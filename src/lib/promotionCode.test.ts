import { describe, expect, it } from "vitest"
import { discountNote, isVoucherError, normalizePromotionCode, orderErrorMessage, promotionCodeProblem, voucherCheckMessage, voucherDiscount } from "./promotionCode"

describe("normalizePromotionCode", () => {
  it("trims, removes inner spaces and upper-cases", () => {
    expect(normalizePromotionCode("  save10 ")).toBe("SAVE10")
    expect(normalizePromotionCode("lp 2026 ab")).toBe("LP2026AB")
    expect(normalizePromotionCode("")).toBe("")
  })
})

describe("promotionCodeProblem", () => {
  it("accepts an empty code (no voucher) and normal codes", () => {
    expect(promotionCodeProblem("")).toBeNull()
    expect(promotionCodeProblem("SAVE10")).toBeNull()
    expect(promotionCodeProblem("LP-2026_AB")).toBeNull()
  })

  it("refuses codes the server could never accept", () => {
    expect(promotionCodeProblem("A".repeat(41))).toMatch(/40/)
    expect(promotionCodeProblem("GIẢM10")).toMatch(/chữ, số/)
    expect(promotionCodeProblem("SAVE!")).toMatch(/chữ, số/)
  })
})

describe("orderErrorMessage", () => {
  it("translates the server's voucher error codes", () => {
    expect(orderErrorMessage({ message: "Minimum order not met", code: "voucher.min_order_not_met" })).toBe("Đơn chưa đạt giá trị tối thiểu để dùng mã này.")
    expect(orderErrorMessage({ message: "x", code: "voucher.expired" })).toBe("Mã giảm giá đã hết hạn.")
    expect(orderErrorMessage({ message: "x", code: "voucher.wrong_branch" })).toMatch(/chi nhánh/)
  })

  it("has a fallback for a voucher code it does not know, and keeps other errors as they are", () => {
    expect(orderErrorMessage({ message: "x", code: "voucher.something_new" })).toBe("Mã giảm giá không dùng được cho đơn này.")
    expect(orderErrorMessage({ message: "Khung giờ này đã đầy", code: "pickup.slot_full" })).toBe("Khung giờ này đã đầy")
    expect(orderErrorMessage({ message: "Lỗi mạng" })).toBe("Lỗi mạng")
  })

  it("recognises the Customer service refusals that Ordering relays, only when a code was sent", () => {
    const relayed404 = { message: "customer 'requested item' was not found.", code: "not_found", status: 404 }
    expect(orderErrorMessage(relayed404, "NOPE")).toBe("Mã giảm giá không tồn tại.")
    expect(orderErrorMessage(relayed404)).toBe(relayed404.message)
    expect(orderErrorMessage({ message: "Table 'A9' was not found.", code: "not_found" }, "SAVE10")).toBe("Table 'A9' was not found.")
    expect(orderErrorMessage({ message: "You cannot do that.", code: "forbidden", status: 403 }, "SAVE10")).toMatch(/chưa cho dùng mã giảm giá/)
  })

  it("explains a refused preview from /customers/vouchers/validate", () => {
    expect(voucherCheckMessage({ message: "Voucher 'NOPE' was not found.", code: "not_found", status: 404 })).toBe("Mã giảm giá không tồn tại.")
    expect(voucherCheckMessage({ message: "x", code: "voucher.expired", status: 422 })).toBe("Mã giảm giá đã hết hạn.")
    expect(voucherCheckMessage({ message: "x", status: 403 })).toMatch(/không có quyền/)
  })

  it("only treats voucher.* codes as voucher errors", () => {
    expect(isVoucherError("voucher.expired")).toBe(true)
    expect(isVoucherError("qr.cart_empty")).toBe(false)
    expect(isVoucherError(undefined)).toBe(false)
  })
})

describe("voucherDiscount", () => {
  it("takes a percentage off, rounded to whole dong", () => {
    expect(voucherDiscount({ kind: "percent", value: 10, minOrder: 50000 }, 100000)).toBe(10000)
    expect(voucherDiscount({ kind: "percent", value: 15, minOrder: 0 }, 33333)).toBe(5000)
  })

  it("never takes more than the order and gives nothing under the minimum", () => {
    expect(voucherDiscount({ kind: "amount", value: 20000, minOrder: 0 }, 15000)).toBe(15000)
    expect(voucherDiscount({ kind: "percent", value: 10, minOrder: 50000 }, 49999)).toBe(0)
    expect(voucherDiscount({ kind: "amount", value: 20000, minOrder: 0 }, 0)).toBe(0)
  })
})

describe("discountNote", () => {
  const vnd = (n: number) => `${n} ₫`
  it("describes the discount the server accepted", () => {
    expect(discountNote({ promotionCode: "SAVE10", discountAmount: 10000 }, vnd)).toBe(" Đã giảm 10000 ₫ (mã SAVE10).")
  })
  it("says nothing when no voucher was used", () => {
    expect(discountNote({}, vnd)).toBe("")
    expect(discountNote({ promotionCode: "SAVE10", discountAmount: 0 }, vnd)).toBe("")
  })
})
