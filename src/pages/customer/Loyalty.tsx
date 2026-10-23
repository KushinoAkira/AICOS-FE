import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { Page } from "../../App"
import { CustomerFrame } from "../../components/CustomerFrame"
import { Button, QueryBoundary } from "../../components/ui"
import { useToast } from "../../context/ToastContext"
import { loyaltyApi } from "../../lib/api/staff"
import { formatDate, formatDateTime, formatVND } from "../../lib/format"

/** Points and vouchers of the customer's own brand (UC-56). */
export default function CustomerLoyalty({ navigate }: { navigate: (p: Page) => void }) {
  const qc = useQueryClient()
  const { showToast } = useToast()
  const me = useQuery({ queryKey: ["loyalty"], queryFn: loyaltyApi.me })
  const redeem = useMutation({ mutationFn: loyaltyApi.redeem, onSuccess: (d) => { qc.setQueryData(["loyalty"], d); showToast("Đã đổi voucher", "success") }, onError: (e) => showToast(e.message, "error") })
  return (
    <CustomerFrame page="customer-loyalty" navigate={navigate} uc="UC-56" title="Tích điểm và voucher">
      <QueryBoundary query={me}>
        {(d) => (
          <div className="space-y-8">
            <section className="rounded-[20px] bg-espresso p-6 text-white">
              <p className="text-sm opacity-80">Hạng {d.tier}</p>
              <p className="mt-1 font-serif text-4xl">{d.points} điểm</p>
              <p className="mt-2 text-sm opacity-80">{d.nextTier ? `Còn ${d.pointsToNext} điểm để lên hạng ${d.nextTier}` : "Bạn đang ở hạng cao nhất"}</p>
              <Button variant="secondary" className="mt-4" loading={redeem.isPending} disabled={d.points < d.redeemPoints} disabledReason={`Cần ${d.redeemPoints} điểm`} onClick={() => redeem.mutate()}>Đổi {d.redeemPoints} điểm lấy voucher</Button>
            </section>
            <section>
              <h2 className="mb-3 font-serif text-lg text-text-primary">Voucher của bạn</h2>
              {d.vouchers.length === 0 ? <p className="text-sm text-text-secondary">Bạn chưa có voucher nào.</p> : <ul className="grid gap-3 sm:grid-cols-2">{d.vouchers.map((v) => <li key={v.id} className="rounded-[14px] border border-dashed border-clay bg-surface p-4"><p className="font-medium text-text-primary">{v.title} · {formatVND(v.value)}</p><p className="text-sm text-text-secondary">Mã <b>{v.code}</b> · HSD {formatDate(v.expiresAtUtc)}</p></li>)}</ul>}
            </section>
            <section>
              <h2 className="mb-3 font-serif text-lg text-text-primary">Lịch sử điểm</h2>
              <ul className="divide-y divide-border rounded-[14px] border border-border bg-surface text-sm">
                {d.history.map((h) => <li key={h.id} className="flex items-center justify-between px-4 py-3"><span className="text-text-primary">{h.reason}<span className="block text-xs text-text-secondary">{formatDateTime(h.atUtc)}</span></span><b className={h.delta >= 0 ? "text-state-success" : "text-state-danger"}>{h.delta >= 0 ? "+" : ""}{h.delta}</b></li>)}
              </ul>
            </section>
          </div>
        )}
      </QueryBoundary>
    </CustomerFrame>
  )
}