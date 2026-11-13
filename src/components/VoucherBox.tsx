import { useState } from "react"
import type { VoucherQuote } from "../lib/api/orders"
import { formatVND } from "../lib/format"
import { normalizePromotionCode, promotionCodeProblem, PROMOTION_CODE_MAX, voucherCheckMessage } from "../lib/promotionCode"

/** A voucher of the signed-in customer, offered as a one-tap choice. */
export interface VoucherSuggestion { code: string; label: string; minOrderAmount: number }

/** Turns the voucher field on for a menu. Every field is optional: without `preview` the discount is only known once the order is placed. */
export interface VoucherOptions {
  /** What the server says the code takes off this amount (staff at the counter, or a member on their own order). Nothing is redeemed by a preview. */
  preview?: (code: string, amount: number) => Promise<VoucherQuote>
  suggestions?: VoucherSuggestion[]
  /** Under the field when there is no preview. */
  hint?: string
}

/** What the cart remembers about the voucher. Kept by the composer so the sidebar and the mobile drawer show the same thing. */
export interface VoucherState {
  input: string
  /** The code that goes with the order ("" = none). */
  applied: string
  quote: VoucherQuote | null
  checking: boolean
  problem: string | null
}

export const emptyVoucher: VoucherState = { input: "", applied: "", quote: null, checking: false, problem: null }

/** The quote still matches the cart only while the cart total has not changed since it was asked for. */
export const liveQuote = (v: VoucherState, total: number): VoucherQuote | null => (v.quote && v.quote.orderAmount === total ? v.quote : null)

export function VoucherBox({ options, state, setState, total }: {
  options: VoucherOptions
  state: VoucherState
  setState: (next: VoucherState | ((prev: VoucherState) => VoucherState)) => void
  total: number
}) {
  const [open, setOpen] = useState(false)
  const quote = liveQuote(state, total)

  async function apply(raw: string) {
    const code = normalizePromotionCode(raw)
    const problem = promotionCodeProblem(code) ?? (code ? null : "Nhập mã giảm giá.")
    if (problem) return setState((s) => ({ ...s, input: code, problem }))
    if (!options.preview) return setState({ ...emptyVoucher, input: code, applied: code })
    setState((s) => ({ ...s, input: code, checking: true, problem: null }))
    try {
      const q = await options.preview(code, total)
      setState({ ...emptyVoucher, input: q.code, applied: q.code, quote: q })
    } catch (e) {
      setState({ ...emptyVoucher, input: code, problem: voucherCheckMessage(e as { message: string; code?: string; status?: number }) })
    }
  }

  if (state.applied) {
    return (
      <div className="mt-3 rounded-[10px] border border-dashed border-clay bg-sand/40 px-3 py-2 text-sm" data-testid="voucher-applied">
        <div className="flex items-center justify-between gap-2">
          <span className="text-text-primary">Mã <b>{state.applied}</b></span>
          <button type="button" onClick={() => setState(emptyVoucher)} className="text-xs text-state-danger">Bỏ mã</button>
        </div>
        {quote ? <p className="mt-1 text-text-secondary">Giảm {formatVND(quote.discount)}</p>
          : state.quote ? (
            <p className="mt-1 text-xs text-text-secondary">Giỏ hàng đã đổi. <button type="button" disabled={state.checking} onClick={() => void apply(state.applied)} className="text-clay underline">Kiểm tra lại mã</button></p>
          ) : <p className="mt-1 text-xs text-text-secondary">{options.hint ?? "Giảm giá được tính khi đặt đơn."}</p>}
      </div>
    )
  }

  const usable = (options.suggestions ?? []).filter((s) => s.code)
  if (!open && !state.problem && !state.input) {
    return (
      <div className="mt-3">
        <button type="button" onClick={() => setOpen(true)} className="text-sm text-clay underline">Có mã giảm giá?</button>
        {usable.length > 0 && <SuggestionChips list={usable} total={total} onPick={(c) => void apply(c)} />}
      </div>
    )
  }

  return (
    <div className="mt-3">
      <label htmlFor="promotion-code" className="mb-1.5 block text-sm font-medium text-text-primary">Mã giảm giá</label>
      <div className="flex gap-2">
        <input
          id="promotion-code"
          value={state.input}
          maxLength={PROMOTION_CODE_MAX + 5}
          autoCapitalize="characters"
          autoComplete="off"
          aria-invalid={!!state.problem}
          aria-describedby={state.problem ? "promotion-code-err" : undefined}
          onChange={(e) => setState({ ...state, input: e.target.value, problem: null })}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void apply(state.input) } }}
          placeholder="VD: SAVE10"
          className={`min-h-11 min-w-0 flex-1 rounded-[10px] border bg-surface px-3 text-sm uppercase text-text-primary outline-none focus:border-terracotta ${state.problem ? "border-state-danger" : "border-border"}`}
        />
        <button type="button" disabled={state.checking || total <= 0} onClick={() => void apply(state.input)} className="min-h-11 rounded-[10px] border border-espresso px-4 text-sm font-medium text-espresso disabled:opacity-50">
          {state.checking ? "Đang kiểm tra…" : "Áp dụng"}
        </button>
      </div>
      {state.problem && <p id="promotion-code-err" role="alert" className="mt-1 text-xs text-state-danger">{state.problem}</p>}
      {usable.length > 0 && <SuggestionChips list={usable} total={total} onPick={(c) => void apply(c)} />}
    </div>
  )
}

function SuggestionChips({ list, total, onPick }: { list: VoucherSuggestion[]; total: number; onPick: (code: string) => void }) {
  return (
    <div className="mt-2">
      <p className="mb-1 text-xs text-text-secondary">Voucher của bạn</p>
      <div className="flex flex-wrap gap-2">
        {list.map((s) => {
          const short = total < s.minOrderAmount
          return (
            <button key={s.code} type="button" disabled={short} title={short ? `Đơn tối thiểu ${formatVND(s.minOrderAmount)}` : undefined} onClick={() => onPick(s.code)}
              className="rounded-full border border-dashed border-clay px-3 py-1 text-xs text-text-primary disabled:opacity-50">
              {s.code} · {s.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
