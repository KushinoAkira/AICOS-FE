import { useEffect, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link, useNavigate } from "react-router"
import type { Page } from "../../App"
import { PublicPage } from "../../components/PublicChrome"
import { Button, ErrorState, LoadingState } from "../../components/ui"
import { useAuth } from "../../context/AuthContext"
import { publicApi } from "../../lib/api/platform"
import { tokenStore } from "../../lib/api/tokenStore"
import { BRAND_SEARCH_FROM, BRANDS_SHOWN, filterBrands } from "../../lib/brandSearch"

/**
 * "Đặt món" from the home page: choose the coffee shop, then its public menu `/b/:brandSlug` opens (choose the branch and the drinks).
 * With a single brand on the platform the menu opens straight away. With many, the list gets a search box and shows 12 at a
 * time, and how to order stays beside it (above it on a phone), so it never ends up far down the page. A customer already inside a brand goes on to its takeaway menu.
 * Ordering takeaway needs a customer account; guests can look and fill a cart, then sign in to order.
 */
export default function OrderStart({ navigate }: { navigate: (p: Page) => void }) {
  const routerNavigate = useNavigate()
  const { role } = useAuth()
  const activeBrand = role === "customer" ? tokenStore.get()?.activeBrandCode ?? null : null
  const brands = useQuery({ queryKey: ["public", "brands"], queryFn: publicApi.brands, retry: 1, staleTime: 60_000 })
  const all = brands.data ?? []
  const only = all.length === 1 ? all[0] : null
  const [query, setQuery] = useState("")
  const [showAll, setShowAll] = useState(false)
  const found = filterBrands(all, query)
  const shown = showAll ? found : found.slice(0, BRANDS_SHOWN)

  // One brand only: nothing to choose, open its menu.
  useEffect(() => { if (only && !activeBrand) routerNavigate(`/b/${only.slug}`, { replace: true }) }, [only, activeBrand, routerNavigate])

  return (
    <PublicPage navigate={navigate} uc="UC-ORDER-START">
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-8 sm:py-14">
        <h1 className="font-serif text-3xl text-text-primary sm:text-4xl">Bạn muốn gọi món ở quán nào?</h1>
        <p className="mt-2 max-w-2xl text-text-secondary">Chọn quán để xem thực đơn và chọn chi nhánh. Bạn có thể xem thực đơn và chọn món trước, rồi đăng nhập khi đặt mang đi.</p>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
          {/* How to order stays in view beside the list (above it on a phone), however many shops there are. */}
          <aside aria-label="Cách đặt món" className="grid gap-3 text-sm text-text-secondary sm:grid-cols-2 lg:sticky lg:top-24 lg:order-last lg:grid-cols-1">
            <div className="rounded-[16px] bg-sand p-4">
              <h2 className="font-medium text-text-primary">Đặt mang đi</h2>
              <p className="mt-1">Dành cho khách có tài khoản: chọn giờ nhận, thanh toán trước và tích điểm.</p>
              {!role && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button variant="secondary" className="min-h-10" onClick={() => navigate("auth-customer-register")}>Đăng ký</Button>
                  <Button className="min-h-10" onClick={() => navigate("auth-customer-login")}>Đăng nhập</Button>
                </div>
              )}
            </div>
            <div className="rounded-[16px] bg-sand p-4">
              <h2 className="font-medium text-text-primary">Ngồi tại quán</h2>
              <p className="mt-1">Quét mã QR trên bàn để gọi món, không cần tài khoản. Mã QR dán ở chi nhánh mở thẳng thực đơn của chi nhánh đó.</p>
            </div>
          </aside>

          <div className="min-w-0">
            {activeBrand && (
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-[16px] border border-border bg-surface p-4">
                <p className="text-sm text-text-secondary">Bạn đang đặt ở quán <b className="text-text-primary">{all.find((b) => b.slug === activeBrand)?.name ?? activeBrand}</b>.</p>
                <Button className="min-h-11" onClick={() => navigate("customer-menu")}>Tiếp tục đặt mang đi</Button>
              </div>
            )}

            {brands.isPending ? <LoadingState /> : brands.isError ? (
              <ErrorState description={brands.error.message} onRetry={() => void brands.refetch()} />
            ) : !all.length ? (
              <ErrorState title="Chưa có quán nào mở bán" description="Hãy quay lại sau." />
            ) : (
              <>
                {all.length >= BRAND_SEARCH_FROM && (
                  <div className="mb-4 flex flex-wrap items-center gap-3">
                    <label htmlFor="brand-search" className="sr-only">Tìm quán</label>
                    <input
                      id="brand-search" type="search" value={query} placeholder="Tìm quán theo tên…" autoComplete="off"
                      onChange={(e) => { setQuery(e.target.value); setShowAll(false) }}
                      className="min-h-11 min-w-0 flex-1 rounded-[12px] border border-border bg-surface px-4"
                    />
                    <span className="text-sm text-text-secondary" aria-live="polite">{found.length} quán</span>
                  </div>
                )}
                {found.length === 0 ? (
                  <p className="rounded-[16px] border border-dashed border-border p-6 text-center text-text-secondary">Không tìm thấy quán nào khớp “{query.trim()}”.</p>
                ) : (
                  <ul aria-label="Các quán" className="grid gap-3 sm:grid-cols-2">
                    {shown.map((b) => (
                      <li key={b.id}>
                        <Link to={`/b/${b.slug}`} className="flex h-full items-center gap-4 rounded-[16px] border border-border bg-surface p-4 hover:border-clay">
                          {b.logoUrl
                            ? <img src={b.logoUrl} alt="" className="h-14 w-14 shrink-0 rounded-[14px] object-contain" />
                            : <span aria-hidden className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[14px] font-serif text-2xl text-white" style={{ backgroundColor: b.brandColor ?? "#C97B4A" }}>{b.name.charAt(0).toUpperCase()}</span>}
                          <span className="min-w-0">
                            <span className="block font-medium text-text-primary">{b.name}</span>
                            {b.description && <span className="block truncate text-sm text-text-secondary">{b.description}</span>}
                            <span className="block text-xs text-text-secondary">{b.branchCount} chi nhánh</span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
                {found.length > shown.length && (
                  <div className="mt-4 text-center">
                    <Button variant="secondary" className="min-h-11" onClick={() => setShowAll(true)}>Xem thêm {found.length - shown.length} quán</Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </section>
    </PublicPage>
  )
}
