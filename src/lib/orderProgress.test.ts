import { describe, expect, it } from "vitest"
import { isOrderOver, progressStep } from "./orderProgress"

describe("progressStep", () => {
  it("follows the order from the bar to the table", () => {
    expect(["Pending", "Preparing", "Ready", "Served"].map((s) => progressStep(s as never))).toEqual([0, 1, 2, 3])
    expect(progressStep("PickedUp")).toBe(3)
  })
  it("has no step for orders off the normal path or not at the bar yet", () => {
    for (const s of ["Cancelled", "NoShow", "Unfulfillable", "PendingPayment", "Scheduled"]) expect(progressStep(s as never)).toBeNull()
  })
})

describe("isOrderOver", () => {
  it("is false while the order is on its way and true once it is picked up, served or cancelled", () => {
    for (const s of ["PendingPayment", "Scheduled", "Pending", "Preparing", "Ready"]) expect(isOrderOver(s as never)).toBe(false)
    for (const s of ["PickedUp", "Served", "Cancelled", "NoShow", "Unfulfillable"]) expect(isOrderOver(s as never)).toBe(true)
  })
})
