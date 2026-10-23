import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { Page } from "../../App"
import { OrderStatusPill } from "../../components/OrderStatusPill"
import { PageFrame } from "../../components/PageFrame"
import { Button, ConfirmDialog, EmptyState, QueryBoundary } from "../../components/ui"
import { useToast } from "../../context/ToastContext"
import { ordersApi, type Order } from "../../lib/api/orders"
import { formatTime } from "../../lib/format"
import type { OrderStatus } from "../../lib/orderStateMachine"

const COLUMNS: { status: OrderStatus; title: string }[] = [
  { status: "Pending", title: "Chờ pha chế" },
  { status: "Preparing", title: "Đang pha" },
  { status: "Ready", title: "Sẵn sàng" },
]

/** Barista kiosk: big touch targets, 5s polling, no prices (UC-30..32). */
export default function BaristaQueue({ navigate }: { navigate: (p: Page) => void }) {
  const qc = useQueryClient()
  const { showToast } = useToast()
  const orders = useQuery({ queryKey: ["orders"], queryFn: ordersApi.orders, refetchInterval: 5000 })
  const [failing, setFailing] = useState<Order | null>(null)
  const [reason, setReason] = useState("")
  const move = useMutation({
    mutationFn: (v: { id: string; status: OrderStatus; reason?: string }) => ordersApi.transition(v.id, { status: v.status, reason: v.reason }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["orders"] }); setFailing(null); setReason("") },
    onError: (e) => { showToast(e.message, "error"); void qc.invalidateQueries({ queryKey: ["orders"] }) },
  })
  const busy = (id: string) => move.isPending && move.variables?.id === id

  return (
    <PageFrame page="barista-queue" navigate={navigate} uc="UC-30" title="Hàng chờ pha chế" subtitle="Tự cập nhật mỗi 5 giây.">
      <QueryBoundary query={orders}>
        {(rows) => (
          <div className="grid gap-5 lg:grid-cols-3">
            {COLUMNS.map((c) => {
              const col = [...rows].filter((o) => o.status === c.status).reverse()
              return (
                <section key={c.status} aria-label={c.title} className="rounded-[16px] bg-bg-warm p-4">
                  <h2 className="mb-3 flex justify-between font-serif text-lg text-text-primary">{c.title}<span className="text-sm text-text-secondary">{col.length}</span></h2>
                  {col.length === 0 ? <EmptyState title="Trống" /> : (
                    <ul className="space-y-3">
                      {col.map((o) => (
                        <li key={o.id} className="rounded-[14px] border border-border bg-surface p-4">
                          <div className="flex items-center justify-between"><p className="text-lg font-semibold text-text-primary">{o.code} · {o.channel === "takeaway" ? "Mang đi" : `Bàn ${o.tableCode}`}</p><span className="text-xs text-text-secondary">{formatTime(o.createdAtUtc)}</span></div>
                          <ul className="mt-2 space-y-1 text-sm text-text-primary">
                            {o.lines.map((l, i) => <li key={i}>{l.qty}× <b>{l.name}</b> <span className="text-text-secondary">{[l.size, `đường ${l.sugar}`, l.ice, l.note].filter(Boolean).join(" · ")}</span></li>)}
                          </ul>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {c.status === "Pending" && <Button className="flex-1 py-3" loading={busy(o.id)} onClick={() => move.mutate({ id: o.id, status: "Preparing" })}>Bắt đầu pha</Button>}
                            {c.status === "Preparing" && <Button className="flex-1 py-3" loading={busy(o.id)} onClick={() => move.mutate({ id: o.id, status: "Ready" })}>Xong</Button>}
                            {c.status === "Ready" && <><Button className="flex-1 py-3" loading={busy(o.id)} onClick={() => move.mutate({ id: o.id, status: o.channel === "takeaway" ? "PickedUp" : "Served" })}>{o.channel === "takeaway" ? "Khách đã nhận" : "Đã phục vụ"}</Button>{o.channel === "takeaway" && <Button variant="danger" disabled={busy(o.id)} onClick={() => move.mutate({ id: o.id, status: "NoShow" })}>Không đến nhận</Button>}<Button variant="secondary" disabled={busy(o.id)} onClick={() => move.mutate({ id: o.id, status: "Preparing" })}>Pha lại</Button></>}
                            {c.status !== "Ready" && <Button variant="danger" disabled={busy(o.id)} onClick={() => setFailing(o)}>Không làm được</Button>}
                          </div>
                          {c.status === "Ready" && <div className="mt-2"><OrderStatusPill status="Ready" /></div>}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              )
            })}
          </div>
        )}
      </QueryBoundary>
      <ConfirmDialog open={!!failing} danger requireReason reason={reason} onReason={setReason} title={`Không thực hiện được ${failing?.code ?? ""}?`} message="Khách sẽ được báo và không bị tính tiền đơn này. Ghi rõ lý do, ví dụ hết nguyên liệu." confirmLabel="Xác nhận" onCancel={() => { setFailing(null); setReason("") }} onConfirm={() => failing && move.mutate({ id: failing.id, status: "Unfulfillable", reason })} />
    </PageFrame>
  )
}