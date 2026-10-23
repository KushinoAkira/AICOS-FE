import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { Page } from "../../App"
import { OrderComposer, type MenuItem } from "../../components/OrderComposer"
import { PageFrame } from "../../components/PageFrame"
import { QueryBoundary } from "../../components/ui"
import { useAuth } from "../../context/AuthContext"
import { useToast } from "../../context/ToastContext"
import { brandApi } from "../../lib/api/brand"
import { ordersApi, type LineInput } from "../../lib/api/orders"

const DEFAULT_BRANCH = "00000000-0000-0000-0000-000000000b01"

/** Cashier creates an order on behalf of a table or walk-in guest (UC-26). Prices are recomputed by the server. */
export default function CashierPOS({ navigate }: { navigate: (p: Page) => void }) {
  const { user } = useAuth()
  const branchId = user?.branchId ?? DEFAULT_BRANCH
  const qc = useQueryClient()
  const { showToast } = useToast()
  const products = useQuery({ queryKey: ["brand", "products"], queryFn: brandApi.products })
  const tables = useQuery({ queryKey: ["tables"], queryFn: ordersApi.tables })
  const [tableId, setTableId] = useState("")
  const [error, setError] = useState<string | null>(null)
  const place = useMutation({
    mutationFn: (lines: LineInput[]) => ordersApi.place(tableId, lines),
    onSuccess: (o) => { void qc.invalidateQueries({ queryKey: ["tables"] }); void qc.invalidateQueries({ queryKey: ["orders"] }); showToast(`Đã đặt món ${o.code} cho quầy pha chế`, "success") },
    onError: (e) => setError(e.message),
  })
  const items: MenuItem[] = (products.data ?? []).filter((p) => p.published).map((p) => ({ ...p, price: p.branchPrices[branchId] ?? p.basePrice, soldOut: p.soldOutAt.includes(branchId) }))

  return (
    <PageFrame page="cashier-pos" navigate={navigate} uc="UC-26" title="Tạo đơn tại quầy" subtitle="Chọn bàn rồi chọn món. Thanh toán ở mục Bàn và bill.">
      <QueryBoundary query={products}>
        {() => (
          <>
            <label className="mb-5 block max-w-xs text-sm font-medium text-text-primary">Bàn
              <select value={tableId} onChange={(e) => setTableId(e.target.value)} className="mt-1.5 w-full rounded-[10px] border border-border bg-surface px-3 py-3 text-sm">
                <option value="">Chọn bàn</option>
                {(tables.data ?? []).map((t) => <option key={t.id} value={t.id}>Bàn {t.code}{t.orders.length ? " (đang phục vụ)" : ""}</option>)}
              </select>
            </label>
            <OrderComposer products={items} submitLabel={tableId ? "Đặt món" : "Chọn bàn trước"} submitting={place.isPending} error={tableId ? error : "Chọn bàn trước khi đặt món"} onSubmit={(l) => { if (!tableId) return setError("Chọn bàn"); setError(null); place.mutate(l) }} />
          </>
        )}
      </QueryBoundary>
    </PageFrame>
  )
}