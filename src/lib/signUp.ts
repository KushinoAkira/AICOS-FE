/**
 * The sign-up that is waiting for its emailed code. Kept in sessionStorage so the code screen survives a refresh,
 * and so the resend countdown does not restart when the customer comes back to it.
 */
export interface PendingSignUp {
  email: string
  /** When another code may be asked for (epoch milliseconds). */
  resendAvailableAt: number
}

const KEY = "aicos.signup"

export const pendingSignUp = {
  get(): PendingSignUp | null {
    try {
      const raw = sessionStorage.getItem(KEY)
      return raw ? (JSON.parse(raw) as PendingSignUp) : null
    } catch {
      return null
    }
  },
  set(email: string, resendAfterSeconds: number) {
    try {
      sessionStorage.setItem(KEY, JSON.stringify({ email, resendAvailableAt: Date.now() + resendAfterSeconds * 1000 } satisfies PendingSignUp))
    } catch {
      /* private mode: the code screen then asks for the email again */
    }
  },
  clear() {
    try {
      sessionStorage.removeItem(KEY)
    } catch {
      /* nothing to clear */
    }
  },
}

/** The email with the middle of the name hidden: an***@gmail.com. */
export function maskEmail(email: string): string {
  const [name = "", domain = ""] = email.split("@")
  return `${name.slice(0, 2)}${name.length > 2 ? "***" : ""}@${domain}`
}
