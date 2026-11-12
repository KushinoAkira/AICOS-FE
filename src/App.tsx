import { Suspense, lazy, startTransition, useCallback, useEffect, type ReactElement } from "react"
import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from "react-router"
import { ToastProvider } from "./context/ToastContext"
import { ToastContainer } from "./components/ToastContainer"
import { ErrorBoundary } from "./components/ErrorBoundary"
import { homePageOf, useAuth } from "./context/AuthContext"
import { GUEST_ONLY_PAGES, canAccess, loginPageFor } from "./router/rbac"
import {
  PAGE_PATHS,
  matchPage,
  pathFor,
  type NavigationState,
  type Page,
} from "./router/pages"
import { getActiveBrandSlug, setActiveBrandSlug } from "./lib/brand"
import { tokenStore } from "./lib/api/tokenStore"

export type { Page } from "./router/pages"

const Landing = lazy(() => import("./pages/public/Landing"))
const Contact = lazy(() => import("./pages/public/Contact"))
const Terms = lazy(() => import("./pages/public/Legal").then((m) => ({ default: m.Terms })))
const Privacy = lazy(() => import("./pages/public/Legal").then((m) => ({ default: m.Privacy })))
const StaffEntry = lazy(() => import("./pages/auth/StaffEntry"))
const Login = lazy(() => import("./pages/auth/Login"))
const AdminLogin = lazy(() => import("./pages/auth/AdminLogin"))
const CustomerRegister = lazy(() => import("./pages/auth/CustomerRegister"))
const CustomerLogin = lazy(() => import("./pages/auth/CustomerLogin"))
const OTPVerification = lazy(() => import("./pages/auth/OTPVerification"))
const RegisterBrand = lazy(() => import("./pages/public/RegisterBrand"))
const CustomerBrands = lazy(() => import("./pages/customer/Brands"))
const BrandMenu = lazy(() => import("./pages/public/BrandMenu"))
const OrderStart = lazy(() => import("./pages/public/OrderStart"))
const Kiosk = lazy(() => import("./pages/kiosk/Kiosk"))
const ForgotPassword = lazy(() => import("./pages/auth/ForgotPassword"))
const ResetPassword = lazy(() => import("./pages/auth/ResetPassword"))
const AccountSettings = lazy(() => import("./pages/shared/AccountSettings"))
const StaffNotifications = lazy(() => import("./pages/shared/StaffNotifications"))

const CustomerShops = lazy(() => import("./pages/customer/ShopPicker"))
const CustomerMenu = lazy(() => import("./pages/customer/Takeaway"))
const CustomerFeedback = lazy(() => import("./pages/customer/Feedback"))
const CustomerForYou = lazy(() => import("./pages/customer/ForYou"))
const CustomerLoyalty = lazy(() => import("./pages/customer/Loyalty"))
const CustomerNotifications = lazy(() => import("./pages/customer/Notifications"))
const BranchSchedule = lazy(() => import("./pages/brand/Schedule"))
const ShiftRequests = lazy(() => import("./pages/brand/ShiftRequests"))
const CashierPayments = lazy(() => import("./pages/cashier/Payments"))
const CustomerOrderTracking = lazy(() => import("./pages/customer/Orders"))
const CustomerProfile = lazy(() => import("./pages/customer/Profile"))

const ManagerMenuManagement = lazy(() => import("./pages/brand/Menu"))
const AdminUsers = lazy(() => import("./pages/brand/Accounts"))
const AdminBranches = lazy(() => import("./pages/brand/Branches"))
const BranchPickupPage = lazy(() => import("./pages/brand/BranchPickup"))
const BrandProfile = lazy(() => import("./pages/brand/BrandProfile"))
const BrandVouchers = lazy(() => import("./pages/brand/Vouchers"))
const BrandSubscription = lazy(() => import("./pages/brand/Subscription"))
const BrandPickup = lazy(() => import("./pages/brand/SettingsPages").then((m) => ({ default: m.BrandPickup })))
const BrandLoyalty = lazy(() => import("./pages/brand/SettingsPages").then((m) => ({ default: m.BrandLoyalty })))
const BrandCancelPolicy = lazy(() => import("./pages/brand/SettingsPages").then((m) => ({ default: m.BrandCancelPolicy })))
const BrandPayRules = lazy(() => import("./pages/brand/SettingsPages").then((m) => ({ default: m.BrandPayRules })))
const BrandMerchant = lazy(() => import("./pages/brand/SettingsPages").then((m) => ({ default: m.BrandMerchant })))
const CashierPOS = lazy(() => import("./pages/cashier/POS"))
const BaristaQueue = lazy(() => import("./pages/barista/Queue"))
const GuestMenu = lazy(() => import("./pages/guest/GuestMenu"))
const GuestStatus = lazy(() => import("./pages/guest/GuestStatus"))
const BranchOrders = lazy(() => import("./pages/brand/BranchOrders"))
const BranchTables = lazy(() => import("./pages/brand/BranchTables"))
const TablesPrint = lazy(() => import("./pages/brand/TablesPrint"))
const CashierTables = lazy(() => import("./pages/cashier/Tables"))
const CashierShifts = lazy(() => import("./pages/cashier/Shifts"))
const StaffOrderHistory = lazy(() => import("./pages/cashier/OrderHistory"))
const CashierServe = lazy(() => import("./pages/cashier/Serve"))

const ManagerDashboard = lazy(() => import("./pages/manager/Dashboard"))
const ManagerReports = lazy(() => import("./pages/manager/Reports"))
const ManagerFeedback = lazy(() => import("./pages/manager/Feedback"))
const ManagerEmployees = lazy(() => import("./pages/manager/Employees"))
const ManagerPayroll = lazy(() => import("./pages/manager/Payroll"))
const ManagerPayrollDetail = lazy(() => import("./pages/manager/PayrollDetail"))
const FloorPlanEditor = lazy(() => import("./pages/manager/FloorPlanEditor"))
const FloorPlanViewer = lazy(() => import("./pages/staff/FloorPlanViewer"))
const ManagerAttendance = lazy(() => import("./pages/manager/Attendance"))
const ManagerCashClosings = lazy(() => import("./pages/manager/CashClosings"))
const BrandReconciliation = lazy(() => import("./pages/brand/Reconciliation"))

const AdminSystemLogs = lazy(() => import("./pages/admin/SystemLogs"))

const Forbidden = lazy(() => import("./pages/shared/ErrorPages").then((m) => ({ default: m.Forbidden })))
const NotFound = lazy(() => import("./pages/shared/ErrorPages").then((m) => ({ default: m.NotFound })))
const PlatformTenants = lazy(() => import("./pages/platform/Tenants"))
const PlatformPlans = lazy(() => import("./pages/platform/Plans"))
const PlatformSubscriptions = lazy(() => import("./pages/platform/Subscriptions"))
const PlatformProviders = lazy(() => import("./pages/platform/Providers"))
const PlatformHealth = lazy(() => import("./pages/platform/Health"))
const PlatformRevenue = lazy(() => import("./pages/platform/Revenue"))
const PlatformAudit = lazy(() => import("./pages/platform/Audit"))

function PageFallback() {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-0.5 overflow-hidden" role="status" aria-label="Đang tải">
      <div className="h-full w-1/3 animate-pulse" style={{ backgroundColor: "#C97B4A" }} />
    </div>
  )
}

function LegacyQrRedirect({ status }: { status?: boolean }) {
  const { token = "" } = useParams()
  return <Navigate to={status ? `/t/${encodeURIComponent(token)}/status` : `/t/${encodeURIComponent(token)}`} replace />
}

function loginPathFor(page: Page): string {
  const portal = loginPageFor(page)
  if (portal === "login") {
    const slug = getActiveBrandSlug() ?? tokenStore.get()?.tenantSlug
    if (slug) return pathFor("login", { tenantSlug: slug })
    return pathFor("staff-entry")
  }
  return pathFor(portal)
}

export default function App() {
  const location = useLocation()
  const routerNavigate = useNavigate()
  const { user, role, logout } = useAuth()

  const state = (location.state ?? {}) as NavigationState
  const matched = matchPage(location.pathname)
  const currentPage = matched?.page
  const returnPage: Page = state.from ?? (user ? homePageOf(user) : "staff-entry")

  useEffect(() => {
    const onExpired = () => {
      const slug = getActiveBrandSlug() ?? tokenStore.get()?.tenantSlug
      const target = slug ? pathFor("login", { tenantSlug: slug }) : pathFor("staff-entry")
      startTransition(() => routerNavigate(target, { replace: true }))
    }
    const onTenantDenied = () => {
      void logout().finally(() => {
        const slug = getActiveBrandSlug()
        startTransition(() => {
          routerNavigate(slug ? pathFor("login", { tenantSlug: slug }) : pathFor("staff-entry"), { replace: true })
        })
      })
    }
    window.addEventListener("aicos:session-expired", onExpired)
    window.addEventListener("aicos:tenant-denied", onTenantDenied)
    return () => {
      window.removeEventListener("aicos:session-expired", onExpired)
      window.removeEventListener("aicos:tenant-denied", onTenantDenied)
    }
  }, [logout, routerNavigate])

  // After staff login, keep URL slug aligned with JWT tenant.
  useEffect(() => {
    const sessionSlug = tokenStore.get()?.tenantSlug
    if (sessionSlug && role && role !== "customer" && role !== "superAdmin") {
      setActiveBrandSlug(sessionSlug)
    }
  }, [role, user])

  const navigate = useCallback(
    (page: Page, params?: Record<string, string>) => {
      const next: NavigationState = { from: currentPage }
      if (page === "auth-otp") {
        next.otpFlow = currentPage === "auth-forgot-password" ? "forgot-password" : "register"
      }
      const path = pathFor(page, params)
      startTransition(() => {
        routerNavigate(path, { state: next })
      })
    },
    [currentPage, routerNavigate],
  )

  const screens: Record<Page, ReactElement> = {
    landing: <Landing navigate={navigate} />,
    terms: <Terms navigate={navigate} />,
    privacy: <Privacy navigate={navigate} />,
    contact: <Contact navigate={navigate} />,
    "staff-entry": <StaffEntry navigate={navigate} />,
    "register-brand": <RegisterBrand navigate={navigate} />,
    login: <Login navigate={navigate} />,
    "admin-login": <AdminLogin navigate={navigate} />,
    "auth-customer-register": <CustomerRegister navigate={navigate} />,
    "auth-customer-login": <CustomerLogin navigate={navigate} />,
    "auth-otp": <OTPVerification navigate={navigate} />,
    "auth-forgot-password": <ForgotPassword navigate={navigate} />,
    "auth-reset-password": <ResetPassword navigate={navigate} />,
    "account-settings": <AccountSettings navigate={navigate} returnPage={returnPage} />,
    "staff-notifications": <StaffNotifications navigate={navigate} />,

    "guest-menu": <GuestMenu navigate={navigate} />,
    "guest-order-status": <GuestStatus navigate={navigate} />,

    "brand-menu": <BrandMenu navigate={navigate} />,
    "order-start": <OrderStart navigate={navigate} />,
    "customer-shops": <CustomerShops navigate={navigate} />,
    "customer-brands": <CustomerBrands navigate={navigate} />,
    "customer-menu": <CustomerMenu navigate={navigate} />,
    "customer-tracking": <CustomerOrderTracking navigate={navigate} />,
    "customer-loyalty": <CustomerLoyalty navigate={navigate} />,
    "customer-feedback": <CustomerFeedback navigate={navigate} />,
    "customer-for-you": <CustomerForYou navigate={navigate} />,
    "customer-notifications": <CustomerNotifications navigate={navigate} />,
    "customer-profile": <CustomerProfile navigate={navigate} />,

    "barista-queue": <BaristaQueue navigate={navigate} />,

    "cashier-pos": <CashierPOS navigate={navigate} />,
    kiosk: <Kiosk navigate={navigate} />,
    "cashier-payments": <CashierPayments navigate={navigate} />,
    "cashier-tables": <CashierTables navigate={navigate} />,
    "cashier-serve": <CashierServe navigate={navigate} />,
    "cashier-shift": <CashierShifts navigate={navigate} />,
    "staff-orders": <StaffOrderHistory navigate={navigate} />,
    "floor-plan-view": <FloorPlanViewer navigate={navigate} />,

    "manager-dashboard": <ManagerDashboard navigate={navigate} />,
    "manager-staff": <ManagerEmployees navigate={navigate} />,
    "branch-schedule": <BranchSchedule navigate={navigate} />,
    "branch-shift-requests": <ShiftRequests navigate={navigate} />,
    "manager-payroll": <ManagerPayroll navigate={navigate} />,
    "manager-payroll-detail": <ManagerPayrollDetail navigate={navigate} />,
    "branch-tables": <BranchTables navigate={navigate} />,
    "branch-tables-print": <TablesPrint />,
    "branch-floor-plan": <FloorPlanEditor navigate={navigate} />,
    "branch-pickup": <BranchPickupPage navigate={navigate} />,
    "branch-orders": <BranchOrders navigate={navigate} />,
    "branch-attendance": <ManagerAttendance navigate={navigate} />,
    "branch-cash-closings": <ManagerCashClosings navigate={navigate} />,

    "manager-menu": <ManagerMenuManagement navigate={navigate} />,
    "manager-reports": <ManagerReports navigate={navigate} />,
    "manager-feedback": <ManagerFeedback navigate={navigate} />,

    "brand-dashboard": <ManagerDashboard navigate={navigate} scope="brand" />,
    "brand-profile": <BrandProfile navigate={navigate} />,
    "admin-branches": <AdminBranches navigate={navigate} />,
    "admin-users": <AdminUsers navigate={navigate} />,
    "brand-pickup": <BrandPickup navigate={navigate} />,
    "brand-promotions": <BrandVouchers navigate={navigate} />,
    "brand-loyalty": <BrandLoyalty navigate={navigate} />,
    "brand-subscription": <BrandSubscription navigate={navigate} />,
    "brand-cancel-policy": <BrandCancelPolicy navigate={navigate} />,
    "brand-pay-rules": <BrandPayRules navigate={navigate} />,
    "brand-merchant": <BrandMerchant navigate={navigate} />,
    "admin-logs": <AdminSystemLogs navigate={navigate} />,
    "brand-reconciliation": <BrandReconciliation navigate={navigate} />,
    "platform-tenants": <PlatformTenants navigate={navigate} />,
    "platform-plans": <PlatformPlans navigate={navigate} />,
    "platform-subscriptions": <PlatformSubscriptions navigate={navigate} />,
    "platform-providers": <PlatformProviders navigate={navigate} />,
    "platform-health": <PlatformHealth navigate={navigate} />,
    "platform-revenue": <PlatformRevenue navigate={navigate} />,
    "platform-audit": <PlatformAudit navigate={navigate} />,
  }

  function guard(page: Page): ReactElement {
    if (user && GUEST_ONLY_PAGES.includes(page)) {
      const onCustomerAuth = page === "auth-customer-login" || page === "auth-customer-register"
      const onStaffLogin = page === "login" || page === "staff-entry" || page === "admin-login"
      if (onCustomerAuth && role === "customer") return <Navigate to={pathFor(homePageOf(user))} replace />
      if (onStaffLogin && role === "customer") return <Navigate to={PAGE_PATHS.landing} replace />
      if (onStaffLogin && role !== null) return <Navigate to={pathFor(homePageOf(user))} replace />
      if (!onCustomerAuth && !onStaffLogin) return <Navigate to={pathFor(homePageOf(user))} replace />
    }
    // Path-tenant: customer pages under /:tenantSlug need an active slug (or shops picker).
    if (
      role === "customer" &&
      page.startsWith("customer-") &&
      page !== "customer-shops" &&
      page !== "customer-brands" &&
      pageNeedsTenantGuard(page) &&
      !getActiveBrandSlug() &&
      !tokenStore.get()?.tenantSlug &&
      !tokenStore.get()?.activeBrandCode
    ) {
      return <Navigate to={PAGE_PATHS["customer-shops"]} replace />
    }
    if (canAccess(page, role)) return screens[page]
    if (!user) {
      return <Navigate to={loginPathFor(page)} replace state={{ from: page } satisfies NavigationState} />
    }
    return <Forbidden onHome={() => routerNavigate(pathFor(homePageOf(user)))} />
  }

  function publicOrRoleHome() {
    if (!user) return PAGE_PATHS.landing
    return pathFor(homePageOf(user))
  }

  return (
    <ToastProvider>
      <ToastContainer />
      <ErrorBoundary>
        <div className="relative">
          <Suspense fallback={<PageFallback />}>
            <Routes>
              {/* Static paths before `/:tenantSlug/...` so /admin/login is not captured as a tenant. */}
              {([...(Object.keys(PAGE_PATHS) as Page[])].sort((a, b) => {
                const score = (p: string) => {
                  const parts = p.split("/").filter(Boolean)
                  return parts.reduce((s, seg) => s + (seg.startsWith(":") ? 1 : 10), parts.length)
                }
                return score(PAGE_PATHS[b]) - score(PAGE_PATHS[a])
              })).map((page) => (
                <Route key={page} path={PAGE_PATHS[page]} element={guard(page)} />
              ))}
              <Route path="/login" element={<Navigate to={pathFor("staff-entry")} replace />} />
              <Route path="/q/:token" element={<LegacyQrRedirect />} />
              <Route path="/q/:token/status" element={<LegacyQrRedirect status />} />
              <Route path="*" element={<NotFound onHome={() => routerNavigate(publicOrRoleHome())} />} />
            </Routes>
          </Suspense>
        </div>
      </ErrorBoundary>
    </ToastProvider>
  )
}

function pageNeedsTenantGuard(page: Page): boolean {
  return PAGE_PATHS[page].includes(":tenantSlug")
}
