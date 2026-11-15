/** Vietnamese banknotes still handed over at a counter, largest first (coins are no longer used). */
export const BANKNOTES = [500_000, 200_000, 100_000, 50_000, 20_000, 10_000, 5_000, 2_000, 1_000] as const

export function shortfall(received: number, total: number): number {
  return Math.max(0, total - received)
}

export function change(received: number, total: number): number {
  return Math.max(0, received - total)
}

/** The sum of the notes tapped, in the order they were tapped. */
export const sumNotes = (notes: number[]) => notes.reduce((s, n) => s + n, 0)

/** "2 × 50.000 · 1 × 20.000", largest note first. */
export function describeNotes(notes: number[], format: (n: number) => string): string {
  const counts = new Map<number, number>()
  for (const n of notes) counts.set(n, (counts.get(n) ?? 0) + 1)
  return BANKNOTES.filter((n) => counts.get(n)).map((n) => `${counts.get(n)} × ${format(n)}`).join(" · ")
}

/**
 * What customers usually hand over for this bill: the exact amount, then the bill rounded up to the next 10.000, 50.000, 100.000,
 * 200.000 and 500.000, without repeats, at most four.
 */
export function suggestedAmounts(total: number): number[] {
  if (total <= 0) return []
  const out: number[] = [total]
  for (const step of [10_000, 50_000, 100_000, 200_000, 500_000]) {
    const v = Math.ceil(total / step) * step
    if (!out.includes(v)) out.push(v)
    if (out.length === 4) break
  }
  return out
}
