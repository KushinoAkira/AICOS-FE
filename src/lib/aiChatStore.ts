/** Persist AI chat transcripts keyed by login session + brand + branch. */

export type StoredChatMsg = {
  role: "user" | "ai"
  text: string
  suggestions?: { productId: string; name: string; price: number; reason: string }[]
  failed?: boolean
}

const PREFIX = "aicos.aiChat."
const MAX_MSGS = 60

export function aiChatKey(userId: string | null | undefined, brand: string | null | undefined, branchId: string | null | undefined) {
  const who = (userId ?? "").trim() || "guest"
  const b = (brand ?? "").trim().toLowerCase() || "_"
  const br = (branchId ?? "").trim() || "_"
  return `${PREFIX}${who}.${b}.${br}`
}

export function loadAiChat(key: string): StoredChatMsg[] | null {
  try {
    const raw = sessionStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredChatMsg[]
    return Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function saveAiChat(key: string, msgs: StoredChatMsg[]) {
  try {
    const slim = msgs.slice(-MAX_MSGS).map((m) => ({
      role: m.role,
      text: m.text,
      ...(m.failed ? { failed: true } : {}),
      ...(m.suggestions?.length
        ? {
            suggestions: m.suggestions.map((s) => ({
              productId: s.productId,
              name: s.name,
              price: s.price,
              reason: s.reason,
            })),
          }
        : {}),
    }))
    sessionStorage.setItem(key, JSON.stringify(slim))
  } catch {
    /* quota / private mode — ignore */
  }
}

/** Drop every AI transcript for one account (call on logout). */
export function clearAiChatsForUser(userId: string | null | undefined) {
  const who = (userId ?? "").trim()
  if (!who || typeof sessionStorage === "undefined") return
  const needle = `${PREFIX}${who}.`
  const drop: string[] = []
  for (let i = 0; i < sessionStorage.length; i++) {
    const k = sessionStorage.key(i)
    if (k?.startsWith(needle)) drop.push(k)
  }
  drop.forEach((k) => sessionStorage.removeItem(k))
}

export function clearAllAiChats() {
  if (typeof sessionStorage === "undefined") return
  const drop: string[] = []
  for (let i = 0; i < sessionStorage.length; i++) {
    const k = sessionStorage.key(i)
    if (k?.startsWith(PREFIX)) drop.push(k)
  }
  drop.forEach((k) => sessionStorage.removeItem(k))
}
