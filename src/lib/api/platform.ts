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
  planName?: string
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

/** A card of the brand picker customers see after signing in. */
export interface BrandCard {
  id: string
  slug: string
  name: string
  description?: string
  logoUrl?: string
  brandColor?: string
  branchCount: number
}

/** A shop owner registering a brand; a Super Admin approves it before the owner can sign in. */
export interface RegisterBrandInput {
  brandName: string
  code: string
  ownerFullName: string
  email: string
  phone: string
  password: string
  confirmPassword: string
  description: string
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
  /** 0 is unlimited. */
  maxTablesPerBranch?: number
  graceDays?: number
  tier?: string
  description?: string
  isActive?: boolean
  subscribers?: number
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
  /** What is still unpaid for the current period. */
  outstanding?: number
}

export interface SubscriptionPaymentInput {
  amount: number
  method: string
  reference: string
}

export interface PaymentProvider {
  id: string
  code: string
  name: string
  mode: "mock" | "sandbox"
  enabled: boolean
  merchantId?: string
  callbackUrl?: string
  /** The API only says whether keys are set, and the last 4 characters of the API key. */
  hasApiKey: boolean
  apiKeyHint?: string
  hasSecretKey: boolean
}

/** Empty keys keep what is stored. */
export interface ProviderInput {
  displayName: string
  mode: PaymentProvider["mode"]
  merchantId: string
  callbackUrl: string
  apiKey: string
  secretKey: string
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
  brands: () => http.get<BrandCard[]>(`${PUB}/brands`, { anonymous: true }),
  brand: (slug: string) => http.get<BrandPublic>(`${PUB}/brands/${slug}`, { anonymous: true }),
  qrBrand: (token: string) => http.get<{ token: string; tenantSlug: string; brandName: string; branchId: string }>(`${PUB}/qr/${token}`, { anonymous: true }),
  contact: (body: ContactInput) => http.post<{ received: true }>(`${PUB}/contact`, body, { anonymous: true }),
  registerBrand: (body: RegisterBrandInput) => http.post<{ code: string; message: string }>(`${PUB}/register-brand`, body, { anonymous: true }),
}

const mockPlatformApi = {
  tenants: () => http.get<Tenant[]>(`${BASE}/tenants`),
  createTenant: (body: TenantInput) => http.post<Tenant>(`${BASE}/tenants`, body),
  setTenantStatus: (id: string, status: TenantStatus, reason?: string) => http.patch<Tenant>(`${BASE}/tenants/${id}/status`, { status, reason }),
  approveTenant: (id: string) => http.patch<Tenant>(`${BASE}/tenants/${id}/status`, { status: "Active" }),
  rejectTenant: (id: string, reason: string) => http.patch<Tenant>(`${BASE}/tenants/${id}/status`, { status: "Rejected", reason }),
  plans: () => http.get<Plan[]>(`${BASE}/plans`),
  createPlan: (body: Omit<Plan, "id">) => http.post<Plan>(`${BASE}/plans`, body),
  updatePlan: (id: string, body: Omit<Plan, "id">) => http.put<Plan>(`${BASE}/plans/${id}`, body),
  setPlanActive: (id: string, isActive: boolean) => http.patch<Plan>(`${BASE}/plans/${id}/status`, { isActive }),
  subscriptions: () => http.get<Subscription[]>(`${BASE}/subscriptions`),
  changeSubscription: (id: string, body: { planId?: string; suspend?: boolean }) => http.patch<Subscription>(`${BASE}/subscriptions/${id}`, body),
  recordPayment: (id: string, body: SubscriptionPaymentInput) => http.post<void>(`${BASE}/subscriptions/${id}/payments`, body),
  providers: () => http.get<PaymentProvider[]>(`${BASE}/payment-providers`),
  createProvider: (code: string, body: ProviderInput) => http.post<PaymentProvider>(`${BASE}/payment-providers`, { code, ...body }),
  updateProvider: (id: string, body: ProviderInput) => http.put<PaymentProvider>(`${BASE}/payment-providers/${id}`, body),
  setProviderEnabled: (id: string, enabled: boolean) => http.patch<PaymentProvider>(`${BASE}/payment-providers/${id}/status`, { enabled }),
  health: () => http.get<HealthItem[]>(`${BASE}/health`),
  revenue: () => http.get<RevenuePoint[]>(`${BASE}/revenue`),
  audit: () => http.get<PlatformAuditEntry[]>(`${BASE}/audit`),
}

/** Mock data in demo mode, the real gateway otherwise. */
export const publicApi: typeof mockPublicApi = env.useMock ? mockPublicApi : bePublicApi
export const platformApi: typeof mockPlatformApi = env.useMock ? mockPlatformApi : bePlatformApi
