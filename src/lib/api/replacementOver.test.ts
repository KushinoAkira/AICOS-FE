import { describe, expect, it } from "vitest"
import { replacementOver, type Replacement } from "./staff"

const request = (date: string, endTime?: string): Replacement => ({
  id: "r", reason: "", status: "open", applicants: [], applied: false,
  shift: { id: "s", date, period: "morning", endTime, userId: "", userName: "", branchId: "", checkInAtUtc: null, checkOutAtUtc: null },
})

describe("replacementOver", () => {
  const now = new Date("2026-11-09T15:00:00")
  it("is over once the shift has ended", () => expect(replacementOver(request("2026-11-09", "14:00"), now)).toBe(true))
  it("is still open while the shift has not ended", () => expect(replacementOver(request("2026-11-09", "18:00"), now)).toBe(false))
  it("is open for a later day", () => expect(replacementOver(request("2026-11-10", "10:00"), now)).toBe(false))
  it("treats a shift without an end time as ending at midnight", () => expect(replacementOver(request("2026-11-09"), now)).toBe(false))
})
