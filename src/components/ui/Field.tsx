import type { InputHTMLAttributes } from "react"

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
        className={`w-full rounded-[10px] border bg-surface px-4 py-3 text-sm text-text-primary outline-none transition-colors focus:border-terracotta ${error ? "border-state-danger" : "border-border"} ${className}`}
      />
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
