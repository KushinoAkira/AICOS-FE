import { useQuery } from "@tanstack/react-query"
import { useParams } from "react-router"
import type { Page } from "../../App"
import { HomeLogo } from "../../components/AuthShell"
import { GuestPay } from "../../components/GuestPay"
import { paidAndStillMaking } from "../../components/GuestOrderTabs"
import { GuestOrderCard } from "../../components/GuestOrderCard"
import { Banner, Button, EmptyState, ErrorState, LoadingState } from "../../components/ui"
import { ordersApi } from "../../lib/api/orders"
import { pollWhile, useGuestRealtime } from "../../lib/realtime"
import { formatVND } from "../../lib/format"

/** Live status of the table's open orders. Pushed over SignalR; polls every 5s while the channel is down. */
export default function GuestStatus({ navigate }: { navigate: (p: Page, params?: Record<string, string>) => void }) {
  const { token = "" } = useParams()
  const live = useGuestRealtime(token)
  const orders = useQuery({ queryKey: ["guest", token, "orders"], queryFn: () => ordersApi.guestOrders(token), refetchInterval: (q) => (q.state.data?.some(paidAndStillMaking) ? 5000 : pollWhile(live, 5000)), retry: false })
  const counted = (orders.data ?? []).filter((o) => o.status !== "Cancelled" && o.status !== "Unfulfillable")
  const total = counted.reduce((s, o) => s + o.total, 0)
  const due = counted.filter((o) => o.paymentStatus === "Unpaid").reduce((s, o) => s + o.total, 0)

  return (
    <div data-uc="UC-QR" className="min-h-screen bg-bg-base px-4 py-6 sm:px-8">
      <header className="mx-auto mb-6 flex max-w-2xl items-center justify-between"><HomeLogo /><Button variant="secondary" onClick={() => navigate("guest-menu", { token })}>Gọi thêm món</Button></header>
      <main className="mx-auto max-w-2xl space-y-4">
        <h1 className="font-serif text-3xl text-text-primary">Đơn của bàn</h1>
        <p className="-mt-2 text-sm text-text-secondary">Trạng thái tự cập nhật khi quầy pha chế làm xong từng đơn.</p>
        {orders.isPending && <LoadingState />}
        {orders.isError && <ErrorState description={orders.error.message} onRetry={() => void orders.refetch()} />}
        {orders.data?.length === 0 && <EmptyState title="Bàn chưa có đơn nào" action={<Button onClick={() => navigate("guest-menu", { token })}>Chọn món</Button>} />}
        {orders.data?.map((o) => <GuestOrderCard key={o.id} order={o} />)}
        {!!orders.data?.length && (
          <div className="flex items-center justify-between rounded-[16px] bg-sand p-5">
            <p className="text-sm text-text-secondary">Tổng các đơn</p><p className="font-serif text-xl text-text-primary">{formatVND(total)}</p>
          </div>
        )}
        {due > 0 ? <GuestPay token={token} due={due} /> : !!counted.length && <Banner tone="success">Bàn đã thanh toán đủ. Cảm ơn bạn!</Banner>}
      </main>
    </div>
  )
}