import type { Order } from "./api/orders"

/** Device-local memory of what an anonymous guest ordered before (signed-in customers use the server instead). */
export interface PastOrder { code: string; atUtc: string; tableCode: string; total: number; lines: Order["lines"] }
const KEY = "aicos.guest.history"
const MAX = 20

export function readGuestHistory(): PastOrder[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "[]") as PastOrder[] } catch { return [] }
}
export function rememberGuestOrder(o: Order) {
  const next = [{ code: o.code, atUtc: o.createdAtUtc, tableCode: o.tableCode, total: o.total, lines: o.lines }, ...readGuestHistory().filter((h) => h.code !== o.code)].slice(0, MAX)
  try { localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* storage full or blocked: history is a convenience only */ }
}
export function clearGuestHistory() { localStorage.removeItem(KEY) }