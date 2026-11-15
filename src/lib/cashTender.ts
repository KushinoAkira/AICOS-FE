/** Vietnamese banknotes still handed over at a counter, smallest first (coins are no longer used). */
export const BANKNOTES = [1_000, 2_000, 5_000, 10_000, 20_000, 50_000, 100_000, 200_000, 500_000] as const

/** The amount typed so far plus one more note. An empty or non-numeric field counts as 0. */
export function addNote(received: string, note: number): string {
  const now = Number(received.replace(/\D/g, "")) || 0
  return String(now + note)
}

/** What the cashier still has to ask for (positive) or give back (negative is never returned: see `change`). */
export function shortfall(received: number, total: number): number {
  return Math.max(0, total - received)
}

export function change(received: number, total: number): number {
  return Math.max(0, received - total)
}

/** "2 × 50.000 · 1 × 20.000", largest note first, for the notes tapped so far. */
export function describeNotes(counts: Record<number, number>, format: (n: number) => string): string {
  return [...BANKNOTES].reverse().filter((n) => counts[n]).map((n) => `${counts[n]} × ${format(n)}`).join(" · ")
}
