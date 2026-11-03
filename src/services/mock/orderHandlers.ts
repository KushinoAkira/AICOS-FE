import { HttpResponse, delay, http } from "msw"
import type { LineInput, Order, TableRow } from "../../lib/api/orders"
import type { OrderStatus } from "../../lib/orderStateMachine"
import { canTransition } from "../../lib/orderStateMachine"
import * as bdb from "./brandDb"
import * as odb from "./orderDb"
import { takeawayHandlers } from "./takeawayHandlers"
import { engageHandlers } from "./engageHandlers"
import { staffHandlers } from "./staffHandlers"
import { applyDemoVoucher, voucherHandlers } from "./voucherMock"

const problem = (status: number, title: string) => HttpResponse.json({ title, detail: title }, { status })
const ok = <T,>(b: T) => HttpResponse.json(b as never)

const openOrders = (tableId: string) => odb.orders.filter((o) => o.tableId === tableId && !o.completedAtUtc && o.status !== "Cancelled")
const rowOf = (t: (typeof odb.tables)[number]): TableRow => ({ ...t, orders: openOrders(t.id) })
const priceOf = (p: (typeof bdb.products)[number]) => p.branchPrices[odb.BRANCH_ID] ?? p.basePrice

/** Server-side pricing: the client never sends prices (BR). */
function build(tableId: string, lines: LineInput[], source: Order["source"]): Order | string {
  const table = odb.tables.find((t) => t.id === tableId)
  if (!table) return "Không tìm thấy bàn"
  if (lines.length === 0) return "Giỏ hàng trống"
  const out: Order["lines"] = []
  for (const l of lines) {
    const p = bdb.products.find((x) => x.id === l.productId && x.published)
    if (!p) return "Món không còn trên thực đơn"
    if (p.soldOutAt.includes(odb.BRANCH_ID)) return `${p.name} đã hết`
    if (!(l.qty >= 1 && l.qty <= 20)) return "Số lượng không hợp lệ"
    const delta = p.sizes.find((s) => s.label === l.size)?.priceDelta ?? 0
    out.push({ productId: p.id, name: p.name, size: l.size, sugar: l.sugar, ice: l.ice, qty: l.qty, unitPrice: priceOf(p) + delta, note: l.note })
  }
  return { id: `o${odb.orders.length + 1}`, code: odb.nextOrderCode(), tableId, tableCode: table.code, channel: "dine-in", status: "Pending", paymentStatus: "Unpaid", lines: out, total: out.reduce((s, l) => s + l.unitPrice * l.qty, 0), createdAtUtc: new Date().toISOString(), source, paidAmount: 0, refundedAmount: 0 }
}

const byToken = (token: unknown) => odb.tables.find((t) => t.qrToken === token)

export const orderHandlers = [
  http.get("*/api/v1/ordering/tables", () => ok(odb.tables.map(rowOf))),
  http.post("*/api/v1/ordering/tables", async ({ request }) => {
    const b = (await request.json()) as { code: string; seats: number }
    if (!b.code.trim()) return problem(422, "Nhập mã bàn")
    if (odb.tables.some((t) => t.code.toLowerCase() === b.code.trim().toLowerCase())) return problem(409, "Mã bàn đã tồn tại")
    const t = { id: `t${odb.tables.length + 1}`, code: b.code.trim().toUpperCase(), seats: b.seats, qrToken: `tbl-${b.code.trim().toLowerCase()}`, billRequested: false }
    odb.tables.push(t)
    return ok(rowOf(t))
  }),
  http.get("*/api/v1/ordering/orders", () => ok([...odb.orders].reverse())),
  http.post("*/api/v1/ordering/orders", async ({ request }) => {
    const b = (await request.json()) as { tableId: string; lines: LineInput[]; promotionCode?: string | null }
    const o = build(b.tableId, b.lines, "pos")
    if (typeof o === "string") return problem(422, o)
    const refused = applyDemoVoucher(o, b.promotionCode)
    if (refused) return refused
    odb.orders.push(o)
    return ok(o)
  }),
  http.post("*/api/v1/ordering/orders/:id/status", async ({ params, request }) => {
    const o = odb.orders.find((x) => x.id === params.id)
    if (!o) return problem(404, "Không tìm thấy đơn")
    const b = (await request.json()) as { status: OrderStatus; reason?: string }
    if (!canTransition(o.status, b.status, o.channel)) return problem(409, "Đơn đã được cập nhật bởi người khác. Hãy tải lại.")
    if ((b.status === "Cancelled" || b.status === "Unfulfillable") && !b.reason?.trim()) return problem(422, "Cần nhập lý do")
    o.status = b.status
    o.reason = b.reason
    return ok(o)
  }),
  http.post("*/api/v1/ordering/tables/:id/pay", async ({ params, request }) => {
    const b = (await request.json()) as { received: number }
    const unpaid = openOrders(String(params.id)).filter((o) => o.paymentStatus === "Unpaid")
    const open = unpaid.filter((o) => o.status !== "Unfulfillable")
    const total = open.reduce((s, o) => s + o.total, 0)
    if (b.received < total) return problem(422, "Số tiền nhận chưa đủ")
    unpaid.forEach((o) => { o.paymentStatus = "Paid"; o.paymentMethod = "cash"; o.paidAmount = o.status === "Unfulfillable" ? 0 : o.total })
    const t = odb.tables.find((x) => x.id === params.id)
    if (t) t.billRequested = false
    return ok({ change: b.received - total })
  }),
  /** Cashier closes the table after payment: the orders leave the table and enter the customer's history. */
  http.post("*/api/v1/ordering/tables/:id/complete", ({ params }) => {
    const open = openOrders(String(params.id))
    if (open.length === 0) return problem(409, "Bàn không có đơn để hoàn thành")
    if (open.some((o) => o.paymentStatus === "Unpaid" && o.status !== "Unfulfillable")) return problem(409, "Bàn chưa thanh toán xong")
    if (open.some((o) => o.status === "Pending" || o.status === "Preparing")) return problem(409, "Còn món chưa pha xong")
    const now = new Date().toISOString()
    open.forEach((o) => { o.completedAtUtc = now; if (o.status === "Ready") o.status = "Served" })
    return ok({ completed: open.length })
  }),
  ...takeawayHandlers,
  ...engageHandlers,
  ...staffHandlers,
  ...voucherHandlers,
  http.get("*/api/v1/ordering/guest/:token", async ({ params }) => {
    await delay(150)
    const t = byToken(params.token)
    if (!t) return problem(404, "Mã QR không hợp lệ hoặc bàn đã bị vô hiệu hóa")
    const products = bdb.products.filter((p) => p.published).map((p) => ({ ...p, price: priceOf(p), soldOut: p.soldOutAt.includes(odb.BRANCH_ID) }))
    return ok({ branchName: "Chi nhánh Quận 1", tableCode: t.code, products })
  }),
  http.post("*/api/v1/ordering/guest/:token/orders", async ({ params, request }) => {
    const t = byToken(params.token)
    if (!t) return problem(404, "Mã QR không hợp lệ")
    const b = (await request.json()) as { lines: LineInput[]; promotionCode?: string | null }
    const o = build(t.id, b.lines, "qr")
    if (typeof o === "string") return problem(422, o)
    const refused = applyDemoVoucher(o, b.promotionCode)
    if (refused) return refused
    const who = request.headers.get("authorization")?.replace("Bearer mock-", "")
    if (who) o.customerId = who
    odb.orders.push(o)
    return ok(o)
  }),
  http.get("*/api/v1/ordering/guest/:token/orders", ({ params }) => {
    const t = byToken(params.token)
    return t ? ok(openOrders(t.id)) : problem(404, "Mã QR không hợp lệ")
  }),
  http.post("*/api/v1/ordering/guest/:token/bill", ({ params }) => {
    const t = byToken(params.token)
    if (!t) return problem(404, "Mã QR không hợp lệ")
    if (openOrders(t.id).length === 0) return problem(409, "Bàn chưa có đơn nào")
    t.billRequested = true
    return ok({ ok: true })
  }),
]