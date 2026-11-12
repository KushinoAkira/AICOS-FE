/**
 * Promotion (voucher) codes typed at the POS, the table QR menu and the takeaway menu.
 * The server is the only judge of a code: it checks it again and takes the discount when the order is saved (BR-46).
 * These helpers only tidy what was typed, catch obvious typos before a request, and turn the server's error codes into Vietnamese.
 */

/** Same limit as the backend (`PromotionCode` max length). */
export const PROMOTION_CODE_MAX = 40

/** "  save10 " -> "SAVE10". Codes are stored upper case on the server; spaces inside a code are never valid. */
export function normalizePromotionCode(raw: string): string {
  return raw.replace(/\s+/g, "").toUpperCase()
}

/** A message when the typed code cannot be valid, otherwise null. An empty code is fine: it means "no voucher". */
export function promotionCodeProblem(code: string): string | null {
  if (!code) return null
  if (code.length > PROMOTION_CODE_MAX) return `Mã giảm giá tối đa ${PROMOTION_CODE_MAX} ký tự.`
  if (!/^[A-Z0-9_-]+$/.test(code)) return "Mã giảm giá chỉ gồm chữ, số, dấu - và _."
  return null
}

const VOUCHER_MESSAGES: Record<string, string> = {
  "voucher.invalid": "Mã giảm giá không tồn tại hoặc không dùng được.",
  "voucher.not_found": "Mã giảm giá không tồn tại.",
  "voucher.expired": "Mã giảm giá đã hết hạn.",
  "voucher.redeemed": "Mã giảm giá đã được sử dụng.",
  "voucher.already_redeemed": "Mã giảm giá đã được sử dụng.",
  "voucher.revoked": "Mã giảm giá đã bị thu hồi.",
  "voucher.invalid_status": "Mã giảm giá không còn dùng được.",
  "voucher.min_order_not_met": "Đơn chưa đạt giá trị tối thiểu để dùng mã này.",
  "voucher.wrong_branch": "Mã này không dùng được ở chi nhánh này.",
  "voucher.sign_in_required": "Đăng nhập để dùng mã giảm giá tại bàn.",
  "voucher.not_yours": "Mã này thuộc tài khoản khác. Hãy đăng nhập đúng tài khoản đã nhận voucher.",
}

/** True when the server refused the order because of its voucher. */
export function isVoucherError(code: string | undefined): boolean {
  return !!code && code.startsWith("voucher.")
}

type ErrorLike = { message: string; code?: string; status?: number }

/**
 * The message to show for a failed order: a Vietnamese one for voucher errors, the server's message otherwise.
 * `sentCode`: the voucher that went with the order. The Ordering service relays the Customer service's refusal: an unknown code comes
 * back as `not_found` naming the customer service, and a voucher the caller may not redeem as `forbidden`.
 */
export function orderErrorMessage(e: ErrorLike, sentCode = ""): string {
  if (isVoucherError(e.code)) return VOUCHER_MESSAGES[e.code!] ?? "Mã giảm giá không dùng được cho đơn này."
  if (sentCode && e.code === "not_found" && /customer/i.test(e.message)) return "Mã giảm giá không tồn tại."
  if (sentCode && e.code === "forbidden") return "Hệ thống chưa cho dùng mã giảm giá với loại đơn này. Hãy bỏ mã hoặc nhờ nhân viên."
  return e.message
}

/** The message for a refused preview (`/customers/vouchers/validate`): an unknown code is a plain 404 there. */
export function voucherCheckMessage(e: ErrorLike): string {
  if (isVoucherError(e.code)) return orderErrorMessage(e)
  if (e.status === 404 || e.code === "not_found") return "Mã giảm giá không tồn tại."
  if (e.status === 403 || e.code === "forbidden") return "Bạn không có quyền kiểm tra mã giảm giá."
  return e.message
}

/** What a voucher takes off an order. Mirrors the server rule for previews and the demo data only; the server's number wins. */
export function voucherDiscount(v: { kind: "percent" | "amount"; value: number; minOrder: number }, amount: number): number {
  if (amount <= 0 || amount < v.minOrder) return 0
  const raw = v.kind === "percent" ? Math.round((amount * v.value) / 100) : v.value
  return Math.max(0, Math.min(amount, raw))
}

/** One line for the toast after an order: "Đã giảm 10.000 ₫ (mã SAVE10)." or "" when nothing was taken off. */
export function discountNote(order: { promotionCode?: string; discountAmount?: number }, format: (n: number) => string): string {
  if (!order.promotionCode || !order.discountAmount) return ""
  return ` Đã giảm ${format(order.discountAmount)} (mã ${order.promotionCode}).`
}
