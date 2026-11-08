import { useEffect, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useParams } from "react-router"
import type { Page } from "../../App"
import { Logo } from "../../components/AuthShell"
import CustomerUserMenu from "../../components/CustomerUserMenu"
import { AiChat } from "../../components/AiChat"
import { HistoryTab, OrderedTab } from "../../components/GuestOrderTabs"
import { OrderComposer } from "../../components/OrderComposer"
import { ErrorState, LoadingState } from "../../components/ui"
import { useAuth } from "../../context/AuthContext"
import { useToast } from "../../context/ToastContext"
import { ordersApi, type LineInput } from "../../lib/api/orders"
import { pollWhile, useGuestRealtime } from "../../lib/realtime"
import { rememberGuestOrder } from "../../lib/guestHistory"
import { formatVND } from "../../lib/format"
import { env } from "../../config/env"
import { featureFlags } from "../../config/featureFlags"
import { discountNote, orderErrorMessage } from "../../lib/promotionCode"

/** Table QR ordering: cart, what the table already ordered, and history. Guests need no account; payment is at the counter. */
export default function GuestMenu({ navigate }: { navigate: (p: Page, params?: Record<string, string>) => void }) {
  const { token = "" } = useParams()
  const { role, selectBrand } = useAuth()
  const qc = useQueryClient()
  const live = useGuestRealtime(token)
  const { showToast } = useToast()
  const menu = useQuery({ queryKey: ["guest", token], queryFn: () => ordersApi.guest(token), retry: false })
  const branchId = menu.data?.branchId ?? ""
  const picks = useQuery({ queryKey: ["recommendations", branchId, role], queryFn: () => ordersApi.recommendations(branchId), enabled: !!branchId, retry: false })
  const orderedCount = useQuery({ queryKey: ["guest", token, "orders"], queryFn: () => ordersApi.guestOrders(token), refetchInterval: pollWhile(live, 5000), retry: false })
  const [error, setError] = useState<string | null>(null)
  // A signed-in customer scanning a table is now at that table's brand, so the order and its points go there.
  const tableTenant = menu.data?.tenantId
  useEffect(() => {
    if (role === "customer" && tableTenant) void selectBrand({ tenantId: tableTenant }).catch(() => undefined)
  }, [role, tableTenant, selectBrand])
  /** Remember the table so signing in brings the customer straight back to this menu (points are earned on this order). */
  const goAuth = (p: Page) => { sessionStorage.setItem("aicos.returnTo", `/q/${token}`); navigate(p) }
  const [sent, setSent] = useState(0)
  const place = useMutation({
    mutationFn: ({ lines, code }: { lines: LineInput[]; code: string }) => ordersApi.guestPlace(token, lines, code),
    onSuccess: (o, { code }) => {
      rememberGuestOrder(o)
      setSent((n) => n + 1)
      void qc.invalidateQueries({ queryKey: ["guest", token, "orders"] })
      void qc.invalidateQueries({ queryKey: ["mine"] })
      showToast(`Đã đặt món ${o.code}. Quầy pha chế đã nhận.${discountNote(o, formatVND)}`, "success")
      // An older server takes the order but ignores the code: say so instead of letting the guest believe it was used.
      if (code && !o.promotionCode) showToast(`Mã ${code} chưa được áp dụng cho đơn này. Vui lòng báo nhân viên khi thanh toán.`, "error")
    },
    onError: (e, v) => setError(orderErrorMessage(e, v.code)),
  })

  return (
    <div data-uc="UC-QR" className="min-h-screen bg-bg-base px-4 pb-4 pt-4 sm:px-8 sm:py-6">
      <header className="mx-auto mb-3 max-w-5xl sm:mb-6">
        <div className="flex items-center justify-between gap-3">
          <Logo />
          <div className="flex items-center gap-2">
            {role === "customer" ? (
              <>
                <button onClick={() => navigate("customer-menu")} className="min-h-10 rounded-full border border-border bg-surface px-3 text-sm text-text-primary">← Trang khách hàng</button>
                <CustomerUserMenu navigate={navigate} />
              </>
            ) : role === null || role === undefined ? (
              <>
                <button onClick={() => goAuth("auth-customer-register")} className="hidden min-h-10 rounded-full px-3 text-sm text-text-secondary sm:block">Đăng ký</button>
                <button onClick={() => goAuth("auth-customer-login")} className="min-h-10 rounded-full bg-espresso px-4 text-sm font-medium text-white">Đăng nhập</button>
              </>
            ) : null}
          </div>
        </div>
        {menu.data && (
          // Where the guest is sitting, first and large: the order goes to this table.
          <div data-testid="table-card" className="mt-4 flex items-center gap-4 rounded-[20px] bg-espresso px-4 py-4 text-white sm:px-5">
            <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-[16px] bg-white/12 ring-1 ring-white/20">
              <span className="text-[11px] leading-none text-white/70">Bàn</span>
              <span className="mt-1 font-serif text-2xl leading-none">{menu.data.tableCode}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-serif text-xl leading-tight">Bạn đang ngồi bàn {menu.data.tableCode}</p>
              <p className="mt-1 text-sm text-white/75">{menu.data.branchName}. Gọi món ở đây, quầy pha chế nhận ngay; thanh toán khi bạn xong.</p>
              {role !== "customer" && <button type="button" onClick={() => goAuth("auth-customer-login")} className="mt-1.5 text-sm text-white underline underline-offset-2">Đăng nhập để tích điểm cho đơn này</button>}
            </div>
          </div>
        )}
      </header>
      <main className="mx-auto max-w-5xl">
        {menu.isPending && <LoadingState />}
        {menu.isError && <ErrorState title="Không mở được thực đơn" description={menu.error.message} onRetry={() => void menu.refetch()} />}
        {menu.data && (
          <OrderComposer
            products={menu.data.products} submitLabel="Đặt món" submitting={place.isPending} error={error} clearSignal={sent} recommendations={picks.data}
            onSubmit={(l, code) => { setError(null); place.mutate({ lines: l, code }) }}
            voucher={env.useMock || (featureFlags.voucherAtQr && role === "customer") ? { hint: "Giảm giá được trừ khi đặt món." } : undefined}
            tabs={{
              orderedCount: orderedCount.data?.length ?? 0,
              ordered: <OrderedTab token={token} channelUp={live} />,
              history: (reorder) => <HistoryTab signedIn={role === "customer"} reorder={reorder} version={sent} onLogin={() => goAuth("auth-customer-login")} />,
            }}
          />
        )}
        <p className="mt-8 text-center text-sm text-text-secondary">Xem đơn và thanh toán ở thẻ “Đã gọi”, hoặc gọi nhân viên.</p>
      </main>
      <AiChat />
    </div>
  )
}