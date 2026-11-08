import { describe, expect, it } from "vitest"
import { progressStep } from "./orderProgress"

describe("progressStep", () => {
  it("follows the order from the bar to the table", () => {
    expect(["Pending", "Preparing", "Ready", "Served"].map((s) => progressStep(s as never))).toEqual([0, 1, 2, 3])
    expect(progressStep("PickedUp")).toBe(3)
  })
  it("has no step for orders off the normal path or not at the bar yet", () => {
    for (const s of ["Cancelled", "NoShow", "Unfulfillable", "PendingPayment", "Scheduled"]) expect(progressStep(s as never)).toBeNull()
  })
})
