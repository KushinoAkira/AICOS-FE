import { useEffect } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useParams } from "react-router"
import type { Page } from "../../App"
import { CustomerFrame, rememberDineInToken } from "../../components/CustomerFrame"
import { OrderStatusPill } from "../../components/OrderStatusPill"
import { Banner, Button, EmptyState, ErrorState, LoadingState } from "../../components/ui"
import { useAuth } from "../../context/AuthContext"
import { ordersApi } from "../../lib/api/orders"
import { formatTime, formatVND } from "../../lib/format"

/** Live status of the table's open orders — same customer chrome as the QR menu. */
export default function GuestStatus({ navigate }: { navigate: (p: Page, params?: Record<string, string>) => void }) {
  const { token = "" } = useParams()
  const { role } = useAuth()
  const qc = useQueryClient()
  useEffect(() => { if (token) rememberDineInToken(token) }, [token])

  const orders = useQuery({ queryKey: ["guest", token, "orders"], queryFn: () => ordersApi.guestOrders(token), refetchInterval: 5000, retry: false })
  const bill = useMutation({
    mutationFn: () => ordersApi.requestBill(token),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["guest", token] }),
  })
  const total = (orders.data ?? []).filter((o) => o.status !== "Cancelled" && o.status !== "Unfulfillable").reduce((s, o) => s + o.total, 0)

  return (
    <CustomerFrame
      page="guest-order-status"
      navigate={navigate}
      uc="UC-QR"
      title="Đơn của bàn"
      subtitle={
        role === "customer"
          ? "Khi thanh toán xong, điểm tích lũy sẽ được cộng vào tài khoản của bạn."
          : "Đăng nhập trước khi thanh toán nếu bạn muốn nhận điểm cho đơn này."
      }
    >
      {orders.isPending && <LoadingState />}
      {orders.isError && <ErrorState description={orders.error.message} onRetry={() => void orders.refetch()} />}
      {orders.data?.length === 0 && (
        <EmptyState title="Bàn chưa có đơn nào" action={<Button onClick={() => navigate("guest-menu", { token })}>Chọn món</Button>} />
      )}
      <div className="space-y-4">
        {orders.data?.map((o) => (
          <section key={o.id} className="rounded-[16px] border border-border bg-surface p-5">
            <div className="flex items-center justify-between">
              <p className="font-medium text-text-primary">{o.code} <span className="text-xs text-text-secondary">{formatTime(o.createdAtUtc)}</span></p>
              <OrderStatusPill status={o.status} />
            </div>
            <ul className="mt-3 text-sm text-text-secondary">{o.lines.map((l, i) => <li key={i}>{l.qty}× {l.name} ({l.size})</li>)}</ul>
            {o.status === "Unfulfillable" && (
              <div className="mt-3">
                <Banner>Quán không thực hiện được đơn này{o.reason ? `: ${o.reason}` : ""}. Bạn không bị tính tiền.</Banner>
              </div>
            )}
          </section>
        ))}
        {!!orders.data?.length && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[16px] bg-sand p-5">
            <div>
              <p className="text-sm text-text-secondary">Tạm tính</p>
              <p className="font-serif text-xl text-text-primary">{formatVND(total)}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => navigate("guest-menu", { token })}>Gọi thêm món</Button>
              <Button loading={bill.isPending} disabled={bill.isSuccess} onClick={() => bill.mutate()}>
                {bill.isSuccess ? "Đã gọi thanh toán" : "Gọi thanh toán"}
              </Button>
            </div>
          </div>
        )}
        {bill.isError && <Banner>{bill.error.message}</Banner>}
      </div>
    </CustomerFrame>
  )
}
