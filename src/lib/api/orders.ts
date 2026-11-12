import { env } from "../../config/env"
import { beOrdersApi } from "./be/orders"
import { http } from "./http"
import type { Product } from "./brand"
import type { OrderStatus, PaymentStatus } from "../orderStateMachine"
import { isKioskOrder } from "../kiosk"

export interface OrderLine {
  productId: string
  name: string
  size: string
  sugar: string
  ice: string
  qty: number
  unitPrice: number
  note: string
}
export interface LineInput { productId: string; size: string; sugar: string; ice: string; qty: number; note: string }

export interface Order {
  id: string
  code: string
  tableId: string
  tableCode: string
  channel: "dine-in" | "takeaway"
  status: OrderStatus
  paymentStatus: PaymentStatus
  lines: OrderLine[]
  total: number
  createdAtUtc: string
  reason?: string
  source: "qr" | "pos" | "web"
  paidAmount: number
  refundedAmount: number
  paymentMethod?: "cash" | "online"
  pickupSlot?: string
  customerId?: string
  /** Set when the cashier completes the table: only then does a dine-in order enter the customer's history. */
  completedAtUtc?: string
  /** Before the voucher; `total` is what is left to pay. */
  originalAmount?: number
  /** The voucher the server accepted for this order, and what it took off. */
  promotionCode?: string
  discountAmount?: number
}

export interface PickupInfo { open: string; close: string; slotMinutes: number; cutoffMinutes: number; capacityPerSlot: number }
export interface PickupCheck { ok: boolean; remaining: number; message: string | null }
export type ProviderStatus = "Success" | "Failed" | "Pending"
export type PayOutcome = "success" | "failed" | "lost"

export interface TableRow {
  id: string
  code: string
  seats: number
  branchId: string
  /** 1 = ground floor, 2+ = upper floors (display); prefer floorId when present. */
  floor: number
  /** Floor entity id (floor-plan model). */
  floorId?: string
  /** Where the table stands on the floor plan. */
  areaId?: string
  areaName?: string
  positionX?: number | null
  positionY?: number | null
  qrToken: string
  isActive?: boolean
  billRequested: boolean
  /** How the guests said they want to pay, when they asked for the bill. */
  billMethod?: "Cash" | "Transfer"
  /** Unpaid orders of the open table session; empty means the table is empty (derived, never stored). */
  orders: Order[]
}

/** The server's answer for a voucher on an amount (`POST /customers/vouchers/validate`). */
export interface VoucherQuote { code: string; orderAmount: number; discount: number; amountToPay: number }

/** A way to pay online that this branch offers. */
export interface PayMethod { code: string; name: string }

/** One online payment for one order. Paid only when the provider says so (BR-26). */
export interface DigitalCharge {
  id: string
  orderId: string
  orderCode: string
  amount: number
  state: "Pending" | "Paid" | "Failed"
  checkoutUrl: string
  reference: string
}

/** One cup's label (printing may be simulated for the MVP). */
export interface CupLabel { id: string; code: string; table: string; product: string; cup: string; details: string }

/** <code>quantity</code> is how many the shop sold, or how many this customer has ordered. */
export interface RecommendedItem {
  productId: string
  quantity: number
}

export interface Recommendations {
  forYou: RecommendedItem[]
  bestSellers: RecommendedItem[]
}

export interface GuestMenu {
  /** The branch of the table, for what the menu recommends. */
  branchId?: string
  /** The brand of the table, so a signed-in customer's points go to the right shop. */
  tenantId?: string
  branchName: string
  tableCode: string
  /** Brand this table QR belongs to — FE sets active brand before other tenant APIs. */
  tenantSlug?: string
  products: (Product & { soldOut: boolean; price: number })[]
}

const B = "/api/v1/ordering"
/** Orders placed at the kiosk in demo mode (the mock server has no dine-in order without a table). */
const mockKiosk: Order[] = []

const mockOrdersApi = {
  tables: () => http.get<TableRow[]>(`${B}/tables`),
  addTable: (b: { code: string; seats: number; floor: number }) => http.post<TableRow>(`${B}/tables`, b),
  orders: () => http.get<Order[]>(`${B}/orders`),
  ordersBetween: (_from: string, _to: string) => http.get<Order[]>(`${B}/orders`),
  cupLabels: (id: string) => http.get<CupLabel[]>(`${B}/orders/${id}/cup-labels`),
  transition: (id: string, b: { status: OrderStatus; reason?: string }) => http.post<Order>(`${B}/orders/${id}/status`, b),
  place: (tableId: string, lines: LineInput[], promotionCode?: string) => http.post<Order>(`${B}/orders`, { tableId, lines, promotionCode: promotionCode || null }),
  completeTable: (tableId: string) => http.post<{ completed: number }>(`${B}/tables/${tableId}/complete`),
  payTable: (tableId: string, b: { method: "cash"; received: number }) => http.post<{ change: number }>(`${B}/tables/${tableId}/pay`, b),
  guest: (token: string) => http.get<GuestMenu>(`${B}/guest/${token}`),
  /** Only attach the bearer when the caller is a customer; staff sessions must not become customerId on QR orders. */
  guestPlace: (token: string, lines: LineInput[], promotionCodeOrAsCustomer?: string | boolean, asCustomer = false) => {
    const promotionCode = typeof promotionCodeOrAsCustomer === "string" ? promotionCodeOrAsCustomer : undefined
    const asCust = typeof promotionCodeOrAsCustomer === "boolean" ? promotionCodeOrAsCustomer : asCustomer
    return http.post<Order>(`${B}/guest/${token}/orders`, { lines, promotionCode: promotionCode || null }, { anonymous: !asCust })
  },
  guestOrders: (token: string) => http.get<Order[]>(`${B}/guest/${token}/orders`),
  takeawayMenu: (branchId: string) => http.get<GuestMenu>(`${B}/takeaway/menu?branchId=${branchId}`),
  recommendations: (branchId: string) => http.get<Recommendations>(`${B}/recommendations?branchId=${branchId}`),
  pickupInfo: (branchId: string) => http.get<PickupInfo>(`${B}/takeaway/info?branchId=${branchId}`),
  pickupCheck: (branchId: string, at: string) => http.get<PickupCheck>(`${B}/takeaway/check?branchId=${branchId}&at=${encodeURIComponent(at)}`),
  placeTakeaway: (b: { branchId: string; slot: string; lines: LineInput[]; promotionCode?: string }) => http.post<Order>(`${B}/takeaway`, { ...b, promotionCode: b.promotionCode || null }),
  /** Real mode: backend returns a provider redirect URL instead; this call simulates the provider callback. */
  payOnline: (id: string, outcome: PayOutcome) => http.post<Order>(`${B}/orders/${id}/pay-online`, { outcome }),
  mine: () => http.get<Order[]>(`${B}/mine`),
  cancelMine: (id: string) => http.post<Order>(`${B}/orders/${id}/cancel`, {}),
  payments: () => http.get<Order[]>(`${B}/payments`),
  lookup: (id: string) => http.post<{ providerStatus: ProviderStatus; order: Order }>(`${B}/orders/${id}/payment-lookup`, {}),
  refund: (id: string, b: { amount: number; reason: string }) => http.post<Order>(`${B}/orders/${id}/refund`, b),
  requestBill: (token: string, method: "Cash" | "Transfer" = "Cash") => http.post<{ ok: true }>(`${B}/guest/${token}/bill`, { method }),
  // The demo data has no payment provider: the guest asks staff instead.
  guestPayMethods: async (_token: string): Promise<PayMethod[]> => [],
  guestPayStart: async (_token: string, _provider: string): Promise<DigitalCharge[]> => [],
  guestPayCheck: async (_token: string, c: DigitalCharge): Promise<DigitalCharge> => c,
  guestPaySimulate: async (_token: string, c: DigitalCharge): Promise<DigitalCharge> => c,
  counterPayMethods: async (): Promise<PayMethod[]> => [],
  tablePayStart: async (_tableId: string, _provider: string): Promise<DigitalCharge[]> => [],
  orderPayStart: async (_order: Order, _provider: string): Promise<DigitalCharge[]> => [],
  chargeCheck: async (c: DigitalCharge): Promise<DigitalCharge> => c,
  chargeSimulate: async (c: DigitalCharge): Promise<DigitalCharge> => c,
  placeCounter: (lines: LineInput[], promotionCode?: string) => http.post<Order>(`${B}/orders`, { tableId: null, lines, promotionCode: promotionCode || null }),
  placeKiosk: async (lines: LineInput[], opts: { branchId?: string; memberId?: string; promotionCode?: string } = {}): Promise<Order> => {
    const o = await http.post<Order>(`${B}/orders`, { tableId: null, lines, promotionCode: opts.promotionCode || null })
    const placed: Order = { ...o, channel: "dine-in", tableId: "", tableCode: "", customerId: opts.memberId }
    mockKiosk.push(placed)
    return placed
  },
  kioskQueue: async (): Promise<Order[]> => mockKiosk.filter(isKioskOrder),
  /** Staff only: what a code would take off this amount, before the order is placed. */
  previewVoucher: (code: string, orderAmount: number, _branchId?: string) => http.post<VoucherQuote>(`${B}/vouchers/validate`, { code, orderAmount }),
  payOrderCash: (id: string, received: number) => http.post<{ change: number }>(`${B}/orders/${id}/pay-cash`, { received }),
}

/** Mock data in demo mode, the real gateway otherwise. */
export const ordersApi: typeof mockOrdersApi = env.useMock ? mockOrdersApi : beOrdersApi
