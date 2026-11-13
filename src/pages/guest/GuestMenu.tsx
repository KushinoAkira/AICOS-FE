import { useEffect, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useParams } from "react-router"
import type { Page } from "../../App"
import { Logo } from "../../components/AuthShell"
import CustomerUserMenu from "../../components/CustomerUserMenu"
import { AiChat } from "../../components/AiChat"
import { HistoryTab, OrderedTab } from "../../components/GuestOrderTabs"
import { GuestPay } from "../../components/GuestPay"
import { OrderComposer } from "../../components/OrderComposer"
import { PayGateway } from "../../components/PayGateway"
import { usePickupSlot } from "../../components/PickupSlot"
import { ErrorState, LoadingState } from "../../components/ui"
import { useAuth } from "../../context/AuthContext"
import { useToast } from "../../context/ToastContext"
import { ordersApi, type LineInput, type Order, type PayOutcome } from "../../lib/api/orders"
import { pollWhile, useGuestRealtime } from "../../lib/realtime"
import { rememberGuestOrder } from "../../lib/guestHistory"
import { formatVND } from "../../lib/format"
import { env } from "../../config/env"
import { featureFlags } from "../../config/featureFlags"
import { discountNote, orderErrorMessage } from "../../lib/promotionCode"
import { orderTitle, shortOrderCode } from "../../lib/orderLabel"

/**
 * Table QR ordering: cart, what the table already ordered, and history. Guests need no account. A guest's own order is paid first:
 * sending it opens the QR payment straight away (or the guest calls staff to pay), and the bar starts once the money is in.
 * A signed-in customer orders for this table by default (dine-in); ticking "Đặt mang đi" turns the cart into a takeaway order at this
 * branch with a pickup time, paid online. Guests without an account have no takeaway.
 */
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
  const [paying, setPaying] = useState(0)
  const due = (orderedCount.data ?? []).filter((o) => o.paymentStatus === "Unpaid" && o.status !== "Cancelled" && o.status !== "Unfulfillable").reduce((s, o) => s + o.total, 0)
  const [takeaway, setTakeaway] = useState(false)
  const isTakeaway = role === "customer" && takeaway
  const pickup = usePickupSlot(branchId, isTakeaway)
  const [payingTakeaway, setPayingTakeaway] = useState<Order | null>(null)
  const placeTakeaway = useMutation({
    mutationFn: ({ lines, code }: { lines: LineInput[]; code: string }) => ordersApi.placeTakeaway({ branchId, slot: pickup.slot, lines, promotionCode: code }),
    onSuccess: (o) => {
      setSent((n) => n + 1)
      setPayingTakeaway(o)
      void qc.invalidateQueries({ queryKey: ["takeaway", "check"] })
      void qc.invalidateQueries({ queryKey: ["mine"] })
      showToast(`Đã giữ chỗ đơn mang đi ${orderTitle(o.lines)} (${shortOrderCode(o.code)}).${discountNote(o, formatVND)}`, "success")
    },
    onError: (e, v) => { setError(orderErrorMessage(e, v.code)); void qc.invalidateQueries({ queryKey: ["takeaway", "check"] }) },
  })
  const payTakeaway = useMutation({
    mutationFn: (outcome: PayOutcome) => ordersApi.payOnline(payingTakeaway!.id, outcome),
    onSuccess: (o) => {
      setPayingTakeaway(null)
      void qc.invalidateQueries({ queryKey: ["mine"] })
      showToast(o.paymentStatus === "Paid" ? "Thanh toán thành công" : o.paymentStatus === "Failed" ? "Thanh toán thất bại. Bạn có thể thanh toán lại ở Đơn của tôi" : "Đang chờ xác nhận từ cổng thanh toán", o.paymentStatus === "Paid" ? "success" : "error")
      navigate("customer-tracking")
    },
    onError: (e) => showToast(e.message, "error"),
  })
  const place = useMutation({
    mutationFn: ({ lines, code }: { lines: LineInput[]; code: string }) => ordersApi.guestPlace(token, lines, code),
    onSuccess: (o, { code }) => {
      rememberGuestOrder(o)
      setSent((n) => n + 1)
      void qc.invalidateQueries({ queryKey: ["guest", token, "orders"] })
      void qc.invalidateQueries({ queryKey: ["mine"] })
      showToast(`Đã đặt ${orderTitle(o.lines)} (${shortOrderCode(o.code)}). Thanh toán xong quầy sẽ bắt đầu pha.${discountNote(o, formatVND)}`, "success")
      setPaying((n) => n + 1)
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
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="inline-flex items-center gap-2 rounded-full bg-espresso px-4 py-1.5 font-serif text-lg font-medium leading-none text-white">Bàn {menu.data.tableCode}</h1>
            <span className="text-sm text-text-secondary">{menu.data.branchName}</span>
            {role !== "customer" && <span className="text-xs text-clay">Đăng nhập để tích điểm cho đơn này</span>}
          </div>
        )}
      </header>
      <main className="mx-auto max-w-5xl">
        {menu.isPending && <LoadingState />}
        {menu.isError && <ErrorState title="Không mở được thực đơn" description={menu.error.message} onRetry={() => void menu.refetch()} />}
        {menu.data && (
          <OrderComposer
            products={menu.data.products} submitLabel={isTakeaway ? "Đặt mang đi và thanh toán" : "Đặt món và thanh toán"} submitting={place.isPending || placeTakeaway.isPending}
            error={isTakeaway ? pickup.problem ?? error : error} clearSignal={sent} recommendations={picks.data}
            onSubmit={(l, code) => {
              if (isTakeaway) { if (pickup.problem) return setError(pickup.problem); setError(null); placeTakeaway.mutate({ lines: l, code }); return }
              setError(null); place.mutate({ lines: l, code })
            }}
            cartExtra={role === "customer" ? (
              <div className="rounded-[14px] bg-sand p-3">
                <label className="flex cursor-pointer items-start gap-3 text-sm font-medium text-text-primary">
                  <input type="checkbox" checked={takeaway} onChange={(e) => { setTakeaway(e.target.checked); setError(null) }} className="mt-0.5 h-4 w-4 accent-terracotta" />
                  <span>Đặt mang đi<span className="block text-xs font-normal text-text-secondary">{takeaway ? "Chọn giờ nhận bên dưới, thanh toán online khi đặt." : `Không tick: món dùng tại bàn ${menu.data.tableCode}.`}</span></span>
                </label>
                {takeaway && <div className="mt-3">{pickup.picker(`Giờ nhận hàng · ${menu.data.branchName}`, true)}</div>}
              </div>
            ) : undefined}
            voucher={env.useMock || (featureFlags.voucherAtQr && role === "customer") ? { preview: (code, amount) => ordersApi.previewVoucher(code, amount, branchId), hint: "Giảm giá được trừ khi đặt món." } : undefined}
            tabs={{
              orderedCount: orderedCount.data?.length ?? 0,
              ordered: <OrderedTab token={token} channelUp={live} />,
              history: (reorder) => <HistoryTab signedIn={role === "customer"} reorder={reorder} version={sent} onLogin={() => goAuth("auth-customer-login")} />,
            }}
          />
        )}
        <p className="mt-6 text-center text-sm text-text-secondary">{isTakeaway ? "Đơn mang đi được thanh toán online ngay khi đặt, quầy pha theo giờ nhận bạn chọn." : "Món được pha sau khi bạn thanh toán: quét QR ngay trên điện thoại, hoặc gọi nhân viên."}</p>
        {paying > 0 && due > 0 && <GuestPay key={paying} token={token} due={due} startOpen bare />}
        <PayGateway open={!!payingTakeaway} amount={payingTakeaway?.total ?? 0} code={payingTakeaway ? shortOrderCode(payingTakeaway.code) : ""} busy={payTakeaway.isPending} onOutcome={(o) => payTakeaway.mutate(o)} onClose={() => { setPayingTakeaway(null); navigate("customer-tracking") }} />
      </main>
      <AiChat />
    </div>
  )
}