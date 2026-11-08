import type { OrderStatus } from "./orderStateMachine"

/** The steps a guest sees an order go through, in order. */
export const PROGRESS_STEPS = ["Đã nhận", "Đang pha", "Sẵn sàng", "Đã phục vụ"] as const

/**
 * Where an order is on those steps, or null when it left the normal path (cancelled, no-show, cannot be made) or has not
 * reached the bar yet (waiting for payment, scheduled for later); those keep their status label instead.
 */
export function progressStep(status: OrderStatus): number | null {
  switch (status) {
    case "Pending": return 0
    case "Preparing": return 1
    case "Ready": return 2
    case "Served":
    case "PickedUp": return 3
    default: return null
  }
}
