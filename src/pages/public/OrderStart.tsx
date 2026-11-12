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
 * A visitor first chooses how they order: takeaway from afar (needs a customer account) or at the shop (QR on the table, kiosk or
 * cashier, no account); the shops below are to look at the menu. A signed-in customer chooses the shop for takeaway, and goes
 * straight in when there is only one. With many shops the list gets a search box and shows 12 at a time.
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

  // A signed-in customer with one shop to choose from goes straight to its menu. A visitor stays here: takeaway needs an
  // account, so they first see how ordering works (sign in, or scan the QR at the table) and can still look at the menu.
  const isCustomer = role === "customer"
  useEffect(() => { if (only && isCustomer && !activeBrand) routerNavigate(`/b/${only.slug}`, { replace: true }) }, [only, isCustomer, activeBrand, routerNavigate])

  return (
    <PublicPage navigate={navigate} uc="UC-ORDER-START">
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-8 sm:py-14">
        {isCustomer ? (
          <>
            <h1 className="font-serif text-3xl text-text-primary sm:text-4xl">Bạn muốn gọi món ở quán nào?</h1>
            <p className="mt-2 max-w-2xl text-text-secondary">Chọn quán để xem thực đơn, chọn chi nhánh và đặt mang đi.</p>
            {activeBrand && (
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-[16px] border border-border bg-surface p-4">
                <p className="text-sm text-text-secondary">Bạn đang đặt ở quán <b className="text-text-primary">{all.find((b) => b.slug === activeBrand)?.name ?? activeBrand}</b>.</p>
                <Button className="min-h-11" onClick={() => navigate("customer-menu")}>Tiếp tục đặt mang đi</Button>
              </div>
            )}
          </>
        ) : (
          <>
            <h1 className="font-serif text-3xl text-text-primary sm:text-4xl">Bạn muốn gọi món thế nào?</h1>
            <p className="mt-2 max-w-2xl text-text-secondary">Chọn theo chỗ bạn đang ở.</p>
            {/* A visitor picks how they order first: from afar (takeaway, needs an account) or already at the shop (no account). */}
            <div aria-label="Cách gọi món" role="group" className="mt-8 grid gap-4 md:grid-cols-2">
              <section aria-labelledby="way-takeaway" className="flex flex-col rounded-[20px] border border-border bg-surface p-6">
                <h2 id="way-takeaway" className="font-serif text-2xl text-text-primary">Đặt mang đi</h2>
                <p className="mt-2 flex-1 text-text-secondary">Đặt trước rồi tới lấy. Cần tài khoản khách hàng để chọn giờ nhận, thanh toán trước và tích điểm.</p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Button className="min-h-11 px-6" onClick={() => navigate("auth-customer-login")}>Đăng nhập để đặt</Button>
                  <Button variant="secondary" className="min-h-11 px-6" onClick={() => navigate("auth-customer-register")}>Tạo tài khoản</Button>
                </div>
              </section>
              <section aria-labelledby="way-here" className="flex flex-col rounded-[20px] bg-sand p-6">
                <h2 id="way-here" className="font-serif text-2xl text-text-primary">Uống tại quán</h2>
                <p className="mt-2 text-text-secondary">Không cần tài khoản. Khi đã tới quán, gọi món bằng một trong ba cách:</p>
                <ul className="mt-3 space-y-2 text-text-primary">
                  <li className="flex gap-2"><span aria-hidden className="text-clay">•</span>Quét mã QR dán trên bàn</li>
                  <li className="flex gap-2"><span aria-hidden className="text-clay">•</span>Tự gọi ở kiosk tại quầy</li>
                  <li className="flex gap-2"><span aria-hidden className="text-clay">•</span>Gọi trực tiếp với thu ngân</li>
                </ul>
                <p className="mt-4 text-sm text-text-secondary">Muốn tích điểm: đăng nhập khi gọi bằng QR, hoặc đọc số điện thoại ở kiosk hay quầy.</p>
              </section>
            </div>
            <h2 className="mt-12 font-serif text-2xl text-text-primary">Xem thực đơn</h2>
            <p className="mt-1 text-sm text-text-secondary">Xem trước món và giá của từng quán, chưa cần đăng nhập.</p>
          </>
        )}

        <div className="mt-6">
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
                <ul aria-label="Các quán" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
                          {!isCustomer && <span className="mt-1 block text-xs font-medium text-clay underline underline-offset-2">Xem thực đơn</span>}
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

        {isCustomer && <p className="mt-8 text-sm text-text-secondary">Đang ngồi ở quán? Quét mã QR trên bàn hoặc gọi ở kiosk, quầy thu ngân.</p>}
      </section>
    </PublicPage>
  )
}
