/** Active branch for staff ops (menu, tables) within the selected brand. */

const STORAGE_KEY = "aicos.branchId"
export const BRANCH_CHANGE_EVENT = "aicos:branch-change"

function notify() {
  window.dispatchEvent(new Event(BRANCH_CHANGE_EVENT))
}

export function getActiveBranchId(): string | null {
  const id = sessionStorage.getItem(STORAGE_KEY)?.trim() ?? ""
  return id || null
}

export function setActiveBranchId(id: string) {
  const next = id.trim()
  if (!next) return
  if (sessionStorage.getItem(STORAGE_KEY) === next) return
  sessionStorage.setItem(STORAGE_KEY, next)
  notify()
}

export function clearActiveBranchId() {
  if (!sessionStorage.getItem(STORAGE_KEY)) return
  sessionStorage.removeItem(STORAGE_KEY)
  notify()
}

/** Floor label for UI (1 = trệt in VN cafés often, but we show "Tầng N"). */
export function floorLabel(floor: number): string {
  if (floor <= 1) return "Tầng trệt"
  return `Tầng ${floor}`
}
