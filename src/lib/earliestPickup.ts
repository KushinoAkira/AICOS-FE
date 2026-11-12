export interface PickupHours {
  open: string
  close: string
  slotMinutes: number
  cutoffMinutes: number
}

const atTime = (day: Date, hhmm: string) => new Date(day.getFullYear(), day.getMonth(), day.getDate(), Number(hhmm.slice(0, 2)), Number(hhmm.slice(3, 5)))
const pad = (n: number) => String(n).padStart(2, "0")

/**
 * The first pickup slot still open. The backend closes a slot `cutoffMinutes` before it starts and takes only slot starts counted from
 * opening time, so the answer is always one of those starts. Past the last slot of the day it is the opening slot of tomorrow.
 */
export function earliestPickup(now: Date, h: PickupHours): { day: "today" | "tomorrow"; time: string } {
  const open = atTime(now, h.open)
  const slotMs = h.slotMinutes * 60_000
  const steps = Math.floor((now.getTime() + h.cutoffMinutes * 60_000 - open.getTime()) / slotMs) + 1
  const start = new Date(open.getTime() + Math.max(0, steps) * slotMs)
  if (start.getTime() + slotMs > atTime(now, h.close).getTime()) return { day: "tomorrow", time: h.open }
  return { day: "today", time: `${pad(start.getHours())}:${pad(start.getMinutes())}` }
}
