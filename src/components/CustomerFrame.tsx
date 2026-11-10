import { type ReactNode, useEffect, useRef } from "react"
import { HomeLogo } from "./AuthShell"
import CustomerUserMenu from "./CustomerUserMenu"
import { AiChat } from "./AiChat"
import { useBrand } from "../context/BrandContext"
import type { Page } from "../router/pages"

const LINKS: { page: Page; label: string }[] = [
  { page: "customer-menu", label: "Đặt mang đi" },
  { page: "customer-tracking", label: "Đơn của tôi" },
  { page: "customer-for-you", label: "Gợi ý" },
  { page: "customer-feedback", label: "Đánh giá" },
  { page: "customer-loyalty", label: "Tích điểm" },
  { page: "customer-notifications", label: "Thông báo" },
]

/**
 * Frame of the signed-in customer pages. On a phone the menu gets its own full-width row under the logo (it scrolls
 * sideways and keeps the current page in view); from tablets up it sits in the header.
 */
export function CustomerFrame({ page, navigate, uc, title, subtitle, action, children }: { page: Page; navigate: (p: Page) => void; uc: string; title: string; subtitle?: ReactNode; action?: ReactNode; children: ReactNode }) {
  const brand = useBrand()
  const navRef = useRef<HTMLElement>(null)
  useEffect(() => {
    const nav = navRef.current
    const active = nav?.querySelector<HTMLElement>("[aria-current=page]")
    if (nav && active && nav.scrollWidth > nav.clientWidth) nav.scrollLeft = active.offsetLeft - (nav.clientWidth - active.offsetWidth) / 2
  }, [page])
  return (
    <div data-uc={uc} className="min-h-screen bg-bg-base">
      <header className="sticky top-0 z-30 border-b border-border bg-surface/95 px-4 py-3 backdrop-blur sm:px-8">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <div className="flex min-w-0 shrink-0 items-center gap-2">
            <HomeLogo />
            {brand.kind === "ready" && <button onClick={() => navigate("customer-brands")} className="min-h-9 rounded-full border border-border px-3 text-xs text-text-secondary hover:bg-bg-warm">Đổi quán</button>}
          </div>
          <nav ref={navRef} aria-label="Khách hàng" className="order-last -mx-4 flex w-[calc(100%+2rem)] gap-1 overflow-x-auto px-4 [scrollbar-width:none] md:order-none md:mx-0 md:w-auto md:min-w-0 md:px-0">
            {LINKS.map((l) => (
              <button
                key={l.page} aria-current={l.page === page ? "page" : undefined} onClick={() => navigate(l.page)}
                className={`min-h-9 shrink-0 whitespace-nowrap rounded-full px-4 text-sm transition-colors ${l.page === page ? "bg-espresso text-white" : "text-text-secondary hover:bg-sand hover:text-text-primary"}`}
              >
                {l.label}
              </button>
            ))}
          </nav>
          <CustomerUserMenu navigate={navigate} />
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 pb-28 pt-8 sm:px-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-serif text-3xl text-text-primary">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-text-secondary">{subtitle}</p>}
          </div>
          {action}
        </div>
        {children}
      </main>
      <AiChat />
    </div>
  )
}
