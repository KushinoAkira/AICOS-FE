import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { Page } from "../../App"
import { CustomerFrame } from "../../components/CustomerFrame"
import { OrderStatusPill, PaymentPill } from "../../components/OrderStatusPill"
import { OrderProgress } from "../../components/OrderProgress"
import { PayGateway, useStartPayment } from "../../components/PayGateway"
import { isOrderOver, TAKEAWAY_STEPS } from "../../lib/orderProgress"
import { Banner, Button, ConfirmDialog, EmptyState, QueryBoundary } from "../../components/ui"
import { useToast } from "../../context/ToastContext"
import { ordersApi, type Order, type PayOutcome } from "../../lib/api/orders"
import { pollWhile, useMemberRealtime } from "../../lib/realtime"
import { formatDateTime, formatTime, formatVND } from "../../lib/format"
import { orderTitle, shortOrderCode } from "../../lib/orderLabel"

export default function CustomerOrders({ navigate }: { navigate: (p: Page) => void }) {
  const qc = useQueryClient()
  const { showToast } = useToast()
  const live = useMemberRealtime()
  const orders = useQuery({ queryKey: ["mine"], queryFn: ordersApi.mine, refetchInterval: pollWhile(live, 5000) })
  const [paying, setPaying] = useState<Order | null>(null)
  const startPay = useStartPayment(setPaying)
  const [canceling, setCanceling] = useState<Order | null>(null)
  const refresh = () => void qc.invalidateQueries({ queryKey: ["mine"] })
  const pay = useMutation({
    mutationFn: (outcome: PayOutcome) => ordersApi.payOnline(paying!.id, outcome),
    onSuccess: (o) => { setPaying(null); refresh(); showToast(o.paymentStatus === "Paid" ? "Thanh toán thành công" : "Chưa ghi nhận thanh toán", o.paymentStatus === "Paid" ? "success" : "error") },
    onError: (e) => showToast(e.message, "error"),
  })
  const cancel = useMutation({
    mutationFn: (o: Order) => ordersApi.cancelMine(o.id),
    onSuccess: () => { setCanceling(null); refresh(); showToast("Đã hủy đơn", "success") },
    onError: (e) => { setCanceling(null); showToast(e.message, "error"); refresh() },
  })

  const card = (o: Order, active: boolean) => (
    <li key={o.id} className={`rounded-[16px] border bg-surface p-5 ${active && o.status === "Ready" ? "border-state-success" : "border-border"}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium text-text-primary">{orderTitle(o.lines)} <span className="text-sm font-normal text-text-secondary">· {shortOrderCode(o.code)}</span></p>
          <p className="text-sm text-text-secondary">Đặt lúc {formatDateTime(o.createdAtUtc)}</p>
        </div>
        <span className="flex flex-wrap gap-2">{!active && <OrderStatusPill status={o.status} />}<PaymentPill status={o.paymentStatus} /></span>
      </div>
      {active && (
        <div className="mt-4 space-y-3">
          {o.status === "Ready" && <p className="rounded-[12px] bg-success-bg px-4 py-3 text-sm font-medium text-state-success">Đồ uống đã sẵn sàng, mời bạn tới quầy nhận.</p>}
          {o.pickupSlot && <p className="text-sm text-text-secondary">Nhận lúc <b className="font-serif text-xl font-medium text-text-primary">{formatTime(o.pickupSlot)}</b></p>}
          <OrderProgress status={o.status} steps={TAKEAWAY_STEPS} />
        </div>
      )}
      <ul className="mt-4 space-y-1 text-sm">
        {o.lines.map((l, i) => (
          <li key={i} className="flex justify-between gap-3">
            <span className="text-text-primary">{l.qty} × {l.name}{l.size ? <span className="text-text-secondary"> ({l.size})</span> : null}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 flex items-baseline justify-between border-t border-border pt-3 text-sm text-text-secondary">Tổng <b className="text-base text-text-primary">{formatVND(o.total)}</b></p>
      {o.paymentStatus === "RefundPending" && <div className="mt-3"><Banner tone="warn">Đang hoàn {formatVND(o.refundedAmount)}. Sẽ báo đã hoàn khi cổng thanh toán xác nhận.</Banner></div>}
      {o.paymentStatus === "Refunded" && <p className="mt-3 text-sm text-state-success">Đã hoàn {formatVND(o.refundedAmount)}.</p>}
      {o.status === "PendingPayment" && o.paymentStatus === "Unpaid" && o.channel === "takeaway" && <p className="mt-3 text-sm text-text-secondary">Đang chờ xác nhận thanh toán. Nếu bạn đã trả tiền, đơn sẽ tự cập nhật sau khi quán tra cứu giao dịch.</p>}
      {(o.status === "PickedUp" || o.paymentStatus === "Failed" || (o.status === "PendingPayment" && o.paymentStatus === "Unpaid") || ((o.status === "PendingPayment" || o.status === "Pending") && o.paymentStatus !== "RefundPending")) && (
        <div className="mt-4 flex flex-wrap gap-2">
          {(o.paymentStatus === "Failed" || (o.status === "PendingPayment" && o.paymentStatus === "Unpaid")) && <Button loading={startPay.isPending && startPay.variables?.id === o.id} onClick={() => startPay.mutate(o)}>Thanh toán lại</Button>}
          {o.status === "PickedUp" && <Button variant="secondary" onClick={() => navigate("customer-feedback")}>Đánh giá</Button>}
          {(o.status === "PendingPayment" || o.status === "Pending") && o.paymentStatus !== "RefundPending" && <Button variant="ghost" onClick={() => setCanceling(o)}>Hủy đơn</Button>}
        </div>
      )}
    </li>
  )

  return (
    <CustomerFrame page="customer-tracking" navigate={navigate} uc="UC-36" title="Đơn của tôi">
      <QueryBoundary query={orders}>
        {(rows) => {
          if (rows.length === 0) return <EmptyState title="Bạn chưa có đơn nào" description="Đặt trước rồi tới lấy, không phải xếp hàng." action={<Button onClick={() => navigate("customer-menu")}>Đặt mang đi</Button>} />
          const now = rows.filter((o) => !isOrderOver(o.status))
          const past = rows.filter((o) => isOrderOver(o.status))
          return (
            <div className="space-y-10">
              <section aria-labelledby="orders-now">
                <h2 id="orders-now" className="mb-3 font-serif text-xl text-text-primary">Đang thực hiện</h2>
                {now.length === 0
                  ? <p className="rounded-[16px] border border-dashed border-border p-6 text-center text-sm text-text-secondary">Không có đơn nào đang làm.</p>
                  : <ul className="grid gap-4 md:grid-cols-2">{now.map((o) => card(o, true))}</ul>}
              </section>
              {past.length > 0 && (
                <section aria-labelledby="orders-past">
                  <h2 id="orders-past" className="mb-3 font-serif text-xl text-text-primary">Đơn trước đây</h2>
                  <ul className="grid gap-4 md:grid-cols-2">{past.map((o) => card(o, false))}</ul>
                </section>
              )}
            </div>
          )
        }}
      </QueryBoundary>
      <PayGateway open={!!paying} amount={paying?.total ?? 0} code={paying?.code ?? ""} busy={pay.isPending} onOutcome={(o) => pay.mutate(o)} onClose={() => setPaying(null)} />
      <ConfirmDialog open={!!canceling} danger title={`Hủy đơn ${canceling?.code ?? ""}?`} message={canceling?.paymentStatus === "Paid" ? "Đơn đã thanh toán sẽ được hoàn tiền sau khi cổng thanh toán xác nhận." : "Đơn chưa thanh toán sẽ bị hủy."} confirmLabel="Hủy đơn" onCancel={() => setCanceling(null)} onConfirm={() => canceling && cancel.mutate(canceling)} />
    </CustomerFrame>
  )
}