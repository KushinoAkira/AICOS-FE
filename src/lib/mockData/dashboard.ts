/** Seeded demo data for dashboards. Replace with API calls (GET /reports/summary) when available. */
import type { OrderStatus } from "../orderStateMachine"

export interface DaySales { date: string; label: string; revenue: number; orders: number }

const BASE = [3.2, 2.8, 4.1, 3.6, 5.2, 6.8, 7.4].map((m) => m * 1_000_000)

/** Last 7 days ending today, with real weekday labels. */
export function lastSevenDays(now = new Date()): DaySales[] {
  return BASE.map((revenue, i) => {
    const d = new Date(now)
    d.setDate(now.getDate() - (6 - i))
    const label = new Intl.DateTimeFormat("vi-VN", { weekday: "short" }).format(d).replace("Thứ ", "T").replace("Chủ nhật", "CN")
    return { date: d.toISOString(), label, revenue, orders: Math.round(revenue / 52_000) }
  })
}

export const WAITING_ORDERS: { code: string; channel: "dine-in" | "takeaway"; where: string; status: OrderStatus; waitMin: number }[] = [
  { code: "#1042", channel: "dine-in", where: "Bàn 5", status: "Pending", waitMin: 4 },
  { code: "#1043", channel: "takeaway", where: "Nhận 10:30", status: "Scheduled", waitMin: 0 },
  { code: "#1041", channel: "dine-in", where: "Bàn 2", status: "Preparing", waitMin: 7 },
]

export const SOLD_OUT_ITEMS = ["Cold brew cam", "Bánh tiramisu"]

export const ISSUE_TRANSACTIONS: { code: string; reason: string }[] = [
  { code: "#1036", reason: "Hoàn tiền lỗi, cần thử lại" },
  { code: "#1039", reason: "Hoàn tiền đang chờ cổng thanh toán" },
]

export const TODAY_SHIFTS = [
  { name: "Ca sáng", time: "07:00 - 13:00", staff: 3 },
  { name: "Ca chiều", time: "13:00 - 18:00", staff: 3 },
  { name: "Ca tối", time: "18:00 - 22:00", staff: 2 },
]

export const TOP_ITEMS = [
  { name: "Cà phê sữa đá", qty: 48 },
  { name: "Cappuccino", qty: 35 },
  { name: "Đá xay matcha", qty: 28 },
  { name: "Trà đào cam sả", qty: 24 },
]
