import { useRef, useState } from "react"
import { BANKNOTES, change, describeNotes, shortfall, suggestedAmounts, sumNotes } from "../lib/cashTender"
import { formatVND } from "../lib/format"

const digits = (n: number) => formatVND(n).replace(" ₫", "")
const label = (n: number) => (n >= 1000 ? `${n / 1000}k` : String(n))

/** A soft tint per note family so the pad reads like the notes in the cashier's hand (large notes warmer). */
const TINT: Record<number, string> = {
  500_000: "bg-[#E8F0F4] border-[#B9CFDA]", 200_000: "bg-[#F6E7E1] border-[#E2C1B3]", 100_000: "bg-[#EAEDE0] border-[#C9D1B1]",
  50_000: "bg-[#F4E6EE] border-[#DDBFD0]", 20_000: "bg-[#E6ECF5] border-[#BFCCE0]", 10_000: "bg-[#F5EDDC] border-[#E3D1A8]",
  5_000: "bg-surface border-border", 2_000: "bg-surface border-border", 1_000: "bg-surface border-border",
}

/**
 * Cash handed over at the counter. The cashier taps each note the customer gives (or a usual amount, or types it), and sees at once
 * what is still missing or the change to give back. `value` is the amount as digits, the way the pay button reads it.
 */
export function CashTendered({ total, value, onChange }: { total: number; value: string; onChange: (v: string) => void }) {
  const [notes, setNotes] = useState<number[]>([])
  const input = useRef<HTMLInputElement>(null)
  const received = Number(value) || 0
  const missing = shortfall(received, total)
  const set = (list: number[], amount: number) => { setNotes(list); onChange(amount ? String(amount) : "") }
  const tap = (n: number) => { const next = notes.length || !received ? [...notes, n] : [n]; set(next, notes.length || !received ? received + n : n) }
  const undo = () => { const next = notes.slice(0, -1); set(next, sumNotes(next)) }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 overflow-hidden rounded-[16px] border border-border">
        <div className="bg-bg-warm px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">Cần thu</p>
          <p className="mt-1 font-serif text-2xl leading-tight tabular-nums text-text-primary">{formatVND(total)}</p>
        </div>
        <div className="cursor-text border-l border-border px-4 py-3" onClick={() => input.current?.focus()}>
          <label htmlFor="cash-received" className="block text-xs font-medium uppercase tracking-wide text-text-secondary">Khách đưa</label>
          <div className="mt-1 flex items-baseline gap-1.5">
          <input
            ref={input} id="cash-received" inputMode="numeric" autoComplete="off" placeholder="0"
            value={received ? digits(received) : ""}
            onChange={(e) => { setNotes([]); onChange(e.target.value.replace(/\D/g, "")) }}
            className="field-sizing-content min-w-[1ch] max-w-full bg-transparent font-serif text-2xl leading-tight tabular-nums text-text-primary outline-none placeholder:text-border focus:text-terracotta"
          />
          <span aria-hidden className="font-serif text-2xl leading-tight text-text-secondary">₫</span>
          </div>
        </div>
      </div>

      <div aria-live="polite" className={`flex items-center justify-between gap-3 rounded-[14px] px-4 py-3 ${received === 0 ? "bg-bg-warm text-text-secondary" : missing > 0 ? "bg-danger-bg text-state-danger" : "bg-success-bg text-state-success"}`}>
        {received === 0
          ? <span className="text-sm">Bấm tờ tiền khách đưa, hoặc chọn nhanh số tiền bên dưới.</span>
          : missing > 0
            ? <><span className="text-sm font-medium">Còn thiếu</span><b className="font-serif text-xl tabular-nums">{formatVND(missing)}</b></>
            : <><span className="text-sm font-medium">{change(received, total) ? "Trả lại khách" : "Khách đưa vừa đủ"}</span><b className="font-serif text-2xl tabular-nums">{formatVND(change(received, total))}</b></>}
      </div>

      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-text-secondary">Chọn nhanh</p>
        <div className="flex flex-wrap gap-2">
          {suggestedAmounts(total).map((a, i) => (
            <button
              key={a} type="button" onClick={() => set([], a)} aria-pressed={received === a && !notes.length}
              className="min-h-10 rounded-full border border-border bg-surface px-4 text-sm font-medium tabular-nums text-text-primary transition-colors hover:border-terracotta aria-pressed:border-terracotta aria-pressed:bg-sand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta/40"
            >
              {i === 0 ? `Vừa đủ ${digits(a)}` : digits(a)}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">Đếm từng tờ</p>
          {received > 0 && (
            <div className="flex gap-3 text-xs">
              {notes.length > 0 && <button type="button" onClick={undo} className="text-text-secondary underline-offset-2 hover:text-text-primary hover:underline">Bỏ tờ vừa bấm</button>}
              <button type="button" onClick={() => set([], 0)} className="text-text-secondary underline-offset-2 hover:text-text-primary hover:underline">Xóa hết</button>
            </div>
          )}
        </div>
        <div role="group" aria-label="Cộng tờ tiền khách đưa" className="grid grid-cols-3 gap-2">
          {BANKNOTES.map((n) => {
            const count = notes.filter((x) => x === n).length
            return (
              <button
                key={n} type="button" onClick={() => tap(n)} aria-label={`Thêm tờ ${formatVND(n)}`}
                className={`relative flex min-h-12 items-center justify-center rounded-[12px] border text-base font-semibold tabular-nums text-text-primary transition-[transform,box-shadow] hover:shadow-sm active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta/40 ${TINT[n]}`}
              >
                {label(n)}
                {count > 0 && <span aria-hidden className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-terracotta px-1 text-[11px] font-semibold text-white">×{count}</span>}
              </button>
            )
          })}
        </div>
        {notes.length > 0 && <p className="mt-2 text-sm text-text-secondary">{describeNotes(notes, digits)}</p>}
      </div>
    </div>
  )
}
