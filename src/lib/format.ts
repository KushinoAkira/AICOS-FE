import { env } from "../config/env"

const vnd = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 })

/** 45000 -> "45.000 ₫". Amounts are whole dong (BR-63: rounded, never negative). */
export function formatVND(amount: number): string {
  return `${vnd.format(Math.max(0, Math.round(amount)))} ₫`
}

/** Compact for charts: 7400000 -> "7,4 tr", 45000 -> "45k". */
export function formatVNDShort(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} tr`
  return `${Math.round(amount / 1000)}k`
}

const dateFmt = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("vi-VN", { timeZone: env.timeZone, ...opts })

/** Times are stored in UTC and shown in the branch timezone (NFR-34). */
export const formatDate = (iso: string | Date) => dateFmt({ day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(iso))
export const formatTime = (iso: string | Date) => dateFmt({ hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso))
export const formatDateTime = (iso: string | Date) => `${formatDate(iso)} ${formatTime(iso)}`
export const formatLongDate = (iso: string | Date) =>
  dateFmt({ weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(iso))

export function greetingFor(date = new Date()): string {
  const hour = Number(dateFmt({ hour: "2-digit", hour12: false }).format(date))
  if (hour < 11) return "Chào buổi sáng"
  if (hour < 14) return "Chào buổi trưa"
  if (hour < 18) return "Chào buổi chiều"
  return "Chào buổi tối"
}
