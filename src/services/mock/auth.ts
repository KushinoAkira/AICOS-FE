import { HttpResponse, type DefaultBodyType } from "msw"
import type { ApiRole, UserDto } from "../../lib/api/identity"
import type { StoredSession } from "../../lib/api/tokenStore"
import * as db from "./db"

const problem = (status: number, title: string, extra: Record<string, unknown> = {}) =>
  HttpResponse.json({ title, detail: title, ...extra }, { status })

/** Opaque access token → user id. Predictable `mock-<userId>` tokens are rejected. */
const accessTokens = new Map<string, string>()

function randomToken(prefix: string) {
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  return `${prefix}${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}`
}

export function tenantSlugOf(user: UserDto): string | null {
  if (user.role === "Customer" || user.role === "SystemAdmin" || user.role === "SuperAdmin") return null
  return db.tenantSlugOfUserId[user.id] ?? null
}

/** Issue a mock session with non-guessable bearer tokens (maps to Better Auth “opaque session” guidance). */
export function issueSession(user: UserDto): StoredSession {
  const accessToken = randomToken("atk_")
  const refreshToken = randomToken("rtk_")
  accessTokens.set(accessToken, user.id)
  const in1h = new Date(Date.now() + 3_600_000).toISOString()
  const tenantSlug = tenantSlugOf(user)
  const tenantId = tenantSlug ? db.tenantIdOfSlug(tenantSlug) : null
  return {
    accessToken,
    accessTokenExpiresAtUtc: in1h,
    refreshToken,
    refreshTokenExpiresAtUtc: in1h,
    user,
    tenantSlug,
    tenantId,
  }
}

export function revokeAccessToken(token: string | null | undefined) {
  if (token) accessTokens.delete(token)
}

/** Resolve the signed-in mock user from `Authorization: Bearer <opaque>`. */
export function userFromRequest(request: Request): UserDto | null {
  const header = request.headers.get("authorization") ?? ""
  const match = /^Bearer\s+(\S+)$/i.exec(header)
  if (!match) return null
  const token = match[1]
  const userId = accessTokens.get(token)
  if (!userId) return null
  return db.users.find((u) => u.id === userId) ?? null
}

/** Stable id for per-customer mock data (orders, loyalty). Anonymous → `"anon"`. */
export function userIdFromRequest(request: Request): string {
  return userFromRequest(request)?.id ?? "anon"
}

export type MockRoleGate = "authenticated" | readonly ApiRole[]

/** Roles bound to exactly one branch (BR-05) — branch comes from the account/JWT only. */
export const BRANCH_LOCKED_ROLES: ApiRole[] = ["BranchManager", "Manager", "Cashier", "Barista", "WarehouseStaff"]

export function isBranchLockedRole(role: ApiRole): boolean {
  return BRANCH_LOCKED_ROLES.includes(role)
}

/**
 * Branch scope for mock APIs (server-side).
 * Locked staff → always `user.branchId` (ignore client X-Branch for data).
 * Brand Admin → X-Branch if it belongs to their tenant.
 */
export function effectiveBranchId(request: Request): string | null {
  const user = userFromRequest(request)
  const header = request.headers.get("x-branch")?.trim() || null
  if (!user) return header
  if (user.branchId && isBranchLockedRole(user.role)) return user.branchId
  if (header) {
    const slug = tenantSlugOf(user)
    if (slug && !(db.branchesOfTenant[slug] ?? []).includes(header)) return null
    return header
  }
  return null
}

function denyBranchViolation(request: Request, user: UserDto): HttpResponse<DefaultBodyType> | null {
  const header = request.headers.get("x-branch")?.trim()
  if (user.branchId && isBranchLockedRole(user.role)) {
    if (header && header !== user.branchId) {
      return problem(403, "Không được truy cập chi nhánh khác", { code: "branch_forbidden" })
    }
    return null
  }
  if ((user.role === "BrandAdmin" || (user.role === "Manager" && !user.branchId)) && header) {
    const slug = tenantSlugOf(user)
    if (slug && !(db.branchesOfTenant[slug] ?? []).includes(header)) {
      return problem(403, "Chi nhánh không thuộc thương hiệu của bạn", { code: "branch_forbidden" })
    }
  }
  return null
}

/**
 * Returns a 401/403 response when the caller may not proceed; otherwise null.
 * Also enforces Suspended tenants, X-Tenant vs JWT mismatch, and branch isolation (BR-05).
 */
export function denyUnless(request: Request, gate: MockRoleGate): HttpResponse<DefaultBodyType> | null {
  const user = userFromRequest(request)
  if (!user) return problem(401, "Bạn cần đăng nhập", { code: "unauthorized" })
  if (user.status === "Locked") return problem(403, "Tài khoản đã bị vô hiệu hóa", { code: "account_disabled" })

  const sessionSlug = tenantSlugOf(user)
  if (sessionSlug) {
    const tenant = db.tenantBySlug(sessionSlug)
    if (tenant && (tenant.status === "Suspended" || tenant.status === "Closed")) {
      return problem(403, "Thương hiệu đang tạm ngưng hoặc đã đóng", { code: "tenant_suspended" })
    }
  }

  const headerTenant = request.headers.get("x-tenant")
  if (
    headerTenant
    && sessionSlug
    && headerTenant !== sessionSlug
    && user.role !== "SystemAdmin"
    && user.role !== "SuperAdmin"
  ) {
    return problem(403, "Tenant trên URL không khớp phiên đăng nhập", { code: "tenant_mismatch" })
  }

  const branchDenied = denyBranchViolation(request, user)
  if (branchDenied) return branchDenied

  if (gate !== "authenticated" && !gate.includes(user.role)) {
    return problem(403, "Bạn không có quyền thực hiện thao tác này", { code: "forbidden" })
  }
  return null
}

/** Roles that manage a brand (menu, branches, accounts, settings). */
export const BRAND_STAFF: ApiRole[] = ["BrandAdmin", "Manager", "BranchManager"]

/** Roles that run a branch floor (POS, queue, tables). */
export const FLOOR_STAFF: ApiRole[] = ["Cashier", "WarehouseStaff", "Barista", "Manager", "BranchManager", "BrandAdmin"]

export const PLATFORM_ADMIN: ApiRole[] = ["SystemAdmin", "SuperAdmin"]
export const CUSTOMER_ONLY: ApiRole[] = ["Customer"]

/** Generic credential failure — never reveal whether email or tenant exists. */
export const GENERIC_AUTH_FAIL = "Email hoặc mật khẩu không đúng"
