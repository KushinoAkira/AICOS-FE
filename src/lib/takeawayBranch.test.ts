import { describe, expect, it } from "vitest"
import { defaultBranch, hoursLabel, isOpenAt } from "./takeawayBranch"

const q1 = { id: "q1" }, q3 = { id: "q3" }, q7 = { id: "q7" }

describe("defaultBranch", () => {
  it("starts from the branch chosen last time", () => {
    expect(defaultBranch([q1, q3, q7], "q3", "q1")).toBe(q3)
  })

  it("falls back when the remembered branch no longer takes orders", () => {
    expect(defaultBranch([q1, q7], "q3", "q7")).toBe(q7)
    expect(defaultBranch([q1, q7], "q3")).toBe(q1)
    expect(defaultBranch([q1, q7], null)).toBe(q1)
  })

  it("gives nothing when the brand has no branch", () => {
    expect(defaultBranch([], "q1")).toBeUndefined()
  })
})

describe("hoursLabel", () => {
  it("shows hours without seconds", () => {
    expect(hoursLabel({ openingTime: "07:00:00", closingTime: "22:00:00" })).toBe("07:00 - 22:00")
  })
  it("is empty when the hours are not set", () => {
    expect(hoursLabel({ openingTime: null, closingTime: "22:00" })).toBe("")
  })
})

describe("isOpenAt", () => {
  const day = { openingTime: "07:00:00", closingTime: "22:00:00" }
  const at = (h: number, m = 0) => new Date(2026, 10, 3, h, m)

  it("is open between opening and closing time", () => {
    expect(isOpenAt(day, at(7))).toBe(true)
    expect(isOpenAt(day, at(21, 59))).toBe(true)
  })

  it("is closed before opening and from closing time on", () => {
    expect(isOpenAt(day, at(6, 59))).toBe(false)
    expect(isOpenAt(day, at(22))).toBe(false)
  })

  it("handles hours that run past midnight", () => {
    const night = { openingTime: "18:00", closingTime: "02:00" }
    expect(isOpenAt(night, at(23))).toBe(true)
    expect(isOpenAt(night, at(1, 30))).toBe(true)
    expect(isOpenAt(night, at(12))).toBe(false)
  })

  it("does not guess when the hours are unknown", () => {
    expect(isOpenAt({ openingTime: null, closingTime: null }, at(12))).toBeNull()
  })
})
