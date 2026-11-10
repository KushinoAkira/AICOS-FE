import type { HTMLAttributes, ReactNode } from "react"

export function Card({ className = "", ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div {...rest} className={`rounded-[16px] border border-border bg-surface p-6 ${className}`} />
}

export function KpiCard({ label, value, hint, tone = "neutral" }: { label: string; value: ReactNode; hint?: ReactNode; tone?: "neutral" | "warn" | "danger" }) {
  const hintColor = tone === "danger" ? "text-state-danger" : tone === "warn" ? "text-state-warning" : "text-text-secondary"
  return (
    <Card>
      <p className="text-sm text-text-secondary">{label}</p>
      <p className="mt-2 font-serif text-3xl font-medium text-text-primary">{value}</p>
      {hint && <p className={`mt-1 text-xs ${hintColor}`}>{hint}</p>}
    </Card>
  )
}
