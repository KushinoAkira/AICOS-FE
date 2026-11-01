import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { Page } from "../../App"
import { CounterDigitalPay } from "../../components/CounterDigitalPay"
import { OrderStatusPill } from "../../components/OrderStatusPill"
import { PageFrame } from "../../components/PageFrame"
import { Banner, Button, Field, Modal, QueryBoundary, StatusPill } from "../../components/ui"
import { useToast } from "../../context/ToastContext"
import { ordersApi, type TableRow } from "../../lib/api/orders"
import { pollWhile, useBranchRealtime } from "../../lib/realtime"
import { formatVND } from "../../lib/format"
import { tableStateOf } from "../../lib/orderStateMachine"

/** Amount still to collect: unpaid, workable orders only. */
const billOf = (t: TableRow) => t.orders.filter((o) => o.paymentStatus === "Unpaid" && o.status !== "Cancelled" && o.status !== "Unfulfillable").reduce((s, o) => s + o.total, 0)
/** Paid but the cashier has not yet completed (closed) the table. */
const isSettled = (t: TableRow) => t.orders.length > 0 && billOf(t) === 0
const stillMaking = (t: TableRow) => t.orders.some((o) => o.status === "Pending" || o.status === "Preparing")

/** Table map and cash bill. Table state is derived from the open session (never stored). */
export default function CashierTables({ navigate }: { navigate: (p: Page) => void }) {
  const qc = useQueryClient()
  const { showToast } = useToast()
  const live = useBranchRealtime()
  const tables = useQuery({ queryKey: ["tables"], queryFn: ordersApi.tables, refetchInterval: pollWhile(live, 5000) })
  const [selected, setSelected] = useState<string | null>(null)
  const [received, setReceived] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [digital, setDigital] = useState<TableRow | null>(null)
  const pay = useMutation({
    mutationFn: (t: TableRow) => ordersApi.payTable(t.id, { method: "cash", received: Number(received) }),
    onSuccess: (r) => { void qc.invalidateQueries({ queryKey: ["tables"] }); void qc.invalidateQueries({ queryKey: ["orders"] }); setSelected(null); setReceived(""); showToast(r.change > 0 ? `Đã thanh toán. Thối lại ${formatVND(r.change)}` : "Đã thanh toán", "success") },
    onError: (e) => setError(e.message),
  })
  const complete = useMutation({
    mutationFn: (t: TableRow) => ordersApi.completeTable(t.id),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["tables"] }); void qc.invalidateQueries({ queryKey: ["orders"] }); void qc.invalidateQueries({ queryKey: ["mine"] }); setSelected(null); showToast("Đã hoàn thành bàn. Đơn được lưu vào lịch sử khách hàng.", "success") },
    onError: (e) => setError(e.message),
  })
  const stateTone = { Empty: "neutral", InService: "pending", AwaitingPayment: "danger" } as const
  const stateLabel = { Empty: "Trống", InService: "Đang phục vụ", AwaitingPayment: "Chờ thanh toán" } as const

  return (
    <PageFrame page="cashier-tables" navigate={navigate} uc="UC-28" title="Bàn và bill" subtitle="Bàn chờ thanh toán được ưu tiên hiển thị.">
      <QueryBoundary query={tables}>
        {(rows) => {
          const sorted = [...rows].sort((a, b) => Number(b.billRequested) - Number(a.billRequested) || Number(isSettled(b)) - Number(isSettled(a)))
          const current = rows.find((t) => t.id === selected) ?? null
          return (
            <>
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {sorted.map((t) => {
                  const st = tableStateOf(t.orders.length ? { open: true, billRequested: t.billRequested } : null)
                  return (
                    <li key={t.id}>
                      <button onClick={() => { setSelected(t.id); setReceived(""); setError(null) }} disabled={st === "Empty"} className="w-full rounded-[16px] border border-border bg-surface p-5 text-left hover:border-clay disabled:opacity-60">
                        <span className="flex items-center justify-between"><span className="font-serif text-xl text-text-primary">Bàn {t.code}</span>{isSettled(t) ? <StatusPill tone="success">Đã thanh toán</StatusPill> : <StatusPill tone={stateTone[st]}>{stateLabel[st]}</StatusPill>}</span>
                        <span className="mt-2 block text-sm text-text-secondary">{st === "Empty" ? `${t.seats} chỗ` : isSettled(t) ? `${t.orders.length} đơn · bấm để hoàn thành bàn` : `${t.orders.length} đơn · ${formatVND(billOf(t))}`}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
              <Modal open={!!current} title={`Bill bàn ${current?.code ?? ""}`} onClose={() => setSelected(null)} footer={current && <><Button variant="secondary" onClick={() => setSelected(null)}>Đóng</Button>{isSettled(current)
                ? <Button loading={complete.isPending} disabled={stillMaking(current)} disabledReason="Còn món chưa pha xong" onClick={() => complete.mutate(current)}>Hoàn thành bàn</Button>
                : <Button loading={pay.isPending} disabled={Number(received) < billOf(current)} disabledReason="Số tiền nhận chưa đủ" onClick={() => pay.mutate(current)}>Xác nhận đã nhận tiền</Button>}</>}>
                {current && (
                  <div className="space-y-4">
                    {error && <Banner>{error}</Banner>}
                    <ul className="divide-y divide-border text-sm">
                      {current.orders.map((o) => (
                        <li key={o.id} className="py-2"><div className="flex items-center justify-between"><b className="text-text-primary">{o.code}</b><OrderStatusPill status={o.status} /></div>
                          {o.lines.map((l, i) => <p key={i} className="text-text-secondary">{l.qty}× {l.name}{l.size ? ` (${l.size})` : ""} · {formatVND(l.unitPrice * l.qty)}</p>)}
                        </li>
                      ))}
                    </ul>
                    {current.billRequested && !isSettled(current) && <Banner tone="warn">Khách gọi thanh toán {current.billMethod === "Transfer" ? "bằng chuyển khoản" : "bằng tiền mặt"}.</Banner>}
                    {isSettled(current)
                      ? <Banner tone="success">Bàn đã thanh toán. Bấm "Hoàn thành bàn" để trả bàn và lưu đơn vào lịch sử khách hàng.</Banner>
                      : <p className="flex justify-between font-serif text-lg text-text-primary"><span>Tổng</span><span>{formatVND(billOf(current))}</span></p>}
                    {!isSettled(current) && <Field label="Khách đưa (₫)" inputMode="numeric" value={received} onChange={(e) => setReceived(e.target.value.replace(/\D/g, ""))} hint={Number(received) >= billOf(current) && received ? `Thối lại ${formatVND(Number(received) - billOf(current))}` : "Nhập số tiền mặt nhận được"} />}
                    {!isSettled(current) && <Button variant="secondary" className="min-h-11 w-full" onClick={() => { setDigital(current); setSelected(null) }}>Khách chuyển khoản QR</Button>}
                  </div>
                )}
              </Modal>
              <CounterDigitalPay
                open={!!digital}
                amount={digital ? billOf(digital) : 0}
                start={(provider) => ordersApi.tablePayStart(digital?.id ?? "", provider)}
                onClose={() => setDigital(null)}
                onSettled={() => { void qc.invalidateQueries({ queryKey: ["tables"] }); void qc.invalidateQueries({ queryKey: ["orders"] }) }}
              />
            </>
          )
        }}
      </QueryBoundary>
    </PageFrame>
  )
}