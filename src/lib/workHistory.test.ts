import { describe, expect, it } from "vitest"
import type { Order } from "./api/orders"
import { filterHistory, historyCsv, historyTotals, type HistoryFilter } from "./workHistory"

const order = (o: Partial<Order>): Order => ({
  id: "o", code: "ORD-20261109-AAA111", tableId: "", tableCode: "", channel: "dine-in", status: "Served", paymentStatus: "Paid",
  lines: [{ productId: "p", name: "Latte", size: "", sugar: "", ice: "", qty: 1, unitPrice: 35000, note: "" }],
  total: 35000, createdAtUtc: "2026-11-09T03:00:00Z", source: "pos", paidAmount: 35000, refundedAmount: 0, paymentMethod: "cash", ...o,
} as Order)

const rows = [
  order({ code: "ORD-1-A01", tableCode: "A01", createdAtUtc: "2026-11-09T02:00:00Z" }),
  order({ code: "ORD-1-T01", channel: "takeaway", status: "PickedUp", paymentMethod: "online", createdAtUtc: "2026-11-09T04:00:00Z" }),
  order({ code: "ORD-1-A02", tableCode: "A02", status: "Preparing", paymentStatus: "Unpaid", paidAmount: 0, paymentMethod: undefined, createdAtUtc: "2026-11-09T05:00:00Z" }),
  order({ code: "ORD-1-A03", tableCode: "A03", status: "Unfulfillable", paymentStatus: "Unpaid", paidAmount: 0, createdAtUtc: "2026-11-09T06:00:00Z" }),
  order({ code: "ORD-1-R01", tableCode: "A04", status: "Cancelled", paymentStatus: "Refunded", paidAmount: 35000, refundedAmount: 35000, createdAtUtc: "2026-11-09T07:00:00Z" }),
  order({ code: "ORD-0-OLD", tableCode: "A09", createdAtUtc: "2026-11-08T07:00:00Z" }),
]
const all: HistoryFilter = { fromUtc: "2026-11-09T00:00:00Z", toUtc: "2026-11-09T23:59:59Z", type: "all", status: "all", search: "" }

describe("filterHistory", () => {
  it("keeps the window only, newest first", () => {
    expect(filterHistory(rows, all).map((o) => o.code)).toEqual(["ORD-1-R01", "ORD-1-A03", "ORD-1-A02", "ORD-1-T01", "ORD-1-A01"])
  })
  it("filters by type and status", () => {
    expect(filterHistory(rows, { ...all, type: "takeaway" }).map((o) => o.code)).toEqual(["ORD-1-T01"])
    expect(filterHistory(rows, { ...all, status: "done" })).toHaveLength(2)
    expect(filterHistory(rows, { ...all, status: "working" }).map((o) => o.code)).toEqual(["ORD-1-A02"])
    expect(filterHistory(rows, { ...all, status: "unpaid" }).map((o) => o.code)).toEqual(["ORD-1-A02"])
    expect(filterHistory(rows, { ...all, status: "problem" })).toHaveLength(2)
    expect(filterHistory(rows, { ...all, status: "refund" }).map((o) => o.code)).toEqual(["ORD-1-R01"])
  })
  it("searches the code, the table and the drinks", () => {
    expect(filterHistory(rows, { ...all, search: "a02" }).map((o) => o.code)).toEqual(["ORD-1-A02"])
    expect(filterHistory(rows, { ...all, search: "latte" })).toHaveLength(5)
  })
})

describe("historyTotals", () => {
  it("counts by state and keeps only money not refunded", () => {
    const t = historyTotals(filterHistory(rows, all))
    expect(t).toMatchObject({ orders: 5, done: 2, working: 1, problem: 2, refunded: 1, collected: 70000, dineIn: 4, takeaway: 1 })
  })
})

describe("historyCsv", () => {
  it("writes one line per order with Vietnamese labels", () => {
    const csv = historyCsv(filterHistory(rows, { ...all, type: "takeaway" }), () => "11:00")
    expect(csv.startsWith("﻿")).toBe(true)
    expect(csv.split("\r\n")).toHaveLength(2)
    expect(csv).toContain('"Mang đi"')
    expect(csv).toContain('"Khách đã nhận"')
  })
})
