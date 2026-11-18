import { useMemo, useState } from "react"
import { Button, EmptyState, StatusPill, chipClass } from "./ui"
import { CartPanel, type CartLine, type CartTab, type ExtraTabs } from "./CartPanel"
import { emptyVoucher, liveQuote, type VoucherOptions, type VoucherState } from "./VoucherBox"
import type { Product } from "../lib/api/brand"
import type { LineInput, Recommendations, RecommendedItem } from "../lib/api/orders"
import { formatVND } from "../lib/format"

/** Drink photo, or a steaming-cup placeholder when the URL is missing/broken. `name` kept for callers. */
export function ProductImage({ src, name: _name, className = "h-16 w-16" }: { src?: string; name: string; className?: string }) {
  const [failed, setFailed] = useState(false)
  if (!src || failed) {
    return (
      <span
        aria-hidden
        className={`${className} relative flex shrink-0 items-center justify-center overflow-visible rounded-[14px] bg-gradient-to-b from-[#F8EFE3] via-sand to-[#E5D4BE] text-clay shadow-[inset_0_1px_0_rgb(255_255_255/0.55)] ring-1 ring-border/70`}
      >
        <svg viewBox="0 0 48 52" className="h-[72%] w-[72%]" fill="none" stroke="currentColor" strokeWidth="2.35" strokeLinecap="round" strokeLinejoin="round">
          <path className="cup-steam" d="M17 20 C 14 14, 19 10, 16 4" opacity="0.85" />
          <path className="cup-steam-2" d="M24 18 C 21 12, 26 8, 23 3" opacity="0.95" />
          <path className="cup-steam-3" d="M31 20 C 28 14, 33 10, 30 4" opacity="0.8" />
          <path d="M10 24h26v7.5a11.5 11.5 0 0 1-11.5 11.5h-3A11.5 11.5 0 0 1 10 31.5z" fill="currentColor" fillOpacity="0.16" />
          <path d="M10 24h26v7.5a11.5 11.5 0 0 1-11.5 11.5h-3A11.5 11.5 0 0 1 10 31.5z" />
          <path d="M36 27h2.8a5.2 5.2 0 0 1 0 10.4H35" />
          <ellipse cx="23" cy="24" rx="11" ry="2.2" fill="currentColor" fillOpacity="0.22" stroke="none" />
        </svg>
      </span>
    )
  }
  return <img src={src} alt="" loading="lazy" onError={() => setFailed(true)} className={`${className} shrink-0 rounded-[14px] object-cover`} />
}

export type MenuItem = Product & { soldOut: boolean; price: number }

/** Shared by the guest QR menu, takeaway and the cashier POS. Prices shown here are estimates; the server recomputes (BR). */
export function OrderComposer({ products, submitLabel, submitting, error, onSubmit, tabs, clearSignal = 0, recommendations, voucher, initialCart, cartExtra }: {
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
  /** Shown in the cart above the submit button. */
  cartExtra?: React.ReactNode
}) {
  const [cart, setCart] = useState<CartLine[]>(() => initialCart ?? [])
  const [tab, setTab] = useState<CartTab>("cart")
  const [drawer, setDrawer] = useState(false)
  const [picking, setPicking] = useState<MenuItem | null>(null)
  const [size, setSize] = useState("")
  const [sugar, setSugar] = useState("")
  const [ice, setIce] = useState("")
  const [tops, setTops] = useState<string[]>([])
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
    <section aria-label={title} className="mb-6">
      <h2 className="mb-3 font-serif text-xl text-text-primary">{title}</h2>
      <ul className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
        {rows.map(({ product, quantity }, i) => (
          <li key={product.id} className="w-[9.5rem] shrink-0 stagger-item" style={{ animationDelay: `${i * 45}ms` }}>
            <button
              type="button"
              onClick={() => pick(product)}
              className="hover-lift flex h-full w-full flex-col gap-2.5 rounded-[18px] border border-border/80 bg-surface p-3 text-left shadow-[0_8px_22px_-16px_rgb(60_40_25/0.45)]"
            >
              <ProductImage src={product.imageUrl} name={product.name} className="aspect-square h-auto w-full" />
              <span className="font-medium leading-snug text-text-primary">{product.name}</span>
              <span className="text-xs text-text-secondary">{hint(quantity)}</span>
              <span className="mt-auto text-sm font-medium text-clay">{formatVND(product.price)}</span>
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
    setTops([])
    setQty(1)
    setNote("")
  }
  /** One drink's price on screen: the menu price, the chosen size's add-on and every topping picked. The server recomputes it. */
  const unitOf = (p: MenuItem, sizeLabel: string, toppings: string[]) =>
    p.price + (p.sizes.find((s) => s.label === sizeLabel)?.priceDelta ?? 0) + p.toppings.filter((t) => toppings.includes(t.label)).reduce((s, t) => s + t.priceDelta, 0)
  function add() {
    if (!picking) return
    const chosen = picking.toppings.filter((t) => tops.includes(t.label)).map((t) => t.label)
    setCart([...cart, { productId: picking.id, name: picking.name, size, sugar, ice, qty, note, toppings: chosen, unit: unitOf(picking, size, chosen) }])
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
      const toppings = (l.toppings ?? []).filter((t) => p.toppings.some((x) => x.label === t))
      next.push({ productId: p.id, name: p.name, size: l.size, sugar: l.sugar, ice: l.ice, qty: l.qty, note: l.note, toppings, unit: unitOf(p, l.size, toppings) })
    }
    setCart(next)
    return skipped
  }
  const submit = () => onSubmit(cart.map(({ name: _n, unit: _u, ...l }) => l), voucher ? voucherState.applied : "")
  const voucherProps = voucher ? { options: voucher, state: voucherState, setState: setVoucherState } : undefined
  const toPay = voucher ? liveQuote(voucherState, total)?.amountToPay ?? total : total
  const panel = <CartPanel cart={cart} setCart={setCart} total={total} submitLabel={submitLabel} submitting={submitting} error={error} onSubmit={submit} tabs={tabs} tab={tab} setTab={setTab} reorder={reorder} voucher={voucherProps} cartExtra={cartExtra} />
  /** `extra`: text after a choice's name, e.g. its price. */
  const chips = (values: string[], current: string, set: (v: string) => void, label: string, extra?: (v: string) => string) => (
    <fieldset className="mt-4">
      <legend className="mb-2 text-sm font-medium text-text-primary">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {values.map((v) => (
          <button key={v} type="button" aria-pressed={v === current} onClick={() => set(v)} className={chipClass(v === current, "outline")}>{v}{extra && <span className="ml-1.5 opacity-80">{extra(v)}</span>}</button>
        ))}
      </div>
    </fieldset>
  )

  return (
    <div className="grid gap-6 pb-20 lg:grid-cols-[1fr_360px] lg:pb-0">
      <div>
        <div className="sticky top-0 z-20 -mx-4 mb-3 flex gap-2 overflow-x-auto bg-bg-base px-4 py-2 sm:-mx-8 sm:px-8 lg:static lg:mx-0 lg:mb-4 lg:px-0 lg:py-0 lg:pb-1" role="tablist" aria-label="Danh mục">
          {categories.map((c) => (
            <button key={c} type="button" role="tab" aria-selected={c === category} onClick={() => setCategory(c)} className={chipClass(c === category)}>{c}</button>
          ))}
        </div>
        {category === "Tất cả" && <>
          {strip("Gợi ý cho bạn", forYou, (q) => `Bạn đã gọi ${q} lần`)}
          {strip("Món bán chạy", bestSellers, (q) => `Đã bán ${q} ly`)}
        </>}
        {shown.length === 0 ? <EmptyState title="Chưa có món nào" /> : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {shown.map((p, i) => (
              <li key={p.id} className="stagger-item" style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
                <button
                  type="button"
                  disabled={p.soldOut}
                  onClick={() => pick(p)}
                  className="hover-lift flex w-full items-center gap-3.5 rounded-[18px] border border-border/80 bg-surface p-3.5 text-left shadow-[0_10px_24px_-18px_rgb(60_40_25/0.5)] hover:border-clay disabled:opacity-50"
                >
                  <ProductImage src={p.imageUrl} name={p.name} className="h-[4.75rem] w-[4.75rem]" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium leading-snug text-text-primary">{p.name}</span>
                    {p.description && <span className="mt-0.5 line-clamp-2 text-xs text-text-secondary">{p.description}</span>}
                    <span className="mt-1.5 block text-sm font-medium text-clay">{formatVND(p.price)}</span>
                  </span>
                  {p.soldOut ? <StatusPill tone="danger">Hết</StatusPill> : <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-espresso text-xl text-white shadow-[0_6px_14px_-6px_rgb(111_78_55/0.7)]" aria-hidden>+</span>}
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
              {chips(picking.sizes.map((s) => s.label), size, setSize, "Kích cỡ", picking.sizes.length > 1 ? (v) => formatVND(picking.price + (picking.sizes.find((s) => s.label === v)?.priceDelta ?? 0)) : undefined)}
              {picking.toppings.length > 0 && (
                <fieldset className="mt-4">
                  <legend className="mb-2 text-sm font-medium text-text-primary">Topping <span className="font-normal text-text-secondary">(chọn thêm, không bắt buộc)</span></legend>
                  <div className="flex flex-wrap gap-2">
                    {picking.toppings.map((t) => {
                      const on = tops.includes(t.label)
                      return (
                        <button key={t.id} type="button" aria-pressed={on} onClick={() => setTops(on ? tops.filter((x) => x !== t.label) : [...tops, t.label])} className={chipClass(on, "outline")}>
                          {on ? "✓ " : ""}{t.label}<span className="ml-1.5 opacity-80">{t.priceDelta > 0 ? `+${formatVND(t.priceDelta)}` : "miễn phí"}</span>
                        </button>
                      )
                    })}
                  </div>
                </fieldset>
              )}
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
              <Button className="min-h-12 flex-1" onClick={add}>Thêm · {formatVND(unitOf(picking, size, tops) * qty)}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
