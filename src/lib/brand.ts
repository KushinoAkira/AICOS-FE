/** Active brand (tenant) for this browser tab, and how brand colour is applied to the theme. */

import { normalizeTenantSlug } from "./tenantSlug"

const STORAGE_KEY = "aicos.brandSlug"
/** Dispatched on `window` whenever the active brand slug changes so BrandProvider can re-resolve. */
export const BRAND_CHANGE_EVENT = "aicos:brand-change"

function notifyBrandChange() {
  window.dispatchEvent(new Event(BRAND_CHANGE_EVENT))
  // Alias event kept for voucher-era listeners (`aicos:brand-changed`).
  window.dispatchEvent(new Event("aicos:brand-changed"))
}

/** Currently selected brand slug (session), or null on the platform with no shop chosen. */
export function getActiveBrandSlug(): string | null {
  return normalizeTenantSlug(sessionStorage.getItem(STORAGE_KEY))
}

/** Alias kept for http.ts / BE adapters — storage only, never hostname. */
export function currentBrandSlug(): string | null {
  return getActiveBrandSlug()
}

export function setActiveBrandSlug(slug: string) {
  const next = normalizeTenantSlug(slug)
  if (!next) return
  const prev = sessionStorage.getItem(STORAGE_KEY)
  if (prev === next) return
  sessionStorage.setItem(STORAGE_KEY, next)
  notifyBrandChange()
}

export function clearActiveBrandSlug() {
  if (!sessionStorage.getItem(STORAGE_KEY)) return
  sessionStorage.removeItem(STORAGE_KEY)
  notifyBrandChange()
}

/** @deprecated Prefer clearActiveBrandSlug */
export function clearRememberedBrand() {
  clearActiveBrandSlug()
}

/** Tells the app the current brand changed (the customer chose another one, or signed out). */
export function brandChanged() {
  notifyBrandChange()
}

/** Ready-made brand colours (data, not styling). The owner can also pick any colour. */
export const BRAND_COLORS = ["#C97B4A", "#B5483A", "#4F7A5A", "#3E6A8A", "#7A5C99", "#2F2A26"] as const
export const DEFAULT_BRAND_COLOR = BRAND_COLORS[0]

export const isHexColor = (v: string) => /^#[0-9a-fA-F]{6}$/.test(v)

/** Overrides the primary colour tokens for the whole page. Pass null to restore the defaults. */
export function applyBrandColor(hex: string | null) {
  const root = document.documentElement.style
  if (hex && isHexColor(hex)) {
    root.setProperty("--color-terracotta", hex)
    root.setProperty("--color-clay", `color-mix(in srgb, ${hex} 78%, black)`)
  } else {
    root.removeProperty("--color-terracotta")
    root.removeProperty("--color-clay")
  }
}

export const MAX_LOGO_BYTES = 512 * 1024
export const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"]
