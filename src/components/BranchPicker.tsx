import { hoursLabel, isOpenAt, type BranchChoice } from "../lib/takeawayBranch"

/**
 * Where the customer picks the order up.
 * Default: one branch just names it; several use a dropdown so a long chain does not push drinks off-screen.
 * Kiosk can pass `alwaysCards` (+ optional label/hint) to keep a card grid even for a single branch.
 */
export function BranchPicker({
  branches,
  value,
  onChange,
  label = "Chi nhánh nhận hàng",
  hint = "Thực đơn, giá và khung giờ theo từng chi nhánh. Đổi chi nhánh sẽ làm trống giỏ hàng.",
  alwaysCards = false,
}: {
  branches: BranchChoice[]
  value: string
  onChange: (id: string) => void
  label?: string
  hint?: string
  alwaysCards?: boolean
}) {
  const now = new Date()
  const current = branches.find((b) => b.id === value)

  if (!alwaysCards && branches.length === 1 && current) {
    return <p className="mb-5 text-sm text-text-secondary">Nhận tại <b className="text-text-primary">{current.name}</b>{current.address ? ` · ${current.address}` : ""}</p>
  }

  if (alwaysCards) {
    return (
      <fieldset className="mb-6">
        <legend className="mb-1 text-sm font-medium text-text-primary">{label}</legend>
        {hint && <p className="mb-2 text-xs text-text-secondary">{hint}</p>}
        <div role="radiogroup" aria-label={label} className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {branches.map((b) => {
            const selected = b.id === value
            const open = isOpenAt(b, now)
            const hours = hoursLabel(b)
            return (
              <button key={b.id} type="button" role="radio" aria-checked={selected} onClick={() => onChange(b.id)}
                className={`rounded-[14px] border p-3 text-left ${selected ? "border-espresso bg-sand/60 ring-1 ring-espresso" : "border-border bg-surface hover:border-espresso/40"}`}>
                <span className="flex items-center justify-between gap-2">
                  <span className="font-medium text-text-primary">{b.name}</span>
                  {open !== null && <span className={`shrink-0 text-xs ${open ? "text-state-success" : "text-text-secondary"}`}>{open ? "Đang mở" : "Đã đóng"}</span>}
                </span>
                {b.address && <span className="mt-0.5 block text-xs text-text-secondary">{b.address}</span>}
                {hours && <span className="mt-0.5 block text-xs text-text-secondary">Giờ mở cửa {hours}</span>}
              </button>
            )
          })}
        </div>
      </fieldset>
    )
  }

  const open = current ? isOpenAt(current, now) : null
  const hours = current ? hoursLabel(current) : null
  const details = current ? [current.address, hours && `Giờ mở cửa ${hours}`].filter(Boolean).join(" · ") : ""
  return (
    <div className="mb-6 max-w-md">
      <label htmlFor="branch-picker" className="mb-1 block text-sm font-medium text-text-primary">{label}</label>
      <select id="branch-picker" value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-[10px] border border-border bg-surface px-3 py-3 text-sm text-text-primary">
        {branches.map((b) => <option key={b.id} value={b.id}>{b.name}{isOpenAt(b, now) === false ? " (đã đóng cửa)" : ""}</option>)}
      </select>
      {current && (
        <p className="mt-1.5 text-xs text-text-secondary">
          {open !== null && <span className={open ? "text-state-success" : ""}>{open ? "Đang mở" : "Đã đóng cửa"}</span>}
          {open !== null && details && " · "}{details}
        </p>
      )}
      {hint && <p className="mt-1 text-xs text-text-secondary">{hint}</p>}
    </div>
  )
}
