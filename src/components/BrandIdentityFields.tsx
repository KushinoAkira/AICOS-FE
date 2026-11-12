import { useRef, useState } from "react"
import { BRAND_COLORS, DEFAULT_BRAND_COLOR, LOGO_TYPES, MAX_LOGO_BYTES, isHexColor } from "../lib/brand"

/** Shrinks a picture to at most 256 px, so the logo stays small enough to be sent with every brand card. SVG stays as it is. */
function shrink(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error("read"))
    reader.onload = () => {
      const source = String(reader.result)
      if (file.type === "image/svg+xml") return resolve(source)
      const image = new Image()
      image.onerror = () => reject(new Error("decode"))
      image.onload = () => {
        const scale = Math.min(1, 256 / Math.max(image.width, image.height))
        const canvas = document.createElement("canvas")
        canvas.width = Math.round(image.width * scale)
        canvas.height = Math.round(image.height * scale)
        canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL("image/png"))
      }
      image.src = source
    }
    reader.readAsDataURL(file)
  })
}

/** Logo upload with preview. The value is a small data URL kept with the brand. */
export function LogoPicker({ value, onChange, name }: { value?: string; onChange: (v: string | undefined) => void; name: string }) {
  const input = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)

  function pick(file: File | undefined) {
    if (!file) return
    setError(null)
    if (!LOGO_TYPES.includes(file.type)) return setError("Chỉ nhận ảnh PNG, JPG, WebP hoặc SVG")
    if (file.size > MAX_LOGO_BYTES) return setError("Logo tối đa 512 KB")
    shrink(file).then((url) => (url.length > 200_000 ? setError("Logo quá lớn, hãy chọn ảnh đơn giản hơn") : onChange(url))).catch(() => setError("Không đọc được tệp ảnh"))
  }

  return (
    <div>
      <span className="mb-1.5 block text-sm font-medium text-text-primary">Logo thương hiệu <span className="font-normal text-text-secondary">(không bắt buộc)</span></span>
      <div className="flex items-center gap-4">
        {value
          ? <img src={value} alt="Logo đã chọn" className="h-16 w-16 rounded-[14px] border border-border bg-surface object-contain" />
          : <span aria-hidden className="flex h-16 w-16 items-center justify-center rounded-[14px] border border-dashed border-border bg-bg-warm font-serif text-2xl text-clay">{name.trim().charAt(0).toUpperCase() || "?"}</span>}
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => input.current?.click()} className="min-h-10 rounded-full border border-border bg-surface px-4 text-sm text-text-primary hover:bg-bg-warm">{value ? "Đổi logo" : "Tải logo lên"}</button>
          {value && <button type="button" onClick={() => { onChange(undefined); if (input.current) input.current.value = "" }} className="min-h-10 rounded-full px-3 text-sm text-state-danger hover:bg-bg-warm">Xóa</button>}
        </div>
        <input ref={input} type="file" accept={LOGO_TYPES.join(",")} className="sr-only" aria-label="Chọn tệp logo" onChange={(e) => pick(e.target.files?.[0])} />
      </div>
      <p className="mt-1 text-xs text-text-secondary">PNG, JPG, WebP hoặc SVG, tối đa 512 KB. Chưa có logo thì hiện chữ cái đầu của tên quán.</p>
      {error && <p role="alert" className="mt-1 text-xs text-state-danger">{error}</p>}
    </div>
  )
}

/** Brand colour: a few ready-made swatches plus a free colour input. */
export function ColorPicker({ value, onChange }: { value?: string; onChange: (v: string) => void }) {
  const current = value && isHexColor(value) ? value : DEFAULT_BRAND_COLOR
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-medium text-text-primary">Màu thương hiệu</legend>
      <div className="flex flex-wrap items-center gap-2">
        {BRAND_COLORS.map((c) => (
          <button key={c} type="button" aria-label={`Màu ${c}`} aria-pressed={current.toLowerCase() === c.toLowerCase()} onClick={() => onChange(c)}
            className={`h-9 w-9 rounded-full border-2 ${current.toLowerCase() === c.toLowerCase() ? "border-text-primary" : "border-transparent"}`} style={{ backgroundColor: c }} />
        ))}
        <label className="ml-1 flex items-center gap-2 text-sm text-text-secondary">
          Màu khác
          <input type="color" value={current} onChange={(e) => onChange(e.target.value)} className="h-9 w-12 cursor-pointer rounded border border-border bg-surface" />
        </label>
      </div>
    </fieldset>
  )
}

/** Small preview of how the colour and logo look on the brand's own pages. */
export function BrandPreview({ name, logo, color }: { name: string; logo?: string; color?: string }) {
  const c = color && isHexColor(color) ? color : DEFAULT_BRAND_COLOR
  return (
    <div className="rounded-[14px] border border-border bg-bg-base p-4" aria-label="Xem trước trang đăng nhập">
      <p className="mb-3 text-xs text-text-secondary">Xem trước trang đăng nhập của quán</p>
      <div className="flex items-center gap-2">
        {logo ? <img src={logo} alt="" className="h-9 w-9 rounded-[10px] object-contain" /> : <span aria-hidden className="flex h-9 w-9 items-center justify-center rounded-[10px] font-serif text-lg text-white" style={{ backgroundColor: c }}>{name.trim().charAt(0).toUpperCase() || "?"}</span>}
        <span className="font-serif text-xl text-espresso">{name.trim() || "Tên quán"}</span>
      </div>
      <span className="mt-4 inline-block rounded-[10px] px-5 py-2 text-sm font-medium text-white" style={{ backgroundColor: c }}>Đăng nhập</span>
    </div>
  )
}
