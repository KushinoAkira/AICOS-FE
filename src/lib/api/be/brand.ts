import type {
  BrandProfile, BrandSubscription, CancelPolicy, LoyaltySettings, MerchantSettings, OptionChoice, PayRules,
  PickupSettings, Product, ProductInput, Topping, Voucher, VoucherInput,
} from "../brand"
import { http } from "../http"
import { bool, itemsOf, num, rec, recs, str, unsupported, type Raw } from "./util"

/** Real backend (reference sections 1, 2, 4, 5, 6, 8). Fields the API does not have are noted in docs/be-integration-gaps.md. */

// ---------- menu (section 2) ----------
const OPTION_KINDS = { size: "Size", sugar: "Sugar", ice: "Ice", topping: "Topping" } as const

function groupOf(p: Raw, kind: string): Raw[] {
  return recs(p.optionGroups).filter((g) => str(g.kind).toLowerCase() === kind.toLowerCase()).flatMap((g) => recs(g.options))
}

export function toProduct(p: Raw, categories: Map<string, string>): Product {
  const choice = (o: Raw): OptionChoice => ({ id: str(o.id) || str(o.name), label: str(o.name), priceDelta: num(o.priceDelta) })
  return {
    id: str(p.id),
    name: str(p.name),
    category: str(p.categoryName) || categories.get(str(p.categoryId)) || "",
    description: str(p.description),
    imageUrl: str(p.imageUrl) || undefined,
    basePrice: num(p.basePrice),
    branchPrices: {},
    sizes: groupOf(p, OPTION_KINDS.size).map(choice),
    sugarLevels: groupOf(p, OPTION_KINDS.sugar).map((o) => str(o.name)),
    iceLevels: groupOf(p, OPTION_KINDS.ice).map((o) => str(o.name)),
    toppings: groupOf(p, OPTION_KINDS.topping).map((o): Topping => choice(o)),
    published: bool(p.isActive, true),
    dirty: false,
    soldOutAt: [],
  }
}

function group(name: string, kind: string, selection: "Single" | "Multiple", required: boolean, options: { name: string; priceDelta: number }[]) {
  return { name, kind, selectionType: selection, isRequired: required, options: options.map((o, i) => ({ ...o, isDefault: i === 0 && selection === "Single" })) }
}

async function categoryId(name: string): Promise<string> {
  const list = recs(itemsOf(await http.get<Raw[]>("/menu/categories")))
  const found = list.find((c) => str(c.name).toLowerCase() === name.trim().toLowerCase())
  if (found) return str(found.id)
  return str(rec(await http.post<Raw>("/menu/categories", { name: name.trim(), sortOrder: list.length + 1 })).id)
}

async function listProducts(): Promise<Product[]> {
  const [products, cats] = await Promise.all([http.get<Raw[]>("/menu/products"), http.get<Raw[]>("/menu/categories")])
  const names = new Map(recs(itemsOf(cats)).map((c) => [str(c.id), str(c.name)]))
  return recs(itemsOf(products)).map((p) => toProduct(p, names))
}

function productBody(catId: string, b: ProductInput) {
  const groups = [
    b.sizes.length ? group("Size", OPTION_KINDS.size, "Single", true, b.sizes.map((s) => ({ name: s.label, priceDelta: s.priceDelta }))) : null,
    b.sugarLevels.length ? group("Đường", OPTION_KINDS.sugar, "Single", false, b.sugarLevels.map((n) => ({ name: n, priceDelta: 0 }))) : null,
    b.iceLevels.length ? group("Đá", OPTION_KINDS.ice, "Single", false, b.iceLevels.map((n) => ({ name: n, priceDelta: 0 }))) : null,
    b.toppings.length ? group("Topping", OPTION_KINDS.topping, "Multiple", false, b.toppings.map((t) => ({ name: t.label, priceDelta: t.priceDelta }))) : null,
  ].filter((g) => g !== null)
  return { categoryId: catId, name: b.name, description: b.description, basePrice: b.basePrice, tags: [], optionGroups: groups }
}

export const beMenuApi = {
  products: listProducts,
  removeProduct: (id: string) => http.delete<void>(`/menu/products/${id}`),
  async saveProduct(id: string | null, body: ProductInput): Promise<Product> {
    const payload = productBody(await categoryId(body.category), body)
    const saved = rec(id ? await http.put<Raw>(`/menu/products/${id}`, payload) : await http.post<Raw>("/menu/products", payload))
    const productId = str(saved.id) || (id ?? "")
    // Per-branch price overrides are written on the branch publication (the API has no separate "price" call).
    await Promise.all(Object.entries(body.branchPrices).map(([branchId, price]) =>
      http.put<Raw>(`/menu/products/${productId}/branches/${branchId}`, { isPublished: true, priceOverride: price })))
    return { ...toProduct(saved, new Map([[str(saved.categoryId), body.category]])), id: productId, branchPrices: body.branchPrices }
  },
  async publish(branchIds: string[]): Promise<{ published: number }> {
    const products = await listProducts()
    const res = rec(await http.post<Raw>("/menu/publications", { branchIds, productIds: products.map((p) => p.id), publish: true }))
    return { published: num(res.changed, products.length) }
  },
  async setAvailability(productId: string, branchId: string, available: boolean): Promise<Product> {
    await http.patch<Raw>(`/menu/branches/${branchId}/products/${productId}/availability`, { isAvailable: available })
    const found = (await listProducts()).find((p) => p.id === productId)
    return found ?? unsupported("đọc lại món sau khi đổi tình trạng")
  },
}

// ---------- pickup slots (section 5) ----------
function toPickup(r: Raw): PickupSettings {
  return { slotMinutes: num(r.slotMinutes, 15), capacityPerSlot: num(r.capacityPerSlot, 10), cutoffMinutes: num(r.cutoffMinutes, 15), lockMinutes: 0 }
}
const pickupBody = (branchId: string | null, v: PickupSettings) => ({ branchId, slotMinutes: v.slotMinutes, capacityPerSlot: v.capacityPerSlot, cutoffMinutes: v.cutoffMinutes, advanceDays: 1 })

export const bePickupApi = {
  pickupDefault: async () => toPickup(rec(await http.get<Raw>("/orders/pickup-slots/effective"))),
  savePickupDefault: async (v: PickupSettings) => { await http.put<Raw>("/orders/pickup-slots", pickupBody(null, v)); return v },
  async branchPickup(branchId: string) {
    const eff = rec(await http.get<Raw>("/orders/pickup-slots/effective", { query: { branchId } }))
    const brandDefault = toPickup(rec(await http.get<Raw>("/orders/pickup-slots/effective")))
    return { inherited: str(eff.source) !== "Branch", values: toPickup(eff), defaults: brandDefault }
  },
  async saveBranchPickup(branchId: string, v: PickupSettings | null) {
    if (v) await http.put<Raw>("/orders/pickup-slots", pickupBody(branchId, v))
    else {
      const mine = recs(itemsOf(await http.get<Raw[]>("/orders/pickup-slots"))).find((s) => str(s.branchId) === branchId)
      if (mine) await http.delete<void>(`/orders/pickup-slots/${str(mine.id)}`)
    }
    return bePickupApi.branchPickup(branchId)
  },
}

// ---------- loyalty rules (section 4) ----------
const loyaltyRaw = async () => rec(await http.get<Raw>("/customers/loyalty/rules"))
export const beLoyaltySettingsApi = {
  async loyalty(): Promise<LoyaltySettings> {
    const r = await loyaltyRaw()
    const min = num(r.minPointsToRedeem, 1)
    return { earnPer10k: Math.round(10000 / Math.max(1, num(r.amountPerPoint, 10000))), redeemPoints: min, voucherValue: num(r.redeemValuePerPoint) * min, expiryMonths: 3 }
  },
  async saveLoyalty(v: LoyaltySettings): Promise<LoyaltySettings> {
    const r = await loyaltyRaw()
    await http.put<Raw>("/customers/loyalty/rules", {
      isActive: true, amountPerPoint: Math.round(10000 / Math.max(1, v.earnPer10k)), redeemValuePerPoint: Math.round(v.voucherValue / Math.max(1, v.redeemPoints)),
      minPointsToRedeem: v.redeemPoints, silverThreshold: num(r.silverThreshold, 100), goldThreshold: num(r.goldThreshold, 500),
    })
    return v
  },
}

// ---------- refund policy, pay rules, merchant (sections 6, 8) ----------
const policyRaw = async () => rec(await http.get<Raw>("/payments/policies/cancellation"))
export const bePolicyApi = {
  async cancelPolicy(): Promise<CancelPolicy> {
    const r = await policyRaw()
    return { freeCancelBeforeMinutes: num(r.noShowAfterMinutes, 30), refundPercentAfterLock: num(r.noShowRefundPercent), autoRefund: bool(r.autoApproveWithinPolicy, true), exceptionNeedsApproval: str(r.exceptionApprover, "BranchManager") !== "None" }
  },
  async saveCancelPolicy(v: CancelPolicy): Promise<CancelPolicy> {
    const r = await policyRaw()
    await http.put<Raw>("/payments/policies/cancellation", {
      cancelRefundPercent: num(r.cancelRefundPercent, 100), noShowAfterMinutes: v.freeCancelBeforeMinutes, noShowRefundPercent: v.refundPercentAfterLock,
      unpaidOrderTimeoutMinutes: num(r.unpaidOrderTimeoutMinutes, 15), autoApproveWithinPolicy: v.autoRefund, exceptionApprover: r.exceptionApprover ?? "BranchManager",
    })
    return v
  },
  async payRules(): Promise<PayRules> {
    const r = rec(await http.get<Raw>("/workforce/pay-rules"))
    const part = num(r.partTimeHourRate)
    return { fullTimeDailyRate: num(r.fullTimeDayRate), partTimeHourlyRate: part, replacementMultiplier: part ? Math.round((num(r.replacementHourRate) / part) * 100) / 100 : 1, lateDeductPerHour: 0 }
  },
  async savePayRules(v: PayRules): Promise<PayRules> {
    const r = rec(await http.get<Raw>("/workforce/pay-rules"))
    await http.put<Raw>("/workforce/pay-rules", {
      fullTimeDayRate: v.fullTimeDailyRate, partTimeHourRate: v.partTimeHourlyRate, replacementHourRate: Math.round(v.partTimeHourlyRate * v.replacementMultiplier),
      overtimeAfterHours: num(r.overtimeAfterHours, 8), overtimeMultiplier: num(r.overtimeMultiplier, 1.5),
    })
    return v
  },
  async merchant(): Promise<MerchantSettings> {
    const s = recs(itemsOf(await http.get<Raw[]>("/payments/merchant-settings")))[0] ?? {}
    return { merchantName: str(s.accountName), merchantId: str(s.merchantCode), bankCode: str(s.bankCode), accountNumber: "", acceptCash: true, acceptQr: bool(s.isEnabled) }
  },
  async saveMerchant(v: MerchantSettings): Promise<MerchantSettings> {
    await http.put<Raw>("/payments/merchant-settings", { branchId: null, providerCode: "VietQR", isEnabled: v.acceptQr, accountName: v.merchantName, merchantCode: v.merchantId || null, bankCode: v.bankCode?.trim() || null, accountNumber: v.accountNumber?.trim() || null })
    return v
  },
}

// ---------- vouchers (section 4) ----------
const toVoucher = (v: Raw): Voucher => ({
  id: str(v.id), code: str(v.code), kind: str(v.discountType) === "Percentage" ? "percent" : "amount", value: num(v.value), minOrder: num(v.minOrderAmount),
  expiresAt: str(v.expiresAtUtc) || str(v.expiresAt), maxUses: 1, used: str(v.status) === "Redeemed" ? 1 : 0, active: str(v.status, "Active") === "Active",
})
export const beVoucherApi = {
  vouchers: async () => recs(itemsOf(await http.get<Raw[]>("/customers/vouchers"))).map(toVoucher),
  createVoucher: async (v: VoucherInput) =>
    toVoucher(rec(await http.post<Raw>("/customers/vouchers", { branchId: null, code: v.code, type: "Voucher", discountType: v.kind === "percent" ? "Percentage" : "FixedAmount", value: v.value, minOrderAmount: v.minOrder, expiresAt: v.expiresAt }))),
  async setVoucherActive(id: string, active: boolean): Promise<Voucher> {
    if (active) return unsupported("kích hoạt lại voucher đã thu hồi")
    await http.post<Raw>(`/customers/vouchers/${id}/revoke`, {})
    return toVoucher({ ...rec(await http.get<Raw>(`/customers/vouchers/${id}`)) })
  },
}

// ---------- subscription (section 1) ----------
export const beSubscriptionApi = {
  async subscription(): Promise<BrandSubscription> {
    const r = rec(await http.get<Raw>("/identity/subscription"))
    return toBrandSubscription(rec(r.subscription))
  },
  async renew(): Promise<BrandSubscription> {
    const r = rec(await http.post<Raw>("/identity/subscription/renew", {}))
    return toBrandSubscription(rec(r.subscription))
  },
}
function toBrandSubscription(s: Raw): BrandSubscription {
  const health = str(s.health)
  return {
    planName: str(s.planName), monthlyFee: num(s.fee), maxBranches: num(s.maxBranches), maxUsers: num(s.maxStaffAccounts),
    usedBranches: num(s.activeBranches), usedUsers: num(s.staffAccounts), renewsAtUtc: str(s.periodEndUtc),
    status: str(s.status) === "Suspended" ? "Suspended" : health === "Overdue" || health === "GracePeriod" ? "PastDue" : "Active",
  }
}

// ---------- profile ----------
const toProfile = (p: Raw): BrandProfile => ({ name: str(p.name), slug: str(p.code), logoUrl: str(p.logoUrl) || undefined, brandColor: str(p.primaryColor) || undefined, description: str(p.description) || undefined })

export const beProfileApi = {
  profile: async (): Promise<BrandProfile> => toProfile(rec(await http.get<Raw>("/identity/brand/profile"))),
  saveProfile: async (v: { logoUrl?: string; brandColor?: string; description?: string }): Promise<BrandProfile> =>
    toProfile(rec(await http.put<Raw>("/identity/brand/profile", { description: v.description ?? null, logoUrl: v.logoUrl ?? null, primaryColor: v.brandColor ?? null, secondaryColor: null }))),
}
