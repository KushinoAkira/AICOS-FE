/** The only place that decides which order transitions are legal. UI calls these, never guesses. */
export type OrderStatus =
  | "PendingPayment"
  | "Scheduled"
  | "Pending"
  | "Preparing"
  | "Ready"
  | "Served"
  | "PickedUp"
  | "Cancelled"
  | "NoShow"
  | "Unfulfillable"

export type PaymentStatus = "Unpaid" | "Paid" | "Failed" | "RefundPending" | "Refunded" | "RefundFailed"

export type TableState = "Empty" | "InService" | "AwaitingPayment"

export type Channel = "dine-in" | "takeaway"

const NEXT: Record<OrderStatus, OrderStatus[]> = {
  PendingPayment: ["Scheduled", "Cancelled"],
  Scheduled: ["Pending", "Cancelled"],
  Pending: ["Preparing", "Cancelled", "Unfulfillable"],
  Preparing: ["Ready", "Unfulfillable"],
  Ready: ["Served", "PickedUp", "NoShow", "Preparing"], // Preparing = "Pha lại"
  Served: [],
  PickedUp: [],
  Cancelled: [],
  NoShow: [],
  Unfulfillable: [],
}

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PendingPayment: "Chờ thanh toán",
  Scheduled: "Đã hẹn giờ",
  Pending: "Chờ pha chế",
  Preparing: "Đang pha",
  Ready: "Sẵn sàng",
  Served: "Đã phục vụ",
  PickedUp: "Đã nhận",
  Cancelled: "Đã hủy",
  NoShow: "Không đến nhận",
  Unfulfillable: "Không thực hiện được",
}

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  Unpaid: "Chưa thanh toán",
  Paid: "Đã thanh toán",
  Failed: "Thanh toán lỗi",
  RefundPending: "Đang hoàn tiền",
  Refunded: "Đã hoàn tiền",
  RefundFailed: "Hoàn tiền lỗi",
}

export const nextStatuses = (from: OrderStatus): OrderStatus[] => NEXT[from]

export function canTransition(from: OrderStatus, to: OrderStatus, channel?: Channel): boolean {
  if (!NEXT[from].includes(to)) return false
  if (from === "Ready" && channel === "dine-in" && to === "PickedUp") return false
  if (from === "Ready" && channel === "takeaway" && to === "Served") return false
  return true
}

/** Why a button is disabled, shown as tooltip. */
export function transitionBlockedReason(from: OrderStatus, to: OrderStatus, channel?: Channel): string | null {
  if (canTransition(from, to, channel)) return null
  if (NEXT[from].length === 0) return `Đơn đã ở trạng thái cuối (${ORDER_STATUS_LABEL[from]})`
  return `Không thể chuyển từ "${ORDER_STATUS_LABEL[from]}" sang "${ORDER_STATUS_LABEL[to]}"`
}

/** Only refund after a real payment; amount <= paid - alreadyRefunded (BR-29). */
export function maxRefundable(paid: number, alreadyRefunded: number): number {
  return Math.max(0, paid - alreadyRefunded)
}

/** An order is shown as refunded only when the provider confirmed it (BR-28). */
export const isRefunded = (p: PaymentStatus) => p === "Refunded"

export function tableStateOf(session: { open: boolean; billRequested: boolean } | null): TableState {
  if (!session || !session.open) return "Empty"
  return session.billRequested ? "AwaitingPayment" : "InService"
}
