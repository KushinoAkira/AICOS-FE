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
        {(d) => {
          const goal = d.nextTierAt ?? (d.nextTier ? d.points + d.pointsToNext : 0)
          const pct = goal > 0 ? Math.min(100, Math.round((d.points / goal) * 100)) : 100
          const short = Math.max(0, d.redeemPoints - d.points)
          return (
            <div className="space-y-10">
              <section className="grid gap-6 rounded-[20px] bg-espresso p-6 text-bg-base sm:p-8 md:grid-cols-[1fr_auto] md:items-end">
                <div>
                  <p className="text-sm text-bg-base/75">Hạng {d.tier}</p>
                  <p className="mt-1 font-serif text-5xl">{d.points} <span className="text-2xl">điểm</span></p>
                  <div className="mt-5 max-w-md">
                    <div className="h-2 overflow-hidden rounded-full bg-white/15" role="progressbar" aria-label={d.nextTier ? `Tiến tới hạng ${d.nextTier}` : "Hạng cao nhất"} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
                      <div className="h-full rounded-full bg-terracotta" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="mt-2 text-sm text-bg-base/80">{d.nextTier ? `Còn ${d.pointsToNext} điểm để lên hạng ${d.nextTier}` : "Bạn đang ở hạng cao nhất"}</p>
                  </div>
                </div>
                <div className="md:text-right">
                  <Button variant="secondary" className="min-h-11" loading={redeem.isPending} disabled={short > 0} disabledReason={`Cần ${d.redeemPoints} điểm`} onClick={() => redeem.mutate()}>Đổi {d.redeemPoints} điểm lấy voucher</Button>
                  {short > 0 && <p className="mt-2 text-xs text-bg-base/70">Tích thêm {short} điểm để đổi.</p>}
                </div>
              </section>

              <section aria-labelledby="my-vouchers">
                <h2 id="my-vouchers" className="mb-3 font-serif text-xl text-text-primary">Voucher dùng được</h2>
                {d.vouchers.length === 0 ? (
                  <p className="rounded-[16px] border border-dashed border-border p-6 text-center text-sm text-text-secondary">Bạn chưa có voucher nào. Đổi điểm ở trên để nhận voucher.</p>
                ) : (
                  <ul className="grid gap-3 sm:grid-cols-2">
                    {d.vouchers.map((v) => (
                      <li key={v.id} className="flex overflow-hidden rounded-[16px] border border-border bg-surface">
                        <span aria-hidden className="w-2 shrink-0 bg-terracotta" />
                        <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-3 p-4">
                          <div className="min-w-0">
                            <p className="font-serif text-lg text-text-primary">{v.label ?? formatVND(v.value)}</p>
                            <p className="text-sm text-text-secondary">{v.minOrder ? `Cho đơn từ ${formatVND(v.minOrder)}` : "Không cần đơn tối thiểu"}{v.expiresAtUtc && <>, hạn {formatDate(v.expiresAtUtc)}</>}</p>
                          </div>
                          <code className="rounded-[8px] border border-dashed border-clay px-2.5 py-1 text-sm font-medium tracking-wide text-clay">{v.code}</code>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                {d.vouchers.length > 0 && <p className="mt-3 text-sm text-text-secondary">Chọn voucher ở bước thanh toán khi <button type="button" onClick={() => navigate("customer-menu")} className="font-medium text-clay underline underline-offset-2">đặt mang đi</button>.</p>}
              </section>

              <section aria-labelledby="points-history">
                <h2 id="points-history" className="mb-3 font-serif text-xl text-text-primary">Lịch sử điểm</h2>
                {d.history.length === 0 ? (
                  <p className="rounded-[16px] border border-dashed border-border p-6 text-center text-sm text-text-secondary">Chưa có điểm nào. Mỗi đơn đã nhận sẽ cộng điểm ở đây.</p>
                ) : (
                  <ul className="divide-y divide-border rounded-[16px] border border-border bg-surface text-sm">
                    {d.history.map((h) => (
                      <li key={h.id} className="flex items-center justify-between gap-3 px-4 py-3">
                        <span className="min-w-0 text-text-primary">{h.reason}<span className="block text-xs text-text-secondary">{formatDateTime(h.atUtc)}</span></span>
                        <b className={`tabular-nums ${h.delta >= 0 ? "text-state-success" : "text-state-danger"}`}>{h.delta >= 0 ? "+" : ""}{h.delta}</b>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          )
        }}
      </QueryBoundary>
    </CustomerFrame>
  )
}
