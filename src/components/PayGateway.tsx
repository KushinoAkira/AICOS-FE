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

/** The payment page of the gateway could not be opened: say so in Vietnamese; the order stays and can be paid again. */
const HOSTED_ERRORS: Record<string, string> = {
  "payment.momo_failed": "MoMo chưa tạo được trang thanh toán. Thử lại sau ít phút trong mục Đơn của bạn.",
  "payment.momo_not_configured": "Cổng MoMo chưa được cấu hình. Báo quán để chọn cách thanh toán khác.",
  "payment.payos_failed": "payOS chưa tạo được trang thanh toán. Thử lại sau ít phút trong mục Đơn của bạn.",
  "payment.payos_not_configured": "Cổng payOS chưa được cấu hình. Báo quán để chọn cách thanh toán khác.",
}

/**
 * Starts paying an order online. A gateway with its own page (payOS, MoMo) takes the customer there; it sends them back to the result page.
 * Otherwise `onSimulated` opens the simulated gateway above.
 */
export function useStartPayment(onSimulated: (o: Order) => void) {
  const { showToast } = useToast()
  return useMutation({
    mutationFn: async (o: Order) => ({ order: o, url: await ordersApi.hostedCheckout(o.id) }),
    onSuccess: ({ order, url }) => { if (url) window.location.assign(url); else onSimulated(order) },
    onError: (e: Error & { code?: string }) => showToast((e.code && HOSTED_ERRORS[e.code]) || e.message, "error"),
  })
}

/**
 * Covers the page while the payment page of the gateway is being prepared and opened: creating it at MoMo or payOS takes a few
 * seconds, and nothing else should be pressed meanwhile.
 */
export function PaymentRedirecting({ pay }: { pay: ReturnType<typeof useStartPayment> }) {
  const busy = pay.isPending || !!pay.data?.url
  if (!busy) return null
  return (
    <div role="status" aria-live="polite" className="fixed inset-0 z-[60] grid place-items-center bg-[rgba(58,46,34,0.45)] p-4">
      <div className="flex max-w-sm flex-col items-center gap-3 rounded-[20px] bg-surface px-8 py-7 text-center shadow-xl">
        <span aria-hidden className="h-9 w-9 animate-spin rounded-full border-[3px] border-sand border-t-terracotta" />
        <p className="font-serif text-lg text-text-primary">Đang mở trang thanh toán…</p>
        <p className="text-sm text-text-secondary">Vui lòng chờ vài giây, đừng tắt trang.</p>
      </div>
    </div>
  )
}
