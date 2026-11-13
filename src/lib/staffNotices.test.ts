import { describe, expect, it } from "vitest"
import { nameOrderCodes, noticeTarget, orderNameMap } from "./staffNotices"

describe("nameOrderCodes", () => {
  const names = orderNameMap([{ code: "ORD-20261112-C5C73C", lines: [{ name: "Trà sữa", size: "M", qty: 2 }] }])
  it("replaces a known code by its drinks and short code", () =>
    expect(nameOrderCodes("Đơn ORD-20261112-C5C73C đã xong", names)).toBe("Đơn Trà sữa (M) ×2 (#C5C73C) đã xong"))
  it("shortens an unknown code", () => expect(nameOrderCodes("Đơn ORD-20261111-9DD4B8, tổng 46.000đ.", names)).toBe("Đơn #9DD4B8, tổng 46.000đ."))
  it("leaves other text alone", () => expect(nameOrderCodes("Bàn A01 gọi tính tiền", names)).toBe("Bàn A01 gọi tính tiền"))
})

describe("noticeTarget", () => {
  it("sends each kind to the screen that handles it", () => {
    expect(noticeTarget("OrderReady", "cashier")).toBe("cashier-serve")
    expect(noticeTarget("BillRequested", "cashier")).toBe("cashier-tables")
    expect(noticeTarget("ReplacementOpened", "barista")).toBe("cashier-shift")
    expect(noticeTarget("Unknown", "cashier")).toBeNull()
  })
})
