import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { Page } from "../../App"
import { CounterDigitalPay } from "../../components/CounterDigitalPay"
import { OrderComposer, type MenuItem } from "../../components/OrderComposer"
import { PageFrame } from "../../components/PageFrame"
import { Banner, Button, Field, Modal, QueryBoundary } from "../../components/ui"
import { useAuth } from "../../context/AuthContext"
import { useToast } from "../../context/ToastContext"
import { brandApi } from "../../lib/api/brand"
import { ordersApi, type LineInput, type Order } from "../../lib/api/orders"
import { formatVND } from "../../lib/format"

const DEFAULT_BRANCH = "00000000-0000-0000-0000-000000000b01"
const WALK_IN = "__walk-in"

/** Cashier creates an order for a table, or for a walk-in who pays now and takes the drink away (UC-41). Prices are recomputed by the server. */
export default function CashierPOS({ navigate }: { navigate: (p: Page) => void }) {
  const { user } = useAuth()
  const branchId = user?.branchId ?? DEFAULT_BRANCH
  const qc = useQueryClient()
  const { showToast } = useToast()
  const products = useQuery({ queryKey: ["brand", "products"], queryFn: brandApi.products })
  const tables = useQuery({ queryKey: ["tables"], queryFn: ordersApi.tables })
  const [tableId, setTableId] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [toPay, setToPay] = useState<Order | null>(null)
  const [digital, setDigital] = useState(false)
  const [placed, setPlaced] = useState(0)
  const [received, setReceived] = useState("")
  const refresh = () => { void qc.invalidateQueries({ queryKey: ["tables"] }); void qc.invalidateQueries({ queryKey: ["orders"] }) }
  const place = useMutation({
    mutationFn: (lines: LineInput[]) => (tableId === WALK_IN ? ordersApi.placeCounter(lines) : ordersApi.place(tableId, lines)),
    onSuccess: (o) => {
      refresh()
      setError(null)
      setPlaced((n) => n + 1)
      if (tableId === WALK_IN) { setReceived(""); setToPay(o) } else showToast(`Đã đặt món ${o.code} cho bàn ${o.tableCode}.`, "success")
    },
    onError: (e) => setError(e.message),
  })
  const payCash = useMutation({
    mutationFn: () => ordersApi.payOrderCash(toPay?.id ?? "", Number(received)),
    onSuccess: (r) => { refresh(); setToPay(null); showToast(r.change > 0 ? `Đã thu tiền. Trả lại khách ${formatVND(r.change)}.` : "Đã thu đủ tiền.", "success") },
    onError: (e) => setError(e.message),
  })
  const items: MenuItem[] = (products.data ?? []).filter((p) => p.published).map((p) => ({ ...p, price: p.branchPrices[branchId] ?? p.basePrice, soldOut: p.soldOutAt.includes(branchId) }))
  const total = toPay?.total ?? 0

  return (
    <PageFrame page="cashier-pos" navigate={navigate} uc="UC-41" title="Tạo đơn tại quầy" subtitle="Khách tại quầy trả tiền ngay. Đơn của bàn thanh toán ở mục Bàn và bill.">
      <QueryBoundary query={products}>
        {() => (
          <>
            <label className="mb-5 block max-w-xs text-sm font-medium text-text-primary">Đơn cho
              <select value={tableId} onChange={(e) => setTableId(e.target.value)} className="mt-1.5 w-full rounded-[10px] border border-border bg-surface px-3 py-3 text-sm">
                <option value="">Chọn bàn hoặc khách tại quầy</option>
                <option value={WALK_IN}>Khách tại quầy (trả tiền ngay)</option>
                {(tables.data ?? []).map((t) => <option key={t.id} value={t.id}>Bàn {t.code}{t.orders.length ? " (đang phục vụ)" : ""}</option>)}
              </select>
            </label>
            <OrderComposer clearSignal={placed} products={items} submitLabel={tableId ? "Đặt món" : "Chọn bàn trước"} submitting={place.isPending} error={tableId ? error : "Chọn bàn hoặc khách tại quầy trước khi đặt món."} onSubmit={(lines) => { if (tableId) place.mutate(lines) }} />
          </>
        )}
      </QueryBoundary>

      <Modal
        open={!!toPay && !digital}
        title={`Thu tiền đơn ${toPay?.code ?? ""}`}
        onClose={() => setToPay(null)}
        footer={<>
          <Button variant="secondary" onClick={() => setToPay(null)}>Để sau</Button>
          <Button loading={payCash.isPending} disabled={Number(received) < total} disabledReason="Số tiền nhận chưa đủ" onClick={() => payCash.mutate()}>Xác nhận đã nhận tiền</Button>
        </>}
      >
        <div className="space-y-4">
          {error && <Banner>{error}</Banner>}
          <p className="flex justify-between font-serif text-lg text-text-primary"><span>Tổng</span><span>{formatVND(total)}</span></p>
          <Field label="Khách đưa (₫)" inputMode="numeric" value={received} onChange={(e) => setReceived(e.target.value.replace(/\D/g, ""))} hint={Number(received) >= total ? `Trả lại ${formatVND(Number(received) - total)}` : undefined} />
          <Button variant="secondary" className="min-h-11 w-full" onClick={() => setDigital(true)}>Khách chuyển khoản QR</Button>
        </div>
      </Modal>
      <CounterDigitalPay
        open={!!toPay && digital}
        amount={total}
        start={(provider) => ordersApi.orderPayStart(toPay as Order, provider)}
        onClose={() => { setDigital(false); setToPay(null) }}
        onSettled={refresh}
      />
    </PageFrame>
  )
}
