import { hoursLabel, isOpenAt, type BranchChoice } from "../lib/takeawayBranch"

/**
 * Where the customer picks the order up. One branch: just says which. Several: a dropdown, so a chain with many branches does not push
 * the drinks off the screen; the chosen branch shows its address, hours and whether it is open now.
 */
export function BranchPicker({ branches, value, onChange }: { branches: BranchChoice[]; value: string; onChange: (id: string) => void }) {
  const now = new Date()
  const current = branches.find((b) => b.id === value)
  if (branches.length === 1 && current) {
    return <p className="mb-5 text-sm text-text-secondary">Nhận tại <b className="text-text-primary">{current.name}</b>{current.address ? ` · ${current.address}` : ""}</p>
  }
  const open = current ? isOpenAt(current, now) : null
  const hours = current ? hoursLabel(current) : null
  const details = current ? [current.address, hours && `Giờ mở cửa ${hours}`].filter(Boolean).join(" · ") : ""
  return (
    <div className="mb-6 max-w-md">
      <label htmlFor="branch-picker" className="mb-1 block text-sm font-medium text-text-primary">Chi nhánh nhận hàng</label>
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
      <p className="mt-1 text-xs text-text-secondary">Thực đơn, giá và khung giờ theo từng chi nhánh. Đổi chi nhánh sẽ làm trống giỏ hàng.</p>
    </div>
  )
}
