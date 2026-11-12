import { env } from "../../config/env"
import { beLoyaltySettingsApi, beMenuApi, bePickupApi, bePolicyApi, beProfileApi, beSubscriptionApi, beVoucherApi } from "./be/brand"
import { http } from "./http"

// ---------- menu (UC-14, UC-15, UC-24) ----------
export interface OptionChoice { id: string; label: string; priceDelta: number }
export interface Topping extends OptionChoice {
  /** Only selectable when this option choice is selected (BR-14), e.g. "tran-chau" needs a cold drink. */
  requiresChoiceId?: string
}
export interface Product {
  id: string
  /** Catalog owner — each branch has its own menu. */
  branchId: string
  name: string
  category: string
  description: string
  imageUrl?: string
  basePrice: number
  /** Legacy price overrides (unused when menus are per-branch). */
  branchPrices: Record<string, number>
  sizes: OptionChoice[]
  sugarLevels: string[]
  iceLevels: string[]
  toppings: Topping[]
  published: boolean
  /** Changed after the last publish. */
  dirty: boolean
  /** When includes this product's branchId, the item is sold out there. */
  soldOutAt: string[]
}
export type ProductInput = Omit<Product, "id" | "published" | "dirty" | "soldOutAt" | "branchId">

// ---------- settings ----------
export interface PickupSettings { slotMinutes: number; capacityPerSlot: number; cutoffMinutes: number; lockMinutes: number }
export interface BranchPickup { inherited: boolean; values: PickupSettings; defaults: PickupSettings }
export interface LoyaltySettings { earnPer10k: number; redeemPoints: number; voucherValue: number; expiryMonths: number }
export interface CancelPolicy { freeCancelBeforeMinutes: number; refundPercentAfterLock: number; autoRefund: boolean; exceptionNeedsApproval: boolean }
export interface PayRules { fullTimeDailyRate: number; partTimeHourlyRate: number; replacementMultiplier: number; lateDeductPerHour: number }
export interface MerchantSettings { merchantName: string; merchantId: string; bankCode?: string; accountNumber?: string; acceptCash: boolean; acceptQr: boolean }

export interface Voucher {
  id: string
  code: string
  kind: "percent" | "amount"
  value: number
  minOrder: number
  expiresAt: string
  maxUses: number
  used: number
  active: boolean
}
export type VoucherInput = Omit<Voucher, "id" | "used" | "active">

export interface BrandSubscription {
  planName: string
  status: "Active" | "PastDue" | "Suspended"
  monthlyFee: number
  maxBranches: number
  maxUsers: number
  /** 0 is unlimited. */
  maxTablesPerBranch?: number
  usedBranches: number
  usedUsers: number
  renewsAtUtc: string
}

const B = "/brand"

export interface BrandProfile { description?: string; name: string; slug: string; logoUrl?: string; brandColor?: string }

const mockBrandApi = {
  profile: () => http.get<BrandProfile>(`${B}/profile`),
  saveProfile: (v: { logoUrl?: string; brandColor?: string; description?: string }) => http.put<BrandProfile>(`${B}/profile`, v),
  products: () => http.get<Product[]>(`${B}/menu/products`),
  removeProduct: (id: string) => http.delete<void>(`${B}/menu/products/${id}`),
  saveProduct: (id: string | null, body: ProductInput) => (id ? http.put<Product>(`${B}/menu/products/${id}`, body) : http.post<Product>(`${B}/menu/products`, body)),
  publish: (branchIds: string[]) => http.post<{ published: number }>(`${B}/menu/publish`, { branchIds }),
  setAvailability: (productId: string, branchId: string, available: boolean) => http.patch<Product>(`${B}/menu/products/${productId}/availability`, { branchId, available }),

  pickupDefault: () => http.get<PickupSettings>(`${B}/settings/pickup`),
  savePickupDefault: (v: PickupSettings) => http.put<PickupSettings>(`${B}/settings/pickup`, v),
  branchPickup: (branchId: string) => http.get<BranchPickup>(`/identity/branches/${branchId}/pickup-settings`),
  saveBranchPickup: (branchId: string, v: PickupSettings | null) => http.put<BranchPickup>(`/identity/branches/${branchId}/pickup-settings`, { override: v }),

  loyalty: () => http.get<LoyaltySettings>(`${B}/settings/loyalty`),
  saveLoyalty: (v: LoyaltySettings) => http.put<LoyaltySettings>(`${B}/settings/loyalty`, v),
  cancelPolicy: () => http.get<CancelPolicy>(`${B}/settings/cancel-policy`),
  saveCancelPolicy: (v: CancelPolicy) => http.put<CancelPolicy>(`${B}/settings/cancel-policy`, v),
  payRules: () => http.get<PayRules>(`${B}/settings/pay-rules`),
  savePayRules: (v: PayRules) => http.put<PayRules>(`${B}/settings/pay-rules`, v),
  merchant: () => http.get<MerchantSettings>(`${B}/settings/merchant`),
  saveMerchant: (v: MerchantSettings) => http.put<MerchantSettings>(`${B}/settings/merchant`, v),

  vouchers: () => http.get<Voucher[]>(`${B}/vouchers`),
  createVoucher: (v: VoucherInput) => http.post<Voucher>(`${B}/vouchers`, v),
  setVoucherActive: (id: string, active: boolean) => http.patch<Voucher>(`${B}/vouchers/${id}`, { active }),

  subscription: () => http.get<BrandSubscription>(`${B}/subscription`),
  renew: () => http.post<BrandSubscription>(`${B}/subscription/renew`),
}

const beBrandApi = { ...beProfileApi, ...beMenuApi, ...bePickupApi, ...beLoyaltySettingsApi, ...bePolicyApi, ...beVoucherApi, ...beSubscriptionApi }
/** Mock data in demo mode, the real gateway otherwise. */
export const brandApi: typeof mockBrandApi = env.useMock ? mockBrandApi : beBrandApi
