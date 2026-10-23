import type { ReactNode } from "react"

export type Tone = "success" | "pending" | "danger" | "neutral" | "info"

const TONES: Record<Tone, string> = {
  success: "bg-success-bg text-state-success",
  pending: "bg-pending-bg text-[#8A5A2B]",
  danger: "bg-danger-bg text-state-danger",
  neutral: "bg-bg-warm text-text-secondary",
  info: "bg-sand text-clay",
}

/** Text is always present, colour is never the only signal. */
export function StatusPill({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${TONES[tone]}`}>{children}</span>
}
