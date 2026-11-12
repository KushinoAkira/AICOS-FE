import type { Order } from "./api/orders"
import { orderTitle, shortOrderCode } from "./orderLabel"

export type HistoryType = "all" | "dine-in" | "takeaway"
export type HistoryStatus = "all" | "done" | "working" | "unpaid" | "problem" | "refund"

export interface HistoryFilter {
  fromUtc: string
  toUtc: string
  type: HistoryType
  status: HistoryStatus
  /** Matches the order code, the table or a drink name. */
  search: string
}

const DONE = new Set(["Served", "PickedUp"])
const WORKING = new Set(["PendingPayment", "Scheduled", "Pending", "Preparing", "Ready"])
const PROBLEM = new Set(["Cancelled", "NoShow", "Unfulfillable"])

export const isDone = (o: Order) => DONE.has(o.status)
export const isWorking = (o: Order) => WORKING.has(o.status)
export const isProblem = (o: Order) => PROBLEM.has(o.status)
export const hasRefund = (o: Order) => o.refundedAmount > 0 || o.paymentStatus === "RefundPending" || o.paymentStatus === "Refunded" || o.paymentStatus === "RefundFailed"

/** The orders of the chosen window that match the filters, newest first. */
export function filterHistory(orders: Order[], f: HistoryFilter): Order[] {
  const from = Date.parse(f.fromUtc)
  const to = Date.parse(f.toUtc)
  const q = f.search.trim().toLowerCase()
  return orders
    .filter((o) => { const at = Date.parse(o.createdAtUtc); return at >= from && at <= to })
    .filter((o) => f.type === "all" || o.channel === f.type)
    .filter((o) => f.status === "all"
      || (f.status === "done" && isDone(o))
      || (f.status === "working" && isWorking(o))
      || (f.status === "unpaid" && o.paymentStatus === "Unpaid" && !isProblem(o))
      || (f.status === "problem" && isProblem(o))
      || (f.status === "refund" && hasRefund(o)))
    .filter((o) => !q || o.code.toLowerCase().includes(q) || o.tableCode.toLowerCase().includes(q) || o.lines.some((l) => l.name.toLowerCase().includes(q)))
    .sort((a, b) => b.createdAtUtc.localeCompare(a.createdAtUtc))
}

export interface HistoryTotals {
  orders: number
  done: number
  working: number
  problem: number
  refunded: number
  /** Money actually kept: paid orders minus what was refunded. */
  collected: number
  dineIn: number
  takeaway: number
}

export function historyTotals(rows: Order[]): HistoryTotals {
  return {
    orders: rows.length,
    done: rows.filter(isDone).length,
    working: rows.filter(isWorking).length,
    problem: rows.filter(isProblem).length,
    refunded: rows.filter(hasRefund).length,
    collected: rows.reduce((s, o) => s + Math.max(0, o.paidAmount - o.refundedAmount), 0),
    dineIn: rows.filter((o) => o.channel === "dine-in").length,
    takeaway: rows.filter((o) => o.channel === "takeaway").length,
  }
}

const STATUS_VI: Record<string, string> = {
  PendingPayment: "Chờ thanh toán", Scheduled: "Đã hẹn giờ", Pending: "Chờ pha chế", Preparing: "Đang pha", Ready: "Đã xong, chờ giao",
  Served: "Đã phục vụ", PickedUp: "Khách đã nhận", Cancelled: "Đã huỷ", NoShow: "Khách không đến", Unfulfillable: "Không làm được",
}
const PAY_VI: Record<string, string> = { Unpaid: "Chưa trả", Paid: "Đã trả", Failed: "Lỗi thanh toán", RefundPending: "Chờ hoàn tiền", Refunded: "Đã hoàn tiền", RefundFailed: "Hoàn tiền lỗi" }

const cell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`

/** A spreadsheet of the rows (opens in Excel; the BOM keeps Vietnamese letters). */
export function historyCsv(rows: Order[], timeOf: (utc: string) => string): string {
  const head = ["Thời gian", "Mã đơn", "Món", "Loại", "Bàn", "Thanh toán", "Phương thức", "Tổng tiền", "Đã hoàn", "Trạng thái"]
  const body = rows.map((o) => [
    timeOf(o.createdAtUtc), shortOrderCode(o.code), orderTitle(o.lines), o.channel === "dine-in" ? "Tại quán" : "Mang đi", o.tableCode || "",
    PAY_VI[o.paymentStatus] ?? o.paymentStatus, o.paymentMethod === "cash" ? "Tiền mặt" : o.paymentMethod === "online" ? "Online" : "", o.total, o.refundedAmount, STATUS_VI[o.status] ?? o.status,
  ])
  return "﻿" + [head, ...body].map((r) => r.map(cell).join(",")).join("\r\n")
}
