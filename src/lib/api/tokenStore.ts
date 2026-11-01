import type { UserDto } from "./identity"

export interface StoredSession {
  accessToken: string
  accessTokenExpiresAtUtc: string
  refreshToken: string
  refreshTokenExpiresAtUtc: string
  user: UserDto
  /** Staff brand after login; customers pick a shop on the platform instead. Mirror of JWT tenant claim. */
  tenantSlug?: string | null
  /** Tenant id claim (null for Super Admin / platform customer). */
  tenantId?: string | null
}

const KEY = "aicos.session"

/** Session persistence. localStorage keeps the demo simple; swap for httpOnly cookies when the BE supports it. */
export const tokenStore = {
  get(): StoredSession | null {
    try {
      const raw = localStorage.getItem(KEY)
      return raw ? (JSON.parse(raw) as StoredSession) : null
    } catch {
      return null
    }
  },
  set(session: StoredSession) {
    localStorage.setItem(KEY, JSON.stringify(session))
  },
  clear() {
    localStorage.removeItem(KEY)
  },
}
