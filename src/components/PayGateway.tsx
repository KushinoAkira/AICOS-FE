import { useMutation } from "@tanstack/react-query"
import { Button, Modal } from "./ui"
import { useToast } from "../context/ToastContext"
import { ordersApi, type Order, type PayOutcome } from "../lib/api/orders"
import { formatVND } from "../lib/format"

/** Stand-in for the provider's hosted payment page. In real mode the user is redirected to the provider instead. */
export function PayGateway({ open, amount, code, busy, onOutcome, onClose }: { open: boolean; amount: number; code: string; busy: boolean; onOutcome: (o: PayOutcome) => void; onClose: () => void }) {
  return (
    <Modal open={open} title="Thanh toán trực tuyến (giả lập)" onClose={onClose} footer={<Button variant="secondary" onClick={onClose}>Để sau</Button>}>
      <p className="text-sm text-text-secondary">Đơn {code} · Số tiền <b className="text-text-primary">{formatVND(amount)}</b></p>
      <div className="mt-4 space-y-2">
        <Button className="w-full" loading={busy} onClick={() => onOutcome("success")}>Thanh toán thành công</Button>
        <Button variant="secondary" className="w-full" disabled={busy} onClick={() => onOutcome("failed")}>Giao dịch thất bại</Button>
        <Button variant="secondary" className="w-full" disabled={busy} onClick={() => onOutcome("lost")}>Đã trừ tiền nhưng mất kết nối</Button>
      </div>
      <p className="mt-3 text-xs text-text-secondary">Đơn chỉ được xác nhận khi cổng thanh toán báo thành công. Nếu mất kết nối, thu ngân có thể tra cứu lại giao dịch.</p>
    </Modal>
  )
}
/**
 * Starts paying an order online. A gateway with its own page (payOS) takes the customer there; it sends them back to the result page.
 * Otherwise `onSimulated` opens the simulated gateway above.
 */
export function useStartPayment(onSimulated: (o: Order) => void) {
  const { showToast } = useToast()
  return useMutation({
    mutationFn: async (o: Order) => ({ order: o, url: await ordersApi.hostedCheckout(o.id) }),
    onSuccess: ({ order, url }) => { if (url) window.location.assign(url); else onSimulated(order) },
    onError: (e) => showToast(e.message, "error"),
  })
}
