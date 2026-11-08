/** What a customer reads instead of the long order code: the first drink and how many more, plus a short code to tell staff. */

/** "ORD-20261108-0A3DE1" becomes "#0A3DE1"; a bare id (a UUID) becomes its first 6 characters. */
export function shortOrderCode(code: string): string {
  if (!code) return ""
  const last = code.split("-").pop() ?? code
  const short = /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(code) ? code.slice(0, 6) : last.length <= 8 ? last : last.slice(-6)
  return `#${short.toUpperCase()}`
}

/** "Cà phê sữa (M) ×2 +1 món": the first line of the order, its size and quantity, and how many other drinks follow. */
export function orderTitle(lines: { name: string; size?: string; qty: number }[]): string {
  if (lines.length === 0) return "Đơn hàng"
  const first = lines[0]
  const more = lines.length - 1
  return `${first.name}${first.size ? ` (${first.size})` : ""}${first.qty > 1 ? ` ×${first.qty}` : ""}${more > 0 ? ` +${more} món` : ""}`
}
