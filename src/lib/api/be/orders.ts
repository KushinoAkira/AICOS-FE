import type { OrderStatus, PaymentStatus } from "../../orderStateMachine"
import { http } from "../http"
import type { GuestMenu, LineInput, Order, PayOutcome, PickupCheck, PickupInfo, ProviderStatus, TableRow } from "../orders"
import { tokenStore } from "../tokenStore"
import { toProduct } from "./brand"
import { itemsOf, num, rec, recs, str, unsupported, type Raw } from "./util"

/**
 * Real backend ordering (reference sections 3, 5, 6, 7). Differences from the screens' model:
 * - A table's id is its code (`T1`); an order carries `tableNumber` only.
 * - Statuses: backend `Pending > Confirmed > Preparing > Ready > Completed` is mapped onto the app's status set.
 * - Size / sugar / ice / topping have no order field: they travel in the line `note`, and the price is the menu base price.
 */

function toStatus(o: Raw): OrderStatus {
  const dineIn = str(o.type) === "DineIn"
  switch (str(o.status)) {
    case "Pending": return !dineIn && str(o.paymentStatus) !== "Paid" ? "PendingPayment" : "Pending"
    case "Confirmed": return "Pending"
    case "Preparing": return "Preparing"
    case "Ready": return "Ready"
    case "Completed": return dineIn ? "Served" : "PickedUp"
    case "Cancelled": return "Cancelled"
    default: return "Pending"
  }
}

function toPayment(o: Raw): PaymentStatus {
  switch (str(o.refundStatus)) {
    case "Refunded": return "Refunded"
    case "Needed": case "RefundPending": return "RefundPending"
    case "RefundFailed": return "RefundFailed"
    default: return str(o.paymentStatus) === "Paid" ? "Paid" : "Unpaid"
  }
}

export function toOrder(o: Raw): Order {
  const table = str(o.tableNumber)
  const paid = str(o.paymentStatus) === "Paid" || str(o.paymentStatus) === "Refunded"
  return {
    id: str(o.id), code: str(o.orderCode), tableId: table, tableCode: table, channel: str(o.type) === "DineIn" ? "dine-in" : "takeaway",
    status: toStatus(o), paymentStatus: toPayment(o), total: num(o.finalAmount),
    lines: recs(o.items).map((i) => ({ productId: str(i.productId), name: str(i.productName), size: "", sugar: "", ice: "", qty: num(i.quantity), unitPrice: num(i.unitPrice), note: str(i.note) })),
    createdAtUtc: str(o.createdAtUtc), source: "pos", paidAmount: paid ? num(o.finalAmount) : 0, refundedAmount: num(o.refundedAmount),
    paymentMethod: str(o.paymentProvider) ? (str(o.paymentProvider) === "Cash" ? "cash" : "online") : undefined,
    customerId: str(o.customerId) || undefined, completedAtUtc: str(o.completedAtUtc) || undefined,
  }
}

const detail = async (id: string) => toOrder(rec(await http.get<Raw>(`/orders/${id}`)))
/** The list API returns summaries (no lines): open each one so the screens can show the items. */
const withLines = (rows: Raw[]) => Promise.all(rows.map((r) => detail(str(r.id))))
const listOrders = async (query: Record<string, string | number> = {}) => withLines(recs(itemsOf(await http.get<Raw[]>("/orders", { query: { limit: 100, ...query } }))))

const lineNote = (l: LineInput) => [l.size && `Size ${l.size}`, l.sugar && `Đường ${l.sugar}`, l.ice && `Đá ${l.ice}`, l.note].filter(Boolean).join(" · ")
const orderBody = (type: string, table: string | null, lines: LineInput[]) => ({
  type, tableNumber: table, items: lines.map((l) => ({ productId: l.productId, quantity: l.qty, note: lineNote(l) || null })),
})

async function transactionOf(orderId: string): Promise<Raw | undefined> {
  return recs(itemsOf(await http.get<Raw[]>("/payments/transactions", { query: { orderId, limit: 5 } })))[0]
}

async function ticketOf(orderId: string): Promise<string> {
  const ticket = recs(itemsOf(await http.get<Raw[]>("/kitchen/queue"))).find((t) => str(t.orderId) === orderId)
  return ticket ? str(ticket.id) : unsupported("đơn này chưa có phiếu pha chế (đơn mang đi chỉ vào bếp sau khi trả tiền)")
}

async function floorTables(): Promise<{ areaId: string; branchId: string; t: Raw }[]> {
  const branchId = tokenStore.get()?.user.branchId ?? ""
  const raw = await http.get<Raw | Raw[]>("/tables/floor-plan", { query: { branchId } })
  const areas = Array.isArray(raw) ? raw : recs(rec(raw).areas ?? rec(raw).items)
  return recs(areas).flatMap((a) => recs(a.tables).map((t) => ({ areaId: str(a.id), branchId, t })))
}

const openTableOrders = async (code: string) =>
  (await listOrders({ paymentStatus: "Unpaid" })).filter((o) => o.tableCode === code && o.status !== "Cancelled")

export const beOrdersApi = {
  async tables(): Promise<TableRow[]> {
    const [tables, orders] = await Promise.all([floorTables(), listOrders({ paymentStatus: "Unpaid" })])
    return tables.map(({ t }) => {
      const code = str(t.tableCode)
      return { id: code, code, seats: num(t.capacity), qrToken: str(t.qrToken), billRequested: false, orders: orders.filter((o) => o.tableCode === code && o.status !== "Cancelled") }
    })
  },
  async addTable(b: { code: string; seats: number }): Promise<TableRow> {
    const first = (await floorTables())[0]
    const areas = recs(itemsOf(await http.get<Raw[]>("/tables/areas")))
    const areaId = first?.areaId || str(areas[0]?.id)
    if (!areaId) return unsupported("thêm bàn: chưa có khu vực nào (tạo khu vực trước)")
    const t = rec(await http.post<Raw>("/tables/dining-tables", { branchId: first?.branchId ?? tokenStore.get()?.user.branchId, areaId, tableCode: b.code, capacity: b.seats, positionX: 0, positionY: 0 }))
    return { id: str(t.tableCode) || b.code, code: b.code, seats: b.seats, qrToken: str(t.qrToken), billRequested: false, orders: [] }
  },
  orders: () => listOrders(),
  async transition(id: string, b: { status: OrderStatus; reason?: string }): Promise<Order> {
    const current = await detail(id)
    if (b.status === "Preparing" && current.status === "Pending") await http.put<Raw>(`/kitchen/tickets/${await ticketOf(id)}/status`, { status: "Brewing" })
    else if (b.status === "Ready") await http.put<Raw>(`/kitchen/tickets/${await ticketOf(id)}/status`, { status: "ReadyForPickup" })
    else if (b.status === "Served" || b.status === "PickedUp") await http.post<Raw>(`/orders/${id}/deliver`, {})
    else if (b.status === "Cancelled") {
      const reason = b.reason ?? "Hủy đơn"
      if (current.paymentStatus === "Unpaid") await http.post<Raw>(`/orders/${id}/cancel`, { reason })
      else await http.post<Raw>(`/orders/${id}/exception`, { reason, refundKind: "Cancellation", amount: null })
    } else return unsupported(`chuyển đơn sang "${b.status}"`)
    return detail(id)
  },
  async place(tableId: string, lines: LineInput[]): Promise<Order> {
    return toOrder(rec(await http.post<Raw>("/orders", orderBody("DineIn", tableId, lines))))
  },
  async completeTable(tableId: string): Promise<{ completed: number }> {
    const ready = (await listOrders({ paymentStatus: "Paid" })).filter((o) => o.tableCode === tableId && o.status === "Ready")
    await Promise.all(ready.map((o) => http.post<Raw>(`/orders/${o.id}/deliver`, {})))
    const table = (await floorTables()).find(({ t }) => str(t.tableCode) === tableId)
    if (table) await http.patch<Raw>(`/tables/dining-tables/${str(table.t.id)}/status`, { status: "Available" })
    return { completed: ready.length }
  },
  async payTable(tableId: string, b: { method: "cash"; received: number }): Promise<{ change: number }> {
    const orders = await openTableOrders(tableId)
    const total = orders.reduce((s, o) => s + o.total, 0)
    if (b.received < total) return unsupported("thu tiền: số tiền khách đưa chưa đủ")
    for (const [i, o] of orders.entries()) {
      const extra = i === orders.length - 1 ? b.received - total : 0
      await http.post<Raw>("/payments/transactions/cash", { orderId: o.id, amount: o.total, amountTendered: o.total + extra, branchId: null })
    }
    return { change: b.received - total }
  },

  // ----- guest QR / takeaway / customer: the backend keeps guest ordering in memory and has no takeaway API (reference section 10) -----
  async guest(token: string): Promise<GuestMenu> {
    const t = rec(await http.get<Raw>(`/tables/public/qr/${token}`, { anonymous: true }))
    return { ...(await publicMenu(str(t.branchId), str(t.branchName))), tableCode: str(t.tableCode) }
  },
  guestPlace: (): Promise<Order> => unsupported("khách đặt món qua QR (backend chưa có API, đang chạy trong bộ nhớ)"),
  guestOrders: (): Promise<Order[]> => unsupported("xem đơn của khách QR"),
  requestBill: (): Promise<{ ok: true }> => unsupported("khách QR gọi thanh toán"),
  takeawayMenu: (branchId: string) => publicMenu(branchId, ""),
  pickupInfo: (): Promise<PickupInfo> => unsupported("đặt món mang đi (SCRUM-80 chưa có API)"),
  pickupCheck: (): Promise<PickupCheck> => unsupported("kiểm tra khung giờ lấy hàng"),
  placeTakeaway: (): Promise<Order> => unsupported("đặt món mang đi"),
  async payOnline(id: string, outcome: PayOutcome): Promise<Order> {
    const order = await detail(id)
    const tx = rec(await http.post<Raw>("/payments/transactions", { orderId: id, amount: order.total, providerCode: "Mock", branchId: null }))
    await http.post<Raw>(`/payments/transactions/${str(tx.id)}/simulate`, { outcome: outcome === "failed" ? "failed" : "success", notify: outcome !== "lost" })
    return detail(id)
  },
  async mine(): Promise<Order[]> { return withLines(recs(itemsOf(await http.get<Raw[]>("/orders/mine")))) },
  cancelMine: (): Promise<Order> => unsupported("khách tự hủy đơn (backend chỉ cho thu ngân/quản lý hủy)"),
  payments: () => listOrders(),
  async lookup(id: string): Promise<{ providerStatus: ProviderStatus; order: Order }> {
    const tx = await transactionOf(id)
    const queried = tx ? rec(await http.post<Raw>(`/payments/transactions/${str(tx.id)}/query`, {})) : {}
    const s = str(queried.status)
    const providerStatus: ProviderStatus = s === "Succeeded" || s === "PartiallyRefunded" || s === "Refunded" ? "Success" : s === "Failed" || s === "Expired" || s === "Cancelled" ? "Failed" : "Pending"
    return { providerStatus, order: await detail(id) }
  },
  async refund(id: string, b: { amount: number; reason: string }): Promise<Order> {
    const tx = await transactionOf(id)
    if (!tx) return unsupported("hoàn tiền: đơn này chưa có giao dịch thanh toán")
    await http.post<Raw>(`/payments/transactions/${str(tx.id)}/refunds`, { kind: "Exception", amount: b.amount, reason: b.reason })
    return detail(id)
  },
}

async function publicMenu(branchId: string, branchName: string): Promise<GuestMenu> {
  const menu = rec(await http.get<Raw>(`/menu/public/branches/${branchId}/menu`, { anonymous: true }))
  const products = recs(menu.categories).flatMap((c) =>
    recs(c.products).map((p) => ({ ...toProduct({ ...p, categoryName: str(c.name) }, new Map()), soldOut: p.isAvailable === false, price: num(p.price ?? p.basePrice) })))
  return { branchName: branchName || str(menu.branchName), tableCode: "", products }
}
