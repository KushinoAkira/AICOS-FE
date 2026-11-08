import { describe, expect, it } from "vitest"
import type { Order } from "./api/orders"
import { summarizeShift } from "./shiftSummary"

const order = (o: Partial<Order>): Order => ({
  id: "o", code: "ORD-1", tableId: "", tableCode: "", channel: "dine-in", status: "Served", paymentStatus: "Paid", lines: [], total: 0,
  createdAtUtc: "2026-11-08T03:00:00Z", source: "pos", paidAmount: 0, refundedAmount: 0, ...o,
} as Order)
const line = (name: string, qty: number, unitPrice: number) => ({ productId: name, name, size: "", sugar: "", ice: "", qty, unitPrice, note: "" })

describe("summarizeShift", () => {
  const orders = [
    order({ tableCode: "A1", paymentMethod: "cash", total: 70000, lines: [line("Latte", 2, 35000)] }),
    order({ tableCode: "A1", paymentMethod: "online", total: 40000, lines: [line("Tra sua", 1, 40000)] }),
    order({ tableCode: "A2", paymentStatus: "Unpaid", total: 35000, lines: [line("Latte", 1, 35000)] }),
    order({ channel: "takeaway", paymentMethod: "online", total: 35000, lines: [line("Latte", 1, 35000)] }),
    order({ tableCode: "A3", status: "Unfulfillable", paymentStatus: "Unpaid", total: 40000, lines: [line("Tra sua", 1, 40000)] }),
    order({ tableCode: "A9", createdAtUtc: "2026-11-08T00:30:00Z", paymentMethod: "cash", total: 99000 }), // before check-in
  ]
  const s = summarizeShift(orders, "2026-11-08T01:00:00Z", "2026-11-08T09:00:00Z")

  it("counts the tables and orders of the shift only", () => {
    expect(s.tables).toBe(2)
    expect(s.orders).toBe(4)
    expect(s.cancelled).toBe(1)
    expect(s.unpaid).toBe(1)
  })
  it("splits collected money by payment method", () => {
    expect(s.cash).toBe(70000)
    expect(s.online).toBe(75000)
  })
  it("adds up what was sold, most first", () => {
    expect(s.items).toEqual([{ name: "Latte", qty: 4, amount: 140000 }, { name: "Tra sua", qty: 1, amount: 40000 }])
  })
})
