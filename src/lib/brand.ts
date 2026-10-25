/** Which brand (tenant) this browser tab is on, and how a brand colour is applied to the theme. */

/** Hosts that are the platform itself, not a brand: `aicos.app`, `www.aicos.app`, plain `localhost`. */
const RESERVED = new Set(["www", "app", "admin", "api", "aicos", "localhost"])
/** Domains where `<project>.web.app` is the platform itself; a brand would be a further subdomain. */
const HOSTING_SUFFIXES = [".web.app", ".firebaseapp.com"]
/** Preview hosts (Figma Make) whose generated subdomain is never a brand. */
const PREVIEW_SUFFIXES = [".figma.site", ".figma.com", ".figma.run", ".figmaiframepreview.figma.com"]
const STORAGE_KEY = "aicos.brandSlug"

/**
 * Brand slug from the host (`caphenha.aicos.app`, `caphenha.localhost`), else from `?brand=caphenha`
 * (remembered for the tab so links inside the app keep the brand). Returns null on the platform's own site.
 */
export function currentBrandSlug(): string | null {
  const host = window.location.hostname.toLowerCase()
  const labels = host.split(".")
  const isLocal = labels[labels.length - 1] === "localhost"
  // On shared hosting domains (Firebase) the project name is the site itself, not a brand.
  const baseLabels = HOSTING_SUFFIXES.some((s) => host.endsWith(s)) ? 3 : 2
  const isPreview = PREVIEW_SUFFIXES.some((s) => host.endsWith(s))
  const hostSlug = isPreview ? null : isLocal ? (labels.length >= 2 ? labels[0] : null) : labels.length > baseLabels ? labels[0] : null
  if (hostSlug && !RESERVED.has(hostSlug)) return hostSlug
  const fromQuery = new URLSearchParams(window.location.search).get("brand")?.toLowerCase()
  if (fromQuery && /^[a-z0-9-]{3,30}$/.test(fromQuery)) { sessionStorage.setItem(STORAGE_KEY, fromQuery); return fromQuery }
  return sessionStorage.getItem(STORAGE_KEY)
}

export function clearRememberedBrand() { sessionStorage.removeItem(STORAGE_KEY) }

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
