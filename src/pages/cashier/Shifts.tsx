import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { Page } from "../../App"
import { PageFrame } from "../../components/PageFrame"
import { Banner, Button, EmptyState, Field, Modal, QueryBoundary, StatusPill } from "../../components/ui"
import { useAuth } from "../../context/AuthContext"
import { useToast } from "../../context/ToastContext"
import { replacementOver, shiftLabel, staffApi, type Replacement, type Shift } from "../../lib/api/staff"
import { dayLabel, todayKey } from "../../lib/dates"
import { formatSignedVND, formatTime, formatVND } from "../../lib/format"
import { ordersApi } from "../../lib/api/orders"
import { summarizeShift } from "../../lib/shiftSummary"

/**
 * "My shifts": attendance (Vào ca / Kết thúc ca), telling the manager you are busy for a coming shift (the manager arranges who replaces
 * you) and, for the cashier, taking the drawer over at the start of the shift and the shift summary. A shift appears here once the
 * branch manager schedules it.
 */
export default function MyShifts({ navigate }: { navigate: (p: Page) => void }) {
  const { role } = useAuth()
  const qc = useQueryClient()
  const { showToast } = useToast()
  const mine = useQuery({ queryKey: ["my-shifts"], queryFn: staffApi.myShifts, refetchInterval: 15000 })
  const reps = useQuery({ queryKey: ["replacements"], queryFn: staffApi.replacements })
  const refresh = () => { void qc.invalidateQueries({ queryKey: ["my-shifts"] }); void qc.invalidateQueries({ queryKey: ["replacements"] }); void qc.invalidateQueries({ queryKey: ["cash"] }) }
  const att = useMutation({
    mutationFn: (v: { s: Shift; out: boolean }) => (v.out ? staffApi.checkOut(v.s.id) : staffApi.checkIn(v.s.id)),
    onSuccess: (_, v) => { refresh(); if (!v.out && role === "cashier") showToast("Đã vào ca. Đếm tiền trong két và xác nhận ở mục Nhận két đầu ca.", "success") },
    onError: (e) => { refresh(); showToast(e.message, "error") },
  })
  const [asking, setAsking] = useState<Shift | null>(null)
  const [askReason, setAskReason] = useState("")
  const ask = useMutation({
    mutationFn: (v: { s: Shift; reason: string }) => staffApi.openReplacement({ shiftId: v.s.id, reason: v.reason }),
    onSuccess: () => { refresh(); setAsking(null); setAskReason(""); showToast("Đã gửi yêu cầu lên quản lý. Quản lý sẽ xếp người thay ca cho bạn.", "success") },
    onError: (e) => showToast(e.message, "error"),
  })
  const retract = useMutation({
    mutationFn: (r: Replacement) => staffApi.retract(r.id),
    onSuccess: () => { refresh(); showToast("Đã rút yêu cầu. Ca vẫn là của bạn.", "success") },
    onError: (e) => showToast(e.message, "error"),
  })
  /** My open request for somebody to take this shift, if any. */
  const requestOf = (s: Shift) => (reps.data ?? []).find((r) => r.shift.id === s.id && r.status === "open")

  return (
    <PageFrame page="cashier-shift" navigate={navigate} uc="UC-46" title="Ca của tôi" subtitle={role === "cashier" ? "Lịch làm của bạn, báo bận cho quản lý, và nhận két đầu ca." : "Lịch làm của bạn và báo bận cho quản lý."}>
      <div className="space-y-10">
        <section>
          <h2 className="font-serif text-lg text-text-primary">Lịch làm của tôi</h2>
          <p className="mb-3 text-sm text-text-secondary">Các ca quản lý đã xếp cho bạn. Bận thì bấm "Báo bận" để gửi yêu cầu lên quản lý; đến khi quản lý xếp người thay, ca vẫn là của bạn.</p>
          <QueryBoundary query={mine}>
            {(rows) => rows.length === 0 ? <EmptyState title="Bạn chưa được xếp ca nào" /> : (
              <ul className="space-y-3">
                {rows.map((s) => {
                  const request = requestOf(s)
                  const over = request ? replacementOver(request) : false
                  return (
                    <li key={s.id} className="rounded-[16px] border border-border bg-surface p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div><p className="font-medium text-text-primary">{dayLabel(s.date)} · {shiftLabel(s)}</p><p className="text-sm text-text-secondary">{s.replaced ? "Đã có đồng nghiệp làm thay, bạn không cần đi ca này" : s.checkInAtUtc ? `Vào ca ${formatTime(s.checkInAtUtc)}` : "Chưa vào ca"}{s.checkOutAtUtc ? ` · Ra ca ${formatTime(s.checkOutAtUtc)}` : ""}</p></div>
                        {s.replaced ? <StatusPill tone="success">Đã có người thay</StatusPill>
                          : s.absent ? <StatusPill tone="danger">Vắng</StatusPill>
                          : s.checkOutAtUtc || s.reviewed ? <StatusPill tone="success">Hoàn thành</StatusPill>
                          : s.checkInAtUtc ? <Button variant="secondary" loading={att.isPending} onClick={() => att.mutate({ s, out: true })}>Kết thúc ca</Button>
                          : <span className="flex flex-wrap gap-2">
                              {request && !over && <Button variant="secondary" loading={retract.isPending && retract.variables?.id === request.id} onClick={() => retract.mutate(request)}>Rút yêu cầu</Button>}
                              {!request && s.date >= todayKey() && <Button variant="secondary" onClick={() => { setAsking(s); setAskReason("") }}>Báo bận</Button>}
                              <Button loading={att.isPending} disabled={s.date !== todayKey()} disabledReason="Chỉ vào ca đúng ngày" onClick={() => att.mutate({ s, out: false })}>Vào ca</Button>
                            </span>}
                      </div>
                      {request && !s.replaced && !s.checkInAtUtc && (
                        <div className={`mt-3 rounded-[12px] px-3 py-2 text-sm ${over ? "bg-danger-bg text-state-danger" : "bg-pending-bg text-[#8A5A2B]"}`}>
                          {over
                            ? "Quản lý chưa xếp được người thay. Ca này vẫn tính là của bạn."
                            : <>Đã báo bận · <b>chờ quản lý xếp người thay</b>. Chưa có người thay thì bạn vẫn làm ca này.</>}
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </QueryBoundary>
        </section>

        {role === "cashier" && <CashHandover />}
        {role === "cashier" && <ShiftSummaryPanel shifts={mine.data ?? []} />}
      </div>
      <Modal open={!!asking} title="Báo bận cho quản lý" onClose={() => setAsking(null)}
        footer={<><Button variant="secondary" onClick={() => setAsking(null)}>Huỷ</Button><Button loading={ask.isPending} disabled={!askReason.trim()} disabledReason="Nhập lý do" onClick={() => asking && ask.mutate({ s: asking, reason: askReason.trim() })}>Gửi lên quản lý</Button></>}>
        {asking && (
          <div className="space-y-4">
            <p className="text-sm text-text-secondary">Yêu cầu nghỉ ca <b className="text-text-primary">{dayLabel(asking.date)} · {shiftLabel(asking)}</b> được gửi tới quản lý chi nhánh. Quản lý sẽ xếp người thay; đến khi có người thay, ca vẫn là của bạn.</p>
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

/**
 * Cash handover at the start of the shift: the drawer should hold what the previous handover counted plus the cash taken at the branch
 * since. The cashier counts it and confirms; a difference needs a note and the branch manager is told.
 */
function CashHandover() {
  const qc = useQueryClient()
  const { showToast } = useToast()
  const expected = useQuery({ queryKey: ["cash", "expected"], queryFn: staffApi.cashExpected, refetchOnMount: "always", refetchInterval: 30000 })
  const [counted, setCounted] = useState("")
  const [reason, setReason] = useState("")
  const [error, setError] = useState<string | null>(null)
  const close = useMutation({
    mutationFn: () => staffApi.closeCash({ counted: Number(counted), reason }),
    onSuccess: (c) => {
      void qc.invalidateQueries({ queryKey: ["cash"] }); setCounted(""); setReason("")
      showToast(c.variance === 0 ? "Đã nhận két, khớp với số ca trước để lại." : "Đã nhận két. Quản lý đã được báo về khoản chênh lệch.", c.variance === 0 ? "success" : "info")
    },
    onError: (e) => setError(e.message),
  })
  const variance = expected.data ? Number(counted) - expected.data.expected : 0
  return (
    <section data-uc="UC-48">
      <h2 className="font-serif text-lg text-text-primary">Nhận két đầu ca</h2>
      <p className="mb-3 text-sm text-text-secondary">Vào ca xong, đếm tiền mặt trong két và xác nhận số tiền ca trước để lại. Không khớp thì ghi lý do, quản lý sẽ được báo để xử lý.</p>
      <QueryBoundary query={expected}>
        {(e) => e.closed ? <Banner tone="success">Bạn đã nhận két của ca đang làm. Ca sau sẽ nhận két từ bạn.</Banner> : e.noShift ? <Banner tone="warn">Bấm "Vào ca" ở lịch làm phía trên, rồi đếm két và xác nhận tại đây.</Banner> : (
          <div className="max-w-md space-y-4 rounded-[16px] border border-border bg-surface p-5">
            {e.shiftLabel && <p className="text-sm text-text-primary">Ca của bạn: <b>{e.shiftLabel}</b></p>}
            <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1.5 text-sm">
              <dt className="text-text-secondary">{e.previousCashier ? <>Ca trước ({e.previousCashier}) bàn giao{e.previousAtUtc ? ` lúc ${formatTime(e.previousAtUtc)}` : ""}</> : "Chưa ca nào bàn giao hôm nay, két bắt đầu từ"}</dt>
              <dd className="text-right text-text-primary">{formatVND(e.opening ?? 0)}</dd>
              {(e.received ?? 0) > 0 && <><dt className="text-text-secondary">Tiền mặt thu thêm từ đó</dt><dd className="text-right text-text-primary">+{formatVND(e.received ?? 0)}</dd></>}
              {(e.refunded ?? 0) > 0 && <><dt className="text-text-secondary">Tiền mặt hoàn cho khách</dt><dd className="text-right text-state-danger">-{formatVND(e.refunded ?? 0)}</dd></>}
              <dt className="border-t border-border pt-1.5 font-medium text-text-primary">Két phải có</dt>
              <dd className="border-t border-border pt-1.5 text-right font-serif text-lg text-text-primary">{formatVND(e.expected)}</dd>
            </dl>
            {error && <Banner>{error}</Banner>}
            <Field label="Tiền mặt bạn đếm được trong két (₫)" inputMode="numeric" value={counted} onChange={(ev) => setCounted(ev.target.value.replace(/\D/g, ""))} hint={counted ? (variance === 0 ? "Khớp với số ca trước để lại" : `Lệch ${formatSignedVND(variance)} so với số phải có`) : undefined} />
            {counted !== "" && variance !== 0 && <Field label="Lý do chênh lệch, gửi quản lý (bắt buộc)" value={reason} maxLength={500} onChange={(ev) => setReason(ev.target.value)} placeholder="Ví dụ: thiếu 20.000 ₫, đã gọi báo chị Lan ca sáng" />}
            <Button loading={close.isPending} disabled={counted === "" || (variance !== 0 && !reason.trim())} disabledReason="Nhập số tiền đếm được, và lý do nếu lệch" onClick={() => { setError(null); close.mutate() }}>{counted !== "" && variance !== 0 ? "Xác nhận và báo quản lý" : "Xác nhận nhận két"}</Button>
          </div>
        )}
      </QueryBoundary>
    </section>
  )
}