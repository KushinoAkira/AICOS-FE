/**
 * A cart chosen on the public brand page (`/b/:brandSlug`) before signing in. It is kept in this tab only, and handed to the
 * takeaway menu once the customer has signed in and is at that brand, so nothing has to be picked twice.
 */
import type { LineInput } from "./api/orders"

export interface OrderDraft {
  brand: string
  branchId: string
  lines: LineInput[]
}

const KEY = "aicos.orderDraft"

export function saveDraft(draft: OrderDraft) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(draft))
  } catch {
    /* storage blocked: the customer picks again after signing in */
  }
}

export function peekDraft(): OrderDraft | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    const d = raw ? (JSON.parse(raw) as Partial<OrderDraft>) : null
    return d && typeof d.brand === "string" && typeof d.branchId === "string" && Array.isArray(d.lines) ? (d as OrderDraft) : null
  } catch {
    return null
  }
}

/** The draft for this brand, or null (a draft of another brand is left for that brand). Reading does not remove it. */
export function draftFor(brand: string | null): OrderDraft | null {
  const d = peekDraft()
  return d && brand && d.brand === brand ? d : null
}

/** Called once the takeaway menu has the draft in its cart. Kept apart from reading so a double render cannot lose it. */
export function clearDraft() {
  try { sessionStorage.removeItem(KEY) } catch { /* ignore */ }
}

export interface CartItem extends LineInput { name: string; unit: number }
interface MenuProduct { id: string; name: string; price: number; soldOut: boolean; sizes: { label: string; priceDelta: number }[] }

/** Lines back into cart rows at today's menu prices. Lines whose drink is gone or sold out are dropped and counted. */
export function draftToCart(lines: LineInput[], products: MenuProduct[]): { cart: CartItem[]; dropped: number } {
  const cart: CartItem[] = []
  let dropped = 0
  for (const l of lines) {
    const p = products.find((x) => x.id === l.productId)
    if (!p || p.soldOut || !(l.qty >= 1)) { dropped++; continue }
    const delta = p.sizes.find((s) => s.label === l.size)?.priceDelta ?? 0
    cart.push({ ...l, qty: Math.min(20, l.qty), name: p.name, unit: p.price + delta })
  }
  return { cart, dropped }
}
