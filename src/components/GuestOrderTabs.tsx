import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { GuestPay } from "./GuestPay"
import { OrderStatusPill } from "./OrderStatusPill"
import { Banner, Button, EmptyState, ErrorState, LoadingState } from "./ui"
import { ordersApi, type LineInput, type Order } from "../lib/api/orders"
import { pollWhile } from "../lib/realtime"
import { formatDateTime, formatTime, formatVND } from "../lib/format"
import { clearGuestHistory, readGuestHistory, type PastOrder } from "../lib/guestHistory"

const linesText = (lines: Order["lines"]) => lines.map((l) => `${l.qty}× ${l.name}${l.size ? ` (${l.size})` : ""}`).join(", ")

/** A sitting that was paid has closed, so its channel is gone: these orders are followed by asking. */
export const paidAndStillMaking = (o: Order) => o.paymentStatus === "Paid" && !["Served", "PickedUp", "Cancelled", "Unfulfillable", "NoShow"].includes(o.status)

/** "Đã gọi": the table's open orders with live status and the bill request. */
export function OrderedTab({ token, channelUp = false }: { token: string; channelUp?: boolean }) {
  const orders = useQuery({ queryKey: ["guest", token, "orders"], queryFn: () => ordersApi.guestOrders(token), refetchInterval: (q) => (q.state.data?.some(paidAndStillMaking) ? 5000 : pollWhile(channelUp, 5000)), retry: false })
  if (orders.isPending) return <LoadingState />
  if (orders.isError) return <ErrorState description={orders.error.message} onRetry={() => void orders.refetch()} />
  if (orders.data.length === 0) return <EmptyState title="Bàn chưa gọi món nào" description="Món đã gửi sẽ hiện ở đây cùng trạng thái." />
  const live = orders.data.filter((o) => o.status !== "Cancelled" && o.status !== "Unfulfillable")
  const total = live.reduce((s, o) => s + o.total, 0)
  const due = live.filter((o) => o.paymentStatus === "Unpaid").reduce((s, o) => s + o.total, 0)
  const allPaid = live.length > 0 && due === 0
  return (
    <div>
      <ul className="space-y-3">
        {orders.data.map((o) => (
          <li key={o.id} className="rounded-[14px] border border-border p-3 text-sm">
            <div className="flex items-center justify-between"><b className="text-text-primary">{o.code} <span className="font-normal text-text-secondary">{formatTime(o.createdAtUtc)}</span></b><OrderStatusPill status={o.status} /></div>
            <ul className="mt-2 text-text-secondary">{o.lines.map((l, i) => <li key={i}>{l.qty}× {l.name}{l.size ? ` (${l.size})` : ""}</li>)}</ul>
            {o.status === "Unfulfillable" && <div className="mt-2"><Banner>Quán không làm được đơn này{o.reason ? `: ${o.reason}` : ""}. Bạn không bị tính tiền.</Banner></div>}
          </li>
        ))}
      </ul>
      {allPaid ? (
        <div className="mt-4 rounded-[14px] bg-sand p-4"><p className="font-serif text-lg text-text-primary">Đã thanh toán {formatVND(total)}</p><p className="text-xs text-text-secondary">Cảm ơn bạn! Đơn sẽ được lưu vào lịch sử khi thu ngân hoàn thành bàn.</p></div>
      ) : (
        <GuestPay token={token} due={due} />
      )}
    </div>
  )
}

function PastList({ rows, reorder }: { rows: PastOrder[]; reorder: (l: LineInput[]) => number }) {
  return (
    <ul className="space-y-3">
      {rows.map((o) => (
        <li key={o.code} className="rounded-[14px] border border-border p-3 text-sm">
          <div className="flex items-center justify-between"><b className="text-text-primary">{formatDateTime(o.atUtc)}</b><span className="text-text-secondary">{formatVND(o.total)}</span></div>
          <p className="mt-1 text-text-secondary">{o.tableCode !== "Mang đi" ? `Bàn ${o.tableCode} · ` : ""}{linesText(o.lines)}</p>
          <Button variant="secondary" className="mt-2 px-3 py-1.5 text-xs" onClick={() => reorder(o.lines)}>Gọi lại</Button>
        </li>
      ))}
    </ul>
  )
}

/** "Lịch sử": signed-in customers see every completed order from the server; guests see this device's own list. */
export function HistoryTab({ signedIn, reorder, onLogin, version }: { signedIn: boolean; reorder: (l: LineInput[]) => number; onLogin: () => void; version: number }) {
  const mine = useQuery({ queryKey: ["mine"], queryFn: ordersApi.mine, enabled: signedIn })
  const [cleared, setCleared] = useState(0)
  if (signedIn) {
    if (mine.isPending) return <LoadingState />
    if (mine.isError) return <ErrorState description={mine.error.message} onRetry={() => void mine.refetch()} />
    // Dine-in orders enter history only once the cashier completes the table; takeaway once picked up.
    const done = mine.data.filter((o) => (o.channel === "takeaway" ? o.status === "PickedUp" : !!o.completedAtUtc))
    if (done.length === 0) return <EmptyState title="Chưa có lịch sử mua hàng" description="Các lần bạn đã dùng món sẽ hiện ở đây sau khi thanh toán xong." />
    return <PastList reorder={reorder} rows={done.map((o) => ({ code: o.code, atUtc: o.completedAtUtc ?? o.createdAtUtc, tableCode: o.tableCode, total: o.total, lines: o.lines }))} />
  }
  void version; void cleared
  const rows = readGuestHistory()
  return (
    <div>
      {rows.length === 0 ? <EmptyState title="Chưa có lịch sử trên thiết bị này" /> : <PastList rows={rows} reorder={reorder} />}
      <div className="mt-4 rounded-[14px] bg-sand p-3 text-xs text-text-secondary">
        Lịch sử này chỉ lưu trên thiết bị của bạn. <button onClick={onLogin} className="font-medium text-clay underline">Đăng nhập</button> để xem mọi lần mua và tích điểm.
        {rows.length > 0 && <button onClick={() => { clearGuestHistory(); setCleared((n) => n + 1) }} className="ml-2 underline">Xóa lịch sử</button>}
      </div>
    </div>
  )
}
