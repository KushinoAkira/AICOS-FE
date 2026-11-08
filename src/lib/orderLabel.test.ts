import { describe, expect, it } from "vitest"
import { orderTitle, shortOrderCode } from "./orderLabel"

describe("shortOrderCode", () => {
  it("keeps the last part of the server code", () => expect(shortOrderCode("ORD-20261108-0a3de1")).toBe("#0A3DE1"))
  it("cuts a bare id to six characters", () => expect(shortOrderCode("9b2f4c1e-1111-2222-3333-444455556666")).toBe("#9B2F4C"))
  it("is empty for no code", () => expect(shortOrderCode("")).toBe(""))
})

describe("orderTitle", () => {
  it("names the first drink and counts the rest", () =>
    expect(orderTitle([{ name: "Cà phê sữa", size: "M", qty: 2 }, { name: "Trà đào", qty: 1 }, { name: "Bạc xỉu", qty: 1 }])).toBe("Cà phê sữa (M) ×2 +2 món"))
  it("shows one drink alone", () => expect(orderTitle([{ name: "Trà đào", size: "", qty: 1 }])).toBe("Trà đào"))
  it("has a fallback for an empty order", () => expect(orderTitle([])).toBe("Đơn hàng"))
})
