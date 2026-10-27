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

/** Issue a mock session with non-guessable bearer tokens (maps to Better Auth “opaque session” guidance). */
export function issueSession(user: UserDto): StoredSession {
  const accessToken = randomToken("atk_")
  const refreshToken = randomToken("rtk_")
  accessTokens.set(accessToken, user.id)
  const in1h = new Date(Date.now() + 3_600_000).toISOString()
  return {
    accessToken,
    accessTokenExpiresAtUtc: in1h,
    refreshToken,
    refreshTokenExpiresAtUtc: in1h,
    user,
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

/**
 * Returns a 401/403 response when the caller may not proceed; otherwise null.
 * FE route guards hide screens; this stops forged/direct API calls in mock mode.
 */
export function denyUnless(request: Request, gate: MockRoleGate): HttpResponse<DefaultBodyType> | null {
  const user = userFromRequest(request)
  if (!user) return problem(401, "Bạn cần đăng nhập", { code: "unauthorized" })
  if (user.status === "Locked") return problem(403, "Tài khoản đã bị vô hiệu hóa", { code: "account_disabled" })
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
