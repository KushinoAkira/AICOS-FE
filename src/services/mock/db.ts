import type { BranchDto, UserDto } from "../../lib/api/identity"
import type { HealthItem, PaymentProvider, Plan, PlatformAuditEntry, RevenuePoint, Subscription, Tenant } from "../../lib/api/platform"

const NOW = new Date()
const iso = (daysAgo: number) => new Date(NOW.getTime() - daysAgo * 86_400_000).toISOString()
const ahead = (days: number) => new Date(NOW.getTime() + days * 86_400_000).toISOString()

/** Demo branch ids (Cà phê Nhà). */
export const BRANCH_Q1 = "00000000-0000-0000-0000-000000000b01"
export const BRANCH_TD = "b02"
/** Trà Sữa Mây single branch. */
export const BRANCH_MAY = "b-may-01"

const user = (id: string, fullName: string, email: string, role: UserDto["role"], branchId: string | null): UserDto => ({
  id, fullName, email, username: null, phone: "0900000000", role, branchId, status: "Active",
  mustChangePassword: false, lockoutEndUtc: null, lastLoginAtUtc: iso(0), createdAtUtc: iso(60), updatedAtUtc: null,
})

/**
 * Password lookup: `tenantSlug:email` for tenant users, `platform:email` for Super Admin / platform customer.
 * Same email may exist under two tenants (UNIQUE per tenant).
 */
export const passwords: Record<string, string> = {
  "platform:admin@aicos.local": "Admin@12345",
  "caphenha:brand@aicos.local": "Staff@12345",
  "caphenha:manager@aicos.local": "Staff@12345",
  "caphenha:warehouse@aicos.local": "Staff@12345",
  "caphenha:cashier@aicos.local": "Staff@12345",
  "trasuamay:brand@aicos.local": "Staff@12345",
  "trasuamay:manager@aicos.local": "Staff@12345",
  "platform:customer@aicos.local": "Customer@12345",
}

/** userId → tenant slug (staff of a brand). Super Admin / platform customer omitted. */
export const tenantSlugOfUserId: Record<string, string> = {
  u2: "caphenha",
  u3: "caphenha",
  u4: "caphenha",
  u5: "caphenha",
  u2b: "trasuamay",
  u3b: "trasuamay",
}

/** @deprecated Prefer tenantSlugOfUserId — kept for older call sites keyed by email (single-tenant demos). */
export const tenantOfUser: Record<string, string> = {
  "brand@aicos.local": "caphenha",
  "manager@aicos.local": "caphenha",
  "warehouse@aicos.local": "caphenha",
  "cashier@aicos.local": "caphenha",
}

export function passwordKey(tenantSlug: string | null | undefined, email: string): string {
  return `${tenantSlug ?? "platform"}:${email.trim().toLowerCase()}`
}

export function findUserByEmailInTenant(email: string, tenantSlug: string | null): UserDto | undefined {
  const login = email.trim().toLowerCase()
  if (!tenantSlug) {
    return users.find((u) => u.email === login && (u.role === "SystemAdmin" || u.role === "SuperAdmin" || u.role === "Customer"))
  }
  return users.find((u) => u.email === login && tenantSlugOfUserId[u.id] === tenantSlug)
}

export const users: UserDto[] = [
  user("u1", "Quản trị nền tảng", "admin@aicos.local", "SystemAdmin", null),
  user("u2", "Chủ chuỗi Demo", "brand@aicos.local", "BrandAdmin", null),
  user("u3", "Quản lý Quận 1", "manager@aicos.local", "BranchManager", BRANCH_Q1),
  user("u4", "Pha chế Minh", "warehouse@aicos.local", "Barista", BRANCH_Q1),
  user("u5", "Thu ngân Lan", "cashier@aicos.local", "Cashier", BRANCH_Q1),
  user("u2b", "Chủ Trà Sữa Mây", "brand@aicos.local", "BrandAdmin", null),
  user("u3b", "QL Chi nhánh Mây", "manager@aicos.local", "BranchManager", BRANCH_MAY),
  user("u6", "Khách hàng Demo", "customer@aicos.local", "Customer", null),
]

const branch = (id: string, name: string, address: string): BranchDto => ({
  id, name, address, phone: "0281234567", openingTime: "07:00:00", closingTime: "22:00:00", status: "Active", createdAtUtc: iso(60), updatedAtUtc: null,
})

export const branches: BranchDto[] = [
  branch(BRANCH_Q1, "AICOS Quận 1", "1 Nguyễn Huệ, Q1, TP.HCM"),
  branch(BRANCH_TD, "AICOS Thủ Đức", "12 Võ Văn Ngân, TP.Thủ Đức"),
  branch(BRANCH_MAY, "Trà Sữa Mây Q3", "88 Nguyễn Thị Minh Khai, Q3"),
]

/** Branches owned by each tenant slug (mock isolation). */
export const branchesOfTenant: Record<string, string[]> = {
  caphenha: [BRANCH_Q1, BRANCH_TD],
  trasuamay: [BRANCH_MAY],
  highlanddemo: [],
}

export const plans: Plan[] = [
  { id: "p-starter", name: "Starter", monthlyFee: 490_000, billingCycle: "Monthly", maxBranches: 1, maxUsers: 10, graceDays: 7 },
  { id: "p-growth", name: "Growth", monthlyFee: 1_490_000, billingCycle: "Monthly", maxBranches: 5, maxUsers: 50, graceDays: 7 },
  { id: "p-chain", name: "Chain", monthlyFee: 3_990_000, billingCycle: "Monthly", maxBranches: 20, maxUsers: 200, graceDays: 14 },
]

export const tenants: Tenant[] = [
  { id: "t1", name: "Cà phê Nhà", slug: "caphenha", planId: "p-growth", status: "Active", branchCount: 2, createdAtUtc: iso(120), brandColor: "#4F7A5A" },
  { id: "t2", name: "Trà Sữa Mây", slug: "trasuamay", planId: "p-starter", status: "Active", branchCount: 1, createdAtUtc: iso(45), brandColor: "#B5483A" },
  { id: "t3", name: "Highland Demo", slug: "highlanddemo", planId: "p-chain", status: "Suspended", branchCount: 6, createdAtUtc: iso(300), brandColor: "#3E6A8A" },
]

export function tenantBySlug(slug: string | null | undefined): Tenant | undefined {
  if (!slug) return undefined
  return tenants.find((t) => t.slug === slug)
}

export function tenantIdOfSlug(slug: string): string | null {
  return tenantBySlug(slug)?.id ?? null
}

export const subscriptions: Subscription[] = [
  { id: "s1", tenantId: "t1", tenantName: "Cà phê Nhà", planId: "p-growth", status: "Active", paymentStatus: "Paid", renewsAtUtc: ahead(12), overdueDays: 0 },
  { id: "s2", tenantId: "t2", tenantName: "Trà Sữa Mây", planId: "p-starter", status: "PastDue", paymentStatus: "Unpaid", renewsAtUtc: iso(5), overdueDays: 5 },
  { id: "s3", tenantId: "t3", tenantName: "Highland Demo", planId: "p-chain", status: "Suspended", paymentStatus: "Unpaid", renewsAtUtc: iso(40), overdueDays: 40 },
]

export const providers: PaymentProvider[] = [
  { id: "pp1", code: "Mock", name: "Mock Pay", mode: "mock", enabled: true, hasApiKey: false, hasSecretKey: false },
  { id: "pp2", code: "VietQR", name: "VietQR Sandbox", mode: "sandbox", enabled: false, hasApiKey: true, apiKeyHint: "a91f", hasSecretKey: true },
]

export const health = (): HealthItem[] => {
  const at = new Date().toISOString()
  return [
    { name: "API Gateway", status: "Up", latencyMs: 42, checkedAtUtc: at },
    { name: "PostgreSQL", status: "Up", latencyMs: 8, checkedAtUtc: at },
    { name: "Redis", status: "Up", latencyMs: 2, checkedAtUtc: at },
    { name: "SignalR", status: "Up", latencyMs: 31, checkedAtUtc: at },
    { name: "AI provider", status: "Degraded", latencyMs: 1850, checkedAtUtc: at },
    { name: "Payment provider", status: "Up", latencyMs: 210, checkedAtUtc: at },
  ]
}

export const revenue: RevenuePoint[] = ["T5", "T6", "T7", "T8", "T9", "T10"].map((month, i) => ({ month, revenue: [4.2, 5.1, 5.9, 6.4, 7.8, 8.2][i] * 1_000_000 }))

export const audit: PlatformAuditEntry[] = [
  { id: "a1", at: iso(0.1), actor: "admin@aicos.local", action: "Tạm ngưng tenant", target: "Highland Demo" },
  { id: "a2", at: iso(1), actor: "admin@aicos.local", action: "Đổi gói", target: "Trà Sữa Mây: Starter" },
  { id: "a3", at: iso(3), actor: "admin@aicos.local", action: "Tạo tenant", target: "Trà Sữa Mây" },
  { id: "a4", at: iso(6), actor: "admin@aicos.local", action: "Bật cổng thanh toán", target: "Mock Pay" },
]
