import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { Page } from "../../App"
import { OrderStatusPill, PaymentPill } from "../../components/OrderStatusPill"
import { PageFrame } from "../../components/PageFrame"
import { Button, ConfirmDialog, EmptyState, Field, QueryBoundary } from "../../components/ui"
import { useToast } from "../../context/ToastContext"
import { ordersApi, type Order } from "../../lib/api/orders"
import { formatTime } from "../../lib/format"
import { pollWhile, useBranchRealtime } from "../../lib/realtime"

/** Serving and handing over: what the bar has finished goes to the table or to the customer who comes to pick it up. */
export default function CashierServe({ navigate }: { navigate: (p: Page) => void }) {
  const qc = useQueryClient()
  const { showToast } = useToast()
  const live = useBranchRealtime()
  const orders = useQuery({ queryKey: ["orders"], queryFn: ordersApi.orders, refetchInterval: pollWhile(live, 5000) })
  const [search, setSearch] = useState("")
  const [voiding, setVoiding] = useState<Order | null>(null)
  const [reason, setReason] = useState("")
  const done = () => { void qc.invalidateQueries({ queryKey: ["orders"] }); void qc.invalidateQueries({ queryKey: ["tables"] }) }
  const hand = useMutation({
    mutationFn: (o: Order) => ordersApi.transition(o.id, { status: o.channel === "takeaway" ? "PickedUp" : "Served" }),
    onSuccess: (o) => { done(); showToast(`Đã giao ${o.code}.`, "success") },
    onError: (e) => showToast(e.message, "error"),
  })
  const noShow = useMutation({
    mutationFn: (o: Order) => ordersApi.transition(o.id, { status: "NoShow" }),
    onSuccess: (o) => { done(); showToast(`Đã ghi nhận khách không đến nhận ${o.code}.`, "success") },
    onError: (e) => showToast(e.message, "error"),
  })
  const voidOrder = useMutation({
    mutationFn: (v: { o: Order; reason: string }) => ordersApi.transition(v.o.id, { status: "Cancelled", reason: v.reason }),
    onSuccess: (o) => { done(); setVoiding(null); setReason(""); showToast(`Đã hủy ${o.code}.`, "success") },
    onError: (e) => showToast(e.message, "error"),
  })
  const needle = search.trim().toLowerCase()
  const matches = (o: Order) => !needle || o.code.toLowerCase().includes(needle) || o.tableCode.toLowerCase().includes(needle)

  return (
    <PageFrame page="cashier-serve" navigate={navigate} uc="UC-45" title="Phục vụ và giao món" subtitle="Món đã pha xong để mang ra bàn hoặc giao cho khách lấy mang đi.">
      <div className="mb-5 max-w-sm"><Field label="Tìm theo mã đơn hoặc bàn" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
      <QueryBoundary query={orders}>
        {(rows) => {
          const ready = rows.filter((o) => o.status === "Ready" && matches(o))
          const waiting = rows.filter((o) => o.status === "Pending" && matches(o))
          return (
            <div className="space-y-10">
              <section aria-label="Món sẵn sàng">
                <h2 className="mb-3 font-serif text-lg text-text-primary">Sẵn sàng giao <span className="text-sm text-text-secondary">({ready.length})</span></h2>
                {ready.length === 0 ? <EmptyState title="Chưa có món nào cần giao" /> : (
                  <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {ready.map((o) => (
                      <li key={o.id} className="flex flex-col rounded-[16px] border border-border bg-surface p-4">
                        <div className="flex items-center justify-between gap-2"><b className="text-text-primary">{o.code}</b><PaymentPill status={o.paymentStatus} /></div>
                        <p className="mt-1 text-sm text-text-secondary">{o.channel === "takeaway" ? "Mang đi" : `Bàn ${o.tableCode}`} · {formatTime(o.createdAtUtc)}</p>
                        <ul className="mt-2 flex-1 text-sm text-text-primary">{o.lines.map((l, i) => <li key={i}>{l.qty}× {l.name}</li>)}</ul>
                        <Button className="mt-3 min-h-11 w-full" loading={hand.isPending && hand.variables?.id === o.id} onClick={() => hand.mutate(o)}>{o.channel === "takeaway" ? "Đã giao cho khách" : "Đã mang ra bàn"}</Button>
                        {o.channel === "takeaway" && <Button variant="danger" className="mt-2 w-full" loading={noShow.isPending && noShow.variables?.id === o.id} onClick={() => noShow.mutate(o)}>Không đến nhận</Button>}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
              <section aria-label="Đơn chưa pha">
                <h2 className="mb-3 font-serif text-lg text-text-primary">Chưa pha, còn hủy được <span className="text-sm text-text-secondary">({waiting.length})</span></h2>
                {waiting.length === 0 ? <EmptyState title="Không có đơn nào đang chờ" /> : (
                  <ul className="divide-y divide-border rounded-[16px] border border-border bg-surface">
                    {waiting.map((o) => (
                      <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                        <div className="min-w-0 text-sm">
                          <p className="font-medium text-text-primary">{o.code} · {o.channel === "takeaway" ? "Mang đi" : `Bàn ${o.tableCode}`}</p>
                          <p className="text-text-secondary">{o.lines.map((l) => `${l.qty}× ${l.name}`).join(", ")}</p>
                        </div>
                        <div className="flex items-center gap-2"><OrderStatusPill status={o.status} />{o.paymentStatus === "Unpaid" ? <Button variant="danger" className="px-3 py-1.5 text-xs" onClick={() => setVoiding(o)}>Hủy đơn</Button> : <span className="text-xs text-text-secondary">Đã trả tiền, quản lý mới hủy được</span>}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          )
        }}
      </QueryBoundary>
      <ConfirmDialog open={!!voiding} danger requireReason reason={reason} onReason={setReason} title={`Hủy đơn ${voiding?.code ?? ""}?`} message="Đơn sẽ bị hủy và quầy pha chế không làm nữa. Lý do được lưu lại." confirmLabel="Hủy đơn" onCancel={() => { setVoiding(null); setReason("") }} onConfirm={() => voiding && voidOrder.mutate({ o: voiding, reason })} />
    </PageFrame>
  )
}
