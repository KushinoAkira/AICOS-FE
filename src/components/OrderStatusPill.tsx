import { StatusPill, type Tone } from "./ui"
import { ORDER_STATUS_LABEL, PAYMENT_STATUS_LABEL, type OrderStatus, type PaymentStatus } from "../lib/orderStateMachine"

const TONE: Record<OrderStatus, Tone> = {
  PendingPayment: "pending", Scheduled: "neutral", Pending: "pending", Preparing: "pending", Ready: "success",
  Served: "success", PickedUp: "success", Cancelled: "danger", NoShow: "danger", Unfulfillable: "danger",
}
export const OrderStatusPill = ({ status }: { status: OrderStatus }) => <StatusPill tone={TONE[status]}>{ORDER_STATUS_LABEL[status]}</StatusPill>
export const PaymentPill = ({ status }: { status: PaymentStatus }) => <StatusPill tone={status === "Paid" || status === "Refunded" ? "success" : status === "Unpaid" ? "neutral" : "danger"}>{PAYMENT_STATUS_LABEL[status]}</StatusPill>