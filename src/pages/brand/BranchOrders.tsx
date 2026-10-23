import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { Page } from "../../App"
import { OrderStatusPill, PaymentPill } from "../../components/OrderStatusPill"
import { PageFrame } from "../../components/PageFrame"
import { Banner, ConfirmDialog, DataTable, Field, Modal, QueryBoundary, Button, type Column } from "../../components/ui"
import { useToast } from "../../context/ToastContext"
import { ordersApi, type Order } from "../../lib/api/orders"
import { formatDateTime, formatVND } from "../../lib/format"
import { canTransition, maxRefundable, ORDER_STATUS_LABEL, type OrderStatus } from "../../lib/orderStateMachine"

const FILTERS: (OrderStatus | "all")[] = ["all", "Pending", "Preparing", "Ready", "Served", "Cancelled", "Unfulfillable"]

export default function BranchOrders({ navigate }: { navigate: (p: Page) => void }) {
  const qc = useQueryClient()
  const { showToast } = useToast()
  const orders = useQuery({ queryKey: ["orders"], queryFn: ordersApi.orders, refetchInterval: 10000 })
  const [filter, setFilter] = useState<OrderStatus | "all">("all")
  const [target, setTarget] = useState<Order | null>(null)
  const [reason, setReason] = useState("")
  const [refunding, setRefunding] = useState<Order | null>(null)
  const [amount, setAmount] = useState("")
  const [refundReason, setRefundReason] = useState("")
  const [refundError, setRefundError] = useState<string | null>(null)
  const max = refunding ? maxRefundable(refunding.paidAmount, refunding.refundedAmount) : 0
  const refund = useMutation({
    mutationFn: (o: Order) => ordersApi.refund(o.id, { amount: Number(amount), reason: refundReason }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["orders"] }); setRefunding(null); showToast("Đã gửi yêu cầu hoàn tiền. Đơn chỉ hiện đã hoàn khi cổng thanh toán xác nhận.", "success") },
    onError: (e) => setRefundError(e.message),
  })
  function openRefund(o: Order) { setRefunding(o); setAmount(String(maxRefundable(o.paidAmount, o.refundedAmount))); setRefundReason(""); setRefundError(null) }
  const cancel = useMutation({
    mutationFn: (o: Order) => ordersApi.transition(o.id, { status: "Cancelled", reason }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["orders"] }); setTarget(null); setReason(""); showToast("Đã hủy đơn", "success") },
    onError: (e) => showToast(e.message, "error"),
  })
  const columns: Column<Order>[] = [
    { key: "code", header: "Đơn", sort: (o) => o.code, render: (o) => <span className="font-medium text-text-primary">{o.code} · Bàn {o.tableCode}</span> },
    { key: "time", header: "Thời gian", sort: (o) => o.createdAtUtc, render: (o) => formatDateTime(o.createdAtUtc) },
    { key: "items", header: "Món", render: (o) => o.lines.map((l) => `${l.qty}× ${l.name}`).join(", ") },
    { key: "total", header: "Tổng", sort: (o) => o.total, render: (o) => formatVND(o.total) },
    { key: "st", header: "Trạng thái", render: (o) => <OrderStatusPill status={o.status} /> },
    { key: "pay", header: "Thanh toán", render: (o) => <PaymentPill status={o.paymentStatus} /> },
    { key: "act", header: "", className: "text-right", render: (o) => <span className="flex justify-end gap-2"><Button variant="ghost" className="px-3 py-1.5 text-xs" disabled={!canTransition(o.status, "Cancelled", o.channel) || o.paymentStatus === "Paid"} disabledReason="Đơn không thể hủy ở trạng thái này" onClick={() => setTarget(o)}>Hủy đơn</Button><Button variant="secondary" className="px-3 py-1.5 text-xs" disabled={o.paymentStatus !== "Paid" || maxRefundable(o.paidAmount, o.refundedAmount) === 0} disabledReason="Chỉ hoàn tiền cho đơn đã thanh toán" onClick={() => openRefund(o)}>Hoàn tiền</Button></span> },
  ]
  return (
    <PageFrame page="branch-orders" navigate={navigate} uc="UC-27" title="Đơn hàng chi nhánh" subtitle="Theo dõi mọi đơn của chi nhánh. Hoàn tiền chỉ áp dụng cho đơn đã thanh toán.">
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => <button key={f} aria-pressed={f === filter} onClick={() => setFilter(f)} className={`rounded-full px-4 py-1.5 text-sm ${f === filter ? "bg-espresso text-white" : "bg-sand text-text-secondary"}`}>{f === "all" ? "Tất cả" : ORDER_STATUS_LABEL[f]}</button>)}
      </div>
      <QueryBoundary query={orders}>{(rows) => <DataTable rows={rows.filter((o) => filter === "all" || o.status === filter)} rowKey={(o) => o.id} columns={columns} pageSize={12} emptyTitle="Không có đơn nào" />}</QueryBoundary>
      <ConfirmDialog open={!!target} danger requireReason reason={reason} onReason={setReason} title={`Hủy đơn ${target?.code ?? ""}?`} message="Đơn sẽ bị hủy và ghi vào nhật ký cùng lý do." confirmLabel="Hủy đơn" onCancel={() => { setTarget(null); setReason("") }} onConfirm={() => target && cancel.mutate(target)} />
      <Modal open={!!refunding} title={`Hoàn tiền ${refunding?.code ?? ""}`} onClose={() => setRefunding(null)} footer={refunding && <><Button variant="secondary" onClick={() => setRefunding(null)}>Hủy</Button><Button loading={refund.isPending} disabled={!(Number(amount) > 0 && Number(amount) <= max) || !refundReason.trim()} disabledReason="Nhập số tiền hợp lệ và lý do" onClick={() => refund.mutate(refunding)}>Hoàn tiền</Button></>}>
        <div className="space-y-4">
          {refundError && <Banner>{refundError}</Banner>}
          <p className="text-sm text-text-secondary">Đã thanh toán {formatVND(refunding?.paidAmount ?? 0)} · tối đa hoàn <b className="text-text-primary">{formatVND(max)}</b></p>
          <Field label="Số tiền hoàn (₫)" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))} error={Number(amount) > max ? "Vượt quá số tiền có thể hoàn" : undefined} />
          <Field label="Lý do (bắt buộc)" value={refundReason} onChange={(e) => setRefundReason(e.target.value)} />
        </div>
      </Modal>
    </PageFrame>
  )
}