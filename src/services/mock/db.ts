import type { BranchDto, UserDto } from "../../lib/api/identity"
import type { HealthItem, PaymentProvider, Plan, PlatformAuditEntry, RevenuePoint, Subscription, Tenant } from "../../lib/api/platform"

const NOW = new Date()
const iso = (daysAgo: number) => new Date(NOW.getTime() - daysAgo * 86_400_000).toISOString()
const ahead = (days: number) => new Date(NOW.getTime() + days * 86_400_000).toISOString()

const BRANCH_ID = "00000000-0000-0000-0000-000000000b01"

const user = (id: string, fullName: string, email: string, role: UserDto["role"], branchId: string | null): UserDto => ({
  id, fullName, email, username: null, phone: "0900000000", role, branchId, status: "Active",
  mustChangePassword: false, lockoutEndUtc: null, lastLoginAtUtc: iso(0), createdAtUtc: iso(60), updatedAtUtc: null,
})

/** email -> password (same demo accounts as the real seed). */
export const passwords: Record<string, string> = {
  "admin@aicos.local": "Admin@12345",
  "brand@aicos.local": "Staff@12345",
  "manager@aicos.local": "Staff@12345",
  "warehouse@aicos.local": "Staff@12345",
  "cashier@aicos.local": "Staff@12345",
  "customer@aicos.local": "Customer@12345",
}

/** Which brand each demo account belongs to. The platform admin belongs to none, so it signs in on the platform site only. */
export const tenantOfUser: Record<string, string> = {
  "brand@aicos.local": "caphenha", "manager@aicos.local": "caphenha", "warehouse@aicos.local": "caphenha",
  "cashier@aicos.local": "caphenha", "customer@aicos.local": "caphenha",
}

export const users: UserDto[] = [
  user("u1", "Quản trị nền tảng", "admin@aicos.local", "SystemAdmin", null),
  user("u2", "Chủ chuỗi Demo", "brand@aicos.local", "Manager", BRANCH_ID),
  user("u3", "Quản lý Quận 1", "manager@aicos.local", "Manager", BRANCH_ID),
  user("u4", "Pha chế Minh", "warehouse@aicos.local", "WarehouseStaff", BRANCH_ID),
  user("u5", "Thu ngân Lan", "cashier@aicos.local", "Cashier", BRANCH_ID),
  user("u6", "Khách hàng Demo", "customer@aicos.local", "Customer", null),
]

const branch = (id: string, name: string, address: string): BranchDto => ({
  id, name, address, phone: "0281234567", openingTime: "07:00:00", closingTime: "22:00:00", status: "Active", createdAtUtc: iso(60), updatedAtUtc: null,
})

export const branches: BranchDto[] = [
  branch(BRANCH_ID, "AICOS Quận 1", "1 Nguyễn Huệ, Q1, TP.HCM"),
  branch("b02", "AICOS Thủ Đức", "12 Võ Văn Ngân, TP.Thủ Đức"),
]

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
