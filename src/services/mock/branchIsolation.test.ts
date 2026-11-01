import { describe, expect, it } from "vitest"
import { denyUnless, effectiveBranchId, issueSession, isBranchLockedRole } from "./auth"
import * as db from "./db"

function req(auth?: string, branch?: string) {
  const headers: Record<string, string> = {}
  if (auth) headers.Authorization = auth
  if (branch) headers["X-Branch"] = branch
  return new Request("https://aicos.local/api/v1/x", { headers })
}

describe("branch isolation (BR-05)", () => {
  it("treats floor staff as branch-locked", () => {
    expect(isBranchLockedRole("Cashier")).toBe(true)
    expect(isBranchLockedRole("Barista")).toBe(true)
    expect(isBranchLockedRole("BranchManager")).toBe(true)
    expect(isBranchLockedRole("BrandAdmin")).toBe(false)
  })

  it("ignores forged X-Branch for locked staff and uses account branch", () => {
    const cashier = db.users.find((u) => u.email === "cashier@aicos.local")!
    expect(cashier.branchId).toBe(db.BRANCH_Q1)
    const tok = issueSession(cashier).accessToken
    expect(effectiveBranchId(req(`Bearer ${tok}`, db.BRANCH_TD))).toBe(db.BRANCH_Q1)
    expect(denyUnless(req(`Bearer ${tok}`, db.BRANCH_TD), "authenticated")?.status).toBe(403)
  })

  it("allows Brand Admin X-Branch only inside their tenant", () => {
    const admin = db.findUserByEmailInTenant("brand@aicos.local", "caphenha")!
    const tok = issueSession(admin).accessToken
    expect(effectiveBranchId(req(`Bearer ${tok}`, db.BRANCH_Q1))).toBe(db.BRANCH_Q1)
    expect(effectiveBranchId(req(`Bearer ${tok}`, db.BRANCH_MAY))).toBeNull()
    expect(denyUnless(req(`Bearer ${tok}`, db.BRANCH_MAY), "authenticated")?.status).toBe(403)
    expect(denyUnless(req(`Bearer ${tok}`, db.BRANCH_Q1), "authenticated")).toBeNull()
  })
})
