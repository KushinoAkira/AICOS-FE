export interface WorkedShift {
  id: string
  workDate: string
  startTime: string
  checkInAtUtc: string | null
  checkOutAtUtc: string | null
}

/**
 * Which shift the cashier is closing the cash of: among the shifts they checked in to and have not closed yet, the one still running comes
 * first, then the most recent. `allClosed` says every shift they worked is closed already; no shift and not all closed means they never checked in.
 */
export function pickClosingShift<T extends WorkedShift>(mine: T[], closedIds: string[]): { shift: T | null; allClosed: boolean } {
  const worked = mine.filter((s) => s.checkInAtUtc)
  const pending = worked.filter((s) => !closedIds.includes(s.id))
  if (pending.length === 0) return { shift: null, allClosed: worked.length > 0 }
  const latestFirst = [...pending].sort((a, b) => `${b.workDate} ${b.startTime}`.localeCompare(`${a.workDate} ${a.startTime}`))
  return { shift: latestFirst.find((s) => !s.checkOutAtUtc) ?? latestFirst[0], allClosed: false }
}
