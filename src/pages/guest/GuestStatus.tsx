import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useParams } from "react-router"
import type { Page } from "../../App"
import { Logo } from "../../components/AuthShell"
import { OrderStatusPill } from "../../components/OrderStatusPill"
import { Banner, Button, EmptyState, ErrorState, LoadingState } from "../../components/ui"
import { ordersApi } from "../../lib/api/orders"
import { formatTime, formatVND } from "../../lib/format"

/** Live status of the table's open orders. Polls every 5s (SignalR replaces this when the hub exists). */
export default function GuestStatus({ navigate }: { navigate: (p: Page, params?: Record<string, string>) => void }) {
  const { token = "" } = useParams()
  const qc = useQueryClient()
  const orders = useQuery({ queryKey: ["guest", token, "orders"], queryFn: () => ordersApi.guestOrders(token), refetchInterval: 5000, retry: false })
  const bill = useMutation({ mutationFn: () => ordersApi.requestBill(token), onSuccess: () => void qc.invalidateQueries({ queryKey: ["guest", token] }) })
  const total = (orders.data ?? []).filter((o) => o.status !== "Cancelled" && o.status !== "Unfulfillable").reduce((s, o) => s + o.total, 0)

  return (
    <div data-uc="UC-QR" className="min-h-screen bg-bg-base px-4 py-6 sm:px-8">
      <header className="mx-auto mb-6 flex max-w-2xl items-center justify-between"><Logo /><Button variant="secondary" onClick={() => navigate("guest-menu", { token })}>Gọi thêm món</Button></header>
      <main className="mx-auto max-w-2xl space-y-4">
        <h1 className="font-serif text-2xl text-text-primary">Đơn của bàn</h1>
        {orders.isPending && <LoadingState />}
        {orders.isError && <ErrorState description={orders.error.message} onRetry={() => void orders.refetch()} />}
        {orders.data?.length === 0 && <EmptyState title="Bàn chưa có đơn nào" action={<Button onClick={() => navigate("guest-menu", { token })}>Chọn món</Button>} />}
        {orders.data?.map((o) => (
          <section key={o.id} className="rounded-[16px] border border-border bg-surface p-5">
            <div className="flex items-center justify-between"><p className="font-medium text-text-primary">{o.code} <span className="text-xs text-text-secondary">{formatTime(o.createdAtUtc)}</span></p><OrderStatusPill status={o.status} /></div>
            <ul className="mt-3 text-sm text-text-secondary">{o.lines.map((l, i) => <li key={i}>{l.qty}× {l.name} ({l.size})</li>)}</ul>
            {o.status === "Unfulfillable" && <div className="mt-3"><Banner>Quán không thực hiện được đơn này{o.reason ? `: ${o.reason}` : ""}. Bạn không bị tính tiền.</Banner></div>}
          </section>
        ))}
        {!!orders.data?.length && (
          <div className="flex items-center justify-between rounded-[16px] bg-sand p-5">
            <div><p className="text-sm text-text-secondary">Tạm tính</p><p className="font-serif text-xl text-text-primary">{formatVND(total)}</p></div>
            <Button loading={bill.isPending} disabled={bill.isSuccess} onClick={() => bill.mutate()}>{bill.isSuccess ? "Đã gọi thanh toán" : "Gọi thanh toán"}</Button>
          </div>
        )}
        {bill.isError && <Banner>{bill.error.message}</Banner>}
      </main>
    </div>
  )
}