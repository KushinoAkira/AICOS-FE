import { Fragment, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { OrderStatusPill, PaymentPill } from "./OrderStatusPill"
import { Button, QueryBoundary } from "./ui"
import { ordersApi } from "../lib/api/orders"
import type { Shift } from "../lib/api/staff"
import { addDays, todayKey } from "../lib/dates"
import { formatDateTime, formatTime, formatVND } from "../lib/format"
import { orderTitle, shortOrderCode } from "../lib/orderLabel"
import { filterHistory, historyCsv, historyTotals, type HistoryStatus, type HistoryType } from "../lib/workHistory"

type Preset = "shift" | "today" | "yesterday" | "custom"

const toUtc = (day: string, time: string) => new Date(`${day}T${time}:00`).toISOString()
const hhmm = (utc: string) => { const d = new Date(utc); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}` }
const dayOf = (utc: string) => { const d = new Date(utc); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` }

const TYPES: [HistoryType, string][] = [["all", "Tất cả"], ["dine-in", "Tại quán"], ["takeaway", "Mang đi"]]
const STATUSES: [HistoryStatus, string][] = [["all", "Mọi trạng thái"], ["done", "Hoàn thành"], ["working", "Đang xử lý"], ["unpaid", "Chưa thanh toán"], ["problem", "Huỷ / không làm được"], ["refund", "Có hoàn tiền"]]

/**
 * "Lịch sử đơn": every order of the branch in a chosen window (the last shift worked, today, yesterday or any day and hours), with
 * what was ordered, dine-in or takeaway, the table, the time, the money and how it ended. Filters, a search and a spreadsheet export.
 */
export function WorkHistory({ shifts }: { shifts: Shift[] }) {
  const lastShift = shifts.filter((s) => s.checkInAtUtc).sort((a, b) => (b.checkInAtUtc ?? "").localeCompare(a.checkInAtUtc ?? ""))[0]
  const [preset, setPreset] = useState<Preset>(lastShift ? "shift" : "today")
  const [day, setDay] = useState(todayKey())
  const [from, setFrom] = useState("00:00")
  const [to, setTo] = useState("23:59")
  const [type, setType] = useState<HistoryType>("all")
  const [status, setStatus] = useState<HistoryStatus>("all")
  const [search, setSearch] = useState("")
  const [open, setOpen] = useState<string | null>(null)

  const range = (() => {
    if (preset === "shift" && lastShift) return { fromUtc: lastShift.checkInAtUtc!, toUtc: lastShift.checkOutAtUtc ?? new Date().toISOString(), label: "Ca gần nhất" }
    if (preset === "yesterday") { const y = addDays(todayKey(), -1); return { fromUtc: toUtc(y, "00:00"), toUtc: toUtc(y, "23:59"), label: "Hôm qua" } }
    if (preset === "custom") return { fromUtc: toUtc(day, from || "00:00"), toUtc: toUtc(day, to || "23:59"), label: "Tùy chọn" }
    return { fromUtc: toUtc(todayKey(), "00:00"), toUtc: new Date().toISOString(), label: "Hôm nay" }
  })()
  const fromDay = dayOf(range.fromUtc)
  const toDay = dayOf(range.toUtc)
  const orders = useQuery({ queryKey: ["work-history", fromDay, toDay], queryFn: () => ordersApi.ordersInRange(fromDay, toDay), refetchInterval: 30000 })

  const chip = (active: boolean) => `min-h-9 rounded-full px-4 text-sm ${active ? "bg-espresso text-white" : "border border-border bg-surface text-text-secondary hover:border-clay"}`
  const input = "rounded-[10px] border border-border bg-surface px-3 py-2 text-sm text-text-primary"

  return (
    <section>
      <h2 className="font-serif text-lg text-text-primary">Lịch sử đơn</h2>
      <p className="mb-3 text-sm text-text-secondary">Đơn của chi nhánh trong khoảng thời gian bạn chọn: món gì, tại quán hay mang đi, bàn nào, lúc nào, bao nhiêu tiền và kết thúc ra sao.</p>

      <div className="space-y-3 rounded-[16px] border border-border bg-surface p-4">
        <div role="radiogroup" aria-label="Khoảng thời gian" className="flex flex-wrap gap-2">
          {lastShift && <button role="radio" aria-checked={preset === "shift"} onClick={() => setPreset("shift")} className={chip(preset === "shift")}>Ca gần nhất</button>}
          {([["today", "Hôm nay"], ["yesterday", "Hôm qua"], ["custom", "Chọn ngày giờ"]] as const).map(([p, l]) => (
            <button key={p} role="radio" aria-checked={preset === p} onClick={() => setPreset(p)} className={chip(preset === p)}>{l}</button>
          ))}
        </div>
        {preset === "custom" && (
          <div className="flex flex-wrap items-center gap-2 text-sm text-text-secondary">
            <label className="flex items-center gap-2">Ngày <input type="date" value={day} max={todayKey()} onChange={(e) => setDay(e.target.value || todayKey())} className={input} /></label>
            <label className="flex items-center gap-2">từ <input type="time" value={from} onChange={(e) => setFrom(e.target.value)} className={input} /></label>
            <label className="flex items-center gap-2">đến <input type="time" value={to} onChange={(e) => setTo(e.target.value)} className={input} /></label>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <select aria-label="Loại đơn" value={type} onChange={(e) => setType(e.target.value as HistoryType)} className={input}>{TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          <select aria-label="Trạng thái" value={status} onChange={(e) => setStatus(e.target.value as HistoryStatus)} className={input}>{STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          <input aria-label="Tìm đơn" placeholder="Tìm mã đơn, bàn, món…" value={search} onChange={(e) => setSearch(e.target.value)} className={`${input} min-w-[200px] flex-1`} />
        </div>
        <p className="text-xs text-text-secondary">{range.label}: {formatDateTime(range.fromUtc)} → {formatDateTime(range.toUtc)}</p>
      </div>

      <div className="mt-4">
        <QueryBoundary query={orders}>
          {(all) => {
            const rows = filterHistory(all, { fromUtc: range.fromUtc, toUtc: range.toUtc, type, status, search })
            const t = historyTotals(rows)
            const download = () => {
              const blob = new Blob([historyCsv(rows, (u) => `${formatDateTime(u)}`)], { type: "text/csv;charset=utf-8" })
              const a = document.createElement("a")
              a.href = URL.createObjectURL(blob)
              a.download = `lich-su-don-${fromDay}.csv`
              a.click()
              URL.revokeObjectURL(a.href)
            }
            return (
              <div className="space-y-4">
                <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                  {([["Số đơn", String(t.orders)], ["Hoàn thành", String(t.done)], ["Đang xử lý", String(t.working)], ["Huỷ / không làm được", String(t.problem)], ["Có hoàn tiền", String(t.refunded)], ["Đã thu (trừ hoàn)", formatVND(t.collected)]] as const).map(([k, v]) => (
                    <div key={k} className="rounded-[12px] bg-sand p-3"><dt className="text-xs text-text-secondary">{k}</dt><dd className="mt-1 font-serif text-xl text-text-primary">{v}</dd></div>
                  ))}
                </dl>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-text-secondary">Tại quán {t.dineIn} · Mang đi {t.takeaway}</p>
                  <Button variant="secondary" disabled={rows.length === 0} disabledReason="Không có đơn để tải" onClick={download}>Tải file Excel (CSV)</Button>
                </div>
                {rows.length === 0 ? <p className="rounded-[16px] border border-dashed border-border p-8 text-center text-sm text-text-secondary">Không có đơn nào trong khoảng này.</p> : (
                  <div className="overflow-x-auto rounded-[16px] border border-border bg-surface">
                    <table className="w-full min-w-[820px] text-sm">
                      <thead className="bg-bg-warm text-left text-xs text-text-secondary">
                        <tr><th className="px-3 py-2 font-medium">Giờ</th><th className="px-3 py-2 font-medium">Đơn</th><th className="px-3 py-2 font-medium">Loại</th><th className="px-3 py-2 font-medium">Bàn</th><th className="px-3 py-2 font-medium">Thanh toán</th><th className="px-3 py-2 text-right font-medium">Tổng</th><th className="px-3 py-2 font-medium">Trạng thái</th></tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {rows.map((o) => (
                          <Fragment key={o.id}>
                            <tr onClick={() => setOpen(open === o.id ? null : o.id)} className="cursor-pointer hover:bg-bg-warm" aria-expanded={open === o.id}>
                              <td className="px-3 py-2 text-text-secondary">{preset === "custom" || fromDay !== toDay ? formatDateTime(o.createdAtUtc) : formatTime(o.createdAtUtc)}</td>
                              <td className="px-3 py-2"><span className="text-text-primary">{orderTitle(o.lines)}</span> <span className="text-xs text-text-secondary">{shortOrderCode(o.code)}</span></td>
                              <td className="px-3 py-2">{o.channel === "dine-in" ? "Tại quán" : "Mang đi"}</td>
                              <td className="px-3 py-2">{o.tableCode || "—"}</td>
                              <td className="px-3 py-2"><span className="flex flex-wrap items-center gap-1"><PaymentPill status={o.paymentStatus} />{o.paymentMethod && <span className="text-xs text-text-secondary">{o.paymentMethod === "cash" ? "Tiền mặt" : "Online"}</span>}</span></td>
                              <td className="px-3 py-2 text-right text-text-primary">{formatVND(o.total)}</td>
                              <td className="px-3 py-2"><OrderStatusPill status={o.status} /></td>
                            </tr>
                            {open === o.id && (
                              <tr className="bg-bg-warm/60">
                                <td colSpan={7} className="px-3 py-3 text-sm text-text-secondary">
                                  <ul className="space-y-0.5">{o.lines.map((l, i) => <li key={i}>{l.qty}× {l.name}{l.size ? ` (${l.size})` : ""}{l.note ? ` · ghi chú: ${l.note}` : ""} · {formatVND(l.qty * l.unitPrice)}</li>)}</ul>
                                  <p className="mt-1">Mã đầy đủ {o.code}{o.pickupSlot ? ` · nhận lúc ${hhmm(o.pickupSlot)}` : ""}{o.promotionCode ? ` · mã giảm ${o.promotionCode} (−${formatVND(o.discountAmount ?? 0)})` : ""}{o.refundedAmount > 0 ? ` · đã hoàn ${formatVND(o.refundedAmount)}` : ""}{o.reason ? ` · lý do: ${o.reason}` : ""}</p>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          }}
        </QueryBoundary>
      </div>
    </section>
  )
}
