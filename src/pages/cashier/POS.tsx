import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { Page } from "../../App"
import { CounterDigitalPay } from "../../components/CounterDigitalPay"
import { OrderComposer, type MenuItem } from "../../components/OrderComposer"
import { CashTendered } from "../../components/CashTendered"
import { PageFrame } from "../../components/PageFrame"
import { Banner, Button, Modal, QueryBoundary } from "../../components/ui"
import { useAuth } from "../../context/AuthContext"
import { useToast } from "../../context/ToastContext"
import { brandApi } from "../../lib/api/brand"
import { ordersApi, type LineInput, type Order } from "../../lib/api/orders"
import { formatVND } from "../../lib/format"
import { discountNote, orderErrorMessage } from "../../lib/promotionCode"

const DEFAULT_BRANCH = "00000000-0000-0000-0000-000000000b01"
const WALK_IN = "__walk-in"

/** Cashier creates an order for a table, or for a walk-in who pays now and takes the drink away (UC-41). Prices are recomputed by the server. */
export default function CashierPOS({ navigate }: { navigate: (p: Page) => void }) {
  const { user } = useAuth()
  const branchId = user?.branchId ?? DEFAULT_BRANCH
  const qc = useQueryClient()
  const { showToast } = useToast()
  const products = useQuery({ queryKey: ["brand", "products"], queryFn: brandApi.products, refetchInterval: 15000 })
  const tables = useQuery({ queryKey: ["tables"], queryFn: ordersApi.tables })
  const kiosk = useQuery({ queryKey: ["kiosk", "queue"], queryFn: ordersApi.kioskQueue, refetchInterval: 10000 })
  const [tableId, setTableId] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [toPay, setToPay] = useState<Order | null>(null)
  const [digital, setDigital] = useState(false)
  const [placed, setPlaced] = useState(0)
  const [received, setReceived] = useState("")
  const [confirmCancel, setConfirmCancel] = useState(false)
  const refresh = () => { void qc.invalidateQueries({ queryKey: ["tables"] }); void qc.invalidateQueries({ queryKey: ["orders"] }); void qc.invalidateQueries({ queryKey: ["kiosk", "queue"] }) }
  const place = useMutation({
    mutationFn: ({ lines, code }: { lines: LineInput[]; code: string }) => (tableId === WALK_IN ? ordersApi.placeCounter(lines, code) : ordersApi.place(tableId, lines, code)),
    onSuccess: (o) => {
      refresh()
      setError(null)
      setPlaced((n) => n + 1)
      if (tableId === WALK_IN) { setReceived(""); setConfirmCancel(false); setToPay(o) } else showToast(`Đã đặt món ${o.code} cho bàn ${o.tableCode}.${discountNote(o, formatVND)}`, "success")
    },
    onError: (e, v) => setError(orderErrorMessage(e, v.code)),
  })
  const payCash = useMutation({
    mutationFn: () => ordersApi.payOrderCash(toPay?.id ?? "", Number(received)),
    onSuccess: (r) => { refresh(); setToPay(null); showToast(r.change > 0 ? `Đã thu tiền. Trả lại khách ${formatVND(r.change)}.` : "Đã thu đủ tiền.", "success") },
    onError: (e) => setError(e.message),
  })
  const cancelOrder = useMutation({
    mutationFn: (o: Order) => ordersApi.transition(o.id, { status: "Cancelled", reason: "Khách không lấy đơn tại quầy" }),
    onSuccess: (o) => { refresh(); setToPay(null); setConfirmCancel(false); showToast(`Đã hủy đơn ${o.code}. Quầy pha chế sẽ không làm đơn này.`, "success") },
    onError: (e) => { setConfirmCancel(false); setError(e.message) },
  })
  const items: MenuItem[] = (products.data ?? []).filter((p) => p.published).map((p) => ({ ...p, price: p.branchPrices[branchId] ?? p.basePrice, soldOut: p.soldOutAt.includes(branchId) }))
  const total = toPay?.total ?? 0
  // A kiosk order stays in its queue, so its window may close; one just placed at the counter is paid or cancelled.
  const fromKiosk = !!toPay && !!kiosk.data?.some((k) => k.id === toPay.id)

  return (
    <PageFrame page="cashier-pos" navigate={navigate} uc="UC-41" title="Tạo đơn tại quầy" subtitle="Khách tại quầy trả tiền ngay. Đơn của bàn thanh toán ở mục Bàn và bill.">
      <QueryBoundary query={products}>
        {() => (
          <>
            {(kiosk.data?.length ?? 0) > 0 && (
              <section aria-label="Đơn từ kiosk chờ thu tiền" data-testid="kiosk-queue" className="mb-5 rounded-[14px] border border-border bg-surface p-4">
                <h2 className="mb-2 font-medium text-text-primary">Đơn từ kiosk chờ thu tiền ({kiosk.data?.length})</h2>
                <ul className="divide-y divide-border">
                  {kiosk.data?.map((o) => (
                    <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 py-2 text-sm">
                      <span><b className="text-text-primary">{o.code}</b> · {o.lines.reduce((n, l) => n + l.qty, 0)} món · {formatVND(o.total)}{o.customerId ? " · thành viên" : ""}</span>
                      <Button className="px-4 py-1.5 text-xs" onClick={() => { setError(null); setReceived(""); setConfirmCancel(false); setToPay(o) }}>Thu tiền</Button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            <label className="mb-5 block max-w-xs text-sm font-medium text-text-primary">Đơn cho
              <select value={tableId} onChange={(e) => setTableId(e.target.value)} className="mt-1.5 w-full rounded-[10px] border border-border bg-surface px-3 py-3 text-sm">
                <option value="">Chọn bàn hoặc khách tại quầy</option>
                <option value={WALK_IN}>Khách tại quầy (trả tiền ngay)</option>
                {(tables.data ?? []).map((t) => <option key={t.id} value={t.id}>Bàn {t.code}{t.orders.length ? " (đang phục vụ)" : ""}</option>)}
              </select>
            </label>
            <OrderComposer
              clearSignal={placed} products={items} submitLabel={tableId ? "Đặt món" : "Chọn bàn trước"} submitting={place.isPending}
              error={tableId ? error : "Chọn bàn hoặc khách tại quầy trước khi đặt món."}
              onSubmit={(lines, code) => { if (tableId) place.mutate({ lines, code }) }}
              voucher={{ preview: (code, amount) => ordersApi.previewVoucher(code, amount, user?.branchId ?? undefined) }}
            />
          </>
        )}
      </QueryBoundary>

      <Modal
        open={!!toPay && !digital}
        title={`Thu tiền đơn ${toPay?.code ?? ""}`}
        onClose={() => { if (fromKiosk) setToPay(null) }}
        footer={confirmCancel
          ? <div className="flex w-full flex-wrap items-center justify-end gap-2">
              <span className="mr-auto text-sm text-text-secondary">Hủy đơn này? Món sẽ không được pha.</span>
              <Button variant="secondary" onClick={() => setConfirmCancel(false)}>Quay lại</Button>
              <Button variant="danger" loading={cancelOrder.isPending} onClick={() => toPay && cancelOrder.mutate(toPay)}>Hủy đơn</Button>
            </div>
          : <>
              <Button variant="ghost" className="mr-auto" onClick={() => setConfirmCancel(true)}>Khách không lấy nữa</Button>
              {fromKiosk && <Button variant="secondary" onClick={() => setToPay(null)}>Đóng</Button>}
              <Button loading={payCash.isPending} disabled={Number(received) < total} disabledReason="Số tiền nhận chưa đủ" onClick={() => payCash.mutate()}>Xác nhận đã nhận tiền</Button>
            </>}
      >
        <div className="space-y-4">
          {error && <Banner>{error}</Banner>}
          {!!toPay?.discountAmount && (
            <p className="flex justify-between text-sm text-state-success"><span>Đã giảm (mã {toPay.promotionCode})</span><span>−{formatVND(toPay.discountAmount)}</span></p>
          )}
          <CashTendered key={toPay?.id} total={total} value={received} onChange={setReceived} />
          <div className="flex items-center gap-3 text-xs text-text-secondary"><span className="h-px flex-1 bg-border" />hoặc<span className="h-px flex-1 bg-border" /></div>
          <Button variant="secondary" className="min-h-11 w-full" onClick={() => setDigital(true)}>Khách chuyển khoản QR</Button>
        </div>
      </Modal>
      <CounterDigitalPay
        open={!!toPay && digital}
        amount={total}
        start={(provider) => ordersApi.orderPayStart(toPay as Order, provider)}
        onClose={() => setDigital(false)}
        onSettled={() => { refresh(); setDigital(false); setToPay(null); showToast("Đã nhận tiền chuyển khoản.", "success") }}
      />
    </PageFrame>
  )
}
