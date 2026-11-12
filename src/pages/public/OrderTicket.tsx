import { useEffect, useState } from "react"
import { formatVND } from "../../lib/format"

const LINES = [
  { qty: 2, name: "Cà phê sữa đá", opts: "Size L, ít đá", price: 64000 },
  { qty: 1, name: "Trà đào cam sả", opts: "Size M, đường 50%", price: 42000 },
]
const STEPS = ["Đã nhận", "Đang pha", "Sẵn sàng"]

/**
 * The hero picture: one order ticket as the bar sees it. Once, shortly after the page opens, it moves from
 * "Đã nhận" to "Đang pha" (left at "Đang pha" when the viewer prefers less motion). Illustration only, no data.
 */
export function OrderTicket() {
  const [step, setStep] = useState(() => (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? 1 : 0))
  useEffect(() => {
    if (step !== 0) return
    const t = window.setTimeout(() => setStep(1), 1400)
    return () => window.clearTimeout(t)
  }, [step])
  const subtotal = LINES.reduce((s, l) => s + l.price, 0)
  const discount = Math.round(subtotal / 10)

  return (
    <figure aria-label="Ví dụ một phiếu đơn ở quầy pha chế" className="relative mx-auto w-full max-w-sm lg:rotate-[-2deg]">
      <div className="rounded-t-[18px] bg-surface px-6 pb-5 pt-6 text-text-primary shadow-[0_30px_60px_-25px_rgb(30_18_10/0.6)]">
        <div className="flex items-baseline justify-between gap-4">
          <p className="font-serif text-4xl leading-none">A-1024</p>
          <p className="text-right text-sm text-text-secondary">Bàn 5<br />Chi nhánh Quận 1</p>
        </div>

        <ul className="mt-5 space-y-3 border-t border-dashed border-border pt-4 text-sm">
          {LINES.map((l) => (
            <li key={l.name} className="flex justify-between gap-3">
              <span>
                <span className="font-medium">{l.qty} × {l.name}</span>
                <span className="block text-xs text-text-secondary">{l.opts}</span>
              </span>
              <span className="tabular-nums">{formatVND(l.price)}</span>
            </li>
          ))}
        </ul>

        <dl className="mt-4 space-y-1 border-t border-dashed border-border pt-3 text-sm tabular-nums">
          <div className="flex justify-between text-state-success"><dt>Voucher SAVE10</dt><dd>−{formatVND(discount)}</dd></div>
          <div className="flex justify-between font-medium"><dt>Tổng</dt><dd>{formatVND(subtotal - discount)}</dd></div>
        </dl>

        <ol aria-label="Trạng thái" className="mt-5 grid grid-cols-3 gap-2 text-center text-xs">
          {STEPS.map((s, i) => (
            <li key={s} aria-current={i === step ? "step" : undefined}
              className={`rounded-full px-2 py-1.5 transition-colors duration-500 ${i < step ? "bg-sand text-text-secondary line-through decoration-1" : i === step ? "bg-espresso text-white" : "border border-border text-text-secondary"}`}>
              {s}
            </li>
          ))}
        </ol>
      </div>
      {/* Torn bottom edge of the paper ticket. */}
      <div aria-hidden className="h-3 bg-[radial-gradient(circle_at_8px_100%,transparent_6px,var(--color-surface)_6.5px)] bg-[length:16px_12px] bg-repeat-x" />
    </figure>
  )
}
