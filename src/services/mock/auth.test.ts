import { describe, expect, it } from "vitest"
import { BRAND_STAFF, CUSTOMER_ONLY, FLOOR_STAFF, PLATFORM_ADMIN, denyUnless, issueSession, userFromRequest } from "./auth"
import * as db from "./db"

function req(auth?: string) {
  return new Request("https://aicos.local/api/v1/x", {
    headers: auth ? { Authorization: auth } : {},
  })
}

describe("mock auth gate", () => {
  it("rejects predictable mock-<userId> forgery", () => {
    expect(userFromRequest(req("Bearer mock-u1"))).toBeNull()
    expect(userFromRequest(req("Bearer mock-u6"))).toBeNull()
    expect(userFromRequest(req())).toBeNull()
  })

  it("resolves user only from issued opaque tokens", () => {
    const customer = db.users.find((u) => u.email === "customer@aicos.local")!
    const session = issueSession(customer)
    expect(userFromRequest(req(`Bearer ${session.accessToken}`))?.email).toBe("customer@aicos.local")
    expect(session.accessToken.startsWith("atk_")).toBe(true)
    expect(session.accessToken.includes(customer.id)).toBe(false)
  })

  it("rejects anonymous and wrong-role callers", () => {
    expect(denyUnless(req(), PLATFORM_ADMIN)?.status).toBe(401)

    const customer = db.users.find((u) => u.email === "customer@aicos.local")!
    const admin = db.users.find((u) => u.email === "admin@aicos.local")!
    const customerTok = issueSession(customer).accessToken
    const adminTok = issueSession(admin).accessToken

    expect(denyUnless(req(`Bearer ${customerTok}`), PLATFORM_ADMIN)?.status).toBe(403)
    expect(denyUnless(req(`Bearer ${adminTok}`), PLATFORM_ADMIN)).toBeNull()
    expect(denyUnless(req(`Bearer ${customerTok}`), CUSTOMER_ONLY)).toBeNull()
  })

  it("lets cashier read the brand menu used by POS", () => {
    const cashier = db.users.find((u) => u.email === "cashier@aicos.local")!
    const tok = issueSession(cashier).accessToken
    expect(denyUnless(req(`Bearer ${tok}`), [...BRAND_STAFF, ...FLOOR_STAFF])).toBeNull()
    expect(denyUnless(req(`Bearer ${tok}`), BRAND_STAFF)?.status).toBe(403)
  })
})
