/**
 * Single source of truth for every screen of the AICOS web app:
 * page id (used by the `navigate(page)` prop) -> URL path.
 *
 * Tenant-scoped staff/customer app routes live under `/:tenantSlug/...`.
 * Platform / marketing / Super Admin / guest QR stay outside the slug.
 */
import { matchPath } from "react-router"
import { getActiveBrandSlug } from "../lib/brand"
import { normalizeTenantSlug } from "../lib/tenantSlug"

export const PAGE_PATHS = {
  landing: "/",
  terms: "/terms",
  privacy: "/privacy",
  contact: "/contact",

  /** Pick a brand before staff login (marketing CTA). */
  "staff-entry": "/staff-login",
  /** Brand / branch staff login — tenant from path. */
  login: "/:tenantSlug/login",
  /** Super Admin — no tenant. */
  "admin-login": "/admin/login",
  "register-brand": "/register-brand",

  "auth-customer-register": "/sign-up",
  "auth-customer-login": "/customer-login",
  "auth-otp": "/auth/otp",
  "auth-forgot-password": "/auth/forgot-password",
  "auth-reset-password": "/reset-password/:token",

  "account-settings": "/account-settings",
  "staff-notifications": "/staff/notifications",

  // Guest (no account, table QR) — token is globally unique
  "guest-menu": "/t/:token",
  "guest-order-status": "/t/:token/status",

  // Public menu of one brand: anyone browses, ordering needs a customer account
  "brand-menu": "/b/:brandSlug",
  "order-start": "/dat-mon",

  // Customer (after shop pick → under slug)
  "customer-shops": "/shops",
  "customer-brands": "/brands",
  "customer-menu": "/:tenantSlug/menu",
  "customer-tracking": "/:tenantSlug/orders",
  "customer-loyalty": "/:tenantSlug/loyalty",
  "customer-feedback": "/:tenantSlug/feedback",
  "customer-for-you": "/:tenantSlug/for-you",
  "customer-notifications": "/:tenantSlug/notifications",
  "customer-profile": "/:tenantSlug/profile",

  // Barista
  "barista-queue": "/:tenantSlug/barista/queue",

  // Cashier
  "cashier-pos": "/:tenantSlug/cashier/pos",
  kiosk: "/:tenantSlug/kiosk",
  "cashier-payments": "/:tenantSlug/cashier/payments",
  "cashier-tables": "/:tenantSlug/cashier/tables",
  "cashier-serve": "/:tenantSlug/cashier/serve",
  "cashier-shift": "/:tenantSlug/cashier/shift",

  /** Published floor plan viewer (Cashier / Barista / Brand Admin read-only). */
  "floor-plan-view": "/:tenantSlug/floor-plan",

  // Branch Manager
  "manager-dashboard": "/:tenantSlug/branch/dashboard",
  "manager-staff": "/:tenantSlug/branch/staff",
  "branch-schedule": "/:tenantSlug/branch/schedule",
  "branch-shift-requests": "/:tenantSlug/branch/shift-requests",
  "manager-payroll": "/:tenantSlug/branch/payroll",
  "manager-payroll-detail": "/:tenantSlug/branch/payroll-detail",
  "branch-tables": "/:tenantSlug/branch/tables",
  "branch-tables-print": "/:tenantSlug/branch/tables/print",
  "branch-floor-plan": "/:tenantSlug/branch/floor-plan",
  "branch-pickup": "/:tenantSlug/branch/pickup-settings",
  "branch-orders": "/:tenantSlug/branch/orders",
  "branch-attendance": "/:tenantSlug/branch/attendance",
  "branch-cash-closings": "/:tenantSlug/branch/cash-closings",

  // Shared Brand Admin + Branch Manager
  "manager-menu": "/:tenantSlug/menu-management",
  "manager-reports": "/:tenantSlug/reports",
  "manager-feedback": "/:tenantSlug/branch/feedback",

  // Brand Admin
  "brand-dashboard": "/:tenantSlug/brand/dashboard",
  "brand-profile": "/:tenantSlug/brand/profile",
  "admin-branches": "/:tenantSlug/brand/branches",
  "admin-users": "/:tenantSlug/brand/accounts",
  "brand-pickup": "/:tenantSlug/brand/pickup-settings",
  "brand-promotions": "/:tenantSlug/brand/promotions",
  "brand-loyalty": "/:tenantSlug/brand/loyalty",
  "brand-subscription": "/:tenantSlug/brand/subscription",
  "brand-cancel-policy": "/:tenantSlug/brand/cancel-policy",
  "brand-pay-rules": "/:tenantSlug/brand/pay-rules",
  "brand-merchant": "/:tenantSlug/brand/merchant",
  "admin-logs": "/:tenantSlug/brand/audit",
  "brand-reconciliation": "/:tenantSlug/brand/reconciliation",

  // Super Admin (platform) — no tenant
  "platform-tenants": "/platform/tenants",
  "platform-plans": "/platform/plans",
  "platform-subscriptions": "/platform/subscriptions",
  "platform-providers": "/platform/payment-providers",
  "platform-health": "/platform/health",
  "platform-revenue": "/platform/revenue",
  "platform-audit": "/platform/audit",
} as const

export type Page = keyof typeof PAGE_PATHS

export type OtpFlow = "register" | "forgot-password"

/** State carried through the router on `navigate()` (survives refresh, unlike component state). */
export interface NavigationState {
  from?: Page
  otpFlow?: OtpFlow
}

const NEEDS_TENANT = (Object.entries(PAGE_PATHS) as [Page, string][]).filter(([, path]) => path.includes(":tenantSlug")).map(([p]) => p)

export function pageNeedsTenant(page: Page): boolean {
  return NEEDS_TENANT.includes(page)
}

/** Prefer static patterns over `/:param` so `/admin/login` is not swallowed by `/:tenantSlug/login`. */
function patternSpecificity(pattern: string): number {
  const parts = pattern.split("/").filter(Boolean)
  let score = parts.length * 10
  for (const p of parts) {
    if (p.startsWith(":")) score -= 5
    else score += 2
  }
  return score
}

const MATCH_ORDER = (Object.entries(PAGE_PATHS) as [Page, string][]).sort(
  (a, b) => patternSpecificity(b[1]) - patternSpecificity(a[1]),
)

/** Match a concrete pathname to a page id + route params. */
export function matchPage(pathname: string): { page: Page; params: Record<string, string> } | undefined {
  const clean = pathname.replace(/\/+$/, "") || "/"
  for (const [page, pattern] of MATCH_ORDER) {
    const m = matchPath({ path: pattern, end: true }, clean)
    if (m) {
      const params: Record<string, string> = {}
      for (const [k, v] of Object.entries(m.params)) {
        if (typeof v === "string") params[k] = v
      }
      // Reject reserved first segments that looked like a tenant slug in a param route.
      if (params.tenantSlug && !normalizeTenantSlug(params.tenantSlug)) continue
      return { page, params }
    }
  }
  return undefined
}

export function pageFromPath(pathname: string): Page | undefined {
  return matchPage(pathname)?.page
}

/**
 * Build a concrete URL for a page. Injects active tenant slug when the pattern needs it
 * unless `params.tenantSlug` is provided.
 */
export function pathFor(page: Page, params?: Record<string, string>): string {
  const pattern: string = PAGE_PATHS[page]
  const merged: Record<string, string> = { ...(params ?? {}) }
  if (pattern.includes(":tenantSlug") && !merged.tenantSlug) {
    const slug = getActiveBrandSlug()
    if (slug) merged.tenantSlug = slug
  }
  let path = pattern
  for (const [k, v] of Object.entries(merged)) {
    path = path.replace(`:${k}`, encodeURIComponent(v))
  }
  if (path.includes(":")) {
    // Incomplete params — fall back to staff entry / shops when slug missing.
    if (pattern.includes(":tenantSlug") && !normalizeTenantSlug(merged.tenantSlug)) {
      if (page === "login") return PAGE_PATHS["staff-entry"]
      if (page.startsWith("customer-")) return PAGE_PATHS["customer-shops"]
      return PAGE_PATHS["staff-entry"]
    }
  }
  return path
}
