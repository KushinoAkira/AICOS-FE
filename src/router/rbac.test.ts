import { describe, expect, it } from "vitest"
import { canAccess, loginPageFor, PAGE_ACCESS } from "./rbac"
import type { Page } from "./pages"
import type { Role } from "./roles"

const STAFF: Role[] = ["superAdmin", "brandAdmin", "branchManager", "barista", "cashier"]
const CUSTOMER: Role = "customer"

describe("canAccess", () => {
  it("allows anyone on public pages", () => {
    expect(canAccess("landing", null)).toBe(true)
    expect(canAccess("login", CUSTOMER)).toBe(true)
    expect(canAccess("guest-menu", null)).toBe(true)
  })

  it("blocks anonymous users from protected pages", () => {
    expect(canAccess("customer-menu", null)).toBe(false)
    expect(canAccess("cashier-pos", null)).toBe(false)
    expect(canAccess("brand-dashboard", null)).toBe(false)
    expect(canAccess("platform-tenants", null)).toBe(false)
  })

  it("keeps customer out of staff and platform screens", () => {
    for (const page of Object.keys(PAGE_ACCESS) as Page[]) {
      const access = PAGE_ACCESS[page]
      if (access === "public" || access === "authenticated") continue
      if (access.includes(CUSTOMER)) {
        expect(canAccess(page, CUSTOMER)).toBe(true)
      } else {
        expect(canAccess(page, CUSTOMER)).toBe(false)
      }
    }
  })

  it("keeps staff out of customer-only screens", () => {
    const customerOnly = (Object.keys(PAGE_ACCESS) as Page[]).filter((p) => {
      const a = PAGE_ACCESS[p]
      return Array.isArray(a) && a.length === 1 && a[0] === "customer"
    })
    for (const page of customerOnly) {
      for (const role of STAFF) {
        expect(canAccess(page, role)).toBe(false)
      }
    }
  })

  it("allows account-settings for any signed-in role", () => {
    expect(canAccess("account-settings", null)).toBe(false)
    expect(canAccess("account-settings", CUSTOMER)).toBe(true)
    expect(canAccess("account-settings", "cashier")).toBe(true)
  })

  it("lets barista open the shared shift screen from the sidebar", () => {
    expect(canAccess("cashier-shift", "barista")).toBe(true)
    expect(canAccess("cashier-shift", "cashier")).toBe(true)
    expect(canAccess("cashier-shift", "customer")).toBe(false)
  })
})

describe("loginPageFor", () => {
  it("sends customer deep-links to the customer portal", () => {
    expect(loginPageFor("customer-menu")).toBe("auth-customer-login")
    expect(loginPageFor("customer-loyalty")).toBe("auth-customer-login")
  })

  it("sends staff deep-links to the staff portal", () => {
    expect(loginPageFor("cashier-pos")).toBe("login")
    expect(loginPageFor("brand-dashboard")).toBe("login")
    expect(loginPageFor("platform-tenants")).toBe("login")
  })

  it("never routes guest QR or marketing pages through customer auth by mistake", () => {
    expect(loginPageFor("guest-menu")).toBe("login")
    expect(loginPageFor("landing")).toBe("login")
    expect(loginPageFor("contact")).toBe("login")
  })
})
