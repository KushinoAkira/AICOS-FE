import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { Page } from "../../App"
import { CustomerFrame } from "../../components/CustomerFrame"
import { OrderStatusPill, PaymentPill } from "../../components/OrderStatusPill"
import { PayGateway } from "../../components/PayGateway"
import { Banner, Button, EmptyState, Field, Modal, QueryBoundary } from "../../components/ui"
import { useToast } from "../../context/ToastContext"
import { ordersApi, type CancelInput, type Order, type PayOutcome } from "../../lib/api/orders"

/** Common Vietnamese banks, offered as suggestions; any other name can be typed. */
const BANKS = ["Vietcombank", "VietinBank", "BIDV", "Agribank", "Techcombank", "MB Bank", "ACB", "VPBank", "TPBank", "Sacombank", "HDBank", "VIB", "SHB", "OCB", "MSB", "SeABank", "Eximbank", "LPBank", "Nam A Bank", "Bac A Bank"]
const REASONS = ["Đặt nhầm món", "Không kịp đến nhận", "Muốn đổi giờ nhận", "Đổi ý, không dùng nữa"]
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
  const [form, setForm] = useState({ reason: "", bankName: "", bankAccountNumber: "", bankAccountHolder: "" })
  const [formError, setFormError] = useState<string | null>(null)
  const paidCancel = canceling?.paymentStatus === "Paid"
  function startCancel(o: Order) { setForm({ reason: "", bankName: "", bankAccountNumber: "", bankAccountHolder: "" }); setFormError(null); setCanceling(o) }
  function confirmCancel() {
    if (!canceling) return
    if (form.reason.trim().length < 3) return setFormError("Cho quán biết lý do hủy (ít nhất 3 ký tự).")
    if (paidCancel) {
      if (!form.bankName.trim()) return setFormError("Chọn hoặc nhập tên ngân hàng.")
      if (!/^[0-9]{6,20}$/.test(form.bankAccountNumber)) return setFormError("Số tài khoản gồm 6 đến 20 chữ số, không có khoảng trắng.")
      if (form.bankAccountHolder.trim().length < 2) return setFormError("Nhập tên chủ tài khoản.")
    }
    setFormError(null)
    cancel.mutate({ order: canceling, input: paidCancel ? { reason: form.reason.trim(), bankName: form.bankName.trim(), bankAccountNumber: form.bankAccountNumber, bankAccountHolder: form.bankAccountHolder.trim() } : { reason: form.reason.trim() } })
  }
  const refresh = () => void qc.invalidateQueries({ queryKey: ["mine"] })
  const pay = useMutation({
    mutationFn: (outcome: PayOutcome) => ordersApi.payOnline(paying!.id, outcome),
    onSuccess: (o) => { setPaying(null); refresh(); showToast(o.paymentStatus === "Paid" ? "Thanh toán thành công" : "Chưa ghi nhận thanh toán", o.paymentStatus === "Paid" ? "success" : "error") },
    onError: (e) => showToast(e.message, "error"),
  })
  const cancel = useMutation({
    mutationFn: ({ order, input }: { order: Order; input: CancelInput }) => ordersApi.cancelMine(order.id, input),
    onSuccess: (_o, v) => { setCanceling(null); refresh(); showToast(v.input.bankAccountNumber ? "Đã hủy đơn. Quán sẽ duyệt và chuyển tiền về tài khoản của bạn." : "Đã hủy đơn", "success") },
    onError: (e) => { setFormError(e.message); refresh() },
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
                {o.paymentStatus === "RefundPending" && <div className="mt-3"><Banner tone="warn">Đơn đã hủy. Yêu cầu hoàn tiền đang chờ quán duyệt; quán sẽ chuyển khoản về tài khoản bạn đã cung cấp.</Banner></div>}
                {o.paymentStatus === "Refunded" && <p className="mt-3 text-sm text-state-success">Đã hoàn {formatVND(o.refundedAmount)}.</p>}
                {o.status === "PendingPayment" && o.paymentStatus === "Unpaid" && o.channel === "takeaway" && <p className="mt-3 text-sm text-text-secondary">Đang chờ xác nhận thanh toán. Nếu bạn đã trả tiền, đơn sẽ tự cập nhật sau khi quán tra cứu giao dịch.</p>}
                <div className="mt-4 flex gap-2">
                  {o.status === "PickedUp" && <Button variant="secondary" onClick={() => navigate("customer-feedback")}>Đánh giá</Button>}
                  {(o.paymentStatus === "Failed" || (o.status === "PendingPayment" && o.paymentStatus === "Unpaid")) && <Button onClick={() => setPaying(o)}>Thanh toán lại</Button>}
                  {(o.status === "PendingPayment" || o.status === "Pending") && o.paymentStatus !== "RefundPending" && <Button variant="secondary" onClick={() => startCancel(o)}>Hủy đơn</Button>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </QueryBoundary>
      <PayGateway open={!!paying} amount={paying?.total ?? 0} code={paying?.code ?? ""} busy={pay.isPending} onOutcome={(o) => pay.mutate(o)} onClose={() => setPaying(null)} />
      <Modal open={!!canceling} title={`Hủy đơn ${canceling ? shortOrderCode(canceling.code) : ""}`} onClose={() => setCanceling(null)}
        footer={<><Button variant="secondary" onClick={() => setCanceling(null)}>Không hủy</Button><Button loading={cancel.isPending} onClick={confirmCancel}>Hủy đơn</Button></>}>
        <div className="space-y-4">
          {formError && <Banner>{formError}</Banner>}
          <div>
            <p className="mb-2 text-sm font-medium text-text-primary">Lý do hủy</p>
            <div className="mb-2 flex flex-wrap gap-2">
              {REASONS.map((r) => <button key={r} type="button" aria-pressed={form.reason === r} onClick={() => setForm({ ...form, reason: r })} className={`rounded-full border px-3 py-1.5 text-xs ${form.reason === r ? "border-espresso bg-espresso text-white" : "border-border text-text-secondary"}`}>{r}</button>)}
            </div>
            <textarea aria-label="Lý do hủy" value={form.reason} maxLength={300} rows={2} placeholder="Hoặc tự nhập lý do" onChange={(e) => setForm({ ...form, reason: e.target.value })} className="w-full rounded-[10px] border border-border p-3 text-sm" />
          </div>
          {paidCancel ? (
            <>
              <p className="text-sm text-text-secondary">Đơn đã thanh toán <b className="text-text-primary">{formatVND(canceling?.total ?? 0)}</b>. Đơn được hủy ngay; tiền hoàn theo chính sách hủy của quán sẽ được <b className="text-text-primary">chủ quán duyệt và chuyển khoản</b> về tài khoản dưới đây.</p>
              <Field label="Ngân hàng" list="bank-names" value={form.bankName} placeholder="Ví dụ: Vietcombank" onChange={(e) => setForm({ ...form, bankName: e.target.value })} />
              <datalist id="bank-names">{BANKS.map((b) => <option key={b} value={b} />)}</datalist>
              <Field label="Số tài khoản" inputMode="numeric" value={form.bankAccountNumber} maxLength={20} onChange={(e) => setForm({ ...form, bankAccountNumber: e.target.value.replace(/\D/g, "") })} />
              <Field label="Tên chủ tài khoản" value={form.bankAccountHolder} maxLength={100} placeholder="Viết không dấu, ví dụ NGUYEN VAN A" onChange={(e) => setForm({ ...form, bankAccountHolder: e.target.value.toUpperCase() })} />
            </>
          ) : <p className="text-sm text-text-secondary">Đơn chưa thanh toán nên sẽ được hủy ngay, không phát sinh hoàn tiền.</p>}
        </div>
      </Modal>
    </CustomerFrame>
  )
}