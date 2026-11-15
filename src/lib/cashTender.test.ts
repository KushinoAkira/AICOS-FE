import { describe, expect, it } from "vitest"
import { addNote, change, describeNotes, shortfall } from "./cashTender"

describe("cash tendered at the counter", () => {
  it("adds notes onto what was typed", () => {
    expect(addNote("", 50_000)).toBe("50000")
    expect(addNote("50000", 20_000)).toBe("70000")
    expect(addNote("abc", 10_000)).toBe("10000")
  })
  it("says what is missing or what to give back", () => {
    expect(shortfall(40_000, 45_000)).toBe(5_000)
    expect(shortfall(50_000, 45_000)).toBe(0)
    expect(change(50_000, 45_000)).toBe(5_000)
    expect(change(40_000, 45_000)).toBe(0)
  })
  it("lists the notes largest first", () => {
    const fmt = (n: number) => n.toLocaleString("vi-VN")
    expect(describeNotes({ 20_000: 1, 50_000: 2 }, fmt)).toBe("2 × 50.000 · 1 × 20.000")
    expect(describeNotes({}, fmt)).toBe("")
  })
})
