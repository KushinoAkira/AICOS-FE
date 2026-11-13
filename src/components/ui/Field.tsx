import { useState, type InputHTMLAttributes } from "react"

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  hint?: string
}

export function Field({ label, error, hint, id, className = "", ...rest }: Props) {
  const fieldId = id ?? `f-${label.replace(/\s+/g, "-").toLowerCase()}`
  return (
    <div>
      <label htmlFor={fieldId} className="mb-1.5 block text-sm font-medium text-text-primary">{label}</label>
      <input
        id={fieldId}
        aria-invalid={!!error}
        aria-describedby={error ? `${fieldId}-err` : undefined}
        {...rest}
        className={`w-full rounded-[10px] border bg-surface px-4 py-3 text-sm text-text-primary outline-none transition-[border-color,box-shadow] focus:border-terracotta focus:ring-2 focus:ring-terracotta/20 ${error ? "border-state-danger" : "border-border"} ${className}`}
      />
      {hint && !error && <p className="mt-1 text-xs text-text-secondary">{hint}</p>}
      {error && <p id={`${fieldId}-err`} className="mt-1 text-xs text-state-danger">{error}</p>}
    </div>
  )
}

/** A password input with an eye button that shows or hides what was typed. */
export function PasswordField({ label, error, hint, id, className = "", ...rest }: Omit<Props, "type">) {
  const [shown, setShown] = useState(false)
  const fieldId = id ?? `f-${label.replace(/\s+/g, "-").toLowerCase()}`
  return (
    <div>
      <label htmlFor={fieldId} className="mb-1.5 block text-sm font-medium text-text-primary">{label}</label>
      <div className="relative">
        <input
          id={fieldId}
          type={shown ? "text" : "password"}
          aria-invalid={!!error}
          aria-describedby={error ? `${fieldId}-err` : undefined}
          {...rest}
          className={`w-full rounded-[10px] border bg-surface py-3 pl-4 pr-11 text-sm text-text-primary outline-none transition-colors focus:border-terracotta ${error ? "border-state-danger" : "border-border"} ${className}`}
        />
        <button
          type="button"
          onClick={() => setShown((s) => !s)}
          aria-label={shown ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          aria-pressed={shown}
          className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-text-secondary hover:text-text-primary"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M2 12c2-4 5-6 10-6s8 2 10 6c-2 4-5 6-10 6S4 16 2 12z" />
            <circle cx="12" cy="12" r="3" />
            {shown && <line x1="3" y1="3" x2="21" y2="21" />}
          </svg>
        </button>
      </div>
      {hint && !error && <p className="mt-1 text-xs text-text-secondary">{hint}</p>}
      {error && <p id={`${fieldId}-err`} className="mt-1 text-xs text-state-danger">{error}</p>}
    </div>
  )
}

export function Banner({ tone = "danger", children, action }: { tone?: "danger" | "warn" | "success"; children: React.ReactNode; action?: React.ReactNode }) {
  const styles = { danger: "bg-danger-bg text-state-danger", warn: "bg-pending-bg text-[#8A5A2B]", success: "bg-success-bg text-state-success" }[tone]
  return (
    <div role="alert" className={`flex items-center justify-between gap-3 rounded-[10px] px-4 py-3 text-sm ${styles}`}>
      <span>{children}</span>
      {action}
    </div>
  )
}
