import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { Page } from "../../App"
import { CustomerFrame } from "../../components/CustomerFrame"
import { OrderStatusPill, PaymentPill } from "../../components/OrderStatusPill"
import { PayGateway } from "../../components/PayGateway"
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

  return (
    <CustomerFrame page="customer-tracking" navigate={navigate} uc="UC-36" title="Đơn của tôi">
      <QueryBoundary query={orders}>
        {(rows) => rows.length === 0 ? <EmptyState title="Bạn chưa có đơn nào" action={<Button onClick={() => navigate("customer-menu")}>Đặt mang đi</Button>} /> : (
          <ul className="space-y-4">
            {rows.map((o) => (
              <li key={o.id} className="rounded-[16px] border border-border bg-surface p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-text-primary">{orderTitle(o.lines)} <span className="text-sm font-normal text-text-secondary">· {shortOrderCode(o.code)} · {formatDateTime(o.createdAtUtc)}</span></p>
                  <span className="flex gap-2"><OrderStatusPill status={o.status} /><PaymentPill status={o.paymentStatus} /></span>
                </div>
                <ul className="mt-3 text-sm text-text-secondary">{o.lines.map((l, i) => <li key={i}>{l.qty}× {l.name}{l.size ? ` (${l.size})` : ""}</li>)}</ul>
                <p className="mt-3 text-sm text-text-secondary">{o.pickupSlot && <>Nhận lúc <b className="text-text-primary">{formatTime(o.pickupSlot)}</b> · </>}Tổng <b className="text-text-primary">{formatVND(o.total)}</b></p>
                {o.paymentStatus === "RefundPending" && <div className="mt-3"><Banner tone="warn">Đang hoàn {formatVND(o.refundedAmount)}. Sẽ báo đã hoàn khi cổng thanh toán xác nhận.</Banner></div>}
                {o.paymentStatus === "Refunded" && <p className="mt-3 text-sm text-state-success">Đã hoàn {formatVND(o.refundedAmount)}.</p>}
                {o.status === "PendingPayment" && o.paymentStatus === "Unpaid" && o.channel === "takeaway" && <p className="mt-3 text-sm text-text-secondary">Đang chờ xác nhận thanh toán. Nếu bạn đã trả tiền, đơn sẽ tự cập nhật sau khi quán tra cứu giao dịch.</p>}
                <div className="mt-4 flex gap-2">
                  {o.status === "PickedUp" && <Button variant="secondary" onClick={() => navigate("customer-feedback")}>Đánh giá</Button>}
                  {(o.paymentStatus === "Failed" || (o.status === "PendingPayment" && o.paymentStatus === "Unpaid")) && <Button onClick={() => setPaying(o)}>Thanh toán lại</Button>}
                  {(o.status === "PendingPayment" || o.status === "Pending") && o.paymentStatus !== "RefundPending" && <Button variant="secondary" onClick={() => setCanceling(o)}>Hủy đơn</Button>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </QueryBoundary>
      <PayGateway open={!!paying} amount={paying?.total ?? 0} code={paying?.code ?? ""} busy={pay.isPending} onOutcome={(o) => pay.mutate(o)} onClose={() => setPaying(null)} />
      <ConfirmDialog open={!!canceling} danger title={`Hủy đơn ${canceling?.code ?? ""}?`} message={canceling?.paymentStatus === "Paid" ? "Đơn đã thanh toán sẽ được hoàn tiền sau khi cổng thanh toán xác nhận." : "Đơn chưa thanh toán sẽ bị hủy."} confirmLabel="Hủy đơn" onCancel={() => setCanceling(null)} onConfirm={() => canceling && cancel.mutate(canceling)} />
    </CustomerFrame>
  )
}