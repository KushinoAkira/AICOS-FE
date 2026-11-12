import { describe, expect, it } from "vitest"
import { draftToCart } from "./orderDraft"

const latte = { id: "p1", name: "Ca phe sua", price: 30000, soldOut: false, sizes: [{ label: "M", priceDelta: 0 }, { label: "L", priceDelta: 6000 }] }
const tea = { id: "p2", name: "Tra sua", price: 40000, soldOut: true, sizes: [] }
const line = (productId: string, size = "M", qty = 1) => ({ productId, size, sugar: "50%", ice: "Ít đá", qty, note: "" })

describe("draftToCart", () => {
  it("prices the lines with the size surcharge of today's menu", () => {
    const { cart, dropped } = draftToCart([line("p1", "L", 2)], [latte])
    expect(dropped).toBe(0)
    expect(cart).toEqual([{ ...line("p1", "L", 2), name: "Ca phe sua", unit: 36000 }])
  })

  it("drops drinks that are gone or sold out at the chosen branch, and says how many", () => {
    const { cart, dropped } = draftToCart([line("p1"), line("p2"), line("gone")], [latte, tea])
    expect(cart.map((c) => c.productId)).toEqual(["p1"])
    expect(dropped).toBe(2)
  })

  it("keeps quantities inside what the cart allows", () => {
    expect(draftToCart([line("p1", "M", 50)], [latte]).cart[0]!.qty).toBe(20)
    expect(draftToCart([line("p1", "M", 0)], [latte]).dropped).toBe(1)
  })
})
