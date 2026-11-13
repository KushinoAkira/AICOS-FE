import type { Page } from "../router/pages"
import { orderTitle, shortOrderCode } from "./orderLabel"

/** Where a staff notification leads, so the person can act on it right away. Also decides which menu item shows its badge. */
export function noticeTarget(kind: string, role: string | null): Page | null {
  switch (kind) {
    case "NewOrder":
    case "Remake": return "barista-queue"
    case "TableOrder":
    case "BillRequested":
    case "OnlinePaid": return "cashier-tables"
    case "OrderReady": return "cashier-serve"
    case "ReplacementOpened": return "cashier-shift"
    case "ReplacementRegistered": return "branch-shift-requests"
    case "CashClosing": return "branch-cash-closings"
    case "RefundRequested":
    case "RefundFailed": return role === "brandAdmin" ? "brand-reconciliation" : "branch-orders"
    case "RenewalDue": return "brand-subscription"
    case "Overdue": return role === "superAdmin" ? "platform-subscriptions" : "brand-subscription"
    case "BrandRegistered": return "platform-tenants"
    default: return null
  }
}

const ORDER_CODE = /ORD-\d{8}-[0-9A-Z]{4,}/g

/**
 * Notifications are written by the server with the order code ("Đơn ORD-20261112-C5C73C đã xong"). People read drinks, not codes:
 * a known code becomes "Trà sữa ×2 (#C5C73C)", an unknown one at least its short form "#C5C73C".
 */
export function nameOrderCodes(text: string, names: Map<string, string>): string {
  return text.replace(ORDER_CODE, (code) => {
    const title = names.get(code)
    return title ? `${title} (${shortOrderCode(code)})` : shortOrderCode(code)
  })
}

/** Order code to its drinks, for the orders the screen already knows. */
export function orderNameMap(orders: { code: string; lines: { name: string; size?: string; qty: number }[] }[]): Map<string, string> {
  return new Map(orders.filter((o) => o.lines.length > 0).map((o) => [o.code, orderTitle(o.lines)]))
}
