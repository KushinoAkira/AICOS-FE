import { describe, expect, it } from "vitest"
import { earliestPickup } from "./earliestPickup"

const hours = { open: "07:00", close: "22:00", slotMinutes: 15, cutoffMinutes: 15 }
const at = (hh: number, mm: number, ss = 0) => new Date(2026, 10, 2, hh, mm, ss)

describe("earliestPickup", () => {
  it("skips the slot that closed for ordering", () => {
    expect(earliestPickup(at(14, 45, 31), hours)).toEqual({ day: "today", time: "15:15" })
  })

  it("keeps a slot only while it is more than the cutoff away", () => {
    expect(earliestPickup(at(14, 44, 59), hours)).toEqual({ day: "today", time: "15:00" })
    expect(earliestPickup(at(14, 45), hours)).toEqual({ day: "today", time: "15:15" })
  })

  it("starts at opening time before the shop opens", () => {
    expect(earliestPickup(at(5, 0), hours)).toEqual({ day: "today", time: "07:00" })
  })

  it("moves to tomorrow when no slot fits before closing", () => {
    expect(earliestPickup(at(21, 40), hours)).toEqual({ day: "tomorrow", time: "07:00" })
    expect(earliestPickup(at(21, 20), hours)).toEqual({ day: "today", time: "21:45" })
  })
})
