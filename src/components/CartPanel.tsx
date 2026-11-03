import { useState, type ReactNode } from "react"
import { Banner, Button } from "./ui"
import type { LineInput } from "../lib/api/orders"
import { formatVND } from "../lib/format"
import { liveQuote, VoucherBox, type VoucherOptions, type VoucherState } from "./VoucherBox"

export interface CartLine extends LineInput { name: string; unit: number }
export type CartTab = "cart" | "ordered" | "history"

export interface ExtraTabs {
  ordered: ReactNode
  orderedCount: number
  /** Render prop: `reorder` puts earlier lines back into the cart. */
  history: (reorder: (lines: LineInput[]) => number) => ReactNode
}

/** Cart + (optionally) "already ordered" and "history" tabs, shared by the sidebar and the mobile drawer. */
export function CartPanel({ cart, setCart, total, submitLabel, submitting, error, onSubmit, tabs, tab, setTab, reorder, voucher }: {
  cart: CartLine[]
  setCart: (c: CartLine[]) => void
  total: number
  submitLabel: string
  submitting: boolean
  error: string | null
  onSubmit: () => void
  tabs?: ExtraTabs
  tab: CartTab
  setTab: (t: CartTab) => void
  reorder: (lines: LineInput[]) => number
  /** Present when this menu takes a voucher code. */
  voucher?: { options: VoucherOptions; state: VoucherState; setState: (next: VoucherState | ((prev: VoucherState) => VoucherState)) => void }
}) {
  const quote = voucher ? liveQuote(voucher.state, total) : null
  const [notice, setNotice] = useState<string | null>(null)
  const count = cart.reduce((n, l) => n + l.qty, 0)
  const setQty = (i: number, q: number) => setCart(q < 1 ? cart.filter((_, j) => j !== i) : cart.map((l, j) => (j === i ? { ...l, qty: Math.min(20, q) } : l)))
  const TABS: [CartTab, string][] = [["cart", `Giỏ hàng${count ? ` (${count})` : ""}`], ["ordered", `Đã gọi${tabs?.orderedCount ? ` (${tabs.orderedCount})` : ""}`], ["history", "Lịch sử"]]

  return (
    <div className="flex h-full flex-col">
      {tabs && (
        <div role="tablist" className="mb-4 flex gap-4 border-b border-border">
          {TABS.map(([k, label]) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`-mb-px border-b-2 pb-2 text-sm ${tab === k ? "border-terracotta font-medium text-text-primary" : "border-transparent text-text-secondary"}`}>{label}</button>)}
        </div>
      )}
      {tab === "ordered" && tabs ? <div className="flex-1 overflow-y-auto">{tabs.ordered}</div>
        : tab === "history" && tabs ? (
          <div className="flex-1 overflow-y-auto">
            {notice && <div className="mb-3"><Banner tone="warn">{notice}</Banner></div>}
            {tabs.history((lines) => { const skipped = reorder(lines); setNotice(skipped ? `${skipped} món không còn hoặc đã hết nên chưa thêm được.` : null); if (!skipped) setTab("cart"); return skipped })}
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto">
              {!tabs && <h2 className="font-serif text-lg text-text-primary">Đơn đang chọn</h2>}
              {cart.length === 0 ? <div className="py-10 text-center"><p className="font-medium text-text-primary">Giỏ hàng trống</p><p className="text-sm text-text-secondary">Chọn món để bắt đầu</p></div> : (
                <ul className="mt-3 divide-y divide-border">
                  {cart.map((l, i) => (
                    <li key={i} className="py-3 text-sm">
                      <div className="flex items-start justify-between gap-2">
                        <span><span className="font-medium text-text-primary">{l.name}</span><br /><span className="text-xs text-text-secondary">{[l.size, l.sugar && `đường ${l.sugar}`, l.ice, l.note].filter(Boolean).join(" · ")}</span></span>
                        <span className="font-medium text-text-primary">{formatVND(l.unit * l.qty)}</span>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <button aria-label={`Giảm ${l.name}`} onClick={() => setQty(i, l.qty - 1)} className="h-7 w-7 rounded-full border border-border">−</button>
                        <span aria-live="polite" className="w-5 text-center">{l.qty}</span>
                        <button aria-label={`Tăng ${l.name}`} onClick={() => setQty(i, l.qty + 1)} className="h-7 w-7 rounded-full border border-border">+</button>
                        <button aria-label={`Xóa ${l.name}`} onClick={() => setCart(cart.filter((_, j) => j !== i))} className="ml-auto text-xs text-state-danger">Xóa</button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="mt-4 border-t border-border pt-4">
              {quote && quote.discount > 0 && <>
                <div className="flex justify-between text-sm text-text-secondary"><span>Tạm tính</span><span>{formatVND(total)}</span></div>
                <div className="flex justify-between text-sm text-state-success"><span>Giảm ({quote.code})</span><span>−{formatVND(quote.discount)}</span></div>
              </>}
              <div className="flex justify-between font-medium text-text-primary"><span>Tổng cộng</span><span data-testid="cart-total">{formatVND(quote ? quote.amountToPay : total)}</span></div>
              {voucher && cart.length > 0 && <VoucherBox options={voucher.options} state={voucher.state} setState={voucher.setState} total={total} />}
              {error && <div className="mt-3"><Banner>{error}</Banner></div>}
              <Button className="mt-4 w-full" disabled={cart.length === 0} disabledReason="Chọn ít nhất một món" loading={submitting} onClick={onSubmit}>{submitLabel}</Button>
            </div>
          </>
        )}
    </div>
  )
}