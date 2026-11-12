/**
 * Which branch a takeaway order goes to. The customer picks one; the choice is remembered per brand on this device,
 * so "Gợi ý cho bạn" and the next visit start from the same shop.
 */

export interface BranchChoice {
  id: string
  name: string
  address: string | null
  /** "HH:mm" or "HH:mm:ss" */
  openingTime: string | null
  closingTime: string | null
}

const key = (brand: string | null) => `aicos.takeaway.branch.${brand ?? "default"}`

export function rememberedBranch(brand: string | null): string | null {
  try {
    return localStorage.getItem(key(brand))
  } catch {
    return null
  }
}

export function rememberBranch(brand: string | null, branchId: string) {
  try {
    localStorage.setItem(key(brand), branchId)
  } catch {
    /* private mode: the choice just is not kept */
  }
}

/** The branch to start with: the one chosen last time if it still takes orders, then `fallback` (demo data), then the first one. */
export function defaultBranch<T extends { id: string }>(branches: T[], remembered: string | null, fallback?: string): T | undefined {
  return branches.find((b) => b.id === remembered) ?? branches.find((b) => b.id === fallback) ?? branches[0]
}

const minutes = (t: string | null): number | null => {
  const m = /^(\d{1,2}):(\d{2})/.exec(t ?? "")
  return m ? Number(m[1]) * 60 + Number(m[2]) : null
}

/** "07:00 - 22:00", or "" when the branch has not set its hours. */
export function hoursLabel(b: Pick<BranchChoice, "openingTime" | "closingTime">): string {
  return b.openingTime && b.closingTime ? `${b.openingTime.slice(0, 5)} - ${b.closingTime.slice(0, 5)}` : ""
}

/** Open right now by the branch's hours (local time). Null when the hours are unknown. Hours past midnight (22:00 - 02:00) are handled. */
export function isOpenAt(b: Pick<BranchChoice, "openingTime" | "closingTime">, now: Date): boolean | null {
  const open = minutes(b.openingTime), close = minutes(b.closingTime)
  if (open === null || close === null) return null
  const t = now.getHours() * 60 + now.getMinutes()
  return open <= close ? t >= open && t < close : t >= open || t < close
}
