import { describe, expect, it } from "vitest"
import { liveStatusOf } from "./liveStatus"
import type { Order } from "../api/orders"

const order = { id: "o1" } as Order

describe("liveStatusOf", () => {
  it("marks empty tables Free", () => {
    expect(liveStatusOf({ orders: [], billRequested: false })).toBe("Free")
  })

  it("marks open sessions Occupied until bill is requested", () => {
    expect(liveStatusOf({ orders: [order], billRequested: false })).toBe("Occupied")
  })

  it("marks bill-requested tables WaitingPayment", () => {
    expect(liveStatusOf({ orders: [order], billRequested: true })).toBe("WaitingPayment")
  })
})
