import { env } from "../../config/env"
import { bePlatformApi, bePublicApi } from "./be/platform"
import { http } from "./http"

export type TenantStatus = "Pending" | "Active" | "Suspended" | "Closed" | "Rejected"
export type SubscriptionStatus = "Active" | "PastDue" | "Suspended"

export interface Tenant {
  id: string
  name: string
  slug: string
  planId: string
  status: TenantStatus
  branchCount: number
  createdAtUtc: string
  /** Set for brands that registered themselves and wait for Super Admin review. */
  applicantName?: string
  applicantEmail?: string
  applicantPhone?: string
  rejectReason?: string
  /** Brand identity shown on the brand's own login page. */
  logoUrl?: string
  brandColor?: string
}

/** What the brand's public pages (login, sign-up) may know about a brand. */
export interface BrandPublic {
  name: string
  slug: string
  status: "Active" | "Suspended" | "Closed"
  logoUrl?: string
  brandColor?: string
}

export interface TenantInput {
  name: string
  slug: string
  planId: string
  adminName: string
  adminEmail: string
  /** Real backend only: the first Brand Admin needs a phone and an initial password. */
  adminPhone?: string
  adminPassword?: string
}

export interface Plan {
  id: string
  name: string
  monthlyFee: number
  billingCycle: "Monthly" | "Quarterly" | "Yearly"
  maxBranches: number
  maxUsers: number
  graceDays: number
}

export interface Subscription {
  id: string
  tenantId: string
  tenantName: string
  planId: string
  status: SubscriptionStatus
  paymentStatus: "Paid" | "Unpaid"
  renewsAtUtc: string
  overdueDays: number
}

export interface PaymentProvider {
  id: string
  name: string
  mode: "mock" | "sandbox"
  enabled: boolean
  /** Always masked by the API; the UI never shows a real secret. */
  secretHint: string
}

export interface HealthItem {
  name: string
  status: "Up" | "Degraded" | "Down"
  latencyMs: number
  checkedAtUtc: string
}

export interface RevenuePoint {
  month: string
  /** SaaS subscription revenue only - never the brands' sales revenue (BR-09). */
  revenue: number
}

export interface PlatformAuditEntry {
  id: string
  at: string
  actor: string
  action: string
  target: string
}

const BASE = "/platform"
const PUB = "/public"

/** Anonymous endpoints used by the landing page and the brand registration form (UC-05 self-service). */
export interface ContactInput {
  name: string
  email: string
  phone?: string
  topic: "demo" | "pricing" | "support" | "other"
  message: string
}

const mockPublicApi = {
  plans: () => http.get<Plan[]>(`${PUB}/plans`, { anonymous: true }),
  brands: () => http.get<BrandPublic[]>(`${PUB}/brands`, { anonymous: true }),
  brand: (slug: string) => http.get<BrandPublic>(`${PUB}/brands/${slug}`, { anonymous: true }),
  qrBrand: (token: string) => http.get<{ token: string; tenantSlug: string; brandName: string; branchId: string }>(`${PUB}/qr/${token}`, { anonymous: true }),
  contact: (body: ContactInput) => http.post<{ received: true }>(`${PUB}/contact`, body, { anonymous: true }),
}

const mockPlatformApi = {
  tenants: () => http.get<Tenant[]>(`${BASE}/tenants`),
  createTenant: (body: TenantInput) => http.post<Tenant>(`${BASE}/tenants`, body),
  setTenantStatus: (id: string, status: TenantStatus, reason?: string) => http.patch<Tenant>(`${BASE}/tenants/${id}/status`, { status, reason }),
  plans: () => http.get<Plan[]>(`${BASE}/plans`),
  updatePlan: (id: string, body: Omit<Plan, "id">) => http.put<Plan>(`${BASE}/plans/${id}`, body),
  subscriptions: () => http.get<Subscription[]>(`${BASE}/subscriptions`),
  changeSubscription: (id: string, body: { planId?: string; suspend?: boolean }) => http.patch<Subscription>(`${BASE}/subscriptions/${id}`, body),
  providers: () => http.get<PaymentProvider[]>(`${BASE}/payment-providers`),
  updateProvider: (id: string, body: { mode: PaymentProvider["mode"]; enabled: boolean }) => http.put<PaymentProvider>(`${BASE}/payment-providers/${id}`, body),
  health: () => http.get<HealthItem[]>(`${BASE}/health`),
  revenue: () => http.get<RevenuePoint[]>(`${BASE}/revenue`),
  audit: () => http.get<PlatformAuditEntry[]>(`${BASE}/audit`),
}

/** Mock data in demo mode, the real gateway otherwise. */
export const publicApi: typeof mockPublicApi = env.useMock ? mockPublicApi : bePublicApi
export const platformApi: typeof mockPlatformApi = env.useMock ? mockPlatformApi : bePlatformApi
