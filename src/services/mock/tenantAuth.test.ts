import { afterEach, describe, expect, it } from "vitest"
import { GENERIC_AUTH_FAIL, denyUnless, issueSession, tenantSlugOf } from "./auth"
import * as db from "./db"

function req(auth?: string, tenant?: string) {
  const headers: Record<string, string> = {}
  if (auth) headers.Authorization = auth
  if (tenant) headers["X-Tenant"] = tenant
  return new Request("https://aicos.local/api/v1/x", { headers })
}

describe("path-based tenant auth (mock)", () => {
  afterEach(() => {
    // restore highlanddemo status if a test mutates it
    const t = db.tenantBySlug("highlanddemo")
    if (t) t.status = "Suspended"
  })

  it("allows the same email under two tenants", () => {
    const a = db.findUserByEmailInTenant("brand@aicos.local", "caphenha")
    const b = db.findUserByEmailInTenant("brand@aicos.local", "trasuamay")
    expect(a?.id).toBe("u2")
    expect(b?.id).toBe("u2b")
    expect(a?.id).not.toBe(b?.id)
    expect(db.passwords[db.passwordKey("caphenha", "brand@aicos.local")]).toBe("Staff@12345")
    expect(db.passwords[db.passwordKey("trasuamay", "brand@aicos.local")]).toBe("Staff@12345")
  })

  it("scopes session tenantSlug to the user tenant", () => {
    const u = db.findUserByEmailInTenant("brand@aicos.local", "trasuamay")!
    const session = issueSession(u)
    expect(session.tenantSlug).toBe("trasuamay")
    expect(session.tenantId).toBe("t2")
    expect(tenantSlugOf(u)).toBe("trasuamay")
  })

  it("rejects X-Tenant mismatch vs session", () => {
    const u = db.findUserByEmailInTenant("cashier@aicos.local", "caphenha")!
    const tok = issueSession(u).accessToken
    const res = denyUnless(req(`Bearer ${tok}`, "trasuamay"), "authenticated")
    expect(res?.status).toBe(403)
  })

  it("rejects Suspended tenant for existing sessions", () => {
    // Attach a fake staff user to highlanddemo for the test
    const suspended = db.users.find((u) => u.id === "u2")!
    const prev = db.tenantSlugOfUserId[suspended.id]
    db.tenantSlugOfUserId[suspended.id] = "highlanddemo"
    const tok = issueSession(suspended).accessToken
    const res = denyUnless(req(`Bearer ${tok}`, "highlanddemo"), "authenticated")
    expect(res?.status).toBe(403)
    db.tenantSlugOfUserId[suspended.id] = prev
  })

  it("isolates branch lists by tenant ownership map", () => {
    expect(db.branchesOfTenant.caphenha).toContain(db.BRANCH_Q1)
    expect(db.branchesOfTenant.trasuamay).toContain(db.BRANCH_MAY)
    expect(db.branchesOfTenant.caphenha).not.toContain(db.BRANCH_MAY)
  })

  it("exposes a generic auth failure message", () => {
    expect(GENERIC_AUTH_FAIL.length).toBeGreaterThan(8)
  })
})
