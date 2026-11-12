import { describe, expect, it } from "vitest"
import { brandCodeOf, branchOrderLink, tenantIdOfToken } from "./branchQr"

describe("branchOrderLink", () => {
  it("opens the brand menu with the branch chosen", () => {
    expect(branchOrderLink("demo", "b-1", "https://aicos.vn/")).toBe("https://aicos.vn/b/demo?branch=b-1")
  })
})

describe("brandCodeOf", () => {
  const brands = [{ id: "AAA-1", slug: "demo" }, { id: "bbb-2", slug: "other" }]
  it("finds the code of the account's brand, whatever the case of the id", () => {
    expect(brandCodeOf(brands, "aaa-1")).toBe("demo")
  })
  it("gives nothing when the brand is not listed or the account has none", () => {
    expect(brandCodeOf(brands, "zzz")).toBeNull()
    expect(brandCodeOf(brands, null)).toBeNull()
  })
})

describe("tenantIdOfToken", () => {
  const token = (payload: object) => `x.${btoa(JSON.stringify(payload)).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_")}.y`
  it("reads the tenant_id claim", () => {
    expect(tenantIdOfToken(token({ sub: "u", tenant_id: "aaa-1" }))).toBe("aaa-1")
  })
  it("gives nothing for a token without it or a broken token", () => {
    expect(tenantIdOfToken(token({ sub: "u" }))).toBeNull()
    expect(tenantIdOfToken("nope")).toBeNull()
    expect(tenantIdOfToken(null)).toBeNull()
  })
})
