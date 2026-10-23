import { HttpResponse, delay, http } from "msw"
import type { BranchDto, UserDto } from "../../lib/api/identity"
import type { Plan, PaymentProvider, Subscription, Tenant, TenantInput } from "../../lib/api/platform"
import type { StoredSession } from "../../lib/api/tokenStore"
import type { BranchPickup, PickupSettings, Product, ProductInput, Voucher, VoucherInput } from "../../lib/api/brand"
import * as db from "./db"
import * as bdb from "./brandDb"

const MAX_ATTEMPTS = 5
const LOCK_SECONDS = 15 * 60
const attempts = new Map<string, { count: number; lockedUntil: number }>()
const resetTokens = new Map<string, { email: string; expiresAt: number }>()

const problem = (status: number, title: string, extra: Record<string, unknown> = {}) => HttpResponse.json({ title, detail: title, ...extra }, { status })
const ok = <T,>(body: T) => HttpResponse.json(body as never)

function session(u: UserDto): StoredSession {
  const in1h = new Date(Date.now() + 3_600_000).toISOString()
  return { accessToken: `mock-${u.id}`, accessTokenExpiresAtUtc: in1h, refreshToken: `mock-r-${u.id}`, refreshTokenExpiresAtUtc: in1h, user: u }
}

const paged = <T,>(items: T[]) => ({ items, page: 1, pageSize: items.length || 20, totalCount: items.length })

export const handlers = [
  // ---------- identity ----------
  http.post("*/api/v1/identity/auth/login", async ({ request }) => {
    await delay(250)
    const body = (await request.json()) as { login: string; password: string }
    const login = body.login.trim().toLowerCase()
    const state = attempts.get(login) ?? { count: 0, lockedUntil: 0 }
    if (state.lockedUntil > Date.now()) {
      return problem(423, "Tài khoản bị khóa tạm", { code: "account_locked", retryAfterSeconds: Math.ceil((state.lockedUntil - Date.now()) / 1000) })
    }
    // A brand owner who registered themselves has no account until the Super Admin approves and the invite is accepted.
    const applied = db.tenants.find((t) => t.applicantEmail?.toLowerCase() === login)
    if (applied && !db.users.some((u) => u.email === login)) {
      if (applied.status === "Pending") return problem(403, "Đăng ký thương hiệu của bạn đang chờ AICOS duyệt. Chúng tôi sẽ gửi email khi có kết quả.", { code: "tenant_pending" })
      if (applied.status === "Rejected") return problem(403, `Đăng ký thương hiệu đã bị từ chối${applied.rejectReason ? `: ${applied.rejectReason}` : ""}.`, { code: "tenant_rejected" })
      return problem(403, "Thương hiệu đã được duyệt. Hãy mở email mời để đặt mật khẩu rồi đăng nhập.", { code: "invite_pending" })
    }
    const found = db.users.find((u) => u.email === login)
    // On a brand's own address only that brand's accounts may sign in.
    const brandSlug = request.headers.get("x-tenant")
    if (found && brandSlug && db.tenantOfUser[found.email] !== brandSlug && db.passwords[found.email] === body.password) {
      return problem(403, "Tài khoản này không thuộc thương hiệu hiện tại. Hãy đăng nhập tại địa chỉ của thương hiệu bạn.", { code: "wrong_tenant" })
    }
    if (!found || db.passwords[found.email] !== body.password) {
      state.count += 1
      if (state.count >= MAX_ATTEMPTS) {
        state.count = 0
        state.lockedUntil = Date.now() + LOCK_SECONDS * 1000
        attempts.set(login, state)
        return problem(423, "Tài khoản bị khóa tạm", { code: "account_locked", retryAfterSeconds: LOCK_SECONDS })
      }
      attempts.set(login, state)
      return problem(401, "Email hoặc mật khẩu không đúng", { code: "invalid_credentials", attemptsLeft: MAX_ATTEMPTS - state.count })
    }
    if (found.status === "Locked") return problem(403, "Tài khoản đã bị vô hiệu hóa", { code: "account_disabled" })
    attempts.delete(login)
    return ok(session(found))
  }),
  http.post("*/api/v1/identity/auth/logout", () => new HttpResponse(null, { status: 204 })),
  http.post("*/api/v1/identity/auth/change-password", () => new HttpResponse(null, { status: 204 })),
  http.post("*/api/v1/identity/auth/forgot-password", async ({ request }) => {
    await delay(300)
    const { email } = (await request.json()) as { email: string }
    const token = `rt-${Math.random().toString(36).slice(2, 12)}`
    resetTokens.set(token, { email: email.toLowerCase(), expiresAt: Date.now() + 30 * 60_000 })
    // Same response whether or not the email exists (no account enumeration). devToken is mock-only.
    return ok({ message: "Nếu email tồn tại, liên kết đặt lại mật khẩu đã được gửi.", devToken: token })
  }),
  http.post("*/api/v1/identity/auth/reset-password", async ({ request }) => {
    await delay(300)
    const body = (await request.json()) as { token: string; newPassword: string }
    const entry = resetTokens.get(body.token)
    if (body.token.startsWith("expired") || !entry || entry.expiresAt < Date.now()) return problem(410, "Liên kết đã hết hạn hoặc không hợp lệ", { code: "token_expired" })
    db.passwords[entry.email] = body.newPassword
    resetTokens.delete(body.token)
    attempts.delete(entry.email)
    return ok({ message: "Đã đặt lại mật khẩu" })
  }),
  http.post("*/api/v1/identity/auth/register", async ({ request }) => {
    const b = (await request.json()) as { fullName: string; email: string; password: string }
    if (db.users.some((u) => u.email === b.email.toLowerCase())) return problem(409, "Email đã được đăng ký", { code: "email_taken" })
    const created: UserDto = { ...db.users[5], id: `u${db.users.length + 1}`, fullName: b.fullName, email: b.email.toLowerCase() }
    db.users.push(created)
    db.passwords[created.email] = b.password
    return ok(created)
  }),

  http.get("*/api/v1/identity/branches/active", () => ok(db.branches.filter((b) => b.status === "Active"))),
  http.get("*/api/v1/identity/branches", ({ request }) => {
    const s = (new URL(request.url).searchParams.get("search") ?? "").toLowerCase()
    return ok(paged(db.branches.filter((b) => b.name.toLowerCase().includes(s))))
  }),
  http.post("*/api/v1/identity/branches", async ({ request }) => {
    const body = (await request.json()) as Partial<BranchDto>
    const created = { ...db.branches[0], ...body, id: `b${db.branches.length + 1}`, status: "Active" } as BranchDto
    db.branches.push(created)
    return ok(created)
  }),
  http.put("*/api/v1/identity/branches/:id", async ({ params, request }) => {
    const b = db.branches.find((x) => x.id === params.id)
    if (!b) return problem(404, "Không tìm thấy chi nhánh")
    Object.assign(b, (await request.json()) as Partial<BranchDto>)
    return ok(b)
  }),
  http.patch("*/api/v1/identity/branches/:id/status", async ({ params, request }) => {
    const b = db.branches.find((x) => x.id === params.id)
    if (!b) return problem(404, "Không tìm thấy chi nhánh")
    b.status = ((await request.json()) as { status: BranchDto["status"] }).status
    return ok(b)
  }),
  http.get("*/api/v1/identity/users", ({ request }) => {
    const sp = new URL(request.url).searchParams
    const s = (sp.get("search") ?? "").toLowerCase()
    return ok(paged(db.users.filter((u) => (u.fullName + u.email).toLowerCase().includes(s) && (!sp.get("role") || u.role === sp.get("role")))))
  }),
  http.post("*/api/v1/identity/users", async ({ request }) => {
    const b = (await request.json()) as Partial<UserDto> & { password: string }
    const created = { ...db.users[4], ...b, id: `u${db.users.length + 1}`, status: "Active" } as UserDto
    db.users.push(created)
    db.passwords[created.email] = b.password
    return ok(created)
  }),
  http.patch("*/api/v1/identity/users/:id/status", async ({ params, request }) => {
    const u = db.users.find((x) => x.id === params.id)
    if (!u) return problem(404, "Không tìm thấy người dùng")
    u.status = ((await request.json()) as { status: UserDto["status"] }).status
    return ok(u)
  }),

  // ---------- platform (Super Admin: platform-level data only, BR-06) ----------
  http.get("*/api/v1/platform/tenants", async () => { await delay(200); return ok(db.tenants) }),
  http.post("*/api/v1/platform/tenants", async ({ request }) => {
    const b = (await request.json()) as TenantInput
    if (db.tenants.some((t) => t.slug === b.slug)) return problem(409, "Mã định danh (subdomain) đã tồn tại", { code: "slug_taken" })
    const created: Tenant = { id: `t${db.tenants.length + 1}`, name: b.name, slug: b.slug, planId: b.planId, status: "Active", branchCount: 0, createdAtUtc: new Date().toISOString() }
    db.tenants.push(created)
    db.audit.unshift({ id: `a${Date.now()}`, at: created.createdAtUtc, actor: "admin@aicos.local", action: "Tạo tenant", target: `${b.name} (Brand Admin: ${b.adminEmail})` })
    return ok(created)
  }),
  http.patch("*/api/v1/platform/tenants/:id/status", async ({ params, request }) => {
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
  http.get("*/api/v1/platform/plans", () => ok(db.plans)),
  http.put("*/api/v1/platform/plans/:id", async ({ params, request }) => {
    const p = db.plans.find((x) => x.id === params.id)
    if (!p) return problem(404, "Không tìm thấy gói")
    const b = (await request.json()) as Omit<Plan, "id">
    if (b.monthlyFee <= 0 || b.maxBranches < 1 || b.maxUsers < 1) return problem(422, "Phí và giới hạn phải lớn hơn 0")
    Object.assign(p, b)
    return ok(p)
  }),
  http.get("*/api/v1/platform/subscriptions", () => ok(db.subscriptions)),
  http.patch("*/api/v1/platform/subscriptions/:id", async ({ params, request }) => {
    const s = db.subscriptions.find((x) => x.id === params.id)
    if (!s) return problem(404, "Không tìm thấy đăng ký")
    const b = (await request.json()) as { planId?: string; suspend?: boolean }
    if (b.planId) s.planId = b.planId
    if (b.suspend) s.status = "Suspended" as Subscription["status"]
    return ok(s)
  }),
  http.get("*/api/v1/platform/payment-providers", () => ok(db.providers)),
  http.put("*/api/v1/platform/payment-providers/:id", async ({ params, request }) => {
    const p = db.providers.find((x) => x.id === params.id)
    if (!p) return problem(404, "Không tìm thấy cổng thanh toán")
    Object.assign(p, (await request.json()) as Pick<PaymentProvider, "mode" | "enabled">)
    return ok(p)
  }),
  http.get("*/api/v1/platform/health", async () => { await delay(150); return ok(db.health()) }),
  http.get("*/api/v1/platform/revenue", () => ok(db.revenue)),
  http.get("*/api/v1/platform/audit", () => ok(db.audit)),
]

const settingRoute = <K extends keyof typeof bdb.settings>(path: string, key: K) => [
  http.get(`*/api/v1/brand/settings/${path}`, () => ok(bdb.settings[key])),
  http.put(`*/api/v1/brand/settings/${path}`, async ({ request }) => {
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

export const brandHandlers = [
  http.get("*/api/v1/brand/menu/products", async () => { await delay(200); return ok(bdb.products) }),
  http.post("*/api/v1/brand/menu/products", async ({ request }) => {
    const b = (await request.json()) as ProductInput
    const err = validateProduct(b)
    if (err) return problem(422, err)
    const created: Product = { ...b, id: `p${bdb.products.length + 1}`, published: false, dirty: true, soldOutAt: [] }
    bdb.products.push(created)
    return ok(created)
  }),
  http.put("*/api/v1/brand/menu/products/:id", async ({ params, request }) => {
    const p = bdb.products.find((x) => x.id === params.id)
    if (!p) return problem(404, "Không tìm thấy món")
    const b = (await request.json()) as ProductInput
    const err = validateProduct(b)
    if (err) return problem(422, err)
    Object.assign(p, b, { dirty: true })
    return ok(p)
  }),
  http.post("*/api/v1/brand/menu/publish", async () => {
    let n = 0
    for (const p of bdb.products) if (p.dirty || !p.published) { p.published = true; p.dirty = false; n += 1 }
    return ok({ published: n })
  }),
  http.patch("*/api/v1/brand/menu/products/:id/availability", async ({ params, request }) => {
    const p = bdb.products.find((x) => x.id === params.id)
    if (!p) return problem(404, "Không tìm thấy món")
    const b = (await request.json()) as { branchId: string; available: boolean }
    p.soldOutAt = b.available ? p.soldOutAt.filter((x) => x !== b.branchId) : [...new Set([...p.soldOutAt, b.branchId])]
    return ok(p)
  }),

  ...settingRoute("pickup", "pickup"),
  ...settingRoute("loyalty", "loyalty"),
  ...settingRoute("cancel-policy", "cancel"),
  ...settingRoute("pay-rules", "pay"),
  ...settingRoute("merchant", "merchant"),
  http.get("*/api/v1/identity/branches/:id/pickup-settings", ({ params }) => ok(effectivePickup(String(params.id)))),
  http.put("*/api/v1/identity/branches/:id/pickup-settings", async ({ params, request }) => {
    const { override } = (await request.json()) as { override: PickupSettings | null }
    if (override) bdb.branchPickup.set(String(params.id), override)
    else bdb.branchPickup.delete(String(params.id))
    return ok(effectivePickup(String(params.id)))
  }),

  http.get("*/api/v1/brand/vouchers", () => ok(bdb.vouchers)),
  http.post("*/api/v1/brand/vouchers", async ({ request }) => {
    const b = (await request.json()) as VoucherInput
    if (bdb.vouchers.some((v) => v.code === b.code.toUpperCase())) return problem(409, "Mã voucher đã tồn tại")
    if (!(b.value > 0) || (b.kind === "percent" && b.value > 100)) return problem(422, "Giá trị giảm không hợp lệ")
    const created: Voucher = { ...b, code: b.code.toUpperCase(), id: `v${bdb.vouchers.length + 1}`, used: 0, active: true }
    bdb.vouchers.unshift(created)
    return ok(created)
  }),
  http.patch("*/api/v1/brand/vouchers/:id", async ({ params, request }) => {
    const v = bdb.vouchers.find((x) => x.id === params.id)
    if (!v) return problem(404, "Không tìm thấy voucher")
    v.active = ((await request.json()) as { active: boolean }).active
    return ok(v)
  }),

  http.get("*/api/v1/brand/subscription", () => ok({ ...bdb.subscription, usedBranches: db.branches.length, usedUsers: db.users.length })),
  http.post("*/api/v1/brand/subscription/renew", () => {
    bdb.subscription.status = "Active"
    bdb.subscription.renewsAtUtc = new Date(new Date(bdb.subscription.renewsAtUtc).getTime() + 30 * 86_400_000).toISOString()
    return ok({ ...bdb.subscription, usedBranches: db.branches.length, usedUsers: db.users.length })
  }),
]