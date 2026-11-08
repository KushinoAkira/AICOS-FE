import { fold } from "./quickAsk"

/** How many shops the order page shows before "Xem thêm", so a long list does not bury the rest of the page. */
export const BRANDS_SHOWN = 12
/** From this many shops on, the order page offers a search box. */
export const BRAND_SEARCH_FROM = 7

/** Shops whose name or description contains every word typed, ignoring case and Vietnamese accents ("tra xanh" finds "Trà Xanh House"). */
export function filterBrands<T extends { name: string; description?: string }>(brands: T[], query: string): T[] {
  const words = fold(query).split(/\s+/).filter(Boolean)
  if (!words.length) return brands
  return brands.filter((b) => {
    const text = fold(`${b.name} ${b.description ?? ""}`)
    return words.every((w) => text.includes(w))
  })
}
