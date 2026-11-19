import { Banner } from "./ui"
import { OrderProgress } from "./OrderProgress"
import type { Order } from "../lib/api/orders"
import { formatTime, formatVND } from "../lib/format"
import { orderTitle, shortOrderCode } from "../lib/orderLabel"

/** One order of the table as a small ticket: code and time, where it is (bar → table), the drinks and the amount. */
export function GuestOrderCard({ order: o, compact = false }: { order: Order; compact?: boolean }) {
  const off = o.status === "Cancelled" || o.status === "Unfulfillable"
  return (
    <article className={`rounded-[16px] border border-border bg-surface ${compact ? "p-3" : "p-4 sm:p-5"} ${off ? "opacity-75" : ""}`}>
      <header className="flex items-baseline justify-between gap-3">
        <h3 className={`min-w-0 font-serif text-text-primary ${compact ? "text-lg" : "text-xl"}`}>{orderTitle(o.lines)}</h3>
        <span className="shrink-0 text-xs text-text-secondary tabular-nums">{shortOrderCode(o.code)} · {formatTime(o.createdAtUtc)}</span>
      </header>
      <div className="mt-3"><OrderProgress status={o.status} /></div>
      <ul className="mt-3 space-y-1 border-t border-dashed border-border pt-3 text-sm">
        {o.lines.map((l, i) => (
          <li key={i} className="flex justify-between gap-3">
            <span className="min-w-0 text-text-primary">{l.qty} × {l.name}{l.size ? <span className="text-text-secondary"> ({l.size})</span> : null}</span>
            {l.unitPrice > 0 && <span className="shrink-0 tabular-nums text-text-secondary">{formatVND(l.unitPrice * l.qty)}</span>}
          </li>
        ))}
      </ul>
      <p className="mt-2 flex justify-between border-t border-dashed border-border pt-2 text-sm font-medium text-text-primary">
        <span>{o.paymentStatus === "Paid" ? "Đã thanh toán" : "Cần trả"}</span><span className="tabular-nums">{formatVND(o.total)}</span>
      </p>
      {o.status === "Unfulfillable" && <div className="mt-3"><Banner>Quán không làm được đơn này{o.reason ? `: ${o.reason}` : ""}. Bạn không bị tính tiền.</Banner></div>}
    </article>
  )
}
