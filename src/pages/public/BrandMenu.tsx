import { useEffect, useRef, useState } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { useNavigate, useParams, useSearchParams } from "react-router"
import type { Page } from "../../App"
import { HomeLogo } from "../../components/AuthShell"
import { BranchPicker } from "../../components/BranchPicker"
import CustomerUserMenu from "../../components/CustomerUserMenu"
import { OrderComposer } from "../../components/OrderComposer"
import { Banner, ErrorState, LoadingState } from "../../components/ui"
import { useAuth } from "../../context/AuthContext"
import { branchesApi } from "../../lib/api/identity"
import { ordersApi, type LineInput } from "../../lib/api/orders"
import { publicApi } from "../../lib/api/platform"
import { peekDraft, saveDraft } from "../../lib/orderDraft"
import { defaultBranch, rememberBranch, rememberedBranch } from "../../lib/takeawayBranch"

/**
 * Public menu of one brand, `/b/:brandSlug`: anyone can see the branches and their drinks and fill a cart (size, sugar, ice, note).
 * `?branch=<id>` is the QR code posted at a branch: that branch's menu opens directly, without choosing.
 * Placing the order needs a customer account at this brand: a guest signs in first and comes back here, the cart is kept in the tab
 * and the takeaway menu (`/menu`) opens with it, at the same branch, to choose the pickup time and pay.
 */
export default function BrandMenu({ navigate }: { navigate: (p: Page) => void }) {
  const { brandSlug = "" } = useParams()
  const slug = brandSlug.toLowerCase()
  const routerNavigate = useNavigate()
  const { role, selectBrand } = useAuth()
  const isCustomer = role === "customer"
  const brand = useQuery({ queryKey: ["public", "brand", slug], queryFn: () => publicApi.brand(slug), retry: false })
  const branches = useQuery({ queryKey: ["public", "branches", slug], queryFn: () => branchesApi.listActiveOf(slug), enabled: !!brand.data })
  const [params] = useSearchParams()
  const qrBranch = params.get("branch")
  const [chosen, setChosen] = useState<string | null>(qrBranch)
  const [changing, setChanging] = useState(false)
  const list = branches.data ?? []
  const branch = list.find((b) => b.id === chosen) ?? defaultBranch(list, rememberedBranch(slug))
  const branchId = branch?.id ?? ""
  // Opened from a branch QR: that branch is where the customer is, so it is also the one remembered for next time.
  const fromQr = !!qrBranch && list.some((b) => b.id === qrBranch)
  const qrUnknown = !!qrBranch && branches.isSuccess && !fromQr
  useEffect(() => { if (fromQr && qrBranch) rememberBranch(slug, qrBranch) }, [fromQr, qrBranch, slug])
  const menu = useQuery({ queryKey: ["takeaway", "menu", branchId], queryFn: () => ordersApi.takeawayMenu(branchId), enabled: !!branchId })
  const picks = useQuery({ queryKey: ["recommendations", branchId, role], queryFn: () => ordersApi.recommendations(branchId), enabled: !!branchId, retry: false })

  /** A signed-in customer goes on to the takeaway menu of this brand, carrying the cart. */
  const proceed = useMutation({
    mutationFn: async () => { await selectBrand({ code: slug }) },
    onSuccess: () => navigate("customer-menu"),
  })
  // Back from signing in with a cart for this brand: continue straight to choosing the pickup time.
  const resume = new URLSearchParams(window.location.search).get("resume") === "1"
  const resumed = useRef(false)
  const { mutate: goOn } = proceed
  useEffect(() => {
    if (resumed.current || !resume || !isCustomer || peekDraft()?.brand !== slug) return
    resumed.current = true
    goOn()
  }, [resume, isCustomer, slug, goOn])

  function order(lines: LineInput[]) {
    saveDraft({ brand: slug, branchId, lines })
    if (isCustomer) return proceed.mutate()
    sessionStorage.setItem("aicos.returnTo", `/b/${slug}?resume=1`)
    navigate("auth-customer-login")
  }
  function pickBranch(id: string) {
    setChosen(id)
    rememberBranch(slug, id)
  }
  const staffSignedIn = !!role && !isCustomer

  return (
    <div data-uc="UC-BRAND-MENU" className="min-h-screen bg-bg-base">
      <header className="border-b border-border bg-surface px-4 py-3 sm:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <HomeLogo />
          {isCustomer ? <CustomerUserMenu navigate={navigate} /> : !role && (
            <div className="flex items-center gap-2">
              <button onClick={() => { sessionStorage.setItem("aicos.returnTo", `/b/${slug}`); navigate("auth-customer-register") }} className="hidden min-h-11 rounded-full px-3 text-sm text-text-secondary sm:block">Đăng ký</button>
              <button onClick={() => { sessionStorage.setItem("aicos.returnTo", `/b/${slug}`); navigate("auth-customer-login") }} className="min-h-11 rounded-full bg-espresso px-4 text-sm font-medium text-white">Đăng nhập</button>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-8">
        {brand.isPending && <LoadingState />}
        {brand.isError && (
          <ErrorState title="Không tìm thấy thương hiệu" description="Đường dẫn có thể đã sai hoặc thương hiệu tạm ngưng hoạt động." onRetry={() => routerNavigate("/")} />
        )}
        {brand.data && (
          <>
            <section aria-label="Thương hiệu" className="mb-6 flex items-center gap-4">
              {brand.data.logoUrl
                ? <img src={brand.data.logoUrl} alt="" className="h-14 w-14 shrink-0 rounded-[14px] object-contain" />
                : <span aria-hidden className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[14px] font-serif text-2xl text-white" style={{ backgroundColor: brand.data.brandColor ?? "#C97B4A" }}>{brand.data.name.charAt(0).toUpperCase()}</span>}
              <div className="min-w-0">
                <h1 className="font-serif text-3xl text-text-primary">{brand.data.name}</h1>
                <p className="text-sm text-text-secondary">Chọn chi nhánh và món bạn muốn uống. {isCustomer ? "Bước sau là chọn giờ nhận và thanh toán." : "Đăng nhập khi đặt hàng để chọn giờ nhận, thanh toán và tích điểm."}</p>
              </div>
            </section>

            {staffSignedIn && <div className="mb-4"><Banner tone="warn">Bạn đang đăng nhập bằng tài khoản nhân viên nên chỉ xem được thực đơn. Đặt hàng cần tài khoản khách hàng.</Banner></div>}
            {proceed.isError && <div className="mb-4"><Banner>Chưa chuyển sang quán này được: {proceed.error?.message}</Banner></div>}
            {branches.isError && <ErrorState description={branches.error.message} onRetry={() => void branches.refetch()} />}
            {branches.data?.length === 0 && <ErrorState title="Chưa có chi nhánh" description="Thương hiệu này chưa có chi nhánh nào đang mở bán." />}
            {!isCustomer && !staffSignedIn && (
              <p data-testid="guest-note" className="mb-4 rounded-[14px] bg-sand px-4 py-3 text-sm text-text-secondary"><b className="text-text-primary">Đặt mang đi chỉ dành cho khách có tài khoản.</b> Bạn vẫn xem thực đơn và chọn món được; khi đặt, hãy đăng nhập hoặc đăng ký (miễn phí). Ngồi tại quán thì quét mã QR trên bàn để gọi món.</p>
            )}
            {qrUnknown && <div className="mb-4"><Banner tone="warn">Chi nhánh của mã QR này hiện không nhận đơn. Hãy chọn một chi nhánh khác.</Banner></div>}
            {branch && fromQr && !changing && branch.id === qrBranch ? (
              <div data-testid="qr-branch" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-border bg-surface p-3">
                <p className="text-sm text-text-secondary">Bạn đang gọi món tại <b className="text-text-primary">{branch.name}</b>{branch.address ? ` · ${branch.address}` : ""}</p>
                {list.length > 1 && <button type="button" onClick={() => setChanging(true)} className="text-sm text-clay underline">Chọn chi nhánh khác</button>}
              </div>
            ) : branch && <BranchPicker branches={list} value={branchId} onChange={pickBranch} />}
            {(branches.isPending || (!!branchId && menu.isPending)) && <LoadingState />}
            {menu.isError && <ErrorState description={menu.error.message} onRetry={() => void menu.refetch()} />}
            {menu.data && (
              <OrderComposer
                key={branchId}
                products={menu.data.products}
                recommendations={picks.data}
                submitLabel={isCustomer ? "Đặt mang đi" : staffSignedIn ? "Cần tài khoản khách hàng" : "Đăng nhập để đặt mang đi"}
                submitting={proceed.isPending}
                error={staffSignedIn ? "Đặt hàng cần tài khoản khách hàng." : null}
                onSubmit={(lines) => { if (!staffSignedIn) order(lines) }}
              />
            )}
          </>
        )}
      </main>
    </div>
  )
}
