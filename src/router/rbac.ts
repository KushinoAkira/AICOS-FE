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
  "register-brand": "public",
  login: "public",
  "auth-customer-register": "public",
  "auth-customer-login": "public",
  "auth-otp": "public",
  "auth-forgot-password": "public",
  "auth-reset-password": "public",
  "guest-menu": "public",
  "guest-order-status": "public",
  "brand-menu": "public",
  "order-start": "public",
  "pay-result": "public",

  "account-settings": "authenticated",
  "staff-notifications": ["superAdmin", "brandAdmin", "branchManager", "barista", "cashier"],

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
  "cashier-shift": [...CASHIER, ...BARISTA],
  "staff-orders": [...CASHIER, ...BARISTA],
  /** Every employee of a branch reads their own payslips and sets the account their salary goes to. */
  "my-payslips": [...CASHIER, ...BARISTA, ...BM],

  "manager-dashboard": BM,
  "manager-staff": BM,
  "branch-schedule": BM,
  "branch-shift-requests": BM,
  "manager-payroll": BM,
  "manager-payroll-detail": BM,
  "branch-tables": BRAND_AND_BRANCH,
  "branch-tables-print": BRAND_AND_BRANCH,
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
  customer: "customer-menu",
}

export function canAccess(page: Page, role: Role | null): boolean {
  const access = PAGE_ACCESS[page]
  if (access === "public") return true
  if (role === null) return false
  return access === "authenticated" || access.includes(role)
}

export const isPublicPage = (page: Page) => PAGE_ACCESS[page] === "public"

/** Public pages a signed-in user should not see again (they are bounced to their home page). */
export const GUEST_ONLY_PAGES: Page[] = ["landing", "login", "auth-customer-login", "auth-customer-register"]
