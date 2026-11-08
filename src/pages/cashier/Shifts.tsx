import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { Page } from "../../App"
import { PageFrame } from "../../components/PageFrame"
import { Banner, Button, EmptyState, Field, Modal, QueryBoundary, StatusPill } from "../../components/ui"
import { useAuth } from "../../context/AuthContext"
import { useToast } from "../../context/ToastContext"
import { shiftLabel, staffApi, type Shift } from "../../lib/api/staff"
import { dayLabel, todayKey } from "../../lib/dates"
import { formatSignedVND, formatTime, formatVND } from "../../lib/format"
import { ordersApi } from "../../lib/api/orders"
import { summarizeShift } from "../../lib/shiftSummary"

/**
 * "My shifts": attendance (Vào ca / Kết thúc ca), asking for somebody to take a coming shift, signing up for a colleague's shift and,
 * for the cashier, the end-of-shift summary and cash closing. A shift appears here once the branch manager schedules it.
 */
export default function MyShifts({ navigate }: { navigate: (p: Page) => void }) {
  const { role } = useAuth()
  const qc = useQueryClient()
  const { showToast } = useToast()
  const mine = useQuery({ queryKey: ["my-shifts"], queryFn: staffApi.myShifts, refetchInterval: 15000 })
  const reps = useQuery({ queryKey: ["replacements"], queryFn: staffApi.replacements })
  const refresh = () => { void qc.invalidateQueries({ queryKey: ["my-shifts"] }); void qc.invalidateQueries({ queryKey: ["replacements"] }); void qc.invalidateQueries({ queryKey: ["cash"] }) }
  const att = useMutation({ mutationFn: (v: { s: Shift; out: boolean }) => (v.out ? staffApi.checkOut(v.s.id) : staffApi.checkIn(v.s.id)), onSuccess: refresh, onError: (e) => { refresh(); showToast(e.message, "error") } })
  const apply = useMutation({ mutationFn: staffApi.apply, onSuccess: () => { refresh(); showToast("Đã đăng ký ca thay, chờ quản lý duyệt", "success") }, onError: (e) => showToast(e.message, "error") })
  const [asking, setAsking] = useState<Shift | null>(null)
  const [askReason, setAskReason] = useState("")
  const ask = useMutation({
    mutationFn: (v: { s: Shift; reason: string }) => staffApi.openReplacement({ shiftId: v.s.id, reason: v.reason }),
    onSuccess: () => { refresh(); setAsking(null); setAskReason(""); showToast("Đã gửi yêu cầu. Đồng nghiệp sẽ thấy ca này ở mục Ca thay đang tuyển, quản lý duyệt người thay.", "success") },
    onError: (e) => showToast(e.message, "error"),
  })
  /** The replacement asked for one of my shifts, if any. */
  const replacementOf = (s: Shift) => (reps.data ?? []).find((r) => r.shift.id === s.id)

  return (
    <PageFrame page="cashier-shift" navigate={navigate} uc="UC-46" title="Ca của tôi" subtitle="Vào ca, kết thúc ca và đăng ký ca thay.">
      <div className="space-y-10">
        <section>
          <h2 className="mb-3 font-serif text-lg text-text-primary">Ca sắp tới</h2>
          <QueryBoundary query={mine}>
            {(rows) => rows.length === 0 ? <EmptyState title="Bạn chưa được xếp ca nào" /> : (
              <ul className="space-y-3">
                {rows.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-[16px] border border-border bg-surface p-4">
                    <div><p className="font-medium text-text-primary">{dayLabel(s.date)} · {shiftLabel(s)}</p><p className="text-sm text-text-secondary">{s.checkInAtUtc ? `Vào ca ${formatTime(s.checkInAtUtc)}` : "Chưa vào ca"}{s.checkOutAtUtc ? ` · Ra ca ${formatTime(s.checkOutAtUtc)}` : ""}</p></div>
                    {s.absent ? <StatusPill tone="danger">Vắng</StatusPill>
                      : s.checkOutAtUtc || s.reviewed ? <StatusPill tone="success">Hoàn thành</StatusPill>
                      : s.checkInAtUtc ? <Button variant="secondary" loading={att.isPending} onClick={() => att.mutate({ s, out: true })}>Kết thúc ca</Button>
                      : replacementOf(s) ? <StatusPill tone="pending">{replacementOf(s)!.status === "filled" ? `Đã có người thay${replacementOf(s)!.filledBy ? `: ${replacementOf(s)!.filledBy}` : ""}` : "Đang tìm người thay"}</StatusPill>
                      : <span className="flex flex-wrap gap-2">
                          {s.date >= todayKey() && <Button variant="secondary" onClick={() => { setAsking(s); setAskReason("") }}>Nhờ người thay</Button>}
                          <Button loading={att.isPending} disabled={s.date !== todayKey()} disabledReason="Chỉ vào ca đúng ngày" onClick={() => att.mutate({ s, out: false })}>Vào ca</Button>
                        </span>}
                  </li>
                ))}
              </ul>
            )}
          </QueryBoundary>
        </section>

        <section>
          <h2 className="mb-3 font-serif text-lg text-text-primary">Ca thay đang tuyển</h2>
          <QueryBoundary query={reps}>
            {(rows) => {
              // A shift I asked somebody to take shows on my own row above, not as one I could sign up for.
              const mineIds = new Set((mine.data ?? []).map((s) => s.id))
              const open = rows.filter((r) => r.status === "open" && !mineIds.has(r.shift.id))
              return open.length === 0 ? <EmptyState title="Hiện không có ca thay" /> : (
                <ul className="space-y-3">
                  {open.map((r) => (
                    <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-[16px] border border-border bg-surface p-4">
                      <p className="text-sm text-text-primary"><b>{dayLabel(r.shift.date)} · {shiftLabel(r.shift)}</b><br /><span className="text-text-secondary">{r.reason}</span></p>
                      {r.applied ? <StatusPill tone="pending">Đã đăng ký</StatusPill> : <Button variant="secondary" loading={apply.isPending && apply.variables === r.id} onClick={() => apply.mutate(r.id)}>Đăng ký thay</Button>}
                    </li>
                  ))}
                </ul>
              )
            }}
          </QueryBoundary>
        </section>

        {role === "cashier" && <ShiftSummaryPanel shifts={mine.data ?? []} />}
        {role === "cashier" && <CashClosing />}
      </div>
      <Modal open={!!asking} title="Nhờ người thay ca" onClose={() => setAsking(null)}
        footer={<><Button variant="secondary" onClick={() => setAsking(null)}>Huỷ</Button><Button loading={ask.isPending} disabled={!askReason.trim()} disabledReason="Nhập lý do" onClick={() => asking && ask.mutate({ s: asking, reason: askReason.trim() })}>Gửi yêu cầu</Button></>}>
        {asking && (
          <div className="space-y-4">
            <p className="text-sm text-text-secondary">Ca <b className="text-text-primary">{dayLabel(asking.date)} · {shiftLabel(asking)}</b> sẽ hiện cho đồng nghiệp cùng chi nhánh đăng ký. Quản lý chọn người thay; đến khi được duyệt, ca vẫn là của bạn.</p>
            <Field label="Lý do" value={askReason} maxLength={500} onChange={(e) => setAskReason(e.target.value)} placeholder="Ví dụ: em có lịch thi" />
          </div>
        )}
      </Modal>
    </PageFrame>
  )
}

/** End of shift: tables served, what was sold and the money collected since check-in, to compare with the drawer before closing. */
function ShiftSummaryPanel({ shifts }: { shifts: Shift[] }) {
  const today = todayKey()
  const worked = shifts.filter((s) => s.date === today && s.checkInAtUtc).sort((a, b) => (b.checkInAtUtc ?? "").localeCompare(a.checkInAtUtc ?? ""))[0]
  const orders = useQuery({ queryKey: ["shift-orders", today], queryFn: () => ordersApi.ordersBetween(today, today), enabled: !!worked, refetchInterval: 30000 })
  if (!worked) return null
  const until = worked.checkOutAtUtc ?? new Date().toISOString()
  return (
    <section>
      <h2 className="mb-1 font-serif text-lg text-text-primary">Tổng kết ca</h2>
      <p className="mb-3 text-sm text-text-secondary">{shiftLabel(worked)} · từ {formatTime(worked.checkInAtUtc!)} đến {worked.checkOutAtUtc ? formatTime(worked.checkOutAtUtc) : "bây giờ"} · đơn của chi nhánh trong khoảng giờ này</p>
      <QueryBoundary query={orders}>
        {(rows) => {
          const s = summarizeShift(rows, worked.checkInAtUtc!, until)
          return (
            <div className="space-y-4 rounded-[16px] border border-border bg-surface p-5">
              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {([["Bàn đã phục vụ", String(s.tables)], ["Số đơn", String(s.orders)], ["Thu tiền mặt", formatVND(s.cash)], ["Thu chuyển khoản/online", formatVND(s.online)]] as const).map(([k, v]) => (
                  <div key={k} className="rounded-[12px] bg-sand p-3"><dt className="text-xs text-text-secondary">{k}</dt><dd className="mt-1 font-serif text-xl text-text-primary">{v}</dd></div>
                ))}
              </dl>
              <p className="text-sm text-text-secondary">Tổng đã thu <b className="text-text-primary">{formatVND(s.cash + s.online)}</b>{s.unpaid > 0 ? ` · ${s.unpaid} đơn chưa thanh toán` : ""}{s.cancelled > 0 ? ` · ${s.cancelled} đơn huỷ hoặc không làm được` : ""}</p>
              {s.items.length === 0 ? <p className="text-sm text-text-secondary">Chưa có món nào trong ca.</p> : (
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-text-secondary"><th className="py-1 font-normal">Món</th><th className="py-1 text-right font-normal">Số lượng</th><th className="py-1 text-right font-normal">Thành tiền</th></tr></thead>
                  <tbody className="divide-y divide-border">
                    {s.items.map((i) => <tr key={i.name}><td className="py-1.5 text-text-primary">{i.name}</td><td className="py-1.5 text-right">{i.qty}</td><td className="py-1.5 text-right">{formatVND(i.amount)}</td></tr>)}
                  </tbody>
                </table>
              )}
            </div>
          )
        }}
      </QueryBoundary>
    </section>
  )
}

function CashClosing() {
  const qc = useQueryClient()
  const { showToast } = useToast()
  const expected = useQuery({ queryKey: ["cash", "expected"], queryFn: staffApi.cashExpected, refetchOnMount: "always" })
  const [counted, setCounted] = useState("")
  const [reason, setReason] = useState("")
  const [error, setError] = useState<string | null>(null)
  const close = useMutation({
    mutationFn: () => staffApi.closeCash({ counted: Number(counted), reason }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["cash"] }); setCounted(""); setReason(""); showToast("Đã chốt tiền mặt", "success") },
    onError: (e) => setError(e.message),
  })
  const variance = expected.data ? Number(counted) - expected.data.expected : 0
  return (
    <section data-uc="UC-48">
      <h2 className="mb-3 font-serif text-lg text-text-primary">Chốt tiền mặt cuối ca</h2>
      <QueryBoundary query={expected}>
        {(e) => e.closed ? <Banner tone="success">Các ca bạn đã vào đều đã chốt tiền mặt.</Banner> : e.noShift ? <Banner tone="warn">Bấm Vào ca trước, rồi mới chốt tiền mặt của ca đó.</Banner> : (
          <div className="max-w-md space-y-4 rounded-[16px] border border-border bg-surface p-5">
            {e.shiftLabel && <p className="text-sm text-text-primary">Đang chốt: <b>{e.shiftLabel}</b></p>}
            <p className="text-sm text-text-secondary">Hệ thống ghi nhận tiền mặt <b className="text-text-primary">{formatVND(e.expected)}</b></p>
            {error && <Banner>{error}</Banner>}
            <Field label="Tiền mặt đếm được (₫)" inputMode="numeric" value={counted} onChange={(ev) => setCounted(ev.target.value.replace(/\D/g, ""))} hint={counted ? (variance === 0 ? "Khớp" : `Lệch ${formatSignedVND(variance)}`) : undefined} />
            {counted !== "" && variance !== 0 && <Field label="Lý do chênh lệch (bắt buộc)" value={reason} onChange={(ev) => setReason(ev.target.value)} />}
            <Button loading={close.isPending} disabled={counted === "" || (variance !== 0 && !reason.trim())} disabledReason="Nhập số tiền và lý do nếu lệch" onClick={() => { setError(null); close.mutate() }}>Chốt tiền mặt</Button>
          </div>
        )}
      </QueryBoundary>
    </section>
  )
}