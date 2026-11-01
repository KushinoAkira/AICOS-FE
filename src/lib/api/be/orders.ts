import type { OrderStatus, PaymentStatus } from "../../orderStateMachine"
import { currentBrandSlug } from "../../brand"
import { ApiError, http } from "../http"
import type { CupLabel, GuestMenu, LineInput, Order, PayOutcome, PickupCheck, PickupInfo, ProviderStatus, TableRow } from "../orders"
import { tokenStore } from "../tokenStore"
import { toProduct } from "./brand"
import { itemsOf, num, rec, recs, str, unsupported, type Raw } from "./util"

/**
 * Real backend ordering (reference sections 3, 5, 6, 7). Differences from the screens' model:
 * - A table's id is its code (`T1`); an order carries `tableNumber` only.
 * - Statuses: backend `Pending > Confirmed > Preparing > Ready > Completed` is mapped onto the app's status set.
 * - Guest QR orders send the chosen option ids, so the server prices size / topping surcharges. Counter (POS) orders still carry
 *   size / sugar / ice in the line `note` and are priced at the menu price.
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
    case "NoShow": return "NoShow"
    case "Unfulfillable": return "Unfulfillable"
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
  async cupLabels(id: string): Promise<CupLabel[]> {
    const r = rec(await http.get<Raw>(`/kitchen/tickets/${await ticketOf(id)}/stickers`))
    return recs(r.stickers).map((s) => ({
      id: str(s.stickerId), code: str(s.orderCode), table: str(s.tableNumber), product: str(s.productName),
      cup: `${num(s.cupIndex)}/${num(s.totalCupsInOrder)}`, details: str(s.customizations),
    }))
  },
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

  // ----- guest QR (/orders/qr/*): the table session, the shared cart, checkout and the bill -----
  async guest(token: string): Promise<GuestMenu> {
    const t = rec(await http.get<Raw>(`/tables/public/qr/${token}`, { anonymous: true }))
    const branchId = str(t.branchId)
    const tenantId = str(t.tenantId)
    return { ...(await publicMenu(branchId, str(t.branchName) || (await branchName(branchId, tenantId)))), tableCode: str(t.tableCode), tenantId }
  },
  async guestPlace(token: string, lines: LineInput[]): Promise<Order> {
    const items = lines.map((l) => ({ productId: l.productId, quantity: l.qty, note: l.note.trim() || null, optionIds: optionIdsOf(l) }))
    return withSession(token, async (headers) => {
      // The cart belongs to the whole table. Lines added by this call are taken back if one of them is refused, so nothing is left behind.
      const added: string[] = []
      try {
        let known = new Set(recs(rec(await http.get<Raw>("/orders/qr/cart", { anonymous: true, headers })).lines).map((l) => str(l.lineId)))
        for (const item of items) {
          const cart = rec(await http.post<Raw>("/orders/qr/cart/items", item, { anonymous: true, headers }))
          const now = recs(cart.lines).map((l) => str(l.lineId))
          added.push(...now.filter((id) => !known.has(id)))
          known = new Set(now)
        }
      } catch (e) {
        await Promise.allSettled(added.map((id) => http.delete<Raw>(`/orders/qr/cart/items/${id}`, { anonymous: true, headers })))
        throw e
      }
      // Sent with the member's token when there is one, so the order earns points.
      const order = rec(await http.post<Raw>("/orders/qr/checkout", { note: null }, { headers }))
      return toQrOrder(order, str(order.tableNumber))
    })
  },
  async guestOrders(token: string): Promise<Order[]> {
    const bill = rec(await withSession(token, (headers) => http.get<Raw>("/orders/qr/session/bill", { anonymous: true, headers })))
    return recs(bill.orders).map((o) => toQrOrder({ ...o, id: o.orderId }, str(bill.tableCode)))
  },
  requestBill: (): Promise<{ ok: true }> => unsupported("gọi thu ngân từ màn hình khách (hãy ra quầy để thanh toán)"),
  takeawayMenu: (branchId: string) => publicMenu(branchId, ""),
  async pickupInfo(branchId: string): Promise<PickupInfo> {
    const day = await pickupDay(branchId, new Date())
    const slots = recs(day.slots)
    const first = slots[0], last = slots[slots.length - 1]
    return {
      open: first ? hhmm(new Date(str(first.startUtc))) : "07:00", close: last ? hhmm(new Date(str(last.endUtc))) : "22:00",
      slotMinutes: num(day.slotMinutes, 15), cutoffMinutes: num(day.cutoffMinutes, 15), capacityPerSlot: num(day.capacityPerSlot, 10),
    }
  },
  async pickupCheck(branchId: string, at: string): Promise<PickupCheck> {
    const when = new Date(at)
    if (Number.isNaN(when.getTime())) return { ok: false, remaining: 0, message: "Giờ nhận không hợp lệ" }
    const day = await pickupDay(branchId, when)
    const slot = slotOf(day, when)
    if (!slot) return { ok: false, remaining: 0, message: "Quán không nhận đơn mang đi vào giờ này" }
    if (slot.available !== true) {
      return { ok: false, remaining: 0, message: slot.locked === true ? `Cần đặt trước ít nhất ${num(day.cutoffMinutes)} phút` : "Khung giờ này đã đầy, vui lòng chọn giờ khác" }
    }
    return { ok: true, remaining: num(slot.remaining), message: null }
  },
  async placeTakeaway(b: { branchId: string; slot: string; lines: LineInput[] }): Promise<Order> {
    const when = new Date(b.slot)
    const slot = slotOf(await pickupDay(b.branchId, when), when)
    if (!slot) throw new ApiError(422, "Quán không nhận đơn mang đi vào giờ này.", "pickup.slot_invalid")
    const items = b.lines.map((l) => ({ productId: l.productId, quantity: l.qty, note: l.note.trim() || null, optionIds: optionIdsOf(l) }))
    // One key per attempt: a retry after a lost answer returns the same order instead of booking the slot twice.
    const key = crypto.randomUUID()
    return toOrder(rec(await http.post<Raw>("/orders/pickup", { branchId: b.branchId, slotStartUtc: str(slot.startUtc), note: null, items }, { headers: { "Idempotency-Key": key } })))
  },
  async payOnline(id: string, outcome: PayOutcome): Promise<Order> {
    const order = await detail(id)
    const tx = rec(await http.post<Raw>("/payments/transactions", { orderId: id, amount: order.total, providerCode: "Mock", branchId: null }))
    await http.post<Raw>(`/payments/transactions/${str(tx.id)}/simulate`, { outcome: outcome === "failed" ? "failed" : "success", notify: outcome !== "lost" })
    return detail(id)
  },
  async mine(): Promise<Order[]> { return withLines(recs(itemsOf(await http.get<Raw[]>("/orders/mine")))) },
  async cancelMine(id: string): Promise<Order> {
    await http.post<Raw>(`/orders/${id}/cancel`, { reason: "Khách tự hủy đơn" })
    return detail(id)
  },
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

const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
const localDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`

/** The pickup slots of the branch on the local day of `when`. */
async function pickupDay(branchId: string, when: Date): Promise<Raw> {
  return rec(await http.get<Raw>("/orders/pickup-slots/available", { query: { branchId, date: localDay(when) } }))
}

/** The slot that contains `when`: any minute inside opening hours belongs to a slot, and the order is booked on the slot's start. */
function slotOf(day: Raw, when: Date): Raw | undefined {
  return recs(day.slots).find((s) => new Date(str(s.startUtc)).getTime() <= when.getTime() && when.getTime() < new Date(str(s.endUtc)).getTime())
}


async function publicMenu(branchId: string, name: string): Promise<GuestMenu> {
  const menu = rec(await http.get<Raw>(`/menu/public/branches/${branchId}/menu`, { anonymous: true }))
  const products = recs(menu.categories).flatMap((c) =>
    recs(c.products).map((p) => {
      indexOptions(p)
      return { ...toProduct({ ...p, categoryName: str(c.name) }, new Map()), soldOut: p.isAvailable === false, price: num(p.price ?? p.basePrice) }
    }))
  return { branchName: name || str(menu.branchName), tableCode: "", products }
}

/** The public lookup of a table has no branch name; the public branches of the table's brand have it. */
async function branchName(branchId: string, tenantId: string): Promise<string> {
  try {
    const brands = recs(itemsOf(await http.get<Raw[]>("/identity/public/brands", { anonymous: true })))
    const code = str(brands.find((b) => str(b.id) === tenantId)?.code) || currentBrandSlug()
    if (!code) return ""
    const rows = recs(itemsOf(await http.get<Raw[]>("/identity/branches/active", { anonymous: true, query: { tenantCode: code } })))
    return str(rows.find((b) => str(b.id) === branchId)?.name)
  } catch { return "" }
}

// ---------- guest QR helpers ----------

/** What a label on the screen means for the backend. Filled when a menu is opened: `productId|kind|label` -> option id, and option id -> kind + label. */
const optionIdByLabel = new Map<string, string>()
const optionById = new Map<string, { kind: string; label: string }>()

function indexOptions(product: Raw) {
  for (const group of recs(product.optionGroups)) {
    const kind = str(group.kind).toLowerCase()
    for (const option of recs(group.options)) {
      optionIdByLabel.set(`${str(product.id)}|${kind}|${str(option.name)}`, str(option.id))
      optionById.set(str(option.id), { kind, label: str(option.name) })
    }
  }
}

/** The option ids of a cart line. A label the menu no longer offers is refused instead of being dropped silently. */
function optionIdsOf(l: LineInput): string[] {
  const chosen: [string, string][] = [["size", l.size], ["sugar", l.sugar], ["ice", l.ice]]
  return chosen.filter(([, label]) => label).map(([kind, label]) => {
    const id = optionIdByLabel.get(`${l.productId}|${kind}|${label}`)
    if (!id) throw new ApiError(422, `Lựa chọn "${label}" không còn trong thực đơn. Hãy tải lại trang rồi chọn lại.`, "option_unknown")
    return id
  })
}

const sessionKey = (token: string) => `aicos.qr.session.${token}`

/** Scanning the table code gives the token that identifies the table's sitting; every guest call sends it in `X-Table-Session`. */
async function scanTable(token: string): Promise<string> {
  const scanned = rec(await http.post<Raw>("/orders/qr/scan", { qrToken: token }, { anonymous: true }))
  const session = str(scanned.sessionToken)
  try { sessionStorage.setItem(sessionKey(token), session) } catch { /* private mode: the table is scanned again on the next call */ }
  return session
}

/** Runs a guest call with the table session; a session that is unknown or closed is renewed once by scanning the code again. */
async function withSession<T>(token: string, run: (headers: Record<string, string>) => Promise<T>): Promise<T> {
  const headersOf = (session: string) => ({ "X-Table-Session": session })
  let stored: string | null = null
  try { stored = sessionStorage.getItem(sessionKey(token)) } catch { /* see scanTable */ }
  try {
    return await run(headersOf(stored ?? (await scanTable(token))))
  } catch (e) {
    if (e instanceof ApiError && (e.code === "qr.session_invalid" || e.code === "qr.session_closed")) return run(headersOf(await scanTable(token)))
    throw e
  }
}

/** An order as the table sees it. The bill lists orders without `type` and `tableNumber`, so they are filled in here. */
function toQrOrder(o: Raw, tableCode: string): Order {
  const order = toOrder({ ...o, type: o.type ?? "DineIn", tableNumber: o.tableNumber ?? tableCode })
  const lines = recs(o.items).map((i, n) => {
    const options = recs(i.options)
    const known = options.every((x) => optionById.has(str(x.optionId)))
    const label = (kind: string) => options.map((x) => optionById.get(str(x.optionId))).find((x) => x?.kind === kind)?.label ?? ""
    return {
      ...order.lines[n]!,
      // Options of a menu this tab has not opened (the page was reloaded) are listed by name so the line still tells what was ordered.
      size: known ? label("size") : options.map((x) => str(x.name)).join(", "),
      sugar: known ? label("sugar") : "",
      ice: known ? label("ice") : "",
    }
  })
  return { ...order, lines, source: "qr" }
}

/** The table-session token of a scanned table, scanning the code first if there is none yet (the real-time channel needs it). */
export async function guestSessionToken(token: string, renew = false): Promise<string> {
  let stored: string | null = null
  try { stored = renew ? null : sessionStorage.getItem(sessionKey(token)) } catch { /* see scanTable */ }
  return stored ?? scanTable(token)
}
