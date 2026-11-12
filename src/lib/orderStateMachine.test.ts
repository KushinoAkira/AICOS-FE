import { describe, expect, it } from "vitest"
import { canTransition, maxRefundable, tableStateOf } from "./orderStateMachine"
import { formatVND } from "./format"

describe("orderStateMachine", () => {
  it("only moves forward", () => {
    expect(canTransition("Pending", "Preparing")).toBe(true)
    expect(canTransition("Preparing", "Pending")).toBe(false)
    expect(canTransition("Served", "Preparing")).toBe(false)
  })
  it("branches after Ready by channel", () => {
    expect(canTransition("Ready", "Served", "dine-in")).toBe(true)
    expect(canTransition("Ready", "PickedUp", "dine-in")).toBe(false)
    expect(canTransition("Ready", "PickedUp", "takeaway")).toBe(true)
  })
  it("caps refunds", () => {
    expect(maxRefundable(100_000, 30_000)).toBe(70_000)
    expect(maxRefundable(100_000, 150_000)).toBe(0)
  })
  it("derives table state from the session only", () => {
    expect(tableStateOf(null)).toBe("Empty")
    expect(tableStateOf({ open: true, billRequested: false })).toBe("InService")
    expect(tableStateOf({ open: true, billRequested: true })).toBe("AwaitingPayment")
  })
})

describe("formatVND", () => {
  it("formats whole dong", () => {
    expect(formatVND(7_400_000).replace(/\s/g, " ")).toBe("7.400.000 ₫")
    expect(formatVND(-5)).toBe("0 ₫")
  })
})
