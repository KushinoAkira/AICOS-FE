import { useEffect, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useParams } from "react-router"
import type { Page } from "../../App"
import { CustomerFrame, rememberDineInToken } from "../../components/CustomerFrame"
import { HistoryTab, OrderedTab } from "../../components/GuestOrderTabs"
import { OrderComposer } from "../../components/OrderComposer"
import { ErrorState, LoadingState } from "../../components/ui"
import { useAuth } from "../../context/AuthContext"
import { useToast } from "../../context/ToastContext"
import { publicApi } from "../../lib/api/platform"
import { ordersApi, type LineInput } from "../../lib/api/orders"
import { setActiveBranchId } from "../../lib/branch"
import { setActiveBrandSlug } from "../../lib/brand"
import { rememberGuestOrder } from "../../lib/guestHistory"

/** Table QR ordering inside the customer chrome: guests order without an account; signed-in customers earn points after the bill is completed. */
export default function GuestMenu({ navigate }: { navigate: (p: Page, params?: Record<string, string>) => void }) {
  const { token = "" } = useParams()
  const { role } = useAuth()
  const signedIn = role === "customer"
  const qc = useQueryClient()
  const { showToast } = useToast()
  useEffect(() => { if (token) rememberDineInToken(token) }, [token])

  const qrBrand = useQuery({
    queryKey: ["public", "qr", token],
    queryFn: () => publicApi.qrBrand(token),
    enabled: !!token,
    retry: false,
    staleTime: 60_000,
  })
  useEffect(() => {
    if (qrBrand.data?.tenantSlug) setActiveBrandSlug(qrBrand.data.tenantSlug)
    if (qrBrand.data?.branchId) setActiveBranchId(qrBrand.data.branchId)
  }, [qrBrand.data?.tenantSlug, qrBrand.data?.branchId])

  const menu = useQuery({
    queryKey: ["guest", token],
    queryFn: () => ordersApi.guest(token),
    retry: false,
    enabled: !!token && (qrBrand.isSuccess || qrBrand.isError),
  })
  useEffect(() => {
    if (menu.data?.tenantSlug) setActiveBrandSlug(menu.data.tenantSlug)
    if (menu.data?.branchId) setActiveBranchId(menu.data.branchId)
  }, [menu.data?.tenantSlug, menu.data?.branchId])
  const orderedCount = useQuery({ queryKey: ["guest", token, "orders"], queryFn: () => ordersApi.guestOrders(token), refetchInterval: 5000, retry: false })
  const [error, setError] = useState<string | null>(null)
  const goAuth = (p: Page) => {
    sessionStorage.setItem("aicos.returnTo", `/t/${token}`)
    navigate(p)
  }
  const [sent, setSent] = useState(0)
  const place = useMutation({
    mutationFn: (lines: LineInput[]) => ordersApi.guestPlace(token, lines, signedIn),
    onSuccess: (o) => {
      rememberGuestOrder(o)
      setSent((n) => n + 1)
      void qc.invalidateQueries({ queryKey: ["guest", token, "orders"] })
      void qc.invalidateQueries({ queryKey: ["mine"] })
      void qc.invalidateQueries({ queryKey: ["loyalty"] })
      showToast(
        signedIn
          ? `Đã đặt món ${o.code}. Điểm tích lũy sẽ được cộng khi thanh toán xong.`
          : `Đã đặt món ${o.code}. Quầy pha chế đã nhận.`,
        "success",
      )
    },
    onError: (e) => setError(e.message),
  })

  const tableMeta = menu.data ? (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <span className="inline-block rounded-full bg-espresso px-3 py-1 text-sm font-medium leading-none text-white">Bàn {menu.data.tableCode}</span>
      <span className="text-sm text-text-secondary">{menu.data.branchName}</span>
      {signedIn ? (
        <span className="text-xs text-state-success">Đang tích điểm cho tài khoản của bạn</span>
      ) : (
        <button type="button" onClick={() => goAuth("auth-customer-login")} className="text-xs text-clay underline-offset-2 hover:underline">
          Đăng nhập để tích điểm cho đơn này
        </button>
      )}
      <button type="button" onClick={() => navigate("guest-order-status", { token })} className="ml-auto text-sm text-text-secondary hover:text-text-primary">
        Xem đơn bàn →
      </button>
    </div>
  ) : null

  return (
    <CustomerFrame
      page="guest-menu"
      navigate={navigate}
      uc="UC-QR"
      title="Gọi món tại bàn"
      subtitle="Không cần đăng nhập để đặt. Thanh toán tại quầy khi dùng xong."
      headerExtra={tableMeta}
    >
      {(qrBrand.isPending || menu.isPending) && <LoadingState />}
      {qrBrand.isError && <ErrorState title="Không mở được mã QR" description={qrBrand.error.message} onRetry={() => void qrBrand.refetch()} />}
      {menu.isError && <ErrorState title="Không mở được thực đơn" description={menu.error.message} onRetry={() => void menu.refetch()} />}
      {menu.data && (
        <OrderComposer
          products={menu.data.products}
          submitLabel="Đặt món"
          submitting={place.isPending}
          error={error}
          clearSignal={sent}
          onSubmit={(l) => { setError(null); place.mutate(l) }}
          tabs={{
            orderedCount: orderedCount.data?.length ?? 0,
            ordered: <OrderedTab token={token} />,
            history: (reorder) => (
              <HistoryTab
                signedIn={signedIn}
                reorder={reorder}
                version={sent}
                onLogin={() => goAuth("auth-customer-login")}
              />
            ),
          }}
        />
      )}
      <p className="mt-6 text-center text-sm text-text-secondary">Thanh toán tại quầy sau khi dùng xong.</p>
    </CustomerFrame>
  )
}
