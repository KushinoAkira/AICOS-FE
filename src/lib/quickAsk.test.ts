import { describe, expect, it } from "vitest"
import type { Plan } from "./api/platform"
import { fold, quickAsk } from "./quickAsk"

const plans: Plan[] = [
  { id: "p1", name: "Khởi đầu", monthlyFee: 499000, billingCycle: "Monthly", maxBranches: 1, maxUsers: 10, graceDays: 7 },
  { id: "p2", name: "Chuỗi", monthlyFee: 1490000, billingCycle: "Monthly", maxBranches: 5, maxUsers: 50, graceDays: 7 },
]

describe("quickAsk", () => {
  it("folds diacritics", () => expect(fold("Đăng nhập Giá")).toBe("dang nhap gia"))
  it("answers price questions from the live plans", () => {
    const r = quickAsk("Giá bao nhiêu một tháng?", plans)
    expect(r.length).toBeGreaterThan(0)
    expect(r[0].body).toMatch(/499\.000|1\.490\.000/)
  })
  it("works without diacritics", () => expect(quickAsk("khach co phai tai app khong", plans)[0].title).toMatch(/ứng dụng/))
  it("finds the trial period", () => expect(quickAsk("dung thu mien phi bao lau", plans).map((a) => a.body).join(" ")).toMatch(/14 ngày/))
  it("returns nothing for unrelated text", () => expect(quickAsk("thời tiết hôm nay thế nào", plans)).toEqual([]))
  it("returns nothing for empty input", () => expect(quickAsk("   ", plans)).toEqual([]))
})
