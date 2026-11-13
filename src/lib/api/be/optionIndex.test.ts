import { describe, expect, it } from "vitest"
import { indexOptions, optionIdsOf, optionOf } from "./optionIndex"

const product = {
  id: "p1",
  optionGroups: [
    { kind: "Size", options: [{ id: "m", name: "M" }, { id: "l", name: "L" }] },
    { kind: "Sugar", options: [{ id: "s50", name: "50%" }] },
    { kind: "Ice", options: [{ id: "ice", name: "Binh thuong" }] },
    { kind: "Topping", options: [{ id: "dao", name: "Đào" }, { id: "tc", name: "Trân châu" }] },
  ],
}
const line = { productId: "p1", size: "M", sugar: "50%", ice: "Binh thuong", qty: 1, note: "" }

describe("optionIdsOf", () => {
  it("sends the chosen size, not the default one", () => {
    indexOptions(product)
    expect(optionIdsOf(line)).toEqual(["m", "s50", "ice"])
    expect(optionIdsOf({ ...line, size: "L" })).toEqual(["l", "s50", "ice"])
    expect(optionOf("l")).toEqual({ kind: "size", label: "L" })
  })

  it("skips an empty choice and refuses a label the menu does not offer", () => {
    indexOptions(product)
    expect(optionIdsOf({ ...line, sugar: "", ice: "" })).toEqual(["m"])
    expect(() => optionIdsOf({ ...line, size: "XL" })).toThrow(/XL/)
  })

  it("sends every topping picked so the server adds their prices", () => {
    indexOptions(product)
    expect(optionIdsOf({ ...line, toppings: ["Đào", "Trân châu"] })).toEqual(["m", "s50", "ice", "dao", "tc"])
    expect(() => optionIdsOf({ ...line, toppings: ["Thạch"] })).toThrow(/Thạch/)
  })
})
