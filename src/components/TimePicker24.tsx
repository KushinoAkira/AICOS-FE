const pad = (n: number) => String(n).padStart(2, "0")
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5)

/** 24-hour time picker limited to opening hours (replaces the browser's AM/PM control). */
export function TimePicker24({ value, openHour, closeHour, onChange }: { value: string; openHour: number; closeHour: number; onChange: (v: string) => void }) {
  const [h = "", m = ""] = value.split(":")
  const hours = Array.from({ length: closeHour - openHour + 1 }, (_, i) => openHour + i)
  const cls = "rounded-[10px] border border-border bg-surface px-3 py-2.5 text-sm text-text-primary focus-visible:outline-2 focus-visible:outline-terracotta"
  return (
    <div className="flex items-center gap-2" role="group" aria-label="Giờ nhận">
      <select aria-label="Giờ" value={h} onChange={(e) => onChange(`${e.target.value}:${m || "00"}`)} className={cls}>
        <option value="" disabled>Giờ</option>
        {hours.map((x) => <option key={x} value={pad(x)}>{pad(x)}</option>)}
      </select>
      <span aria-hidden className="text-text-secondary">:</span>
      <select aria-label="Phút" value={m} onChange={(e) => onChange(`${h || pad(openHour)}:${e.target.value}`)} className={cls}>
        <option value="" disabled>Phút</option>
        {MINUTES.map((x) => <option key={x} value={pad(x)}>{pad(x)}</option>)}
      </select>
    </div>
  )
}