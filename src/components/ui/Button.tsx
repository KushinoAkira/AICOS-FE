import type { ButtonHTMLAttributes } from "react"

type Variant = "primary" | "secondary" | "ghost" | "danger"

const STYLES: Record<Variant, string> = {
  primary: "bg-terracotta text-bg-base hover:bg-clay",
  secondary: "bg-surface text-espresso border border-border hover:bg-bg-warm",
  ghost: "bg-transparent text-clay hover:bg-bg-warm",
  danger: "bg-state-danger text-bg-base hover:opacity-90",
}

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  loading?: boolean
  /** Shown as tooltip when disabled, so users know why. */
  disabledReason?: string
}

export function Button({ variant = "primary", loading, disabled, disabledReason, className = "", children, ...rest }: Props) {
  const off = disabled || loading
  return (
    <button
      {...rest}
      disabled={off}
      title={off && disabledReason ? disabledReason : rest.title}
      className={`inline-flex items-center justify-center gap-2 rounded-[10px] px-4 py-2.5 text-sm font-medium transition-[background-color,box-shadow,transform] duration-200 enabled:hover:-translate-y-px enabled:hover:shadow-md motion-reduce:transform-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta disabled:cursor-not-allowed disabled:opacity-50 ${STYLES[variant]} ${className}`}
    >
      {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />}
      {children}
    </button>
  )
}
