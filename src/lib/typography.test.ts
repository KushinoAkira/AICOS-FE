import { describe, expect, it } from "vitest"
import { NBSP, keep, protectOrphans } from "./typography"

describe("protectOrphans", () => {
  it("keeps cà phê on one line", () => {
    expect(protectOrphans("chuỗi cà phê thông minh")).toContain(`cà${NBSP}phê`)
  })

  it("keeps multi-word compounds", () => {
    const out = protectOrphans("tới quầy pha chế và tạo tài khoản nhân viên")
    expect(out).toContain(`quầy${NBSP}pha${NBSP}chế`)
    expect(out).toContain(`tài${NBSP}khoản`)
    expect(out).toContain(`nhân${NBSP}viên`)
  })

  it("glues short words to the next word", () => {
    expect(protectOrphans("cho bạn")).toBe(`cho${NBSP}bạn`)
  })

  it("keep joins explicit words", () => {
    expect(keep("cà", "phê")).toBe(`cà${NBSP}phê`)
  })
})
