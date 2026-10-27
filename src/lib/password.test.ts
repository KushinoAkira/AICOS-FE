import { describe, expect, it } from "vitest"
import { HINTS, isAcceptable, scorePassword } from "./password"

describe("password strength", () => {
  it("empty is not scored", () => {
    expect(scorePassword("").level).toBe("empty")
    expect(isAcceptable("")).toBe(false)
  })

  it("short lowercase is weak and not acceptable", () => {
    expect(scorePassword("abc").level).toBe("weak")
    expect(isAcceptable("abc")).toBe(false)
  })

  it("8 chars + upper + digit is the minimum we accept", () => {
    expect(isAcceptable("Abcdefg1")).toBe(true)
    expect(scorePassword("Abcdefg1").level).toBe("good")
  })

  it("adds strong when a special character is present", () => {
    expect(scorePassword("Abcdefg1!").level).toBe("strong")
    expect(HINTS.every((h) => h.test("Abcdefg1!"))).toBe(true)
  })
})
