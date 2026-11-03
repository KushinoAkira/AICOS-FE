import { HttpResponse, http } from "msw"
import type { Order, VoucherQuote } from "../../lib/api/orders"
import { normalizePromotionCode, voucherDiscount } from "../../lib/promotionCode"
import * as bdb from "./brandDb"

/** The demo answer for a refused voucher, shaped like the backend's ProblemDetails (`code` = `voucher.*`). */
export const voucherProblem = (code: string, title: string) => HttpResponse.json({ title, detail: title, code }, { status: 422 })

/** Checks a code against the demo vouchers. Returns the quote, or the error code and message the backend would send. */
export function quoteDemoVoucher(raw: string, amount: number): VoucherQuote | { code: string; message: string } {
  const code = normalizePromotionCode(raw)
  const v = bdb.vouchers.find((x) => x.code === code)
  if (!v) return { code: "voucher.invalid", message: "Voucher not found." }
  if (!v.active) return { code: "voucher.revoked", message: "Voucher revoked." }
  if (new Date(v.expiresAt).getTime() < Date.now()) return { code: "voucher.expired", message: "Voucher expired." }
  if (v.maxUses > 0 && v.used >= v.maxUses) return { code: "voucher.redeemed", message: "Voucher used up." }
  if (amount < v.minOrder) return { code: "voucher.min_order_not_met", message: "Minimum order not met." }
  const discount = voucherDiscount(v, amount)
  return { code: v.code, orderAmount: amount, discount, amountToPay: amount - discount }
}

const isQuote = (q: ReturnType<typeof quoteDemoVoucher>): q is VoucherQuote => "discount" in q

/** Takes the voucher off a demo order before it is stored, like the server does. Returns an error response, or null when fine. */
export function applyDemoVoucher(o: Order, raw: string | null | undefined): Response | null {
  if (!raw) return null
  const q = quoteDemoVoucher(raw, o.total)
  if (!isQuote(q)) return voucherProblem(q.code, q.message)
  const v = bdb.vouchers.find((x) => x.code === q.code)
  if (v) v.used += 1
  o.originalAmount = o.total
  o.promotionCode = q.code
  o.discountAmount = q.discount
  o.total = q.amountToPay
  return null
}

export const voucherHandlers = [
  http.post("*/api/v1/ordering/vouchers/validate", async ({ request }) => {
    const b = (await request.json()) as { code: string; orderAmount: number }
    const q = quoteDemoVoucher(b.code, b.orderAmount)
    return isQuote(q) ? HttpResponse.json(q) : voucherProblem(q.code, q.message)
  }),
]
