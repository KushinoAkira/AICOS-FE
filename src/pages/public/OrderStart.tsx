import { useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link, useNavigate } from "react-router"
import type { Page } from "../../App"
import { PublicPage } from "../../components/PublicChrome"
import { Button, ErrorState, LoadingState } from "../../components/ui"
import { useAuth } from "../../context/AuthContext"
import { publicApi } from "../../lib/api/platform"
import { tokenStore } from "../../lib/api/tokenStore"

/**
 * "Đặt món" from the home page: choose the coffee shop, then its public menu `/b/:brandSlug` opens (choose the branch and the drinks).
 * With a single brand on the platform the menu opens straight away. A customer already inside a brand goes on to its takeaway menu.
 * Ordering takeaway needs a customer account; guests can look and fill a cart, then sign in to order.
 */
export default function OrderStart({ navigate }: { navigate: (p: Page) => void }) {
  const routerNavigate = useNavigate()
  const { role } = useAuth()
  const activeBrand = role === "customer" ? tokenStore.get()?.activeBrandCode ?? null : null
  const brands = useQuery({ queryKey: ["public", "brands"], queryFn: publicApi.brands, retry: 1, staleTime: 60_000 })
  const only = brands.data?.length === 1 ? brands.data[0] : null

  // One brand only: nothing to choose, open its menu.
  useEffect(() => { if (only && !activeBrand) routerNavigate(`/b/${only.slug}`, { replace: true }) }, [only, activeBrand, routerNavigate])

  return (
    <PublicPage navigate={navigate} uc="UC-ORDER-START">
      <section className="mx-auto max-w-4xl px-4 py-10 sm:px-8 sm:py-14">
        <h1 className="font-serif text-3xl text-text-primary sm:text-4xl">Bạn muốn gọi món ở quán nào?</h1>
        <p className="mt-2 max-w-2xl text-text-secondary">Chọn quán để xem thực đơn và chọn chi nhánh. Đặt mang đi cần tài khoản khách hàng; bạn có thể xem thực đơn và chọn món trước, rồi đăng nhập khi đặt.</p>

        {activeBrand && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-[16px] border border-border bg-surface p-4">
            <p className="text-sm text-text-secondary">Bạn đang đặt ở quán <b className="text-text-primary">{brands.data?.find((b) => b.slug === activeBrand)?.name ?? activeBrand}</b>.</p>
            <Button className="min-h-11" onClick={() => navigate("customer-menu")}>Tiếp tục đặt mang đi</Button>
          </div>
        )}

        <div className="mt-8">
          {brands.isPending ? <LoadingState /> : brands.isError ? (
            <ErrorState description={brands.error.message} onRetry={() => void brands.refetch()} />
          ) : !brands.data?.length ? (
            <ErrorState title="Chưa có quán nào mở bán" description="Hãy quay lại sau." />
          ) : (
            <ul aria-label="Các quán" className="grid gap-3 sm:grid-cols-2">
              {brands.data.map((b) => (
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
        </div>

        <div className="mt-10 grid gap-3 text-sm text-text-secondary sm:grid-cols-2">
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
        </div>
      </section>
    </PublicPage>
  )
}
