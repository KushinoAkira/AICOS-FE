import { describe, expect, it } from "vitest"
import { RESERVED_SLUGS, normalizeTenantSlug, tenantSlugFromPathname, validateTenantSlug } from "./tenantSlug"

describe("validateTenantSlug", () => {
  it("accepts valid slugs", () => {
    expect(validateTenantSlug("caphenha")).toEqual({ ok: true, slug: "caphenha" })
    expect(validateTenantSlug("Tra-Sua-May")).toEqual({ ok: true, slug: "tra-sua-may" })
    expect(validateTenantSlug("a".repeat(40)).ok).toBe(true)
  })

  it("rejects unknown / malformed / reserved", () => {
    expect(validateTenantSlug("")).toMatchObject({ ok: false, issue: "empty" })
    expect(validateTenantSlug("ab")).toMatchObject({ ok: false, issue: "length" })
    expect(validateTenantSlug("a".repeat(41))).toMatchObject({ ok: false, issue: "length" })
    expect(validateTenantSlug("Bad_Slug")).toMatchObject({ ok: false, issue: "format" })
    expect(validateTenantSlug("-leading")).toMatchObject({ ok: false, issue: "format" })
    expect(validateTenantSlug("trailing-")).toMatchObject({ ok: false, issue: "format" })
    expect(validateTenantSlug("admin")).toMatchObject({ ok: false, issue: "reserved" })
    expect(validateTenantSlug("API")).toMatchObject({ ok: false, issue: "reserved" })
    for (const s of ["login", "t", "swagger", "health"]) {
      expect(RESERVED_SLUGS.has(s)).toBe(true)
      expect(validateTenantSlug(s).ok).toBe(false)
    }
  })
})

describe("tenantSlugFromPathname", () => {
  it("reads the first segment when it is a tenant slug", () => {
    expect(tenantSlugFromPathname("/caphenha/login")).toBe("caphenha")
    expect(tenantSlugFromPathname("/caphenha/brand/dashboard")).toBe("caphenha")
    expect(tenantSlugFromPathname("/admin/login")).toBeNull()
    expect(tenantSlugFromPathname("/t/abc")).toBeNull()
    expect(tenantSlugFromPathname("/")).toBeNull()
    expect(tenantSlugFromPathname("/platform/tenants")).toBeNull()
  })

  it("normalizeTenantSlug mirrors validation", () => {
    expect(normalizeTenantSlug("  CapheNha ")).toBe("caphenha")
    expect(normalizeTenantSlug("admin")).toBeNull()
  })
})
