import { HttpResponse, http } from "msw"
import type { LineInput, Order, PayOutcome, ProviderStatus } from "../../lib/api/orders"
import { maxRefundable } from "../../lib/orderStateMachine"
import { CUSTOMER_ONLY, FLOOR_STAFF, denyUnless, userIdFromRequest } from "./auth"
import * as bdb from "./brandDb"
import * as odb from "./orderDb"
import * as db from "./db"
import type { PickupCheck } from "../../lib/api/orders"

const minutesOfDay = (d: Date) => d.getHours() * 60 + d.getMinutes()
const bucketOf = (iso: string) => Math.floor(new Date(iso).getTime() / (bdb.settings.pickup.slotMinutes * 60_000))

/** Any time is allowed inside opening hours, after the cut-off; capacity is counted per slot-sized bucket. */
function checkSlot(iso: string): PickupCheck {
  const at = new Date(iso)
  if (Number.isNaN(at.getTime())) return { ok: false, remaining: 0, message: "Giờ nhận không hợp lệ" }
  const br = db.branches.find((b) => b.id === odb.BRANCH_ID)
  const toMin = (s: string) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3, 5))
  const open = toMin(br?.openingTime ?? "07:00"), close = toMin(br?.closingTime ?? "22:00")
  const m = minutesOfDay(at)
  if (m < open || m > close) return { ok: false, remaining: 0, message: `Quán chỉ mở từ ${String(br?.openingTime ?? "07:00").slice(0, 5)} đến ${String(br?.closingTime ?? "22:00").slice(0, 5)}` }
  const { cutoffMinutes, capacityPerSlot } = bdb.settings.pickup
  if (at.getTime() < Date.now() + cutoffMinutes * 60_000) return { ok: false, remaining: 0, message: `Cần đặt trước ít nhất ${cutoffMinutes} phút` }
  const used = odb.orders.filter((o) => o.pickupSlot && o.status !== "Cancelled" && bucketOf(o.pickupSlot) === bucketOf(iso)).length
  const remaining = Math.max(0, capacityPerSlot - used)
  return remaining === 0 ? { ok: false, remaining, message: "Khung giờ này đã đầy, vui lòng chọn giờ khác" } : { ok: true, remaining, message: null }
}

const problem = (status: number, title: string) => HttpResponse.json({ title, detail: title }, { status })
const ok = <T,>(b: T) => HttpResponse.json(b as never)
const REFUND_CONFIRM_MS = 4000

/** What the payment provider would report for an order, independent of whether our callback arrived. */
const provider = new Map<string, ProviderStatus>()

const customerOf = userIdFromRequest
const priceOf = (p: (typeof bdb.products)[number]) => p.branchPrices[odb.BRANCH_ID] ?? p.basePrice

function markPaid(o: Order) {
  o.paymentStatus = "Paid"
  o.paymentMethod = "online"
  o.paidAmount = o.total
  if (o.status === "PendingPayment") o.status = "Pending"
}

function startRefund(o: Order, amount: number) {
  o.paymentStatus = "RefundPending"
  o.refundedAmount += amount
  setTimeout(() => { o.paymentStatus = o.refundedAmount >= o.paidAmount ? "Refunded" : "Paid" }, REFUND_CONFIRM_MS)
}

export const takeawayHandlers = [
  http.get("*/api/v1/ordering/takeaway/menu", ({ request }) => {
    const denied = denyUnless(request, CUSTOMER_ONLY)
    if (denied) return denied
    const products = bdb.products.filter((p) => p.published).map((p) => ({ ...p, price: priceOf(p), soldOut: p.soldOutAt.includes(odb.BRANCH_ID) }))
    return ok({ branchName: "Chi nhánh Quận 1", tableCode: "Mang đi", products })
  }),
  http.get("*/api/v1/ordering/takeaway/info", ({ request }) => {
    const denied = denyUnless(request, CUSTOMER_ONLY)
    if (denied) return denied
    const br = db.branches.find((b) => b.id === odb.BRANCH_ID)
    return ok({ open: (br?.openingTime ?? "07:00").slice(0, 5), close: (br?.closingTime ?? "22:00").slice(0, 5), ...bdb.settings.pickup })
  }),
  http.get("*/api/v1/ordering/takeaway/check", ({ request }) => {
    const denied = denyUnless(request, CUSTOMER_ONLY)
    if (denied) return denied
    try { return ok(checkSlot(new URL(request.url).searchParams.get("at") ?? "")) } catch (e) { return problem(500, `check: ${String(e)}`) }
  }),
  http.post("*/api/v1/ordering/takeaway", async ({ request }) => {
    const denied = denyUnless(request, CUSTOMER_ONLY)
    if (denied) return denied
    const b = (await request.json()) as { slot: string; lines: LineInput[] }
    const chk = checkSlot(b.slot)
    if (!chk.ok) return problem(409, chk.message ?? "Giờ nhận không hợp lệ")
    if (b.lines.length === 0) return problem(422, "Giỏ hàng trống")
    const lines: Order["lines"] = []
    for (const l of b.lines) {
      const p = bdb.products.find((x) => x.id === l.productId && x.published)
      if (!p) return problem(422, "Món không còn trên thực đơn")
      if (p.soldOutAt.includes(odb.BRANCH_ID)) return problem(422, `${p.name} đã hết`)
      const delta = p.sizes.find((s) => s.label === l.size)?.priceDelta ?? 0
      lines.push({ productId: p.id, name: p.name, size: l.size, sugar: l.sugar, ice: l.ice, qty: l.qty, unitPrice: priceOf(p) + delta, note: l.note })
    }
    const o: Order = {
      id: `o${odb.orders.length + 1}`, code: odb.nextOrderCode(), tableId: "", tableCode: "Mang đi", channel: "takeaway", status: "PendingPayment", paymentStatus: "Unpaid",
      lines, total: lines.reduce((s, l) => s + l.unitPrice * l.qty, 0), createdAtUtc: new Date().toISOString(), source: "web", paidAmount: 0, refundedAmount: 0, pickupSlot: b.slot, customerId: customerOf(request),
    }
    odb.orders.push(o)
    return ok(o)
  }),
  http.post("*/api/v1/ordering/orders/:id/pay-online", async ({ params, request }) => {
    const denied = denyUnless(request, CUSTOMER_ONLY)
    if (denied) return denied
    const o = odb.orders.find((x) => x.id === params.id)
    if (!o) return problem(404, "Không tìm thấy đơn")
    if (o.customerId && o.customerId !== customerOf(request)) return problem(403, "Bạn không có quyền thực hiện thao tác này")
    if (o.paymentStatus === "Paid") return ok(o)
    const outcome = ((await request.json()) as { outcome: PayOutcome }).outcome
    if (outcome === "success") { provider.set(o.id, "Success"); markPaid(o) }
    else if (outcome === "failed") { provider.set(o.id, "Failed"); o.paymentStatus = "Failed" }
    else provider.set(o.id, "Success") // paid at provider but our callback never arrived
    return ok(o)
  }),
  http.get("*/api/v1/ordering/mine", ({ request }) => {
    const denied = denyUnless(request, CUSTOMER_ONLY)
    if (denied) return denied
    return ok(odb.orders.filter((o) => o.customerId === customerOf(request)).reverse())
  }),
  http.post("*/api/v1/ordering/orders/:id/cancel", ({ params, request }) => {
    const denied = denyUnless(request, CUSTOMER_ONLY)
    if (denied) return denied
    const o = odb.orders.find((x) => x.id === params.id)
    if (!o) return problem(404, "Không tìm thấy đơn")
    if (o.customerId !== customerOf(request)) return problem(403, "Bạn không có quyền thực hiện thao tác này")
    if (o.status !== "PendingPayment" && o.status !== "Pending") return problem(409, "Đơn đã được pha chế, không thể hủy")
    o.status = "Cancelled"
    o.reason = "Khách hủy"
    if (o.paymentStatus === "Paid") startRefund(o, maxRefundable(o.paidAmount, o.refundedAmount))
    return ok(o)
  }),
  http.get("*/api/v1/ordering/payments", ({ request }) => {
    const denied = denyUnless(request, FLOOR_STAFF)
    if (denied) return denied
    return ok(odb.orders.filter((o) => o.channel === "takeaway" && (o.paymentStatus === "Failed" || (o.status === "PendingPayment" && o.paymentStatus === "Unpaid"))).reverse())
  }),
  http.post("*/api/v1/ordering/orders/:id/payment-lookup", ({ params, request }) => {
    const denied = denyUnless(request, FLOOR_STAFF)
    if (denied) return denied
    const o = odb.orders.find((x) => x.id === params.id)
    if (!o) return problem(404, "Không tìm thấy đơn")
    const st = provider.get(o.id) ?? "Pending"
    if (st === "Success" && o.paymentStatus !== "Paid") markPaid(o)
    return ok({ providerStatus: st, order: o })
  }),
  http.post("*/api/v1/ordering/orders/:id/refund", async ({ params, request }) => {
    const denied = denyUnless(request, FLOOR_STAFF)
    if (denied) return denied
    const o = odb.orders.find((x) => x.id === params.id)
    if (!o) return problem(404, "Không tìm thấy đơn")
    const b = (await request.json()) as { amount: number; reason: string }
    if (o.paymentStatus !== "Paid") return problem(409, "Chỉ hoàn tiền cho đơn đã thanh toán")
    if (!b.reason.trim()) return problem(422, "Cần nhập lý do hoàn tiền")
    const max = maxRefundable(o.paidAmount, o.refundedAmount)
    if (!(b.amount > 0) || b.amount > max) return problem(422, `Số tiền hoàn tối đa là ${max.toLocaleString("vi-VN")} ₫`)
    startRefund(o, b.amount)
    return ok(o)
  }),
]