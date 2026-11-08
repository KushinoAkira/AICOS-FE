import { OrderStatusPill } from "./OrderStatusPill"
import type { OrderStatus } from "../lib/orderStateMachine"
import { PROGRESS_STEPS, progressStep } from "../lib/orderProgress"

/** The order's way from the bar to the table as four steps; other states (cancelled, waiting for payment…) keep their label. */
export function OrderProgress({ status }: { status: OrderStatus }) {
  const at = progressStep(status)
  if (at === null) return <OrderStatusPill status={status} />
  return (
    <ol aria-label="Tiến độ" className="grid grid-cols-4 gap-1.5 text-center text-[11px] leading-tight sm:text-xs">
      {PROGRESS_STEPS.map((s, i) => (
        <li key={s} aria-current={i === at ? "step" : undefined}>
          <span aria-hidden className={`mb-1 block h-1.5 rounded-full ${i <= at ? (i === at && at < 3 ? "bg-terracotta" : "bg-espresso") : "bg-border"}`} />
          <span className={i === at ? "font-medium text-text-primary" : i < at ? "text-text-secondary" : "text-text-secondary/70"}>{s}</span>
        </li>
      ))}
    </ol>
  )
}
