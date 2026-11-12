import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { DigitalPayment } from "./DigitalPayment"
import { Banner, Button, Modal } from "./ui"
import { ordersApi, type DigitalCharge } from "../lib/api/orders"
import { formatVND } from "../lib/format"

/**
 * What a guest can do about the bill: pay by QR on the phone, or ask staff to come (cash or transfer).
 * The order is paid only when the payment provider confirms it (BR-26), so this screen never marks anything paid by itself.
 */
export function GuestPay({ token, due }: { token: string; due: number }) {
  const qc = useQueryClient()
  const [askOpen, setAskOpen] = useState(false)
  const [payOpen, setPayOpen] = useState(false)
  const [charges, setCharges] = useState<DigitalCharge[] | null>(null)
  const methods = useQuery({ queryKey: ["guest", token, "pay-methods"], queryFn: () => ordersApi.guestPayMethods(token), enabled: payOpen, retry: false })
  const refresh = () => void qc.invalidateQueries({ queryKey: ["guest", token] })
  const ask = useMutation({ mutationFn: (method: "Cash" | "Transfer") => ordersApi.requestBill(token, method), onSuccess: () => { setAskOpen(false); refresh() } })
  const start = useMutation({ mutationFn: (provider: string) => ordersApi.guestPayStart(token, provider), onSuccess: setCharges })
  const closePay = () => { setPayOpen(false); setCharges(null); start.reset(); refresh() }

  return (
    <div className="mt-4 rounded-[14px] bg-sand p-4">
      <p className="text-xs text-text-secondary">Còn phải trả</p>
      <p className="font-serif text-lg text-text-primary">{formatVND(due)}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button className="min-h-11 flex-1" onClick={() => setPayOpen(true)}>Thanh toán QR</Button>
        <Button variant="secondary" className="min-h-11 flex-1" disabled={ask.isSuccess} onClick={() => setAskOpen(true)}>{ask.isSuccess ? "Đã gọi nhân viên" : "Gọi nhân viên"}</Button>
      </div>
      {ask.isSuccess && <p role="status" className="mt-2 text-xs text-text-secondary">Nhân viên đang tới bàn của bạn.</p>}

      <Modal open={askOpen} title="Gọi nhân viên thanh toán" onClose={() => setAskOpen(false)} footer={<Button variant="secondary" onClick={() => setAskOpen(false)}>Đóng</Button>}>
        <p className="text-sm text-text-secondary">Bạn muốn trả bằng cách nào?</p>
        {ask.isError && <div className="mt-3"><Banner>{ask.error.message}</Banner></div>}
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <Button className="min-h-11" loading={ask.isPending && ask.variables === "Cash"} disabled={ask.isPending} onClick={() => ask.mutate("Cash")}>Tiền mặt</Button>
          <Button variant="secondary" className="min-h-11" loading={ask.isPending && ask.variables === "Transfer"} disabled={ask.isPending} onClick={() => ask.mutate("Transfer")}>Chuyển khoản</Button>
        </div>
      </Modal>

      <Modal open={payOpen} title="Thanh toán QR" onClose={closePay} footer={<Button variant="secondary" onClick={closePay}>Đóng</Button>}>
        {charges ? (
          <DigitalPayment
            charges={charges}
            check={(c) => ordersApi.guestPayCheck(token, c)}
            simulate={(c) => ordersApi.guestPaySimulate(token, c)}
            onSettled={refresh}
          />
        ) : methods.isPending ? (
          <p className="text-sm text-text-secondary">Đang tải cách thanh toán…</p>
        ) : methods.isError ? (
          <Banner>{methods.error.message}</Banner>
        ) : methods.data.length === 0 ? (
          <Banner>Quán chưa bật thanh toán QR. Hãy gọi nhân viên để thanh toán.</Banner>
        ) : (
          <>
            <p className="text-sm text-text-secondary">Số tiền <b className="text-text-primary">{formatVND(due)}</b>. Chọn cách thanh toán:</p>
            {start.isError && <div className="mt-3"><Banner>{start.error.message}</Banner></div>}
            <div className="mt-4 space-y-2">
              {methods.data.map((m) => (
                <Button key={m.code} variant="secondary" className="min-h-11 w-full" loading={start.isPending && start.variables === m.code} disabled={start.isPending} onClick={() => start.mutate(m.code)}>{m.name}</Button>
              ))}
            </div>
          </>
        )}
      </Modal>
    </div>
  )
}
