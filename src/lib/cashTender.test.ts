import { describe, expect, it } from "vitest"
import { change, describeNotes, shortfall, suggestedAmounts, sumNotes } from "./cashTender"

const fmt = (n: number) => n.toLocaleString("vi-VN")

describe("cash tendered at the counter", () => {
  it("adds up the notes tapped", () => {
    expect(sumNotes([20_000, 20_000, 10_000])).toBe(50_000)
    expect(sumNotes([])).toBe(0)
  })
  it("says what is missing or what to give back", () => {
    expect(shortfall(40_000, 45_000)).toBe(5_000)
    expect(shortfall(50_000, 45_000)).toBe(0)
    expect(change(50_000, 45_000)).toBe(5_000)
    expect(change(40_000, 45_000)).toBe(0)
  })
  it("lists the notes largest first", () => {
    expect(describeNotes([20_000, 50_000, 50_000], fmt)).toBe("2 × 50.000 · 1 × 20.000")
    expect(describeNotes([], fmt)).toBe("")
  })
  it("suggests the amounts a customer usually hands over", () => {
    expect(suggestedAmounts(45_000)).toEqual([45_000, 50_000, 100_000, 200_000])
    expect(suggestedAmounts(100_000)).toEqual([100_000, 200_000, 500_000])
    expect(suggestedAmounts(38_500)).toEqual([38_500, 40_000, 50_000, 100_000])
    expect(suggestedAmounts(0)).toEqual([])
  })
})
