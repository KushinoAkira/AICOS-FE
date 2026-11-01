import { http } from "../http"
import type { BrandCard, BrandPublic, ContactInput, RegisterBrandInput, HealthItem, PaymentProvider, Plan, PlatformAuditEntry, RevenuePoint, Subscription, Tenant, TenantInput, TenantStatus } from "../platform"
import { bool, itemsOf, num, randomPassword, rec, recs, str, unsupported, type Raw } from "./util"

/** Real backend, SuperAdmin side (reference section 1 "Nền tảng", section 6 providers). Ids of subscriptions are tenant ids. */
const ID = "/identity"

const toTenant = (t: Raw): Tenant => ({
  id: str(t.id), name: str(t.name), slug: str(t.code), planId: str(t.planId), status: str(t.status, "Active") as TenantStatus,
  branchCount: num(t.branchCount ?? t.activeBranches), createdAtUtc: str(t.createdAtUtc),
})

const toPlan = (p: Raw): Plan => ({
  id: str(p.id), name: str(p.name), monthlyFee: num(p.fee), billingCycle: str(p.billingPeriod, "Monthly") as Plan["billingCycle"],
  maxBranches: num(p.maxBranches), maxUsers: num(p.maxStaffAccounts), graceDays: num(p.graceDays),
})

function toSubscription(s: Raw): Subscription {
  const health = str(s.health)
  return {
    id: str(s.tenantId) || str(s.id), tenantId: str(s.tenantId), tenantName: str(s.tenantName), planId: str(s.planId),
    status: str(s.status) === "Suspended" ? "Suspended" : health === "Overdue" || health === "GracePeriod" ? "PastDue" : "Active",
    paymentStatus: str(s.paymentStatus) === "Paid" ? "Paid" : "Unpaid", renewsAtUtc: str(s.periodEndUtc),
    overdueDays: Math.max(0, -num(s.daysUntilRenewal)),
  }
}

export const bePlatformApi = {
  tenants: async () => recs(itemsOf(await http.get<Raw[]>(`${ID}/tenants`))).map(toTenant),
  createTenant: async (b: TenantInput) =>
    toTenant(rec(await http.post<Raw>(`${ID}/tenants`, {
      name: b.name, code: b.slug, planId: b.planId,
      firstAdmin: { fullName: b.adminName, email: b.adminEmail, phone: b.adminPhone ?? "", password: b.adminPassword || randomPassword() },
    }))),
  async setTenantStatus(id: string, status: TenantStatus): Promise<Tenant> {
    if (status !== "Active" && status !== "Suspended") return unsupported(`đổi thương hiệu sang trạng thái "${status}" (backend chỉ có Active/Suspended)`)
    return toTenant(rec(await http.patch<Raw>(`${ID}/tenants/${id}/status`, { status })))
  },
  plans: async () => recs(itemsOf(await http.get<Raw[]>(`${ID}/subscription-plans`))).map(toPlan),
  updatePlan: async (id: string, b: Omit<Plan, "id">) =>
    toPlan(rec(await http.put<Raw>(`${ID}/subscription-plans/${id}`, { name: b.name, tier: b.name, fee: b.monthlyFee, billingPeriod: b.billingCycle, maxBranches: b.maxBranches, maxStaffAccounts: b.maxUsers, description: "" }))),
  subscriptions: async () => recs(itemsOf(await http.get<Raw[]>(`${ID}/subscriptions`))).map(toSubscription),
  async changeSubscription(id: string, b: { planId?: string; suspend?: boolean }): Promise<Subscription> {
    if (b.planId) await http.post<Raw>(`${ID}/tenants/${id}/subscription`, { planId: b.planId, startDate: new Date().toISOString() })
    if (b.suspend) await http.patch<Raw>(`${ID}/tenants/${id}/status`, { status: "Suspended" })
    const found = (await bePlatformApi.subscriptions()).find((s) => s.id === id)
    return found ?? unsupported("đọc lại thuê bao sau khi đổi")
  },
  providers: async (): Promise<PaymentProvider[]> =>
    recs(itemsOf(await http.get<Raw[]>("/payments/providers"))).map((p) => ({
      id: str(p.id), name: str(p.displayName) || str(p.code), mode: str(p.mode).toLowerCase() === "sandbox" ? "sandbox" : "mock", enabled: bool(p.isEnabled), secretHint: "••••••••",
    })),
  async updateProvider(id: string, b: { mode: PaymentProvider["mode"]; enabled: boolean }): Promise<PaymentProvider> {
    const current = (await bePlatformApi.providers()).find((p) => p.id === id)
    if (current && current.mode !== b.mode) return unsupported("đổi chế độ Mock/Sandbox của cổng thanh toán (khóa bí mật không được trả về nên không ghi đè an toàn được)")
    await http.patch<Raw>(`/payments/providers/${id}/status`, { isEnabled: b.enabled })
    return { ...(current ?? { id, name: id, secretHint: "••••••••" }), mode: b.mode, enabled: b.enabled }
  },
  async health(): Promise<HealthItem[]> {
    const raw = await http.get<Raw | Raw[]>("/platform/health")
    const list = Array.isArray(raw) ? raw : recs(rec(raw).services ?? rec(raw).items ?? rec(raw).checks)
    const now = new Date().toISOString()
    return recs(list).map((h) => ({
      name: str(h.name) || str(h.service), status: (["Up", "Degraded", "Down"].find((s) => s === str(h.status)) ?? (str(h.status).toLowerCase() === "healthy" ? "Up" : "Down")) as HealthItem["status"],
      latencyMs: num(h.latencyMs ?? h.responseTimeMs), checkedAtUtc: str(h.checkedAtUtc) || now,
    }))
  },
  async revenue(): Promise<RevenuePoint[]> {
    const raw = rec(await http.get<Raw>(`${ID}/platform/revenue`))
    return recs(raw.months ?? raw.points ?? raw.items).map((r) => ({ month: str(r.month) || str(r.period), revenue: num(r.revenue ?? r.amount) }))
  },
  async audit(): Promise<PlatformAuditEntry[]> {
    return recs(itemsOf(await http.get<Raw[]>(`${ID}/audit-logs`, { query: { pageSize: 100 } }))).map((a) => ({
      id: str(a.id), at: str(a.createdAtUtc) || str(a.occurredAtUtc) || str(a.at), actor: str(a.actorName) || str(a.actorEmail) || str(a.actor),
      action: str(a.action), target: str(a.target) || str(a.entityName) || str(a.entityType),
    }))
  },
}

const TOPIC_LABEL: Record<ContactInput["topic"], string> = { demo: "Xem demo", pricing: "Bảng giá", support: "Hỗ trợ", other: "Khác" }

/** Anonymous endpoints. */
export const bePublicApi = {
  plans: async () => recs(itemsOf(await http.get<Raw[]>(`${ID}/public/subscription-plans`, { anonymous: true }))).map(toPlan),
  async brand(slug: string): Promise<BrandPublic> {
    const b = rec(await http.get<Raw>(`${ID}/public/brands/${encodeURIComponent(slug)}`, { anonymous: true }))
    return { name: str(b.name), slug: str(b.code), status: "Active", logoUrl: str(b.logoUrl) || undefined, brandColor: str(b.primaryColor) || undefined }
  },
  async brands(): Promise<BrandCard[]> {
    return recs(itemsOf(await http.get<Raw[]>(`${ID}/public/brands`, { anonymous: true }))).map((b) => ({
      id: str(b.id), slug: str(b.code), name: str(b.name), description: str(b.description) || undefined,
      logoUrl: str(b.logoUrl) || undefined, brandColor: str(b.primaryColor) || undefined, branchCount: num(b.branchCount),
    }))
  },
  async contact(b: ContactInput): Promise<{ received: true }> {
    await http.post<Raw>(`${ID}/public/contact`, { fullName: b.name, email: b.email, phone: b.phone || null, subject: TOPIC_LABEL[b.topic], message: b.message }, { anonymous: true })
    return { received: true }
  },
  async registerBrand(b: RegisterBrandInput): Promise<{ code: string; message: string }> {
    const r = rec(await http.post<Raw>(`${ID}/auth/register-brand`, { ...b, phone: b.phone || null, description: b.description || null }, { anonymous: true }))
    return { code: str(r.code), message: str(r.message) }
  },
}
