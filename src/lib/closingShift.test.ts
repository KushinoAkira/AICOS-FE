import { describe, expect, it } from "vitest"
import { pickClosingShift, type WorkedShift } from "./closingShift"

const shift = (id: string, startTime: string, checkIn: boolean, checkOut = false, workDate = "2026-11-02"): WorkedShift => ({
  id, workDate, startTime, checkInAtUtc: checkIn ? "2026-11-02T01:00:00Z" : null, checkOutAtUtc: checkOut ? "2026-11-02T02:00:00Z" : null,
})

describe("pickClosingShift", () => {
  it("takes the second shift of the day when the first is closed", () => {
    const r = pickClosingShift([shift("early", "00:30", true, true), shift("now", "10:00", true)], ["early"])
    expect(r).toEqual({ shift: expect.objectContaining({ id: "now" }), allClosed: false })
  })

  it("prefers the running shift over a finished one that is not closed", () => {
    const r = pickClosingShift([shift("done", "06:00", true, true), shift("running", "05:00", true), shift("later", "20:00", false)], [])
    expect(r.shift?.id).toBe("running")
  })

  it("takes the latest finished shift when none is running", () => {
    const r = pickClosingShift([shift("a", "06:00", true, true), shift("b", "14:00", true, true)], [])
    expect(r.shift?.id).toBe("b")
  })

  it("says so when every worked shift is closed, or none was worked", () => {
    expect(pickClosingShift([shift("a", "06:00", true, true), shift("b", "20:00", false)], ["a"])).toEqual({ shift: null, allClosed: true })
    expect(pickClosingShift([shift("a", "06:00", false)], [])).toEqual({ shift: null, allClosed: false })
    expect(pickClosingShift([], [])).toEqual({ shift: null, allClosed: false })
  })
})
