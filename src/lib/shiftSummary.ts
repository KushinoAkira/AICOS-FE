import type { Order } from "./api/orders"

export interface ShiftSummary {
  /** Distinct tables that had a dine-in order in the shift. */
  tables: number
  orders: number
  /** What was sold, most first: drink or food name, quantity and amount. */
  items: { name: string; qty: number; amount: number }[]
  /** Money collected, split by how it was paid. */
  cash: number
  online: number
  /** Orders of the shift still waiting for payment. */
  unpaid: number
  cancelled: number
}

const workable = (o: Order) => o.status !== "Cancelled" && o.status !== "Unfulfillable"

/** The orders of the branch placed between check-in and `untilUtc` (check-out, or now), summed up for the end-of-shift check. */
export function summarizeShift(orders: Order[], sinceUtc: string, untilUtc: string): ShiftSummary {
  const from = Date.parse(sinceUtc)
  const to = Date.parse(untilUtc)
  const inShift = orders.filter((o) => { const at = Date.parse(o.createdAtUtc); return at >= from && at <= to })
  const live = inShift.filter(workable)
  const paid = live.filter((o) => o.paymentStatus === "Paid")
  const items = new Map<string, { name: string; qty: number; amount: number }>()
  for (const o of live) {
    for (const l of o.lines) {
      const row = items.get(l.name) ?? { name: l.name, qty: 0, amount: 0 }
      row.qty += l.qty
      row.amount += l.qty * l.unitPrice
      items.set(l.name, row)
    }
  }
  return {
    tables: new Set(live.filter((o) => o.channel === "dine-in" && o.tableCode).map((o) => o.tableCode)).size,
    orders: live.length,
    items: [...items.values()].sort((a, b) => b.qty - a.qty || a.name.localeCompare(b.name)),
    cash: paid.filter((o) => o.paymentMethod === "cash").reduce((s, o) => s + o.total, 0),
    online: paid.filter((o) => o.paymentMethod !== "cash").reduce((s, o) => s + o.total, 0),
    unpaid: live.filter((o) => o.paymentStatus === "Unpaid").length,
    cancelled: inShift.length - live.length,
  }
}
