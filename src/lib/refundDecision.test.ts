import { describe, expect, it } from "vitest"
import { refundDecision, refundErrorMessage, sortRefunds } from "./refundDecision"

const pending = (requestedBy: string | null = "cashier-1") => ({ status: "PendingApproval", requestedBy })
const manager = { id: "manager-1", role: "branchManager" as const }
const admin = { id: "owner-1", role: "brandAdmin" as const }

describe("refundDecision", () => {
  it("lets the branch manager decide when the brand leaves exceptions to managers", () => {
    expect(refundDecision(pending(), "BranchManager", manager)).toEqual({ canApprove: true, canReject: true, reason: null })
  })

  it("keeps the manager out when the brand admin must decide", () => {
    const d = refundDecision(pending(), "BrandAdmin", manager)
    expect([d.canApprove, d.canReject]).toEqual([false, false])
    expect(d.reason).toMatch(/chủ thương hiệu/)
    expect(refundDecision(pending(), "BrandAdmin", admin).canApprove).toBe(true)
  })

  it("does not let a manager approve their own request, but lets them turn it down", () => {
    const d = refundDecision(pending("manager-1"), "BranchManager", manager)
    expect([d.canApprove, d.canReject]).toEqual([false, true])
    expect(d.reason).toMatch(/người khác duyệt/)
  })

  it("lets the brand admin approve a request they made", () => {
    expect(refundDecision(pending("owner-1"), "BranchManager", admin).canApprove).toBe(true)
  })

  it("offers nothing on a refund that is already decided, or to a cashier", () => {
    expect(refundDecision({ status: "Succeeded", requestedBy: null }, "BranchManager", manager)).toEqual({ canApprove: false, canReject: false, reason: null })
    expect(refundDecision(pending(), "BranchManager", { id: "c", role: "cashier" }).canApprove).toBe(false)
  })
})

describe("refundErrorMessage", () => {
  it("translates the Payment service refusals", () => {
    expect(refundErrorMessage({ message: "x", code: "refund.self_approval" })).toMatch(/tự duyệt/)
    expect(refundErrorMessage({ message: "x", code: "refund.not_pending" })).toMatch(/đã được xử lý/)
  })
  it("keeps other messages", () => {
    expect(refundErrorMessage({ message: "Lỗi mạng" })).toBe("Lỗi mạng")
  })
})

describe("sortRefunds", () => {
  it("puts pending refunds first, oldest first, then the rest newest first", () => {
    const rows = [
      { id: "a", status: "Succeeded", createdAtUtc: "2026-11-01T10:00:00Z" },
      { id: "b", status: "PendingApproval", createdAtUtc: "2026-11-02T10:00:00Z" },
      { id: "c", status: "Rejected", createdAtUtc: "2026-11-03T10:00:00Z" },
      { id: "d", status: "PendingApproval", createdAtUtc: "2026-11-01T09:00:00Z" },
    ]
    expect(sortRefunds(rows).map((r) => r.id)).toEqual(["d", "b", "c", "a"])
  })
})
