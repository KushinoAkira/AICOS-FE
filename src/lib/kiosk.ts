/**
 * Self-order kiosk at the counter (`/kiosk`): a tablet signed in with a cashier account, turned to face the customer.
 * A member types their phone or email to earn points; nobody else's data is ever listed, only an exact match is shown, masked.
 */
import type { Order } from "./api/orders"

/** Back to the welcome screen after this long without a touch, so the next person never sees someone else's cart. */
export const KIOSK_IDLE_MS = 90_000
/** How long the "order placed" screen stays before the kiosk is ready for the next person. */
export const KIOSK_DONE_MS = 45_000

export type Contact = { kind: "phone"; value: string } | { kind: "email"; value: string }

/** What the customer typed, read as a Vietnamese mobile number (0xxxxxxxxx, +84 or 84 prefix, spaces and dots allowed) or an email. */
export function readContact(input: string): Contact | null {
  const raw = input.trim()
  if (!raw) return null
  if (raw.includes("@")) {
    const email = raw.toLowerCase()
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? { kind: "email", value: email } : null
  }
  let digits = raw.replace(/[\s.\-()]/g, "")
  if (digits.startsWith("+84")) digits = "0" + digits.slice(3)
  else if (digits.startsWith("84") && digits.length === 11) digits = "0" + digits.slice(2)
  return /^0\d{9}$/.test(digits) ? { kind: "phone", value: digits } : null
}

const phoneDigits = (p: string | null | undefined) => {
  const c = readContact(p ?? "")
  return c?.kind === "phone" ? c.value : ""
}

/** The one member whose phone or email is exactly what was typed. Partial or several matches give nothing. */
export function exactMember<T extends { email: string; phone?: string | null }>(rows: T[], contact: Contact): T | null {
  const hits = rows.filter((r) => (contact.kind === "email" ? r.email.trim().toLowerCase() === contact.value : phoneDigits(r.phone) === contact.value))
  return hits.length === 1 ? hits[0]! : null
}

/** "Nguyễn Văn An" -> "An": how the kiosk greets a member without showing the full name to the queue behind them. */
export function greetingName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  return parts[parts.length - 1] ?? ""
}

/** 0901234567 -> 090•••4567, an.nguyen@gmail.com -> a•••@gmail.com */
export function maskContact(contact: Contact): string {
  if (contact.kind === "phone") return `${contact.value.slice(0, 3)}•••${contact.value.slice(-4)}`
  const [name = "", domain = ""] = contact.value.split("@")
  return `${name.charAt(0)}•••@${domain}`
}

/** Placed at the kiosk and still to pay: drinks for here, with no table. */
export function isKioskOrder(o: Pick<Order, "channel" | "tableCode" | "paymentStatus" | "status">): boolean {
  return o.channel === "dine-in" && !o.tableCode && o.paymentStatus === "Unpaid" && o.status !== "Cancelled"
}
