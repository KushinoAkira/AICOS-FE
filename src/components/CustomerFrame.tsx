import { useEffect, type ReactNode } from "react"
import { Navigate } from "react-router"
import { Logo } from "./AuthShell"
import CustomerUserMenu from "./CustomerUserMenu"
import { AiChat } from "./AiChat"
import { useAuth } from "../context/AuthContext"
import { useBrand } from "../context/BrandContext"
import { getActiveBrandSlug } from "../lib/brand"
import { PAGE_PATHS, type Page } from "../router/pages"

const DINE_IN_KEY = "aicos.dineInToken"

export function rememberDineInToken(token: string) {
  if (token) sessionStorage.setItem(DINE_IN_KEY, token)
}

export function readDineInToken() {
  return sessionStorage.getItem(DINE_IN_KEY)
}

const LINKS: { page: Page; label: string }[] = [
  { page: "customer-menu", label: "Đặt mang đi" },
  { page: "customer-tracking", label: "Đơn của tôi" },
  { page: "customer-for-you", label: "Gợi ý" },
  { page: "customer-feedback", label: "Đánh giá" },
  { page: "customer-loyalty", label: "Tích điểm" },
  { page: "customer-notifications", label: "Thông báo" },
]

type NavigateFn = (p: Page, params?: Record<string, string>) => void

/**
 * Customer-facing chrome (QR dine-in + member area).
 * Staff/brand sessions are ignored here — this surface only cares about customer auth (`/customer-login`), never staff `/login`.
 */
export function CustomerFrame({
  page,
  navigate,
  uc,
  title,
  subtitle,
  hideTitle,
  headerExtra,
  children,
}: {
  page: Page
  navigate: NavigateFn
  uc: string
  title?: string
  subtitle?: ReactNode
  hideTitle?: boolean
  headerExtra?: ReactNode
  children: ReactNode
}) {
  const { role } = useAuth()
  const brand = useBrand()
  const isCustomer = role === "customer"
  const dineInToken = readDineInToken()
  const onDineIn = page === "guest-menu" || page === "guest-order-status"
  const showDineIn = onDineIn || !!dineInToken
  const needsBrand = isCustomer && page.startsWith("customer-") && page !== "customer-shops"

  useEffect(() => {
    if (needsBrand && !getActiveBrandSlug()) navigate("customer-shops")
  }, [needsBrand, navigate])

  if (needsBrand && !getActiveBrandSlug()) {
    return <Navigate to={PAGE_PATHS["customer-shops"]} replace />
  }

  const links: { page: Page; label: string; params?: Record<string, string> }[] = [
    ...(showDineIn && dineInToken ? [{ page: "guest-menu" as Page, label: "Tại bàn", params: { token: dineInToken } }] : []),
    ...LINKS,
  ]

  function goCustomerAuth(returnPath: string, target: Page = "auth-customer-login") {
    sessionStorage.setItem("aicos.returnTo", returnPath)
    navigate(target)
  }

  function goAuth(target: Page = "auth-customer-login") {
    const path = onDineIn && dineInToken
      ? `/t/${dineInToken}`
      : (PAGE_PATHS[page] as string).includes(":")
        ? window.location.pathname
        : (PAGE_PATHS[page] as string)
    goCustomerAuth(path, target)
  }

  function go(link: { page: Page; params?: Record<string, string> }) {
    if (link.page.startsWith("customer-") && !isCustomer) {
      goCustomerAuth(PAGE_PATHS[link.page] as string)
      return
    }
    navigate(link.page, link.params)
  }

  /** Stay inside the brand customer surface — never dump into B2B marketing `/`. */
  function goCustomerHome() {
    if (dineInToken) {
      navigate("guest-menu", { token: dineInToken })
      return
    }
    if (isCustomer) {
      navigate(getActiveBrandSlug() ? "customer-menu" : "customer-shops")
      return
    }
    goCustomerAuth(PAGE_PATHS["customer-menu"] as string)
  }

  const shopLabel = brand.kind === "ready" ? brand.brand.name : null

  return (
    <div data-uc={uc} className="min-h-screen bg-bg-base">
      <header className="border-b border-border bg-surface px-4 py-3 sm:px-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <button type="button" onClick={goCustomerHome} aria-label="Về khu khách của quán" className="shrink-0">
            <Logo />
          </button>
          <nav aria-label="Khách hàng" className="flex min-w-0 flex-1 justify-center gap-1 overflow-x-auto">
            {links.map((l) => {
              const current = l.page === page || (l.page === "guest-menu" && onDineIn)
              return (
                <button
                  key={`${l.page}-${l.label}`}
                  type="button"
                  aria-current={current ? "page" : undefined}
                  onClick={() => go(l)}
                  className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm ${current ? "bg-espresso text-white" : "text-text-secondary hover:bg-sand"}`}
                >
                  {l.label}
                </button>
              )
            })}
          </nav>
          <div className="flex shrink-0 items-center gap-2">
            {isCustomer && shopLabel && (
              <button
                type="button"
                onClick={() => navigate("customer-shops")}
                className="hidden max-w-[10rem] truncate rounded-full border border-border px-3 py-1.5 text-xs text-text-secondary hover:bg-sand sm:block"
                title="Đổi quán"
              >
                {shopLabel}
              </button>
            )}
            {isCustomer ? (
              <CustomerUserMenu navigate={navigate} />
            ) : (
              <>
                <button type="button" onClick={() => goAuth("auth-customer-register")} className="hidden min-h-10 rounded-full px-3 text-sm text-text-secondary sm:block">Đăng ký</button>
                <button type="button" onClick={() => goAuth("auth-customer-login")} className="min-h-10 rounded-full bg-espresso px-4 text-sm font-medium text-white">Đăng nhập</button>
              </>
            )}
          </div>
        </div>
        {headerExtra && <div className="mx-auto mt-3 max-w-5xl">{headerExtra}</div>}
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-8 sm:py-8">
        {!hideTitle && title && <h1 className="mb-2 font-serif text-3xl text-text-primary">{title}</h1>}
        {subtitle && <div className="mb-6 text-sm text-text-secondary">{subtitle}</div>}
        {children}
      </main>
      <AiChat />
    </div>
  )
}
