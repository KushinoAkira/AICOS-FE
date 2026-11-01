import type { ReactNode } from "react"
import { Logo } from "./AuthShell"
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

export function CustomerFrame({ page, navigate, uc, title, children }: { page: Page; navigate: (p: Page) => void; uc: string; title: string; children: ReactNode }) {
  const brand = useBrand()
  return (
    <div data-uc={uc} className="min-h-screen bg-bg-base">
      <header className="border-b border-border bg-surface px-4 py-3 sm:px-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <div className="flex shrink-0 items-center gap-2">
            <Logo />
            {brand.kind === "ready" && <button onClick={() => navigate("customer-brands")} className="min-h-9 rounded-full border border-border px-3 text-xs text-text-secondary hover:bg-bg-warm">Đổi quán</button>}
          </div>
          <nav aria-label="Khách hàng" className="flex min-w-0 gap-1 overflow-x-auto">
            {LINKS.map((l) => <button key={l.page} aria-current={l.page === page ? "page" : undefined} onClick={() => navigate(l.page)} className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm ${l.page === page ? "bg-espresso text-white" : "text-text-secondary hover:bg-sand"}`}>{l.label}</button>)}
          </nav>
          <CustomerUserMenu navigate={navigate} />
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-8">
        <h1 className="mb-6 font-serif text-3xl text-text-primary">{title}</h1>
        {children}
      </main>
      <AiChat />
    </div>
  )
}