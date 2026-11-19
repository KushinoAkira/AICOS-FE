import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { QRCodeSVG } from "qrcode.react"
import { Banner, Button, StatusPill } from "./ui"
import { env } from "../config/env"
import type { DigitalCharge } from "../lib/api/orders"
import { formatVND } from "../lib/format"

const isLink = (url: string) => /^https?:\/\//.test(url)
const isImage = (url: string) => /^https?:\/\//.test(url) && /\.(png|jpe?g|svg|webp)(\?|$)/i.test(url)

/**
 * One online payment for each unpaid order: the QR or payment link, the provider's answer, and a way to ask again when the callback is late.
 * "Giả lập" plays the provider and exists only where the demo tools are on; the backend refuses it where simulation is disabled.
 */
export function DigitalPayment({ charges, check, simulate, onSettled }: {
  charges: DigitalCharge[]
  check: (c: DigitalCharge) => Promise<DigitalCharge>
  simulate: (c: DigitalCharge) => Promise<DigitalCharge>
  onSettled: () => void
}) {
  const [rows, setRows] = useState(charges)
  const [message, setMessage] = useState<string | null>(null)
  const replace = (next: DigitalCharge) => {
    setRows((all) => all.map((c) => (c.id === next.id ? next : c)))
    setMessage(next.state === "Paid" ? null : next.state === "Failed" ? "Giao dịch không thành công. Hãy thử lại hoặc chọn cách khác." : "Cổng thanh toán chưa xác nhận. Hãy thử kiểm tra lại sau ít phút.")
    if (next.state === "Paid") onSettled()
  }
  const ask = useMutation({ mutationFn: check, onSuccess: replace, onError: (e) => setMessage(e.message) })
  const play = useMutation({ mutationFn: simulate, onSuccess: replace, onError: (e) => setMessage(e.message) })
  const allPaid = rows.every((c) => c.state === "Paid")

  return (
    <div className="space-y-3">
      {allPaid && <Banner tone="success">Đã thanh toán xong. Cảm ơn bạn!</Banner>}
      {message && !allPaid && <Banner tone="warn">{message}</Banner>}
      <ul className="space-y-3">
        {rows.map((c) => (
          <li key={c.id} className="rounded-[12px] border border-border p-3 text-sm">
            <p className="flex items-center justify-between font-medium text-text-primary">
              <span>{c.orderCode}</span>
              <span>{formatVND(c.amount)}</span>
            </p>
            <div className="mt-1"><StatusPill tone={c.state === "Paid" ? "success" : c.state === "Failed" ? "danger" : "pending"}>{c.state === "Paid" ? "Đã nhận tiền" : c.state === "Failed" ? "Không thành công" : "Chờ thanh toán"}</StatusPill></div>
            {c.state === "Pending" && c.checkoutUrl && (
              isImage(c.checkoutUrl)
                ? <img src={c.checkoutUrl} alt={`Mã QR thanh toán đơn ${c.orderCode}`} className="mx-auto mt-3 w-full max-w-[240px] rounded-[8px]" />
                : isLink(c.checkoutUrl)
                  // A payment page (payOS): the customer scans this code with their phone and pays there.
                  ? <div className="mt-3 flex flex-col items-center gap-2" data-testid="checkout-link">
                      <QRCodeSVG value={c.checkoutUrl} size={180} marginSize={2} aria-label={`Mã QR mở trang thanh toán đơn ${c.orderCode}`} />
                      <a href={c.checkoutUrl} target="_blank" rel="noreferrer" className="text-sm font-medium text-clay underline underline-offset-2">Mở trang thanh toán</a>
                    </div>
                  : <p className="mt-2 break-all text-xs text-text-secondary">Mã giao dịch: {c.reference}</p>
            )}
            {c.state === "Pending" && (
              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="secondary" className="min-h-10 flex-1" loading={ask.isPending && ask.variables?.id === c.id} onClick={() => ask.mutate(c)}>Kiểm tra giao dịch</Button>
                {env.demo && <Button className="min-h-10 flex-1" loading={play.isPending && play.variables?.id === c.id} onClick={() => play.mutate(c)}>Giả lập đã trả tiền</Button>}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
