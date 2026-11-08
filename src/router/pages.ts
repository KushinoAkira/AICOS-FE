/**
 * Single source of truth for every screen of the AICOS web app:
 * page id (used by the `navigate(page)` prop) -> URL path.
 */
export const PAGE_PATHS = {
  landing: "/",
  terms: "/terms",
  privacy: "/privacy",
  contact: "/contact",
  "register-brand": "/register-brand",
  login: "/login",

  "auth-customer-register": "/sign-up",
  "auth-customer-login": "/customer-login",
  "auth-otp": "/auth/otp",
  "auth-forgot-password": "/auth/forgot-password",
  "auth-reset-password": "/reset-password/:token",

  "account-settings": "/account-settings",
  "staff-notifications": "/staff/notifications",

  // Guest (no account, table QR) - UC-23/24/26/27
  "guest-menu": "/q/:token",
  "guest-order-status": "/q/:token/status",

  // Public menu of one brand: anyone browses, ordering needs a customer account
  "brand-menu": "/b/:brandSlug",

  // Customer
  "customer-brands": "/brands",
  "customer-menu": "/menu",
  "customer-tracking": "/orders",
  "customer-loyalty": "/loyalty",
  "customer-feedback": "/feedback",
  "customer-for-you": "/for-you",
  "customer-notifications": "/notifications",
  "customer-profile": "/profile",

  // Barista
  "barista-queue": "/barista/queue",

  // Cashier
  "cashier-pos": "/cashier/pos",
  kiosk: "/kiosk",
  "cashier-payments": "/cashier/payments",
  "cashier-tables": "/cashier/tables",
  "cashier-serve": "/cashier/serve",
  "cashier-shift": "/cashier/shift",

  // Branch Manager
  "manager-dashboard": "/branch/dashboard",
  "manager-staff": "/branch/staff",
  "branch-schedule": "/branch/schedule",
  "branch-shift-requests": "/branch/shift-requests",
  "manager-payroll": "/branch/payroll",
  "manager-payroll-detail": "/branch/payroll-detail",
  "branch-tables": "/branch/tables",
  "branch-tables-print": "/branch/tables/print",
  "branch-pickup": "/branch/pickup-settings",
  "branch-orders": "/branch/orders",
  "branch-attendance": "/branch/attendance",
  "branch-cash-closings": "/branch/cash-closings",

  // Shared Brand Admin + Branch Manager (scope follows the role)
  "manager-menu": "/menu-management",
  "manager-reports": "/reports",
  "manager-feedback": "/branch/feedback",

  // Brand Admin
  "brand-dashboard": "/brand/dashboard",
  "brand-profile": "/brand/profile",
  "admin-branches": "/brand/branches",
  "admin-users": "/brand/accounts",
  "brand-pickup": "/brand/pickup-settings",
  "brand-promotions": "/brand/promotions",
  "brand-loyalty": "/brand/loyalty",
  "brand-subscription": "/brand/subscription",
  "brand-cancel-policy": "/brand/cancel-policy",
  "brand-pay-rules": "/brand/pay-rules",
  "brand-merchant": "/brand/merchant",
  "admin-logs": "/brand/audit",
  "brand-reconciliation": "/brand/reconciliation",

  // Super Admin (platform)
  "platform-tenants": "/platform/tenants",
  "platform-plans": "/platform/plans",
  "platform-subscriptions": "/platform/subscriptions",
  "platform-providers": "/platform/payment-providers",
  "platform-health": "/platform/health",
  "platform-revenue": "/platform/revenue",
  "platform-audit": "/platform/audit",} as const

export type Page = keyof typeof PAGE_PATHS

/** State carried through the router on `navigate()` (survives refresh, unlike component state). */
export interface NavigationState {
  from?: Page
}

const PATH_TO_PAGE = new Map<string, Page>(
  (Object.entries(PAGE_PATHS) as [Page, string][]).map(([page, path]) => [path, page]),
)

export function pageFromPath(pathname: string): Page | undefined {
  return PATH_TO_PAGE.get(pathname.replace(/\/+$/, "") || "/")
}
