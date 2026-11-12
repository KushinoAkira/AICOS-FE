import { useState } from "react"
import { Banner, Button, Field, Modal } from "../../components/ui"
import type { BranchDto } from "../../lib/api/identity"
import type { OptionChoice, Product, ProductInput, Topping } from "../../lib/api/brand"

const CATEGORIES = ["Cà phê", "Trà trái cây", "Trà sữa", "Đá xay", "Bánh ngọt"]
const digits = (s: string) => s.replace(/\D/g, "")
const list = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean)

/** Create / edit a product: options, dependent toppings and per-branch prices (UC-14). Validation mirrors the API. */
export function MenuEditor({ product, branches, saving, serverError, onSave, onClose, categories = [] }: {
  product: Product | null
  /** The categories the brand already uses, offered next to the usual ones so editing a product keeps its own. */
  categories?: string[]
  branches: BranchDto[]
  saving: boolean
  serverError: string | null
  onSave: (input: ProductInput) => void
  onClose: () => void
}) {
  const [name, setName] = useState(product?.name ?? "")
  const options = [...new Set([...(product?.category ? [product.category] : []), ...categories.filter(Boolean), ...CATEGORIES])]
  const [category, setCategory] = useState(product?.category || options[0])
  const [description, setDescription] = useState(product?.description ?? "")
  const [imageUrl, setImageUrl] = useState(product?.imageUrl ?? "")
  const [price, setPrice] = useState(String(product?.basePrice ?? ""))
  const [sizes, setSizes] = useState<{ label: string; delta: string }[]>((product?.sizes ?? [{ id: "s", label: "S", priceDelta: 0 }]).map((s) => ({ label: s.label, delta: String(s.priceDelta) })))
  const [sugar, setSugar] = useState((product?.sugarLevels ?? ["0%", "50%", "100%"]).join(", "))
  const [ice, setIce] = useState((product?.iceLevels ?? ["Ít đá", "Vừa", "Nhiều đá"]).join(", "))
  const [toppings, setToppings] = useState<{ label: string; price: string; coldOnly: boolean }[]>((product?.toppings ?? []).map((t) => ({ label: t.label, price: String(t.priceDelta), coldOnly: t.requiresChoiceId === "cold" })))
  const [branchPrices, setBranchPrices] = useState<Record<string, string>>(Object.fromEntries(Object.entries(product?.branchPrices ?? {}).map(([k, v]) => [k, String(v)])))
  const [error, setError] = useState<string | null>(null)

  function submit() {
    const base = Number(price)
    if (!name.trim()) return setError("Nhập tên món")
    if (!(base > 0)) return setError("Giá gốc phải lớn hơn 0")
    for (const [id, v] of Object.entries(branchPrices)) if (v !== "" && !(Number(v) > 0)) return setError(`Giá chi nhánh ${branches.find((b) => b.id === id)?.name ?? ""} phải lớn hơn 0`)
    if (sizes.some((s) => !s.label.trim())) return setError("Mỗi kích cỡ cần có tên")
    const sizeChoices: OptionChoice[] = sizes.map((s, i) => ({ id: `sz${i}`, label: s.label.trim(), priceDelta: Number(s.delta) || 0 }))
    const toppingList: Topping[] = toppings.filter((t) => t.label.trim()).map((t, i) => ({ id: `tp${i}`, label: t.label.trim(), priceDelta: Number(t.price) || 0, requiresChoiceId: t.coldOnly ? "cold" : undefined }))
    if (toppingList.some((t) => t.requiresChoiceId) && list(ice).every((l) => l.toLowerCase() === "nóng")) return setError("Topping chỉ cho đồ uống lạnh nhưng món này không có mức đá")
    setError(null)
    onSave({
      name: name.trim(), category, description, imageUrl: imageUrl.trim() || undefined, basePrice: base,
      branchPrices: Object.fromEntries(Object.entries(branchPrices).filter(([, v]) => v !== "").map(([k, v]) => [k, Number(v)])),
      sizes: sizeChoices, sugarLevels: list(sugar), iceLevels: list(ice), toppings: toppingList,
    })
  }

  return (
    <Modal open title={product ? "Sửa món" : "Thêm món"} onClose={onClose} footer={<><Button variant="secondary" onClick={onClose}>Hủy</Button><Button loading={saving} onClick={submit}>Lưu</Button></>}>
      <div className="space-y-4">
        {(error || serverError) && <Banner>{error ?? serverError}</Banner>}
        <Field label="Tên món" value={name} onChange={(e) => setName(e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm font-medium text-text-primary">Danh mục
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="mt-1.5 w-full rounded-[10px] border border-border bg-surface px-3 py-3 text-sm">
              {options.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <Field label="Giá gốc (₫)" inputMode="numeric" value={price} onChange={(e) => setPrice(digits(e.target.value))} />
        </div>
        <Field label="Ảnh minh họa (URL)" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
        <Field label="Mô tả" value={description} onChange={(e) => setDescription(e.target.value)} />

        <fieldset>
          <legend className="mb-2 text-sm font-medium text-text-primary">Kích cỡ</legend>
          {sizes.map((s, i) => (
            <div key={i} className="mb-2 flex gap-2">
              <input aria-label="Tên kích cỡ" value={s.label} onChange={(e) => setSizes(sizes.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} className="w-1/2 rounded-[10px] border border-border px-3 py-2 text-sm" />
              <input aria-label="Phụ thu" inputMode="numeric" value={s.delta} onChange={(e) => setSizes(sizes.map((x, j) => (j === i ? { ...x, delta: digits(e.target.value) } : x)))} placeholder="+₫" className="w-1/3 rounded-[10px] border border-border px-3 py-2 text-sm" />
              {sizes.length > 1 && <button type="button" aria-label="Xóa kích cỡ" onClick={() => setSizes(sizes.filter((_, j) => j !== i))} className="px-2 text-state-danger">✕</button>}
            </div>
          ))}
          <button type="button" onClick={() => setSizes([...sizes, { label: "", delta: "0" }])} className="text-sm text-clay hover:underline">+ Thêm kích cỡ</button>
        </fieldset>

        <Field label="Mức đường (cách nhau bằng dấu phẩy)" value={sugar} onChange={(e) => setSugar(e.target.value)} />
        <Field label="Mức đá (cách nhau bằng dấu phẩy)" value={ice} onChange={(e) => setIce(e.target.value)} />

        <fieldset>
          <legend className="mb-2 text-sm font-medium text-text-primary">Topping</legend>
          {toppings.map((t, i) => (
            <div key={i} className="mb-2 flex items-center gap-2">
              <input aria-label="Tên topping" value={t.label} onChange={(e) => setToppings(toppings.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} className="w-1/3 rounded-[10px] border border-border px-3 py-2 text-sm" />
              <input aria-label="Giá topping" inputMode="numeric" value={t.price} onChange={(e) => setToppings(toppings.map((x, j) => (j === i ? { ...x, price: digits(e.target.value) } : x)))} className="w-1/4 rounded-[10px] border border-border px-3 py-2 text-sm" />
              <label className="flex items-center gap-1 text-xs text-text-secondary"><input type="checkbox" checked={t.coldOnly} onChange={(e) => setToppings(toppings.map((x, j) => (j === i ? { ...x, coldOnly: e.target.checked } : x)))} />Chỉ đồ lạnh</label>
              <button type="button" aria-label="Xóa topping" onClick={() => setToppings(toppings.filter((_, j) => j !== i))} className="px-2 text-state-danger">✕</button>
            </div>
          ))}
          <button type="button" onClick={() => setToppings([...toppings, { label: "", price: "0", coldOnly: false }])} className="text-sm text-clay hover:underline">+ Thêm topping</button>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-sm font-medium text-text-primary">Giá theo chi nhánh (để trống = dùng giá gốc)</legend>
          {branches.map((b) => (
            <div key={b.id} className="mb-2 flex items-center justify-between gap-3">
              <span className="text-sm text-text-secondary">{b.name}</span>
              <input aria-label={`Giá tại ${b.name}`} inputMode="numeric" value={branchPrices[b.id] ?? ""} onChange={(e) => setBranchPrices({ ...branchPrices, [b.id]: digits(e.target.value) })} className="w-1/3 rounded-[10px] border border-border px-3 py-2 text-sm" />
            </div>
          ))}
        </fieldset>
      </div>
    </Modal>
  )
}
