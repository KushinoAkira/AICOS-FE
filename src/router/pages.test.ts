import { describe, expect, it } from "vitest"
import { matchPage, PAGE_PATHS, pageNeedsTenant } from "./pages"

describe("matchPage", () => {
  it("matches tenant staff login and app routes", () => {
    expect(matchPage("/caphenha/login")).toEqual({ page: "login", params: { tenantSlug: "caphenha" } })
    expect(matchPage("/caphenha/brand/dashboard")?.page).toBe("brand-dashboard")
    expect(matchPage("/trasuamay/cashier/pos")?.params.tenantSlug).toBe("trasuamay")
  })

  it("matches admin, guest, and platform routes without tenant", () => {
    expect(matchPage("/admin/login")).toEqual({ page: "admin-login", params: {} })
    expect(matchPage("/staff-login")?.page).toBe("staff-entry")
    expect(matchPage("/t/abc123")?.page).toBe("guest-menu")
    expect(matchPage("/t/abc123/status")).toEqual({ page: "guest-order-status", params: { token: "abc123" } })
    expect(matchPage("/platform/tenants")?.page).toBe("platform-tenants")
  })

  it("marks tenant-scoped pages", () => {
    expect(pageNeedsTenant("login")).toBe(true)
    expect(pageNeedsTenant("admin-login")).toBe(false)
    expect(pageNeedsTenant("platform-tenants")).toBe(false)
    expect(PAGE_PATHS["guest-menu"]).toBe("/t/:token")
  })
})
