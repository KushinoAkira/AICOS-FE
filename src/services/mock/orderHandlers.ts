import { HttpResponse, delay, http } from "msw"
import type { LineInput, Order, TableRow } from "../../lib/api/orders"
import type { OrderStatus } from "../../lib/orderStateMachine"
import { canTransition } from "../../lib/orderStateMachine"
import { BRAND_STAFF, FLOOR_STAFF, denyUnless, effectiveBranchId, userFromRequest, userIdFromRequest } from "./auth"
import * as bdb from "./brandDb"
import * as fdb from "./floorDb"
import * as odb from "./orderDb"
import * as db from "./db"
import { takeawayHandlers } from "./takeawayHandlers"
import { engageHandlers } from "./engageHandlers"
import { staffHandlers } from "./staffHandlers"

const problem = (status: number, title: string) => HttpResponse.json({ title, detail: title }, { status })
const ok = <T,>(b: T) => HttpResponse.json(b as never)

const openOrders = (tableId: string) => odb.orders.filter((o) => o.tableId === tableId && !o.completedAtUtc && o.status !== "Cancelled")
const rowOf = (t: (typeof odb.tables)[number]): TableRow => ({ ...t, orders: openOrders(t.id) })

function branchFromRequest(request: Request): string | null {
  return effectiveBranchId(request)
}

const priceOf = (p: (typeof bdb.products)[number], branchId: string) => p.branchPrices[branchId] ?? p.basePrice

/** Server-side pricing: the client never sends prices (BR). */
function build(tableId: string, lines: LineInput[], source: Order["source"]): Order | string {
  const table = odb.tables.find((t) => t.id === tableId)
  if (!table) return "Không tìm thấy bàn"
  if (lines.length === 0) return "Giỏ hàng trống"
  const out: Order["lines"] = []
  for (const l of lines) {
    const p = bdb.products.find((x) => x.id === l.productId && x.published && x.branchId === table.branchId)
    if (!p) return "Món không còn trên thực đơn"
    if (p.soldOutAt.includes(table.branchId)) return `${p.name} đã hết`
    if (!(l.qty >= 1 && l.qty <= 20)) return "Số lượng không hợp lệ"
    const delta = p.sizes.find((s) => s.label === l.size)?.priceDelta ?? 0
    out.push({ productId: p.id, name: p.name, size: l.size, sugar: l.sugar, ice: l.ice, qty: l.qty, unitPrice: priceOf(p, table.branchId) + delta, note: l.note })
  }
  return { id: `o${odb.orders.length + 1}`, code: odb.nextOrderCode(), tableId, tableCode: table.code, channel: "dine-in", status: "Pending", paymentStatus: "Unpaid", lines: out, total: out.reduce((s, l) => s + l.unitPrice * l.qty, 0), createdAtUtc: new Date().toISOString(), source, paidAmount: 0, refundedAmount: 0 }
}

const byToken = (token: unknown) => odb.tables.find((t) => t.qrToken === token)

export const orderHandlers = [
  http.get("*/api/v1/ordering/tables", ({ request }) => {
    const denied = denyUnless(request, [...FLOOR_STAFF, ...BRAND_STAFF])
    if (denied) return denied
    const branchId = branchFromRequest(request)
    const rows = branchId ? odb.tables.filter((t) => t.branchId === branchId) : odb.tables
    return ok(rows.map(rowOf))
  }),
  http.post("*/api/v1/ordering/tables", async ({ request }) => {
    const denied = denyUnless(request, BRAND_STAFF)
    if (denied) return denied
    const branchId = branchFromRequest(request)
    if (!branchId) return problem(422, "Chọn chi nhánh trước khi thêm bàn")
    const b = (await request.json()) as { code: string; seats: number; floor?: number; floorId?: string }
    if (!b.code.trim()) return problem(422, "Nhập mã bàn")
    const floor = Math.max(1, Number(b.floor) || 1)
    if (odb.tables.some((t) => t.branchId === branchId && t.code.toLowerCase() === b.code.trim().toLowerCase())) {
      return problem(409, "Mã bàn đã tồn tại tại chi nhánh này")
    }
    const floorId =
      b.floorId
      || fdb.floors.find((f) => f.branchId === branchId && f.level === floor)?.id
      || fdb.floors.find((f) => f.branchId === branchId)?.id
    if (!floorId) return problem(422, "Chi nhánh chưa có tầng — hãy tạo tầng trước")
    const id = `t${odb.tables.length + 1}`
    const qrToken = fdb.randomQrToken()
    const t = {
      id,
      code: b.code.trim().toUpperCase(),
      seats: b.seats,
      branchId,
      floor,
      floorId,
      qrToken,
      isActive: true,
      billRequested: false,
    }
    odb.tables.push(t)
    fdb.diningTables.push({
      id, branchId, floorId, code: t.code, seats: t.seats, qrToken, isActive: true,
    })
    return ok(rowOf(t))
  }),
  http.get("*/api/v1/ordering/orders", ({ request }) => {
    const denied = denyUnless(request, FLOOR_STAFF)
    if (denied) return denied
    const branchId = branchFromRequest(request)
    const list = branchId
      ? odb.orders.filter((o) => odb.tables.find((t) => t.id === o.tableId)?.branchId === branchId)
      : odb.orders
    return ok([...list].reverse())
  }),
  http.post("*/api/v1/ordering/orders", async ({ request }) => {
    const denied = denyUnless(request, FLOOR_STAFF)
    if (denied) return denied
    const b = (await request.json()) as { tableId: string; lines: LineInput[] }
    const o = build(b.tableId, b.lines, "pos")
    if (typeof o === "string") return problem(422, o)
    odb.orders.push(o)
    const tbl = odb.tables.find((x) => x.id === o.tableId)
    if (tbl) fdb.emitTableStatus(tbl.branchId, tbl.id, tbl.billRequested ? "WaitingPayment" : "Occupied")
    return ok(o)
  }),
  http.post("*/api/v1/ordering/orders/:id/status", async ({ params, request }) => {
    const denied = denyUnless(request, FLOOR_STAFF)
    if (denied) return denied
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
    const denied = denyUnless(request, FLOOR_STAFF)
    if (denied) return denied
    const b = (await request.json()) as { received: number }
    const unpaid = openOrders(String(params.id)).filter((o) => o.paymentStatus === "Unpaid")
    const open = unpaid.filter((o) => o.status !== "Unfulfillable")
    const total = open.reduce((s, o) => s + o.total, 0)
    if (b.received < total) return problem(422, "Số tiền nhận chưa đủ")
    unpaid.forEach((o) => { o.paymentStatus = "Paid"; o.paymentMethod = "cash"; o.paidAmount = o.status === "Unfulfillable" ? 0 : o.total })
    const t = odb.tables.find((x) => x.id === params.id)
    if (t) {
      t.billRequested = false
      fdb.emitTableStatus(t.branchId, t.id, "Occupied")
    }
    return ok({ change: b.received - total })
  }),
  /** Cashier closes the table after payment: the orders leave the table and enter the customer's history. */
  http.post("*/api/v1/ordering/tables/:id/complete", ({ params, request }) => {
    const denied = denyUnless(request, FLOOR_STAFF)
    if (denied) return denied
    const open = openOrders(String(params.id))
    if (open.length === 0) return problem(409, "Bàn không có đơn để hoàn thành")
    if (open.some((o) => o.paymentStatus === "Unpaid" && o.status !== "Unfulfillable")) return problem(409, "Bàn chưa thanh toán xong")
    if (open.some((o) => o.status === "Pending" || o.status === "Preparing")) return problem(409, "Còn món chưa pha xong")
    const now = new Date().toISOString()
    open.forEach((o) => { o.completedAtUtc = now; if (o.status === "Ready") o.status = "Served" })
    const t = odb.tables.find((x) => x.id === params.id)
    if (t) fdb.emitTableStatus(t.branchId, t.id, "Free")
    return ok({ completed: open.length })
  }),
  ...takeawayHandlers,
  ...engageHandlers,
  ...staffHandlers,
  http.get("*/api/v1/ordering/guest/:token", async ({ params }) => {
    await delay(150)
    const t = byToken(params.token)
    if (!t) return problem(404, "Mã QR không hợp lệ hoặc bàn đã bị vô hiệu hóa")
    const br = db.branches.find((b) => b.id === t.branchId)
    const products = bdb.products
      .filter((p) => p.published && p.branchId === t.branchId)
      .map((p) => ({ ...p, price: priceOf(p, t.branchId), soldOut: p.soldOutAt.includes(t.branchId) }))
    return ok({
      branchName: br?.name ?? "Chi nhánh",
      tableCode: t.code,
      tenantSlug: "caphenha",
      branchId: t.branchId,
      products,
    })
  }),
  http.post("*/api/v1/ordering/guest/:token/orders", async ({ params, request }) => {
    const t = byToken(params.token)
    if (!t) return problem(404, "Mã QR không hợp lệ")
    const o = build(t.id, ((await request.json()) as { lines: LineInput[] }).lines, "qr")
    if (typeof o === "string") return problem(422, o)
    const who = userIdFromRequest(request)
    if (who !== "anon") o.customerId = who
    odb.orders.push(o)
    fdb.emitTableStatus(t.branchId, t.id, t.billRequested ? "WaitingPayment" : "Occupied")
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
    fdb.emitTableStatus(t.branchId, t.id, "WaitingPayment")
    return ok({ ok: true })
  }),
]
