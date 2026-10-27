import { HINTS, scorePassword } from "../lib/password"

const BAR: Record<string, string> = {
  empty: "bg-border",
  weak: "bg-state-danger",
  fair: "bg-state-warning",
  good: "bg-olive",
  strong: "bg-state-success",
}

const FILLED: Record<string, number> = { empty: 0, weak: 1, fair: 2, good: 3, strong: 4 }

export function PasswordMeter({ password }: { password: string }) {
  const { level, label } = scorePassword(password)
  const filled = FILLED[level] ?? 0
  return (
    <div className="mt-2" aria-live="polite">
      <div className="flex gap-1" role="meter" aria-valuemin={0} aria-valuemax={4} aria-valuenow={filled} aria-label={label || "Độ mạnh mật khẩu"}>
        {[1, 2, 3, 4].map((i) => (
          <span key={i} className={`h-1.5 flex-1 rounded-full ${i <= filled ? BAR[level] : "bg-border"}`} />
        ))}
      </div>
      {label && <p className="mt-1.5 text-xs text-text-secondary">Độ mạnh: <span className="font-medium text-text-primary">{label}</span></p>}
    </div>
  )
}

export function PasswordHints({ password }: { password: string }) {
  return (
    <ul className="mt-2 space-y-1">
      {HINTS.map((h) => {
        const ok = h.test(password)
        return (
          <li key={h.id} className={`text-xs ${ok ? "text-state-success" : "text-text-secondary"}`}>
            {ok ? "✓" : "○"} {h.label}
            {h.optional && !ok ? " — khuyến nghị" : ""}
          </li>
        )
      })}
    </ul>
  )
}

export function PasswordInput({
  value,
  onChange,
  show,
  onToggle,
  autoComplete = "new-password",
  placeholder = "••••••••",
}: {
  value: string
  onChange: (v: string) => void
  show: boolean
  onToggle: () => void
  autoComplete?: string
  placeholder?: string
}) {
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required
        autoComplete={autoComplete}
        className="w-full rounded-[10px] border border-border bg-surface px-4 py-3 pr-11 font-sans text-sm text-text-primary outline-none focus:border-terracotta"
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-primary opacity-45 hover:opacity-100"
        aria-label={show ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
      >
        {show ? <EyeOff /> : <EyeOn />}
      </button>
    </div>
  )
}

function EyeOn() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12c2-4 5-6 10-6s8 2 10 6c-2 4-5 6-10 6S4 16 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function EyeOff() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-5 0-8-2-10-6a18 18 0 015.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0112 4c5 0 8 2 10 6a18 18 0 01-1.72 2.28" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}
