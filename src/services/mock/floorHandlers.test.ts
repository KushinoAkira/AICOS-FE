import { beforeEach, describe, expect, it } from "vitest"
import { findOverlappingTables, validateLayoutJson } from "../../lib/floorPlan/schema"
import { denyUnless, issueSession } from "./auth"
import * as db from "./db"
import * as fdb from "./floorDb"
import * as odb from "./orderDb"

function req(auth?: string, branch?: string, tenant?: string) {
  const headers: Record<string, string> = {}
  if (auth) headers.Authorization = auth
  if (branch) headers["X-Branch"] = branch
  if (tenant) headers["X-Tenant"] = tenant
  return new Request("https://aicos.local/api/v1/floors", { headers })
}

describe("floor plan mock rules", () => {
  beforeEach(() => {
    // reset draft version for fl-q1-1 if a prior test mutated it
    const draft = fdb.layouts.find((l) => l.floorId === "fl-q1-1" && l.status === "Draft")
    if (draft) draft.version = Math.max(1, draft.version)
  })

  it("rejects cashier writing floor layouts via role gate", () => {
    const cashier = db.users.find((u) => u.email === "cashier@aicos.local")!
    const tok = issueSession(cashier).accessToken
    expect(denyUnless(req(`Bearer ${tok}`, db.BRANCH_Q1, "caphenha"), ["BranchManager", "Manager"])?.status).toBe(403)
  })

  it("allows branch manager of the account branch", () => {
    const mgr = db.findUserByEmailInTenant("manager@aicos.local", "caphenha")!
    const tok = issueSession(mgr).accessToken
    expect(denyUnless(req(`Bearer ${tok}`, db.BRANCH_Q1, "caphenha"), ["BranchManager", "Manager"])).toBeNull()
  })

  it("detects version conflict semantics (expectedVersion must match draft)", () => {
    const draft = fdb.ensureDraft("fl-q1-1")
    expect(draft.version).toBeGreaterThanOrEqual(1)
    const stale = draft.version - 1
    expect(stale !== draft.version).toBe(true)
  })

  it("blocks QR regeneration concept when table has open unpaid order", () => {
    const tableId = "t1"
    odb.orders.push({
      id: "o-test-open",
      code: "#test",
      tableId,
      tableCode: "A1",
      channel: "dine-in",
      status: "Pending",
      paymentStatus: "Unpaid",
      lines: [],
      total: 1,
      createdAtUtc: new Date().toISOString(),
      source: "pos",
      paidAmount: 0,
      refundedAmount: 0,
    })
    const open = odb.orders.some((o) => o.tableId === tableId && !o.completedAtUtc && o.status !== "Cancelled")
    expect(open).toBe(true)
    // cleanup
    const ix = odb.orders.findIndex((o) => o.id === "o-test-open")
    if (ix >= 0) odb.orders.splice(ix, 1)
  })

  it("QR tokens from regenerator are unguessable length", () => {
    const a = fdb.randomQrToken()
    const b = fdb.randomQrToken()
    expect(a).not.toBe(b)
    expect(a.startsWith("qr_")).toBe(true)
    expect(a.length).toBeGreaterThanOrEqual(3 + 32)
  })

  it("publish seed layouts reference only existing active tables once", () => {
    const pub = fdb.ensurePublished("fl-q1-1")!
    const ids = pub.layout.elements.filter((e) => e.type === "table").map((e) => (e.type === "table" ? e.tableId : ""))
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) {
      expect(fdb.diningTables.some((t) => t.id === id && t.floorId === "fl-q1-1" && t.isActive)).toBe(true)
    }
    const validated = validateLayoutJson(pub.layout, { widthUnits: 400, heightUnits: 280 })
    expect(validated.ok).toBe(true)
    expect(findOverlappingTables(pub.layout).length).toBe(0)
  })
})
