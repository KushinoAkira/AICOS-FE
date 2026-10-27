import { Suspense, lazy, startTransition, useCallback, type ReactElement } from "react"
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router"
import { ToastProvider } from "./context/ToastContext"
import { ToastContainer } from "./components/ToastContainer"
import { ErrorBoundary } from "./components/ErrorBoundary"
import { homePageOf, useAuth } from "./context/AuthContext"
import { GUEST_ONLY_PAGES, canAccess, loginPageFor } from "./router/rbac"
import {
  PAGE_PATHS,
  pageFromPath,
  type NavigationState,
  type OtpFlow,
  type Page,
} from "./router/pages"

// Re-exported so the existing `import type { Page } from "../../App"` in pages keeps working.
export type { Page } from "./router/pages"

// Every screen is its own chunk: a cashier never downloads the admin screens.
const Landing = lazy(() => import("./pages/public/Landing"))
const Contact = lazy(() => import("./pages/public/Contact"))
const Terms = lazy(() => import("./pages/public/Legal").then((m) => ({ default: m.Terms })))
const Privacy = lazy(() => import("./pages/public/Legal").then((m) => ({ default: m.Privacy })))
const Login = lazy(() => import("./pages/auth/Login"))
const CustomerRegister = lazy(() => import("./pages/auth/CustomerRegister"))
const CustomerLogin = lazy(() => import("./pages/auth/CustomerLogin"))
const OTPVerification = lazy(() => import("./pages/auth/OTPVerification"))
const ForgotPassword = lazy(() => import("./pages/auth/ForgotPassword"))
const ResetPassword = lazy(() => import("./pages/auth/ResetPassword"))
const AccountSettings = lazy(() => import("./pages/shared/AccountSettings"))

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
const CashierTables = lazy(() => import("./pages/cashier/Tables"))
const CashierShifts = lazy(() => import("./pages/cashier/Shifts"))


const ManagerDashboard = lazy(() => import("./pages/manager/Dashboard"))
const ManagerReports = lazy(() => import("./pages/manager/Reports"))
const ManagerFeedback = lazy(() => import("./pages/manager/Feedback"))
const ManagerEmployees = lazy(() => import("./pages/manager/Employees"))
const ManagerPayroll = lazy(() => import("./pages/manager/Payroll"))
const ManagerPayrollDetail = lazy(() => import("./pages/manager/PayrollDetail"))

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

/** Cold-load only. In-app navigations use startTransition so Suspense keeps the previous screen (no full-page flash). */
function PageFallback() {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-0.5 overflow-hidden" role="status" aria-label="Đang tải">
      <div className="h-full w-1/3 animate-pulse" style={{ backgroundColor: "#C97B4A" }} />
    </div>
  )
}

export default function App() {
  const location = useLocation()
  const routerNavigate = useNavigate()
  const { user, role } = useAuth()

  const state = (location.state ?? {}) as NavigationState
  const currentPage = pageFromPath(location.pathname)
  const otpFlow: OtpFlow = state.otpFlow ?? "register"
  const returnPage: Page = state.from ?? (user ? homePageOf(user) : "login")

  // Same contract the pages already use (`navigate("manager-menu")`), now backed by real URLs.
  // startTransition keeps the current screen visible while the next lazy chunk loads (avoids sidebar flash).
  const navigate = useCallback(
    (page: Page, params?: Record<string, string>) => {
      const next: NavigationState = { from: currentPage }
      if (page === "auth-otp") {
        next.otpFlow = currentPage === "auth-forgot-password" ? "forgot-password" : "register"
      }
      const path = Object.entries(params ?? {}).reduce((acc, [k, v]) => acc.replace(`:${k}`, encodeURIComponent(v)), PAGE_PATHS[page] as string)
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
    login: <Login navigate={navigate} />,
    "auth-customer-register": <CustomerRegister navigate={navigate} />,
    "auth-customer-login": <CustomerLogin navigate={navigate} />,
    "auth-otp": <OTPVerification navigate={navigate} flow={otpFlow} />,
    "auth-forgot-password": <ForgotPassword navigate={navigate} />,
    "auth-reset-password": <ResetPassword navigate={navigate} />,
    "account-settings": <AccountSettings navigate={navigate} returnPage={returnPage} />,

    "guest-menu": <GuestMenu navigate={navigate} />,
    "guest-order-status": <GuestStatus navigate={navigate} />,

    "customer-menu": <CustomerMenu navigate={navigate} />,
    "customer-tracking": <CustomerOrderTracking navigate={navigate} />,
    "customer-loyalty": <CustomerLoyalty navigate={navigate} />,
    "customer-feedback": <CustomerFeedback navigate={navigate} />,
    "customer-for-you": <CustomerForYou navigate={navigate} />,
    "customer-notifications": <CustomerNotifications navigate={navigate} />,
    "customer-profile": <CustomerProfile navigate={navigate} />,

    "barista-queue": <BaristaQueue navigate={navigate} />,

    "cashier-pos": <CashierPOS navigate={navigate} />,
    "cashier-payments": <CashierPayments navigate={navigate} />,
    "cashier-tables": <CashierTables navigate={navigate} />,
    "cashier-shift": <CashierShifts navigate={navigate} />,

    "manager-dashboard": <ManagerDashboard navigate={navigate} />,
    "manager-staff": <ManagerEmployees navigate={navigate} />,
    "branch-schedule": <BranchSchedule navigate={navigate} />,
    "branch-shift-requests": <ShiftRequests navigate={navigate} />,
    "manager-payroll": <ManagerPayroll navigate={navigate} />,
    "manager-payroll-detail": <ManagerPayrollDetail navigate={navigate} />,
    "branch-tables": <BranchTables navigate={navigate} />,
    "branch-pickup": <BranchPickupPage navigate={navigate} />,
    "branch-orders": <BranchOrders navigate={navigate} />,

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
    "platform-tenants": <PlatformTenants navigate={navigate} />,
    "platform-plans": <PlatformPlans navigate={navigate} />,
    "platform-subscriptions": <PlatformSubscriptions navigate={navigate} />,
    "platform-providers": <PlatformProviders navigate={navigate} />,
    "platform-health": <PlatformHealth navigate={navigate} />,
    "platform-revenue": <PlatformRevenue navigate={navigate} />,
    "platform-audit": <PlatformAudit navigate={navigate} />,
  }
  /**
   * RBAC gate for typed URLs and in-app links.
   * Readable paths are fine — authorization is role checks here (UI) plus API 401/403 (data).
   * Wrong role always gets 403; only anonymous users are sent to the matching login portal.
   */
  function guard(page: Page): ReactElement {
    if (user && GUEST_ONLY_PAGES.includes(page)) {
      const onCustomerAuth = page === "auth-customer-login" || page === "auth-customer-register"
      const onStaffLogin = page === "login"
      // Customer already signed in: customer auth → their app; staff login CTA from marketing → stay on public home (never yank into /menu).
      if (onCustomerAuth && role === "customer") return <Navigate to={PAGE_PATHS[homePageOf(user)]} replace />
      if (onStaffLogin && role === "customer") return <Navigate to={PAGE_PATHS.landing} replace />
      if (onStaffLogin && role !== null) return <Navigate to={PAGE_PATHS[homePageOf(user)]} replace />
      if (!onCustomerAuth && !onStaffLogin) return <Navigate to={PAGE_PATHS[homePageOf(user)]} replace />
    }
    if (canAccess(page, role)) return screens[page]
    if (!user) {
      return <Navigate to={PAGE_PATHS[loginPageFor(page)]} replace state={{ from: page } satisfies NavigationState} />
    }
    // Keep each surface: customers → their app home; staff → role home. Marketing `/` stays opt-in only.
    return <Forbidden onHome={() => routerNavigate(role === "customer" ? PAGE_PATHS["customer-menu"] : PAGE_PATHS[homePageOf(user)])} />
  }

  function publicOrRoleHome() {
    if (!user) return PAGE_PATHS.landing
    if (role === "customer") return PAGE_PATHS["customer-menu"]
    return PAGE_PATHS[homePageOf(user)]
  }

  return (
    <ToastProvider>
      <ToastContainer />
      <ErrorBoundary>
        <div className="relative">
          <Suspense fallback={<PageFallback />}>
            <Routes>
              {(Object.keys(PAGE_PATHS) as Page[]).map((page) => (
                <Route key={page} path={PAGE_PATHS[page]} element={guard(page)} />
              ))}
              <Route path="*" element={<NotFound onHome={() => routerNavigate(publicOrRoleHome())} />} />
            </Routes>
          </Suspense>
        </div>
      </ErrorBoundary>
    </ToastProvider>
  )
}
