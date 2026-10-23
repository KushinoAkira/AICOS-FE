/** Local calendar-day keys (YYYY-MM-DD) for schedule UIs; instants themselves stay UTC. */
export const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
export const todayKey = () => dayKey(new Date())
export function addDays(key: string, n: number): string {
  const d = new Date(`${key}T12:00:00`)
  d.setDate(d.getDate() + n)
  return dayKey(d)
}
export function mondayOf(key: string): string {
  const d = new Date(`${key}T12:00:00`)
  return addDays(key, -((d.getDay() + 6) % 7))
}
export const dayLabel = (key: string) => new Date(`${key}T12:00:00`).toLocaleDateString("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit" })