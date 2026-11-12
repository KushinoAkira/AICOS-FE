import { useState } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { DigitalPayment } from "./DigitalPayment"
import { Banner, Button, Modal } from "./ui"
import { ordersApi, type DigitalCharge } from "../lib/api/orders"
import { formatVND } from "../lib/format"

/** At the counter: choose the provider, show the customer the QR, and wait for the provider's confirmation (staff cannot confirm by eye, BR-26). */
export function CounterDigitalPay({ open, amount, start, onClose, onSettled }: {
  open: boolean
  amount: number
  start: (provider: string) => Promise<DigitalCharge[]>
  onClose: () => void
  onSettled: () => void
}) {
  const [charges, setCharges] = useState<DigitalCharge[] | null>(null)
  const methods = useQuery({ queryKey: ["counter", "pay-methods"], queryFn: ordersApi.counterPayMethods, enabled: open })
  const begin = useMutation({ mutationFn: start, onSuccess: setCharges })
  const close = () => { setCharges(null); begin.reset(); onClose() }
  return (
    <Modal open={open} title="Chuyển khoản QR" onClose={close} footer={<Button variant="secondary" onClick={close}>Đóng</Button>}>
      {charges ? (
        <DigitalPayment charges={charges} check={ordersApi.chargeCheck} simulate={ordersApi.chargeSimulate} onSettled={onSettled} />
      ) : methods.isPending ? (
        <p className="text-sm text-text-secondary">Đang tải cách thanh toán…</p>
      ) : methods.isError ? (
        <Banner>{methods.error.message}</Banner>
      ) : methods.data.length === 0 ? (
        <Banner>Chưa có cổng thanh toán nào được bật cho chi nhánh này.</Banner>
      ) : (
        <>
          <p className="text-sm text-text-secondary">Số tiền <b className="text-text-primary">{formatVND(amount)}</b>. Chọn cổng thanh toán:</p>
          {begin.isError && <div className="mt-3"><Banner>{begin.error.message}</Banner></div>}
          <div className="mt-4 space-y-2">
            {methods.data.map((m) => (
              <Button key={m.code} variant="secondary" className="min-h-11 w-full" loading={begin.isPending && begin.variables === m.code} disabled={begin.isPending} onClick={() => begin.mutate(m.code)}>{m.name}</Button>
            ))}
          </div>
        </>
      )}
    </Modal>
  )
}
