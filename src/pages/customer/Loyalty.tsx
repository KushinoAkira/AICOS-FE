import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { Page } from "../../App"
import { CustomerFrame } from "../../components/CustomerFrame"
import { Button, QueryBoundary } from "../../components/ui"
import { useToast } from "../../context/ToastContext"
import { loyaltyApi, type HuntVoucher } from "../../lib/api/staff"
import { formatDate, formatVND } from "../../lib/format"

/** Points and vouchers of the customer's own brand (UC-56). */
export default function CustomerLoyalty({ navigate }: { navigate: (p: Page) => void }) {
  const qc = useQueryClient()
  const { showToast } = useToast()
  const me = useQuery({ queryKey: ["loyalty"], queryFn: loyaltyApi.me })
  const hunts = useQuery({ queryKey: ["loyalty", "hunts"], queryFn: loyaltyApi.hunts })
  const claim = useMutation({
    mutationFn: (h: HuntVoucher) => loyaltyApi.claim(h.id),
    onSuccess: (r) => { void qc.invalidateQueries({ queryKey: ["loyalty"] }); void qc.invalidateQueries({ queryKey: ["customer", "vouchers"] }); showToast(`Đã lấy voucher ${r.code}. Xem trong "Voucher của bạn".`, "success") },
    onError: (e) => showToast(e.message, "error"),
  })
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
              {d.vouchers.length === 0 ? <p className="text-sm text-text-secondary">Bạn chưa có voucher nào.</p> : <ul className="grid gap-3 sm:grid-cols-2">{d.vouchers.map((v) => <li key={v.id} className="rounded-[14px] border border-dashed border-clay bg-surface p-4"><p className="font-medium text-text-primary">{v.title}{v.minOrder ? <span className="font-normal text-text-secondary"> · đơn từ {formatVND(v.minOrder)}</span> : null}</p><p className="text-sm text-text-secondary">Mã <b>{v.code}</b> · HSD {formatDate(v.expiresAtUtc)}</p></li>)}</ul>}
            </section>
            <section>
              <h2 className="font-serif text-lg text-text-primary">Săn voucher</h2>
              <p className="mb-3 text-sm text-text-secondary">Mua đủ số đơn để mở khóa, rồi bấm "Lấy voucher". Chỉ tính đơn đã thanh toán, không bị hủy.</p>
              <QueryBoundary query={hunts}>
                {(list) => list.length === 0 ? <p className="text-sm text-text-secondary">Quán chưa có voucher nào để săn.</p> : (
                  <ul className="grid gap-3 sm:grid-cols-2">
                    {list.map((h) => {
                      const done = Math.min(h.counted, h.requiredOrders)
                      return (
                        <li key={h.id} className={`rounded-[14px] border bg-surface p-4 ${h.canClaim ? "border-clay" : "border-border"}`}>
                          <p className="font-medium text-text-primary">{h.discountLabel}{h.minOrder ? <span className="font-normal text-text-secondary"> · đơn từ {formatVND(h.minOrder)}</span> : null}</p>
                          <p className="mt-1 text-sm text-text-secondary">Cần <b className="text-text-primary">{h.requiredOrders} đơn</b>{h.perOrder > 0 ? <>, mỗi đơn từ <b className="text-text-primary">{formatVND(h.perOrder)}</b></> : null} · tính từ {formatDate(h.countFromUtc)}</p>
                          <div className="mt-3 h-2 overflow-hidden rounded-full bg-sand" role="progressbar" aria-valuemin={0} aria-valuemax={h.requiredOrders} aria-valuenow={done} aria-label={`Đã có ${done} trên ${h.requiredOrders} đơn`}>
                            <div className="h-full rounded-full bg-clay" style={{ width: `${(done / h.requiredOrders) * 100}%` }} />
                          </div>
                          <div className="mt-2 flex items-center justify-between gap-2">
                            <span className="text-xs text-text-secondary">Đã có {done}/{h.requiredOrders} đơn · HSD {formatDate(h.expiresAtUtc)}</span>
                            {h.claimed
                              ? <span className="text-xs font-medium text-state-success">Đã lấy · mã {h.claimedCode}</span>
                              : <Button className="px-3 py-1.5 text-xs" disabled={!h.canClaim} disabledReason={`Còn thiếu ${h.requiredOrders - done} đơn`} loading={claim.isPending && claim.variables?.id === h.id} onClick={() => claim.mutate(h)}>Lấy voucher</Button>}
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </QueryBoundary>
            </section>
          </div>
        )}
      </QueryBoundary>
    </CustomerFrame>
  )
}