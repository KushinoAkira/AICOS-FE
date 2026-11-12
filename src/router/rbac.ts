import type { Page } from "./pages"
import type { Role } from "./roles"

/**
 * Role-based access control for every screen (proposal v2 roles).
 *   "public"        - anyone (login / sign-up / reset / guest QR)
 *   "authenticated" - any signed-in user
 *   Role[]          - only these roles
 * The server remains the source of truth; this only decides which screens are reachable.
 */
type Access = "public" | "authenticated" | Role[]

const SA: Role[] = ["superAdmin"]
const BA: Role[] = ["brandAdmin"]
const BM: Role[] = ["branchManager"]
const BARISTA: Role[] = ["barista"]
const CASHIER: Role[] = ["cashier"]
const CUSTOMER: Role[] = ["customer"]
const BRAND_AND_BRANCH: Role[] = ["brandAdmin", "branchManager"]

export const PAGE_ACCESS: Record<Page, Access> = {
  landing: "public",
  terms: "public",
  privacy: "public",
  contact: "public",
  "staff-entry": "public",
  "register-brand": "public",
  login: "public",
  "admin-login": "public",
  "auth-customer-register": "public",
  "auth-customer-login": "public",
  "auth-otp": "public",
  "auth-forgot-password": "public",
  "auth-reset-password": "public",
  "guest-menu": "public",
  "guest-order-status": "public",
  "brand-menu": "public",
  "order-start": "public",

  "account-settings": "authenticated",
  "staff-notifications": ["superAdmin", "brandAdmin", "branchManager", "barista", "cashier"],

  "customer-shops": CUSTOMER,
  "customer-brands": CUSTOMER,
  "customer-menu": CUSTOMER,
  "customer-tracking": CUSTOMER,
  "customer-loyalty": CUSTOMER,
  "customer-feedback": CUSTOMER,
  "customer-for-you": CUSTOMER,
  "customer-notifications": CUSTOMER,
  "customer-profile": CUSTOMER,

  "barista-queue": BARISTA,

  "cashier-pos": CASHIER,
  /** A counter tablet turned to face the customer. Branch accounts order for their branch; a brand admin picks any branch. */
  kiosk: ["cashier", "branchManager", "brandAdmin"],
  "cashier-payments": CASHIER,
  "cashier-tables": CASHIER,
  "cashier-serve": CASHIER,
  // Shared attendance / replacement screen (UC-47/48/31). Cash closing inside stays cashier-only.
  "cashier-shift": [...CASHIER, ...BARISTA],
  /** Published layout + live status; Brand Admin read-only with branch picker. */
  "floor-plan-view": [...CASHIER, ...BARISTA, ...BA],

  "manager-dashboard": BM,
  "manager-staff": BM,
  "branch-schedule": BM,
  "branch-shift-requests": BM,
  "manager-payroll": BM,
  "manager-payroll-detail": BM,
  "branch-tables": BRAND_AND_BRANCH,
  "branch-tables-print": BRAND_AND_BRANCH,
  "branch-floor-plan": BM,
  "branch-pickup": BM,
  "branch-orders": BM,
  "branch-attendance": BM,
  "branch-cash-closings": BM,

  "manager-menu": BRAND_AND_BRANCH,
  "manager-reports": BRAND_AND_BRANCH,
  "manager-feedback": BRAND_AND_BRANCH,

  "brand-dashboard": BA,
  "brand-profile": BA,
  "admin-branches": BA,
  "admin-users": BA,
  "brand-pickup": BA,
  "brand-promotions": BA,
  "brand-loyalty": BA,
  "brand-subscription": BA,
  "brand-cancel-policy": BA,
  "brand-pay-rules": BA,
  "brand-merchant": BA,
  "admin-logs": BA,
  "brand-reconciliation": BA,

  "platform-tenants": SA,
  "platform-plans": SA,
  "platform-subscriptions": SA,
  "platform-providers": SA,
  "platform-health": SA,
  "platform-revenue": SA,
  "platform-audit": SA,
}

/** Landing page after login, per role. */
export const HOME_PAGE: Record<Role, Page> = {
  superAdmin: "platform-tenants",
  brandAdmin: "brand-dashboard",
  branchManager: "manager-dashboard",
  barista: "barista-queue",
  cashier: "cashier-pos",
  customer: "customer-shops",
}

export function canAccess(page: Page, role: Role | null): boolean {
  const access = PAGE_ACCESS[page]
  if (access === "public") return true
  if (role === null) return false
  return access === "authenticated" || access.includes(role)
}

export const isPublicPage = (page: Page) => PAGE_ACCESS[page] === "public"

/**
 * Which login portal an anonymous visitor should use when they hit a protected URL.
 * Staff and customer portals stay separate — never send a customer deep-link to staff login.
 * Super Admin platform pages go to `/admin/login`.
 */
export function loginPageFor(page: Page): Page {
  if (page.startsWith("customer-")) return "auth-customer-login"
  if (page.startsWith("platform-")) return "admin-login"
  if (page === "login" || page === "staff-entry" || page === "admin-login") return page
  return "login"
}

/**
 * Auth entry pages a signed-in user should not see again (bounced to their home).
 * Landing stays reachable so `/` always opens the marketing home, even when a customer session exists.
 *
 * Note: readable URLs under `/{slug}/...` are intentional. Authorization is enforced by
 * `canAccess` + the App guard (and by the API). Obfuscating paths is not access control.
 */
export const GUEST_ONLY_PAGES: Page[] = ["staff-entry", "login", "admin-login", "auth-customer-login", "auth-customer-register"]
