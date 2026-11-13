import { describe, expect, it } from "vitest"
import { bankAccountError, finalizeBlocker, periodOf } from "./payrollPeriod"
import type { PayrollPeriod } from "./api/manage"

const period = (id: string, status: PayrollPeriod["status"], from = "2026-10-01", to = "2026-10-31", at = "2026-11-01T00:00:00Z"): PayrollPeriod => ({
  id, branchId: "b1", from, to, status, finalizedAtUtc: at, finalizedBy: null, reopenedAtUtc: null, reopenReason: null,
  totalNet: 0, totalPaid: 0, employees: 0, paid: 0, lines: null, warnings: [],
})
const october = { from: "2026-10-01", to: "2026-10-31" }

describe("periodOf", () => {
  it("prefers the finalized period over an older reopened one of the same month", () => {
    expect(periodOf([period("old", "Reopened"), period("new", "Finalized", undefined, undefined, "2026-11-03T00:00:00Z")], october)?.id).toBe("new")
  })
  it("falls back to the latest reopened one", () => {
    expect(periodOf([period("a", "Reopened", undefined, undefined, "2026-11-01T00:00:00Z"), period("b", "Reopened", undefined, undefined, "2026-11-04T00:00:00Z")], october)?.id).toBe("b")
  })
  it("ignores periods of other ranges", () => {
    expect(periodOf([period("sep", "Paid", "2026-09-01", "2026-09-30")], october)).toBeNull()
  })
})

describe("finalizeBlocker", () => {
  it("refuses a month that is not over", () => {
    expect(finalizeBlocker(october, 0, "2026-10-31")).toMatch(/tháng đã qua/)
  })
  it("refuses while shifts wait for review", () => {
    expect(finalizeBlocker(october, 3, "2026-11-13")).toBe("Còn 3 ca chưa duyệt.")
  })
  it("allows a past month with every shift reviewed", () => {
    expect(finalizeBlocker(october, 0, "2026-11-01")).toBeNull()
  })
})

describe("bankAccountError", () => {
  const ok = { bankName: "VCB", accountNumber: "0123456789", accountName: "NGUYEN VAN AN" }
  it("accepts all three parts, or none", () => {
    expect(bankAccountError(ok)).toBeNull()
    expect(bankAccountError({ bankName: null, accountNumber: null, accountName: null })).toBeNull()
  })
  it("refuses a partial account", () => {
    expect(bankAccountError({ ...ok, accountName: " " })).toMatch(/Nhập đủ/)
  })
  it("refuses a number with spaces or of the wrong length", () => {
    expect(bankAccountError({ ...ok, accountNumber: "0123 456" })).toMatch(/6-30/)
    expect(bankAccountError({ ...ok, accountNumber: "12345" })).toMatch(/6-30/)
    expect(bankAccountError({ ...ok, accountNumber: "1".repeat(31) })).toMatch(/6-30/)
  })
})
