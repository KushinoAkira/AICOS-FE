import type { TableRow } from "../api/orders"

export type TableLiveStatus = "Free" | "Occupied" | "WaitingPayment"

/** Map an open table session to canvas live colors (Phase 3). */
export function liveStatusOf(t: Pick<TableRow, "orders" | "billRequested">): TableLiveStatus {
  if (!t.orders.length) return "Free"
  if (t.billRequested) return "WaitingPayment"
  return "Occupied"
}

export function liveStatusLabel(status: TableLiveStatus): string {
  switch (status) {
    case "Free":
      return "Trống"
    case "Occupied":
      return "Đang phục vụ"
    case "WaitingPayment":
      return "Chờ thanh toán"
  }
}
