import { useState } from "react"
import { Field } from "./ui"
import { BANKNOTES, addNote, change, describeNotes, shortfall } from "../lib/cashTender"
import { formatVND } from "../lib/format"

const short = (n: number) => (n >= 1000 ? `${n / 1000}k` : String(n))

/**
 * Cash handed over at the counter: tap each banknote the customer gives and the amounts add up, or type the amount. Shows what is
 * still missing or the change to give back. `value` is the amount as digits, as the pay buttons read it.
 */
export function CashTendered({ total, value, onChange }: { total: number; value: string; onChange: (v: string) => void }) {
  const [counts, setCounts] = useState<Record<number, number>>({})
  const received = Number(value) || 0
  const tap = (note: number) => {
    setCounts((c) => ({ ...c, [note]: (c[note] ?? 0) + 1 }))
    onChange(addNote(value, note))
  }
  const clear = () => { setCounts({}); onChange("") }
  const exact = () => { setCounts({}); onChange(String(total)) }
  const tapped = describeNotes(counts, (n) => formatVND(n).replace(" ₫", ""))
  const missing = shortfall(received, total)

  return (
    <div className="space-y-3">
      <Field
        label="Khách đưa (₫)" inputMode="numeric" value={value}
        onChange={(e) => { setCounts({}); onChange(e.target.value.replace(/\D/g, "")) }}
      />
      <div role="group" aria-label="Cộng tờ tiền khách đưa" className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {BANKNOTES.map((n) => (
          <button
            key={n} type="button" onClick={() => tap(n)} aria-label={`Thêm ${formatVND(n)}`}
            className="relative min-h-11 rounded-[10px] border border-border bg-surface px-2 text-sm font-medium tabular-nums text-text-primary transition-colors hover:border-terracotta hover:bg-bg-warm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta/40"
          >
            +{short(n)}
            {!!counts[n] && <span aria-hidden className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-terracotta px-1 text-[11px] text-white">{counts[n]}</span>}
          </button>
        ))}
        <button type="button" onClick={exact} className="min-h-11 rounded-[10px] border border-border bg-surface px-2 text-sm font-medium text-text-primary hover:bg-bg-warm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta/40">Vừa đủ</button>
      </div>
      <div className="flex min-h-6 flex-wrap items-center justify-between gap-2 text-sm" aria-live="polite">
        <span className="min-w-0 text-text-secondary">{tapped || (received ? "" : "Bấm từng tờ khách đưa hoặc nhập số tiền.")}</span>
        {received > 0 && <button type="button" onClick={clear} className="text-xs text-text-secondary underline-offset-2 hover:underline">Xóa, nhập lại</button>}
      </div>
      {received > 0 && (missing > 0
        ? <p className="flex justify-between rounded-[10px] bg-danger-bg px-4 py-2.5 text-sm text-state-danger"><span>Còn thiếu</span><b className="tabular-nums">{formatVND(missing)}</b></p>
        : <p className="flex justify-between rounded-[10px] bg-success-bg px-4 py-2.5 text-state-success"><span>Trả lại khách</span><b className="font-serif text-lg tabular-nums">{formatVND(change(received, total))}</b></p>)}
    </div>
  )
}
