import type { BrandSubscription, CancelPolicy, LoyaltySettings, MerchantSettings, PayRules, PickupSettings, Product, Voucher } from "../../lib/api/brand"

export const BRANCH_1 = "00000000-0000-0000-0000-000000000b01"
export const BRANCH_2 = "b02"

const sizes = [
  { id: "s", label: "S", priceDelta: 0 },
  { id: "m", label: "M", priceDelta: 5000 },
  { id: "l", label: "L", priceDelta: 10000 },
]
const sugar = ["0%", "30%", "50%", "70%", "100%"]
const ice = ["Không đá", "Ít đá", "Vừa", "Nhiều đá"]
const toppings = [
  { id: "shot", label: "Thêm shot espresso", priceDelta: 10000 },
  { id: "cream", label: "Kem cheese", priceDelta: 12000 },
  { id: "pearl", label: "Trân châu", priceDelta: 8000, requiresChoiceId: "cold" },
]

/** Hosted under Firebase `public/media` so mock Hosting does not depend on Unsplash/CSP passthrough. */
const IMG = (id: string) => `/media/${id}.jpg?v=lfs2`
const CATEGORY_IMAGES: Record<string, string[]> = {
  "Cà phê": ["photo-1510591509098-f4fdc6d0ff04", "photo-1495474472287-4d71bcdd2085", "photo-1461023058943-07fcbe16d735"],
  "Trà trái cây": ["photo-1556679343-c7306c1976bc", "photo-1673090431108-014275c62265"],
  "Trà sữa": ["photo-1558857563-b371033873b8", "photo-1525385133512-2f3bdd039054"],
  "Đá xay": ["photo-1572490122747-3968b75cc699", "photo-1553530666-ba11a7da3888"],
  "Bánh ngọt": ["photo-1578985545062-69928b1d9587", "photo-1558961363-fa8fdf82db35"],
}
let imgSeq = 0
const imageFor = (category: string) => { const pool = CATEGORY_IMAGES[category] ?? CATEGORY_IMAGES["Cà phê"]; return IMG(pool[imgSeq++ % pool.length]) }

const p = (id: string, branchId: string, name: string, category: string, basePrice: number, extra: Partial<Product> = {}): Product => ({
  id, branchId, name, category, description: "", imageUrl: imageFor(category), basePrice, branchPrices: {}, sizes, sugarLevels: sugar, iceLevels: ice, toppings, published: true, dirty: false, soldOutAt: [], ...extra,
})

/** Separate catalogs: Quận 1 vs Thủ Đức. */
export const products: Product[] = [
  // Quận 1
  p("p1", BRANCH_1, "Cà phê sữa đá", "Cà phê", 35000, { description: "Robusta pha phin, sữa đặc." }),
  p("p2", BRANCH_1, "Cà phê đen đá", "Cà phê", 29000),
  p("p3", BRANCH_1, "Espresso", "Cà phê", 39000, { toppings: [toppings[0]], iceLevels: ["Nóng"] }),
  p("p4", BRANCH_1, "Cappuccino", "Cà phê", 52000),
  p("p5", BRANCH_1, "Cold brew cam", "Cà phê", 55000, { soldOutAt: [BRANCH_1] }),
  p("p6", BRANCH_1, "Trà đào cam sả", "Trà trái cây", 49000),
  p("p7", BRANCH_1, "Bánh croissant", "Bánh ngọt", 35000, { sizes: [{ id: "one", label: "1 cái", priceDelta: 0 }], sugarLevels: [], iceLevels: [], toppings: [] }),
  p("p8", BRANCH_1, "Bánh tiramisu", "Bánh ngọt", 45000, { sizes: [{ id: "one", label: "1 phần", priceDelta: 0 }], sugarLevels: [], iceLevels: [], toppings: [], published: false, dirty: true }),
  // Thủ Đức — different set
  p("p9", BRANCH_2, "Latte hạt phỉ", "Cà phê", 55000, { description: "Chỉ bán tại Thủ Đức." }),
  p("p10", BRANCH_2, "Americano", "Cà phê", 39000),
  p("p11", BRANCH_2, "Trà sữa trân châu", "Trà sữa", 45000),
  p("p12", BRANCH_2, "Matcha đá xay", "Đá xay", 59000),
  p("p13", BRANCH_2, "Trà vải hoa hồng", "Trà trái cây", 49000),
  p("p14", BRANCH_2, "Bánh mì que", "Bánh ngọt", 25000, { sizes: [{ id: "one", label: "1 cây", priceDelta: 0 }], sugarLevels: [], iceLevels: [], toppings: [] }),
]

export const settings: {
  pickup: PickupSettings
  loyalty: LoyaltySettings
  cancel: CancelPolicy
  pay: PayRules
  merchant: MerchantSettings
} = {
  pickup: { slotMinutes: 15, capacityPerSlot: 8, cutoffMinutes: 15, lockMinutes: 30 },
  loyalty: { earnPer10k: 1, redeemPoints: 100, voucherValue: 10000, expiryMonths: 12 },
  cancel: { freeCancelBeforeMinutes: 30, refundPercentAfterLock: 0, autoRefund: true, exceptionNeedsApproval: true },
  pay: { fullTimeDailyRate: 350000, partTimeHourlyRate: 28000, replacementMultiplier: 1.5, lateDeductPerHour: 28000 },
  merchant: { merchantName: "Cà phê Nhà", merchantId: "MERCH-0001", acceptCash: true, acceptQr: true },
}

/** branch id -> override (absent = inherits the chain default). */
export const branchPickup = new Map<string, PickupSettings>()

export const vouchers: Voucher[] = [
  { id: "v1", code: "WELCOME10", kind: "percent", value: 10, minOrder: 50000, expiresAt: new Date(Date.now() + 60 * 86_400_000).toISOString(), maxUses: 500, used: 128, active: true },
  { id: "v2", code: "GIAM20K", kind: "amount", value: 20000, minOrder: 100000, expiresAt: new Date(Date.now() + 20 * 86_400_000).toISOString(), maxUses: 200, used: 200, active: true },
  { id: "v3", code: "TET2025", kind: "percent", value: 15, minOrder: 0, expiresAt: new Date(Date.now() - 30 * 86_400_000).toISOString(), maxUses: 300, used: 87, active: false },
]

export const subscription = {
  planName: "Growth",
  status: "Active" as BrandSubscription["status"],
  monthlyFee: 1_490_000,
  maxBranches: 2,
  maxUsers: 50,
  renewsAtUtc: new Date(Date.now() + 12 * 86_400_000).toISOString(),
}
