const pad = (n: number) => String(n).padStart(2, "0")
const HOURS = Array.from({ length: 24 }, (_, i) => pad(i))
const MINUTES = Array.from({ length: 60 }, (_, i) => pad(i))
const cls = "w-full rounded-[10px] border border-border bg-surface px-3 py-3 text-sm text-text-primary outline-none focus:border-terracotta"

/**
 * A 24-hour time (00:00 to 23:59) chosen with two lists, hour and minute, instead of the browser's time box, which shows AM/PM on
 * many Windows setups. `value` and `onChange` use "HH:mm".
 */
export function TimeSelect24({ value, onChange, label, compact = false }: { value: string; onChange: (v: string) => void; label?: string; compact?: boolean }) {
  const [h = "", m = ""] = (value || "").split(":")
  const box = compact ? cls.replace("w-full ", "").replace("py-3", "py-2") : cls
  return (
    <div className="flex items-center gap-1.5" role="group" aria-label={label ?? "Giờ (24 giờ)"}>
      <select aria-label={`${label ?? "Giờ"}: giờ`} value={h} onChange={(e) => onChange(`${e.target.value}:${m || "00"}`)} className={box}>
        <option value="" disabled>Giờ</option>
        {HOURS.map((x) => <option key={x} value={x}>{x}</option>)}
      </select>
      <span aria-hidden className="text-text-secondary">:</span>
      <select aria-label={`${label ?? "Giờ"}: phút`} value={m} onChange={(e) => onChange(`${h || "00"}:${e.target.value}`)} className={box}>
        <option value="" disabled>Phút</option>
        {MINUTES.map((x) => <option key={x} value={x}>{x}</option>)}
      </select>
    </div>
  )
}

/** A labelled 24-hour time field, laid out like the other form fields. */
export function TimeField24({ label, value, onChange, hint, error }: { label: string; value: string; onChange: (v: string) => void; hint?: string; error?: string }) {
  return (
    <div>
      <span className="mb-1.5 block text-sm font-medium text-text-primary">{label}</span>
      <TimeSelect24 label={label} value={value} onChange={onChange} />
      {hint && !error && <p className="mt-1 text-xs text-text-secondary">{hint}</p>}
      {error && <p className="mt-1 text-xs text-state-danger">{error}</p>}
    </div>
  )
}

/** Date and 24-hour time together; `value` and `onChange` use the "YYYY-MM-DDTHH:mm" form of a datetime-local box. */
export function DateTimeField24({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [date = "", time = ""] = (value || "").split("T")
  return (
    <div>
      <span className="mb-1.5 block text-sm font-medium text-text-primary">{label}</span>
      <div className="flex flex-wrap items-center gap-2">
        <input type="date" aria-label={`${label}: ngày`} value={date} onChange={(e) => onChange(`${e.target.value}T${time || "00:00"}`)} className={cls.replace("w-full ", "")} />
        <TimeSelect24 label={label} value={time} onChange={(t) => onChange(`${date}T${t}`)} />
      </div>
    </div>
  )
}
