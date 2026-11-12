import { HttpResponse, delay, http } from "msw"
import type { BranchDto, UserDto } from "../../lib/api/identity"
import type { Plan, PaymentProvider, Subscription, Tenant, TenantInput } from "../../lib/api/platform"
import type { BranchPickup, PickupSettings, Product, ProductInput, Voucher, VoucherInput } from "../../lib/api/brand"
import { BRAND_STAFF, FLOOR_STAFF, GENERIC_AUTH_FAIL, PLATFORM_ADMIN, denyUnless, effectiveBranchId, issueSession, revokeAccessToken, tenantSlugOf, userFromRequest } from "./auth"
import * as db from "./db"
import * as bdb from "./brandDb"
import { normalizeTenantSlug } from "../../lib/tenantSlug"

const MAX_ATTEMPTS = 5
const LOCK_SECONDS = 15 * 60
/** Lockout key = `tenantSlug|email` or `admin|email` / `platform|email`. */
const attempts = new Map<string, { count: number; lockedUntil: number }>()
const resetTokens = new Map<string, { email: string; tenantSlug: string | null; expiresAt: number }>()
/** Demo sign-ups waiting for their code; the demo accepts the code 123456 (no mail is sent). */
const pendingSignUps = new Map<string, { fullName: string; password: string }>()
const DEMO_CODE = "123456"

const problem = (status: number, title: string, extra: Record<string, unknown> = {}) => HttpResponse.json({ title, detail: title, ...extra }, { status })
const ok = <T,>(body: T) => HttpResponse.json(body as never)

const paged = <T,>(items: T[]) => ({ items, page: 1, pageSize: items.length || 20, totalCount: items.length })

function lockKey(scope: string, email: string) {
  return `${scope}|${email.trim().toLowerCase()}`
}

type LoginMode = { kind: "admin" } | { kind: "tenant"; slug: string } | { kind: "legacy"; headerTenant: string | null }

async function handleLogin(request: Request, mode: LoginMode) {
  await delay(250)
  const body = (await request.json()) as { login: string; password: string }
  const login = body.login.trim().toLowerCase()

  let scope: string
  let tenantSlug: string | null
  if (mode.kind === "admin") {
    scope = "admin"
    tenantSlug = null
  } else if (mode.kind === "tenant") {
    scope = mode.slug
    tenantSlug = mode.slug
  } else {
    scope = mode.headerTenant ?? "platform"
    tenantSlug = mode.headerTenant
  }

  const key = lockKey(scope, login)
  const state = attempts.get(key) ?? { count: 0, lockedUntil: 0 }
  if (state.lockedUntil > Date.now()) {
    return problem(423, "Tài khoản bị khóa tạm", { code: "account_locked", retryAfterSeconds: Math.ceil((state.lockedUntil - Date.now()) / 1000) })
  }

  if (mode.kind === "tenant" || (mode.kind === "legacy" && tenantSlug)) {
    const slug = tenantSlug!
    const tenant = db.tenantBySlug(slug)
    // Unknown or suspended — same generic failure as bad credentials (no enumeration).
    if (!tenant || tenant.status === "Suspended" || tenant.status === "Closed" || tenant.status === "Pending" || tenant.status === "Rejected") {
      state.count += 1
      if (state.count >= MAX_ATTEMPTS) {
        state.count = 0
        state.lockedUntil = Date.now() + LOCK_SECONDS * 1000
        attempts.set(key, state)
        return problem(423, "Tài khoản bị khóa tạm", { code: "account_locked", retryAfterSeconds: LOCK_SECONDS })
      }
      attempts.set(key, state)
      return problem(401, GENERIC_AUTH_FAIL, { code: "invalid_credentials" })
    }
  }

  const applied = db.tenants.find((t) => t.applicantEmail?.toLowerCase() === login)
  if (applied && !db.findUserByEmailInTenant(login, applied.slug)) {
    if (applied.status === "Pending") return problem(403, "Đăng ký thương hiệu của bạn đang chờ AICOS duyệt. Chúng tôi sẽ gửi email khi có kết quả.", { code: "tenant_pending" })
    if (applied.status === "Rejected") return problem(403, `Đăng ký thương hiệu đã bị từ chối${applied.rejectReason ? `: ${applied.rejectReason}` : ""}.`, { code: "tenant_rejected" })
    return problem(403, "Thương hiệu đã được duyệt. Hãy mở email mời để đặt mật khẩu rồi đăng nhập.", { code: "invite_pending" })
  }

  let found: UserDto | undefined
  if (mode.kind === "admin") {
    found = db.users.find((u) => u.email === login && (u.role === "SystemAdmin" || u.role === "SuperAdmin"))
  } else if (tenantSlug) {
    found = db.findUserByEmailInTenant(login, tenantSlug)
  } else {
    // Legacy platform login without tenant: Super Admin or Customer only.
    found = db.findUserByEmailInTenant(login, null)
  }

  const expectedPwd = found ? db.passwords[db.passwordKey(tenantSlugOf(found) ?? (mode.kind === "admin" ? "platform" : tenantSlug), found.email)] : undefined
  if (!found || expectedPwd !== body.password) {
    state.count += 1
    if (state.count >= MAX_ATTEMPTS) {
      state.count = 0
      state.lockedUntil = Date.now() + LOCK_SECONDS * 1000
      attempts.set(key, state)
      return problem(423, "Tài khoản bị khóa tạm", { code: "account_locked", retryAfterSeconds: LOCK_SECONDS })
    }
    attempts.set(key, state)
    return problem(401, GENERIC_AUTH_FAIL, { code: "invalid_credentials", attemptsLeft: MAX_ATTEMPTS - state.count })
  }
  if (found.status === "Locked") return problem(403, "Tài khoản đã bị vô hiệu hóa", { code: "account_disabled" })
  if (mode.kind === "admin" && found.role !== "SystemAdmin" && found.role !== "SuperAdmin") {
    return problem(401, GENERIC_AUTH_FAIL, { code: "invalid_credentials" })
  }
  if (mode.kind === "tenant" && (found.role === "SystemAdmin" || found.role === "SuperAdmin" || found.role === "Customer")) {
    return problem(401, GENERIC_AUTH_FAIL, { code: "invalid_credentials" })
  }
  attempts.delete(key)
  return ok(issueSession(found))
}

export const handlers = [
  // ---------- auth (path-based tenant + admin) ----------
  http.post("*/api/v1/admin/auth/login", ({ request }) => handleLogin(request, { kind: "admin" })),
  /** Legacy path — registered before `/:slug/auth/login` so it is not swallowed by the param route. */
  http.post("*/api/v1/identity/auth/login", ({ request }) =>
    handleLogin(request, { kind: "legacy", headerTenant: normalizeTenantSlug(request.headers.get("x-tenant")) }),
  ),
  http.post("*/api/v1/:slug/auth/login", ({ request, params }) => {
    const slug = normalizeTenantSlug(String(params.slug ?? ""))
    if (!slug) return problem(401, GENERIC_AUTH_FAIL, { code: "invalid_credentials" })
    return handleLogin(request, { kind: "tenant", slug })
  }),
  http.post("*/api/v1/identity/auth/logout", ({ request }) => {
    const header = request.headers.get("authorization") ?? ""
    const match = /^Bearer\s+(\S+)$/i.exec(header)
    revokeAccessToken(match?.[1])
    return new HttpResponse(null, { status: 204 })
  }),
  http.post("*/api/v1/identity/auth/change-password", ({ request }) => {
    const denied = denyUnless(request, "authenticated")
    if (denied) return denied
    return new HttpResponse(null, { status: 204 })
  }),
  http.post("*/api/v1/identity/auth/forgot-password", async ({ request }) => {
    await delay(300)
    const { email } = (await request.json()) as { email: string }
    const normalized = email.toLowerCase()
    const headerTenant = normalizeTenantSlug(request.headers.get("x-tenant"))
    const token = `rt-${crypto.getRandomValues(new Uint8Array(16)).reduce((s, b) => s + b.toString(16).padStart(2, "0"), "")}`
    const known = Object.keys(db.passwords).some((k) => k.endsWith(`:${normalized}`))
    if (known) resetTokens.set(token, { email: normalized, tenantSlug: headerTenant, expiresAt: Date.now() + 30 * 60_000 })
    const demo = import.meta.env.VITE_DEMO === "true" || import.meta.env.DEV
    return ok({
      message: "Nếu email tồn tại, liên kết đặt lại mật khẩu đã được gửi.",
      ...(demo ? { devToken: known ? token : `rt-dead-${token.slice(3)}` } : {}),
    })
  }),
  http.post("*/api/v1/identity/auth/reset-password", async ({ request }) => {
    await delay(300)
    const body = (await request.json()) as { token: string; newPassword: string }
    const entry = resetTokens.get(body.token)
    if (body.token.startsWith("expired") || !entry || entry.expiresAt < Date.now()) return problem(410, "Liên kết đã hết hạn hoặc không hợp lệ", { code: "token_expired" })
    if (!body.newPassword || body.newPassword.length < 8) return problem(422, "Mật khẩu mới phải có ít nhất 8 ký tự")
    const pk = db.passwordKey(entry.tenantSlug, entry.email)
    if (db.passwords[pk]) db.passwords[pk] = body.newPassword
    else {
      const hit = Object.keys(db.passwords).find((k) => k.endsWith(`:${entry.email}`))
      if (hit) db.passwords[hit] = body.newPassword
    }
    resetTokens.delete(body.token)
    attempts.delete(lockKey(entry.tenantSlug ?? "platform", entry.email))
    return ok({ message: "Đã đặt lại mật khẩu" })
  }),
  http.post("*/api/v1/identity/auth/register", async ({ request }) => {
    await delay(250)
    const b = (await request.json()) as { fullName: string; email: string; password: string }
    const email = b.email.trim().toLowerCase()
    if (!b.password || b.password.length < 8) return problem(422, "Mật khẩu phải có ít nhất 8 ký tự")
    if (db.users.some((u) => u.email === email)) return problem(409, "Email đã được đăng ký", { code: "user.duplicate_email" })
    // Lam: signup without OTP — create customer and return a session immediately.
    const created: UserDto = {
      id: `u${db.users.length + 1}`, fullName: b.fullName, email, username: null, phone: null, role: "Customer",
      branchId: null, status: "Active", mustChangePassword: false, lockoutEndUtc: null, lastLoginAtUtc: null,
      createdAtUtc: new Date().toISOString(), updatedAtUtc: null,
    }
    db.users.push(created)
    db.passwords[db.passwordKey(null, created.email)] = b.password
    return HttpResponse.json(issueSession(created), { status: 201 })
  }),
  http.post("*/api/v1/identity/auth/register/verify", async ({ request }) => {
    await delay(250)
    const b = (await request.json()) as { email: string; code: string }
    const email = b.email.trim().toLowerCase()
    const pending = pendingSignUps.get(email)
    if (!pending || b.code !== DEMO_CODE) {
      return problem(422, "Mã xác thực không đúng hoặc đã hết hạn. Hãy yêu cầu mã mới.", { code: "auth.verification_code_invalid" })
    }
    const created: UserDto = {
      id: `u${db.users.length + 1}`, fullName: pending.fullName, email, username: null, phone: null, role: "Customer",
      branchId: null, status: "Active", mustChangePassword: false, lockoutEndUtc: null, lastLoginAtUtc: null,
      createdAtUtc: new Date().toISOString(), updatedAtUtc: null,
    }
    db.users.push(created)
    db.passwords[db.passwordKey(null, created.email)] = pending.password
    pendingSignUps.delete(email)
    return ok(issueSession(created))
  }),
  http.post("*/api/v1/identity/auth/register/resend", async ({ request }) => {
    const b = (await request.json()) as { email: string }
    return HttpResponse.json({ email: b.email.trim().toLowerCase(), expiresInSeconds: 600, resendAfterSeconds: 60 }, { status: 202 })
  }),
  http.post("*/api/v1/identity/auth/select-brand", async ({ request }) => {
    const b = (await request.json()) as { tenantCode?: string; tenantId?: string }
    const brand = db.tenants.find((t) => t.slug === b.tenantCode || t.id === b.tenantId)
    if (!brand) return problem(404, "Không tìm thấy quán")
    const actor = userFromRequest(request)
    const user = actor ?? db.users.find((u) => u.role === "Customer")
    if (!user) return problem(401, "Chưa đăng nhập")
    return ok({ ...issueSession(user), activeBrandCode: brand.slug, tenantSlug: brand.slug })
  }),
  http.post("*/api/v1/identity/auth/google", () =>
    problem(422, "Đăng nhập Google không có trong bản demo.", { code: "auth.google_not_configured" })),

  http.get("*/api/v1/identity/branches/active", ({ request }) => {
    // Floor staff may read their own branch (label in sidebar); Brand Admin sees all of the tenant.
    const denied = denyUnless(request, [...BRAND_STAFF, ...FLOOR_STAFF])
    if (denied) return denied
    const actor = userFromRequest(request)!
    const slug = tenantSlugOf(actor)
    const ids = slug ? new Set(db.branchesOfTenant[slug] ?? []) : null
    let list = db.branches.filter((b) => b.status === "Active" && (!ids || ids.has(b.id)))
    // BR-05: branch-locked accounts only see the branch on their JWT.
    if (actor.branchId) list = list.filter((b) => b.id === actor.branchId)
    return ok(list)
  }),
  http.get("*/api/v1/identity/branches", ({ request }) => {
    const denied = denyUnless(request, BRAND_STAFF)
    if (denied) return denied
    const actor = userFromRequest(request)!
    const slug = tenantSlugOf(actor)
    const ids = slug ? new Set(db.branchesOfTenant[slug] ?? []) : null
    const s = (new URL(request.url).searchParams.get("search") ?? "").toLowerCase()
    return ok(paged(db.branches.filter((b) => (!ids || ids.has(b.id)) && b.name.toLowerCase().includes(s))))
  }),
  http.post("*/api/v1/identity/branches", async ({ request }) => {
    const denied = denyUnless(request, BRAND_STAFF)
    if (denied) return denied
    const actor = userFromRequest(request)!
    const slug = tenantSlugOf(actor)
    const body = (await request.json()) as Partial<BranchDto>
    const created = { ...db.branches[0], ...body, id: `b${db.branches.length + 1}`, status: "Active" } as BranchDto
    db.branches.push(created)
    if (slug) {
      db.branchesOfTenant[slug] ??= []
      db.branchesOfTenant[slug].push(created.id)
    }
    return ok(created)
  }),
  http.put("*/api/v1/identity/branches/:id", async ({ params, request }) => {
    const denied = denyUnless(request, BRAND_STAFF)
    if (denied) return denied
    const b = db.branches.find((x) => x.id === params.id)
    if (!b) return problem(404, "Không tìm thấy chi nhánh")
    Object.assign(b, (await request.json()) as Partial<BranchDto>)
    return ok(b)
  }),
  http.patch("*/api/v1/identity/branches/:id/status", async ({ params, request }) => {
    const denied = denyUnless(request, BRAND_STAFF)
    if (denied) return denied
    const b = db.branches.find((x) => x.id === params.id)
    if (!b) return problem(404, "Không tìm thấy chi nhánh")
    b.status = ((await request.json()) as { status: BranchDto["status"] }).status
    return ok(b)
  }),
  http.get("*/api/v1/identity/users", ({ request }) => {
    const denied = denyUnless(request, BRAND_STAFF)
    if (denied) return denied
    const actor = userFromRequest(request)!
    const slug = tenantSlugOf(actor)
    const sp = new URL(request.url).searchParams
    const s = (sp.get("search") ?? "").toLowerCase()
    return ok(paged(db.users.filter((u) => {
      if (slug && db.tenantSlugOfUserId[u.id] !== slug) return false
      if (u.role === "SystemAdmin" || u.role === "SuperAdmin" || u.role === "Customer") return false
      return (u.fullName + u.email).toLowerCase().includes(s) && (!sp.get("role") || u.role === sp.get("role"))
    })))
  }),
  http.post("*/api/v1/identity/users", async ({ request }) => {
    const denied = denyUnless(request, BRAND_STAFF)
    if (denied) return denied
    const actor = userFromRequest(request)!
    const slug = tenantSlugOf(actor)
    const b = (await request.json()) as Partial<UserDto> & { password: string }
    const email = (b.email ?? "").trim().toLowerCase()
    if (slug && db.findUserByEmailInTenant(email, slug)) return problem(409, "Email đã tồn tại trong thương hiệu này", { code: "email_taken" })
    const created = { ...db.users[4], ...b, email, id: `u${db.users.length + 1}`, status: "Active" } as UserDto
    db.users.push(created)
    if (slug) db.tenantSlugOfUserId[created.id] = slug
    db.passwords[db.passwordKey(slug, created.email)] = b.password
    return ok(created)
  }),
  http.patch("*/api/v1/identity/users/:id/status", async ({ params, request }) => {
    const denied = denyUnless(request, BRAND_STAFF)
    if (denied) return denied
    const u = db.users.find((x) => x.id === params.id)
    if (!u) return problem(404, "Không tìm thấy người dùng")
    const actor = userFromRequest(request)!
    const slug = tenantSlugOf(actor)
    if (slug && db.tenantSlugOfUserId[u.id] !== slug) return problem(404, "Không tìm thấy người dùng")
    u.status = ((await request.json()) as { status: UserDto["status"] }).status
    // Brand Admin early unlock (BR-02): clearing Locked also clears temporary lockout attempts.
    if (u.status === "Active") {
      attempts.delete(lockKey(slug ?? "platform", u.email))
      u.lockoutEndUtc = null
    }
    return ok(u)
  }),

  // ---------- platform (Super Admin: platform-level data only, BR-06) ----------
  http.get("*/api/v1/platform/tenants", async ({ request }) => {
    const denied = denyUnless(request, PLATFORM_ADMIN)
    if (denied) return denied
    await delay(200)
    return ok(db.tenants)
  }),
  http.post("*/api/v1/platform/tenants", async ({ request }) => {
    const denied = denyUnless(request, PLATFORM_ADMIN)
    if (denied) return denied
    const b = (await request.json()) as TenantInput
    const slugCheck = normalizeTenantSlug(b.slug)
    if (!slugCheck) return problem(422, "Mã định danh không hợp lệ hoặc bị dành riêng", { code: "slug_invalid" })
    if (db.tenants.some((t) => t.slug === slugCheck)) return problem(409, "Mã định danh đã tồn tại", { code: "slug_taken" })
    const created: Tenant = { id: `t${db.tenants.length + 1}`, name: b.name, slug: slugCheck, planId: b.planId, status: "Active", branchCount: 0, createdAtUtc: new Date().toISOString() }
    db.tenants.push(created)
    db.audit.unshift({ id: `a${Date.now()}`, at: created.createdAtUtc, actor: "admin@aicos.local", action: "Tạo tenant", target: `${b.name} (Brand Admin: ${b.adminEmail})` })
    return ok(created)
  }),
  http.patch("*/api/v1/platform/tenants/:id/status", async ({ params, request }) => {
    const denied = denyUnless(request, PLATFORM_ADMIN)
    if (denied) return denied
    const t = db.tenants.find((x) => x.id === params.id)
    if (!t) return problem(404, "Không tìm thấy tenant")
    const b = (await request.json()) as { status: Tenant["status"]; reason?: string }
    const wasPending = t.status === "Pending"
    if (wasPending && b.status !== "Active" && b.status !== "Rejected") return problem(409, "Đăng ký đang chờ duyệt: chỉ có thể duyệt hoặc từ chối")
    if (b.status === "Rejected" && !b.reason?.trim()) return problem(422, "Cần nhập lý do từ chối")
    t.status = b.status
    if (b.status === "Rejected") t.rejectReason = b.reason?.trim()
    if (wasPending && b.status === "Active") db.subscriptions.push({ id: `s${db.subscriptions.length + 1}`, tenantId: t.id, tenantName: t.name, planId: t.planId, status: "Active", paymentStatus: "Unpaid", renewsAtUtc: new Date(Date.now() + 14 * 86_400_000).toISOString(), overdueDays: 0 })
    db.audit.unshift({ id: `a${Date.now()}`, at: new Date().toISOString(), actor: "admin@aicos.local", action: b.status === "Rejected" ? "Từ chối đăng ký" : wasPending ? "Duyệt đăng ký" : b.status === "Suspended" ? "Tạm ngưng tenant" : b.status === "Closed" ? "Đóng tenant" : "Kích hoạt tenant", target: `${t.name}${b.reason ? ` · ${b.reason}` : ""}` })
    return ok(t)
  }),
  http.get("*/api/v1/platform/plans", ({ request }) => {
    const denied = denyUnless(request, PLATFORM_ADMIN)
    if (denied) return denied
    return ok(db.plans)
  }),
  http.put("*/api/v1/platform/plans/:id", async ({ params, request }) => {
    const denied = denyUnless(request, PLATFORM_ADMIN)
    if (denied) return denied
    const p = db.plans.find((x) => x.id === params.id)
    if (!p) return problem(404, "Không tìm thấy gói")
    const b = (await request.json()) as Omit<Plan, "id">
    if (b.monthlyFee <= 0 || b.maxBranches < 1 || b.maxUsers < 1) return problem(422, "Phí và giới hạn phải lớn hơn 0")
    Object.assign(p, b)
    return ok(p)
  }),
  http.get("*/api/v1/platform/subscriptions", ({ request }) => {
    const denied = denyUnless(request, PLATFORM_ADMIN)
    if (denied) return denied
    return ok(db.subscriptions)
  }),
  http.patch("*/api/v1/platform/subscriptions/:id", async ({ params, request }) => {
    const denied = denyUnless(request, PLATFORM_ADMIN)
    if (denied) return denied
    const s = db.subscriptions.find((x) => x.id === params.id)
    if (!s) return problem(404, "Không tìm thấy đăng ký")
    const b = (await request.json()) as { planId?: string; suspend?: boolean }
    if (b.planId) s.planId = b.planId
    if (b.suspend) s.status = "Suspended" as Subscription["status"]
    return ok(s)
  }),
  http.get("*/api/v1/platform/payment-providers", ({ request }) => {
    const denied = denyUnless(request, PLATFORM_ADMIN)
    if (denied) return denied
    return ok(db.providers)
  }),
  http.put("*/api/v1/platform/payment-providers/:id", async ({ params, request }) => {
    const denied = denyUnless(request, PLATFORM_ADMIN)
    if (denied) return denied
    const p = db.providers.find((x) => x.id === params.id)
    if (!p) return problem(404, "Không tìm thấy cổng thanh toán")
    Object.assign(p, (await request.json()) as Pick<PaymentProvider, "mode" | "enabled">)
    return ok(p)
  }),
  http.get("*/api/v1/platform/health", async ({ request }) => {
    const denied = denyUnless(request, PLATFORM_ADMIN)
    if (denied) return denied
    await delay(150)
    return ok(db.health())
  }),
  http.get("*/api/v1/platform/revenue", ({ request }) => {
    const denied = denyUnless(request, PLATFORM_ADMIN)
    if (denied) return denied
    return ok(db.revenue)
  }),
  http.get("*/api/v1/platform/audit", ({ request }) => {
    const denied = denyUnless(request, PLATFORM_ADMIN)
    if (denied) return denied
    return ok(db.audit)
  }),
]

const settingRoute = <K extends keyof typeof bdb.settings>(path: string, key: K) => [
  http.get(`*/api/v1/brand/settings/${path}`, ({ request }) => {
    const denied = denyUnless(request, BRAND_STAFF)
    if (denied) return denied
    return ok(bdb.settings[key])
  }),
  http.put(`*/api/v1/brand/settings/${path}`, async ({ request }) => {
    const denied = denyUnless(request, BRAND_STAFF)
    if (denied) return denied
    const body = (await request.json()) as (typeof bdb.settings)[K]
    for (const [k, v] of Object.entries(body as unknown as Record<string, unknown>)) if (typeof v === "number" && v < 0) return problem(422, `Giá trị "${k}" không được âm`)
    Object.assign(bdb.settings[key] as object, body)
    return ok(bdb.settings[key])
  }),
]

function validateProduct(b: ProductInput): string | null {
  if (!b.name.trim()) return "Nhập tên món"
  if (!(b.basePrice > 0)) return "Giá phải lớn hơn 0"
  if (Object.values(b.branchPrices).some((v) => !(v > 0))) return "Giá theo chi nhánh phải lớn hơn 0"
  const choiceIds = new Set(b.sizes.map((s) => s.id))
  const bad = b.toppings.find((t) => t.requiresChoiceId && t.requiresChoiceId !== "cold" && !choiceIds.has(t.requiresChoiceId))
  return bad ? `Topping "${bad.label}" phụ thuộc vào lựa chọn không tồn tại` : null
}

const effectivePickup = (branchId: string): BranchPickup => {
  const override = bdb.branchPickup.get(branchId)
  return { inherited: !override, values: override ?? bdb.settings.pickup, defaults: bdb.settings.pickup }
}

function branchFromRequest(request: Request): string | null {
  return effectiveBranchId(request)
}

export const brandHandlers = [
  // Menu is per-branch (X-Branch). Brand Admin + Branch Manager can write.
  http.get("*/api/v1/brand/menu/products", async ({ request }) => {
    const denied = denyUnless(request, [...BRAND_STAFF, ...FLOOR_STAFF])
    if (denied) return denied
    await delay(200)
    const branchId = branchFromRequest(request)
    if (!branchId) return ok([])
    return ok(bdb.products.filter((p) => p.branchId === branchId))
  }),
  http.post("*/api/v1/brand/menu/products", async ({ request }) => {
    const denied = denyUnless(request, BRAND_STAFF)
    if (denied) return denied
    const branchId = branchFromRequest(request)
    if (!branchId) return problem(422, "Chọn chi nhánh trước khi thêm món")
    const b = (await request.json()) as ProductInput
    const err = validateProduct(b)
    if (err) return problem(422, err)
    const created: Product = { ...b, id: `p${bdb.products.length + 1}`, branchId, published: true, dirty: false, soldOutAt: [], branchPrices: b.branchPrices ?? {} }
    bdb.products.push(created)
    return ok(created)
  }),
  http.put("*/api/v1/brand/menu/products/:id", async ({ params, request }) => {
    const denied = denyUnless(request, BRAND_STAFF)
    if (denied) return denied
    const branchId = branchFromRequest(request)
    const p = bdb.products.find((x) => x.id === params.id)
    if (!p || (branchId && p.branchId !== branchId)) return problem(404, "Không tìm thấy món")
    const b = (await request.json()) as ProductInput
    const err = validateProduct(b)
    if (err) return problem(422, err)
    Object.assign(p, b, { dirty: false, published: true })
    return ok(p)
  }),
  http.post("*/api/v1/brand/menu/publish", async ({ request }) => {
    const denied = denyUnless(request, BRAND_STAFF)
    if (denied) return denied
    const branchId = branchFromRequest(request)
    if (!branchId) return problem(422, "Chọn chi nhánh trước khi publish")
    let n = 0
    for (const p of bdb.products) {
      if (p.branchId !== branchId) continue
      if (p.dirty || !p.published) { p.published = true; p.dirty = false; n += 1 }
    }
    return ok({ published: n })
  }),
  http.patch("*/api/v1/brand/menu/products/:id/availability", async ({ params, request }) => {
    const denied = denyUnless(request, BRAND_STAFF)
    if (denied) return denied
    const p = bdb.products.find((x) => x.id === params.id)
    if (!p) return problem(404, "Không tìm thấy món")
    const b = (await request.json()) as { branchId: string; available: boolean }
    const bid = b.branchId || p.branchId
    p.soldOutAt = b.available ? p.soldOutAt.filter((x) => x !== bid) : [...new Set([...p.soldOutAt, bid])]
    return ok(p)
  }),

  ...settingRoute("pickup", "pickup"),
  ...settingRoute("loyalty", "loyalty"),
  ...settingRoute("cancel-policy", "cancel"),
  ...settingRoute("pay-rules", "pay"),
  ...settingRoute("merchant", "merchant"),
  http.get("*/api/v1/identity/branches/:id/pickup-settings", ({ params, request }) => {
    const denied = denyUnless(request, BRAND_STAFF)
    if (denied) return denied
    return ok(effectivePickup(String(params.id)))
  }),
  http.put("*/api/v1/identity/branches/:id/pickup-settings", async ({ params, request }) => {
    const denied = denyUnless(request, BRAND_STAFF)
    if (denied) return denied
    const { override } = (await request.json()) as { override: PickupSettings | null }
    if (override) bdb.branchPickup.set(String(params.id), override)
    else bdb.branchPickup.delete(String(params.id))
    return ok(effectivePickup(String(params.id)))
  }),

  http.get("*/api/v1/brand/vouchers", ({ request }) => {
    const denied = denyUnless(request, BRAND_STAFF)
    if (denied) return denied
    return ok(bdb.vouchers)
  }),
  http.post("*/api/v1/brand/vouchers", async ({ request }) => {
    const denied = denyUnless(request, BRAND_STAFF)
    if (denied) return denied
    const b = (await request.json()) as VoucherInput
    if (bdb.vouchers.some((v) => v.code === b.code.toUpperCase())) return problem(409, "Mã voucher đã tồn tại")
    if (!(b.value > 0) || (b.kind === "percent" && b.value > 100)) return problem(422, "Giá trị giảm không hợp lệ")
    const created: Voucher = { ...b, code: b.code.toUpperCase(), id: `v${bdb.vouchers.length + 1}`, used: 0, active: true }
    bdb.vouchers.unshift(created)
    return ok(created)
  }),
  http.patch("*/api/v1/brand/vouchers/:id", async ({ params, request }) => {
    const denied = denyUnless(request, BRAND_STAFF)
    if (denied) return denied
    const v = bdb.vouchers.find((x) => x.id === params.id)
    if (!v) return problem(404, "Không tìm thấy voucher")
    v.active = ((await request.json()) as { active: boolean }).active
    return ok(v)
  }),

  http.get("*/api/v1/brand/subscription", ({ request }) => {
    const denied = denyUnless(request, BRAND_STAFF)
    if (denied) return denied
    return ok({ ...bdb.subscription, usedBranches: db.branches.length, usedUsers: db.users.length })
  }),
  http.post("*/api/v1/brand/subscription/renew", ({ request }) => {
    const denied = denyUnless(request, BRAND_STAFF)
    if (denied) return denied
    bdb.subscription.status = "Active"
    bdb.subscription.renewsAtUtc = new Date(new Date(bdb.subscription.renewsAtUtc).getTime() + 30 * 86_400_000).toISOString()
    return ok({ ...bdb.subscription, usedBranches: db.branches.length, usedUsers: db.users.length })
  }),
]