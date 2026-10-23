import type { ApiRole, UserDto } from "../lib/api/identity"

/** The roles of proposal v2 (Guest has no account: it only uses the table QR link). */
export type Role = "superAdmin" | "brandAdmin" | "branchManager" | "barista" | "cashier" | "customer"

export const ROLE_LABEL: Record<Role, string> = {
  superAdmin: "Quản trị nền tảng",
  brandAdmin: "Quản trị thương hiệu",
  branchManager: "Quản lý chi nhánh",
  barista: "Pha chế",
  cashier: "Thu ngân / Phục vụ",
  customer: "Khách hàng",
}

/**
 * Backend role -> v2 role. Legacy names are mapped to the closest v2 role until the backend
 * migrates (WarehouseStaff has no v2 equivalent; it lands on Barista).
 */
const API_TO_ROLE: Record<ApiRole, Role | null> = {
  SuperAdmin: "superAdmin",
  BrandAdmin: "brandAdmin",
  BranchManager: "branchManager",
  Barista: "barista",
  Cashier: "cashier",
  Customer: "customer",
  SystemAdmin: "superAdmin",
  Manager: "branchManager",
  AiBusinessAssistant: "branchManager",
  WarehouseStaff: "barista",
  Guest: null,
}

/**
 * DEV ONLY: `VITE_DEV_ROLE_OVERRIDES='{"brand@aicos.local":"brandAdmin"}'` lets one legacy backend
 * account act as a v2 role, because the backend cannot issue Brand Admin / Barista yet.
 */
function devOverrides(): Record<string, Role> {
  if (!import.meta.env.DEV) return {}
  try {
    return JSON.parse((import.meta.env.VITE_DEV_ROLE_OVERRIDES as string | undefined) ?? "{}")
  } catch {
    return {}
  }
}

export function normalizeRole(user: UserDto | null): Role | null {
  if (!user) return null
  return devOverrides()[user.email.toLowerCase()] ?? API_TO_ROLE[user.role] ?? null
}
