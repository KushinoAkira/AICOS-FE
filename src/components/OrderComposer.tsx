import { useMemo, useState } from "react"
import { Button, EmptyState, StatusPill } from "./ui"
import { CartPanel, type CartLine, type CartTab, type ExtraTabs } from "./CartPanel"
import { emptyVoucher, liveQuote, type VoucherOptions, type VoucherState } from "./VoucherBox"
import type { Product } from "../lib/api/brand"
import type { LineInput, Recommendations, RecommendedItem } from "../lib/api/orders"
import { formatVND } from "../lib/format"

/** Photo with a lettered fallback so a broken URL never leaves a hole in the grid. */
/** A drink without a photo, or whose photo fails to load, shows a cup drawing. `name` stays for the callers that pass it. */
export function ProductImage({ src, className = "h-16 w-16" }: { src?: string; name: string; className?: string }) {
  const [failed, setFailed] = useState(false)
  if (!src || failed) {
    return (
      <span aria-hidden className={`${className} flex shrink-0 items-center justify-center rounded-[12px] bg-sand text-clay`}>
        <svg viewBox="0 0 48 48" className="h-3/5 w-3/5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 6c0 2-2 3-2 5s2 3 2 5M25 4c0 2-2 3-2 5s2 3 2 5M32 6c0 2-2 3-2 5s2 3 2 5" />
          <path d="M9 21h28v8a12 12 0 0 1-12 12h-4A12 12 0 0 1 9 29z" fill="currentColor" fillOpacity="0.15" />
          <path d="M37 24h2.5a5 5 0 0 1 0 10H36" />
        </svg>
      </span>
    )
  }
  return <img src={src} alt="" loading="lazy" onError={() => setFailed(true)} className={`${className} shrink-0 rounded-[12px] object-cover`} />
}

export type MenuItem = Product & { soldOut: boolean; price: number }

/** Shared by the guest QR menu, takeaway and the cashier POS. Prices shown here are estimates; the server recomputes (BR). */
export function OrderComposer({ products, submitLabel, submitting, error, onSubmit, tabs, clearSignal = 0, recommendations, voucher, initialCart }: {
  products: MenuItem[]
  submitLabel: string
  submitting: boolean
  error: string | null
  /** `promotionCode`: the voucher the guest applied, "" when none. The server checks it again and takes the discount. */
  onSubmit: (lines: LineInput[], promotionCode: string) => void
  tabs?: ExtraTabs
  /** Increment after a successful submit: empties the cart and jumps to the "Đã gọi" tab. */
  clearSignal?: number
  /** What the shop sells most and what this customer has ordered; shown above the full menu. */
  recommendations?: Recommendations
  /** Shows the "Mã giảm giá" field in the cart (POS, table QR, takeaway). */
  voucher?: VoucherOptions
  /** What the cart starts with (a cart chosen on the public brand page before signing in). Read once, when the composer mounts. */
  initialCart?: CartLine[]
}) {
  const [cart, setCart] = useState<CartLine[]>(() => initialCart ?? [])
  const [tab, setTab] = useState<CartTab>("cart")
  const [drawer, setDrawer] = useState(false)
  const [picking, setPicking] = useState<MenuItem | null>(null)
  const [size, setSize] = useState("")
  const [sugar, setSugar] = useState("")
  const [ice, setIce] = useState("")
  const [qty, setQty] = useState(1)
  const [note, setNote] = useState("")
  const [category, setCategory] = useState("Tất cả")
  const [seenSignal, setSeenSignal] = useState(clearSignal)
  const [voucherState, setVoucherState] = useState<VoucherState>(emptyVoucher)
  if (seenSignal !== clearSignal) { setSeenSignal(clearSignal); setCart([]); setVoucherState(emptyVoucher); if (tabs) setTab("ordered") }

  const categories = useMemo(() => ["Tất cả", ...Array.from(new Set(products.map((p) => p.category)))], [products])
  const shown = products.filter((p) => category === "Tất cả" || p.category === category)
  const onMenu = (rows: RecommendedItem[] = []) => rows.flatMap((r) => {
    const product = products.find((p) => p.id === r.productId && !p.soldOut)
    return product ? [{ product, quantity: r.quantity }] : []
  })
  const forYou = onMenu(recommendations?.forYou).slice(0, 4)
  const bestSellers = onMenu(recommendations?.bestSellers).filter((s) => !forYou.some((f) => f.product.id === s.product.id)).slice(0, 4)
  const strip = (title: string, rows: typeof forYou, hint: (quantity: number) => string) => rows.length > 0 && (
    <section aria-label={title} className="mb-5">
      <h2 className="mb-2 font-serif text-lg text-text-primary">{title}</h2>
      <ul className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
        {rows.map(({ product, quantity }) => (
          <li key={product.id} className="w-40 shrink-0">
            <button onClick={() => pick(product)} className="flex h-full w-full flex-col gap-2 rounded-[16px] border border-border bg-surface p-3 text-left">
              <ProductImage src={product.imageUrl} name={product.name} className="h-16 w-16" />
              <span className="font-medium leading-snug text-text-primary">{product.name}</span>
              <span className="text-xs text-text-secondary">{hint(quantity)}</span>
              <span className="mt-auto text-sm text-text-primary">{formatVND(product.price)}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
  const total = cart.reduce((s, l) => s + l.unit * l.qty, 0)
  const count = cart.reduce((n, l) => n + l.qty, 0)

  function pick(p: MenuItem) {
    setPicking(p)
    setSize(p.sizes[0]?.label ?? "")
    setSugar(p.sugarLevels[Math.floor(p.sugarLevels.length / 2)] ?? "")
    setIce(p.iceLevels[Math.min(2, p.iceLevels.length - 1)] ?? "")
    setQty(1)
    setNote("")
  }
  function add() {
    if (!picking) return
    const delta = picking.sizes.find((s) => s.label === size)?.priceDelta ?? 0
    setCart([...cart, { productId: picking.id, name: picking.name, size, sugar, ice, qty, note, unit: picking.price + delta }])
    setPicking(null)
    setTab("cart")
  }
  /** Re-adds earlier lines at today's prices; returns how many could not be added (gone or sold out). */
  function reorder(lines: LineInput[]): number {
    let skipped = 0
    const next = [...cart]
    for (const l of lines) {
      const p = products.find((x) => x.id === l.productId)
      if (!p || p.soldOut) { skipped++; continue }
      const delta = p.sizes.find((s) => s.label === l.size)?.priceDelta ?? 0
      next.push({ productId: p.id, name: p.name, size: l.size, sugar: l.sugar, ice: l.ice, qty: l.qty, note: l.note, unit: p.price + delta })
    }
    setCart(next)
    return skipped
  }
  const submit = () => onSubmit(cart.map(({ name: _n, unit: _u, ...l }) => l), voucher ? voucherState.applied : "")
  const voucherProps = voucher ? { options: voucher, state: voucherState, setState: setVoucherState } : undefined
  const toPay = voucher ? liveQuote(voucherState, total)?.amountToPay ?? total : total
  const panel = <CartPanel cart={cart} setCart={setCart} total={total} submitLabel={submitLabel} submitting={submitting} error={error} onSubmit={submit} tabs={tabs} tab={tab} setTab={setTab} reorder={reorder} voucher={voucherProps} />
  const chips = (values: string[], current: string, set: (v: string) => void, label: string) => (
    <fieldset className="mt-4">
      <legend className="mb-2 text-sm font-medium text-text-primary">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {values.map((v) => (
          <button key={v} type="button" aria-pressed={v === current} onClick={() => set(v)} className={`min-h-11 rounded-full border px-4 py-2 text-sm ${v === current ? "border-espresso bg-espresso text-white" : "border-border text-text-secondary"}`}>{v}</button>
        ))}
      </div>
    </fieldset>
  )

  return (
    <div className="grid gap-6 pb-20 lg:grid-cols-[1fr_360px] lg:pb-0">
      <div>
        <div className="sticky top-0 z-20 -mx-4 mb-3 flex gap-2 overflow-x-auto bg-bg-base px-4 py-2 sm:-mx-8 sm:px-8 lg:static lg:mx-0 lg:mb-4 lg:px-0 lg:py-0 lg:pb-1" role="tablist" aria-label="Danh mục">
          {categories.map((c) => (
            <button key={c} role="tab" aria-selected={c === category} onClick={() => setCategory(c)} className={`min-h-11 whitespace-nowrap rounded-full px-5 py-2 text-sm ${c === category ? "bg-espresso text-white" : "bg-sand text-text-secondary"}`}>{c}</button>
          ))}
        </div>
        {category === "Tất cả" && <>
          {strip("Gợi ý cho bạn", forYou, (q) => `Bạn đã gọi ${q} lần`)}
          {strip("Món bán chạy", bestSellers, (q) => `Đã bán ${q} ly`)}
        </>}
        {shown.length === 0 ? <EmptyState title="Chưa có món nào" /> : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {shown.map((p) => (
              <li key={p.id}>
                <button disabled={p.soldOut} onClick={() => pick(p)} className="flex w-full items-center gap-3 rounded-[16px] border border-border bg-surface p-3 text-left hover:border-clay active:border-clay disabled:opacity-50">
                  <ProductImage src={p.imageUrl} name={p.name} className="h-20 w-20" />
                  <span className="min-w-0 flex-1"><span className="block font-medium leading-snug text-text-primary">{p.name}</span>{p.description && <span className="line-clamp-1 text-xs text-text-secondary">{p.description}</span>}<span className="mt-1 block text-sm font-medium text-clay">{formatVND(p.price)}</span></span>
                  {p.soldOut ? <StatusPill tone="danger">Hết</StatusPill> : <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-espresso text-xl text-white" aria-hidden>+</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <aside aria-label="Giỏ hàng" className="hidden h-fit max-h-[calc(100vh-3rem)] rounded-[16px] border border-border bg-surface p-5 lg:sticky lg:top-6 lg:block">{panel}</aside>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
        <Button className="min-h-12 w-full" onClick={() => setDrawer(true)}>{tabs ? "Đơn của bạn" : "Giỏ hàng"}{count > 0 ? ` · ${count} món · ${formatVND(toPay)}` : ""}</Button>
      </div>
      {drawer && (
        <div className="fixed inset-0 z-50 flex items-end bg-[rgba(58,46,34,0.45)] lg:hidden" onMouseDown={() => setDrawer(false)}>
          <div role="dialog" aria-modal="true" aria-label="Đơn của bạn" onMouseDown={(e) => e.stopPropagation()} className="mx-auto flex h-[88vh] w-full max-w-lg flex-col rounded-t-[24px] bg-surface p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <div aria-hidden className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" />
            <div className="mb-3 flex items-center justify-between"><h2 className="font-serif text-xl text-text-primary">Đơn của bạn</h2><button aria-label="Đóng" onClick={() => setDrawer(false)} className="text-2xl text-text-secondary">×</button></div>
            <div className="min-h-0 flex-1">{panel}</div>
          </div>
        </div>
      )}

      {picking && (
        <div className="fixed inset-0 z-50 flex items-end bg-[rgba(58,46,34,0.45)] sm:items-center" onMouseDown={() => setPicking(null)}>
          <div role="dialog" aria-modal="true" aria-label={picking.name} onMouseDown={(e) => e.stopPropagation()} className="mx-auto flex max-h-[92vh] w-full max-w-lg flex-col rounded-t-[24px] bg-surface sm:rounded-[24px]">
            <div className="flex items-start gap-3 p-5 pb-2">
              <ProductImage src={picking.imageUrl} name={picking.name} className="h-20 w-20" />
              <div className="min-w-0 flex-1"><h2 className="font-serif text-xl leading-tight text-text-primary">{picking.name}</h2><p className="mt-1 text-sm text-text-secondary">{picking.description || "Pha chế tại quán."}</p></div>
              <button aria-label="Đóng" onClick={() => setPicking(null)} className="flex h-10 w-10 items-center justify-center text-2xl text-text-secondary">×</button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">
              {chips(picking.sizes.map((s) => s.label), size, setSize, "Kích cỡ")}
              {chips(picking.sugarLevels, sugar, setSugar, "Đường")}
              {chips(picking.iceLevels, ice, setIce, "Đá")}
              <label className="mt-4 block text-sm font-medium text-text-primary">Ghi chú
                <input value={note} maxLength={120} onChange={(e) => setNote(e.target.value)} className="mt-1.5 min-h-11 w-full rounded-[10px] border border-border px-3 py-2 text-base" />
              </label>
            </div>
            <div className="flex items-center gap-3 border-t border-border p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <div className="flex items-center gap-1 rounded-full border border-border">
                <button aria-label="Giảm" onClick={() => setQty(Math.max(1, qty - 1))} className="h-11 w-11 text-xl text-text-primary">−</button>
                <span aria-live="polite" className="w-6 text-center font-medium">{qty}</span>
                <button aria-label="Tăng" onClick={() => setQty(Math.min(20, qty + 1))} className="h-11 w-11 text-xl text-text-primary">+</button>
              </div>
              <Button className="min-h-12 flex-1" onClick={add}>Thêm · {formatVND((picking.price + (picking.sizes.find((s) => s.label === size)?.priceDelta ?? 0)) * qty)}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}