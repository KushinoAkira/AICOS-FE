/**
 * Path-based tenant (brand) slug rules — FE mirror of the reserved-slug contract.
 * Slug is unique and treated as immutable after creation.
 */

export const RESERVED_SLUGS = new Set([
  "admin",
  "api",
  "identity",
  "public",
  "brand",
  "ordering",
  "login",
  "logout",
  "t",
  "assets",
  "static",
  "health",
  "swagger",
  "shops",
  "menu",
  "orders",
  "loyalty",
  "feedback",
  "profile",
  "notifications",
  "for-you",
  "sign-up",
  "customer-login",
  "account-settings",
  "auth",
  "reset-password",
  "terms",
  "privacy",
  "contact",
  "platform",
  "branch",
  "barista",
  "cashier",
  "staff-login",
  "q",
])

/** Spec: ^[a-z0-9]+(-[a-z0-9]+)*$ length 3–40, not reserved. */
const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/

export type SlugIssue = "empty" | "length" | "format" | "reserved"

export function normalizeTenantSlug(raw: string | null | undefined): string | null {
  const s = raw?.trim().toLowerCase() ?? ""
  if (!s) return null
  if (s.length < 3 || s.length > 40) return null
  if (!SLUG_RE.test(s)) return null
  if (RESERVED_SLUGS.has(s)) return null
  return s
}

export function validateTenantSlug(raw: string): { ok: true; slug: string } | { ok: false; issue: SlugIssue } {
  const trimmed = raw.trim().toLowerCase()
  if (!trimmed) return { ok: false, issue: "empty" }
  if (trimmed.length < 3 || trimmed.length > 40) return { ok: false, issue: "length" }
  if (!SLUG_RE.test(trimmed)) return { ok: false, issue: "format" }
  if (RESERVED_SLUGS.has(trimmed)) return { ok: false, issue: "reserved" }
  return { ok: true, slug: trimmed }
}

/**
 * First path segment when it looks like a tenant slug (not a reserved platform segment).
 * Used to sync active brand from `/{slug}/...` URLs.
 */
export function tenantSlugFromPathname(pathname: string): string | null {
  const seg = pathname.replace(/\/+$/, "").split("/").filter(Boolean)[0]
  return normalizeTenantSlug(seg ?? null)
}
