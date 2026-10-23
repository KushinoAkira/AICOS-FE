/** Membership tiers by lifetime points. Thresholds are display config; the server owns the real ranking. */
const TIERS = [
  { name: "Thành viên", min: 0 },
  { name: "Bạc", min: 300 },
  { name: "Vàng", min: 800 },
  { name: "Kim cương", min: 2000 },
]
export function tierOf(lifetime: number): { name: string; next: string | null; toNext: number } {
  const idx = TIERS.reduce((acc, t, i) => (lifetime >= t.min ? i : acc), 0)
  const next = TIERS[idx + 1]
  return { name: TIERS[idx].name, next: next?.name ?? null, toNext: next ? next.min - lifetime : 0 }
}