import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { Page } from "../../App"
import { PageFrame } from "../../components/PageFrame"
import { Banner, Button, EmptyState, Field, QueryBoundary, StatusPill } from "../../components/ui"
import { useAuth } from "../../context/AuthContext"
import { useToast } from "../../context/ToastContext"
import { PERIOD_LABEL, staffApi, type Shift } from "../../lib/api/staff"
import { dayLabel, todayKey } from "../../lib/dates"
import { formatTime, formatVND } from "../../lib/format"

/** "My shifts": attendance, replacement sign-up and (cashier) cash closing. */
export default function MyShifts({ navigate }: { navigate: (p: Page) => void }) {
  const { role } = useAuth()
  const qc = useQueryClient()
  const { showToast } = useToast()
  const mine = useQuery({ queryKey: ["my-shifts"], queryFn: staffApi.myShifts })
  const reps = useQuery({ queryKey: ["replacements"], queryFn: staffApi.replacements })
  const refresh = () => { void qc.invalidateQueries({ queryKey: ["my-shifts"] }); void qc.invalidateQueries({ queryKey: ["replacements"] }) }
  const att = useMutation({ mutationFn: (v: { s: Shift; out: boolean }) => (v.out ? staffApi.checkOut(v.s.id) : staffApi.checkIn(v.s.id)), onSuccess: refresh, onError: (e) => showToast(e.message, "error") })
  const apply = useMutation({ mutationFn: staffApi.apply, onSuccess: () => { refresh(); showToast("Đã đăng ký ca thay, chờ quản lý duyệt", "success") }, onError: (e) => showToast(e.message, "error") })

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
                    <div><p className="font-medium text-text-primary">{dayLabel(s.date)} · {PERIOD_LABEL[s.period]}</p><p className="text-sm text-text-secondary">{s.checkInAtUtc ? `Vào ca ${formatTime(s.checkInAtUtc)}` : "Chưa vào ca"}{s.checkOutAtUtc ? ` · Ra ca ${formatTime(s.checkOutAtUtc)}` : ""}</p></div>
                    {s.checkOutAtUtc ? <StatusPill tone="success">Hoàn thành</StatusPill>
                      : s.checkInAtUtc ? <Button variant="secondary" loading={att.isPending} onClick={() => att.mutate({ s, out: true })}>Kết thúc ca</Button>
                      : <Button loading={att.isPending} disabled={s.date !== todayKey()} disabledReason="Chỉ vào ca đúng ngày" onClick={() => att.mutate({ s, out: false })}>Vào ca</Button>}
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
              const open = rows.filter((r) => r.status === "open")
              return open.length === 0 ? <EmptyState title="Hiện không có ca thay" /> : (
                <ul className="space-y-3">
                  {open.map((r) => (
                    <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-[16px] border border-border bg-surface p-4">
                      <p className="text-sm text-text-primary"><b>{dayLabel(r.shift.date)} · {PERIOD_LABEL[r.shift.period]}</b><br /><span className="text-text-secondary">{r.reason}</span></p>
                      {r.applied ? <StatusPill tone="pending">Đã đăng ký</StatusPill> : <Button variant="secondary" loading={apply.isPending && apply.variables === r.id} onClick={() => apply.mutate(r.id)}>Đăng ký thay</Button>}
                    </li>
                  ))}
                </ul>
              )
            }}
          </QueryBoundary>
        </section>

        {role === "cashier" && <CashClosing />}
      </div>
    </PageFrame>
  )
}

function CashClosing() {
  const qc = useQueryClient()
  const { showToast } = useToast()
  const expected = useQuery({ queryKey: ["cash", "expected"], queryFn: staffApi.cashExpected })
  const [counted, setCounted] = useState("")
  const [reason, setReason] = useState("")
  const [error, setError] = useState<string | null>(null)
  const close = useMutation({
    mutationFn: () => staffApi.closeCash({ counted: Number(counted), reason }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["cash"] }); showToast("Đã chốt tiền mặt", "success") },
    onError: (e) => setError(e.message),
  })
  const variance = expected.data ? Number(counted) - expected.data.expected : 0
  return (
    <section data-uc="UC-48">
      <h2 className="mb-3 font-serif text-lg text-text-primary">Chốt tiền mặt cuối ca</h2>
      <QueryBoundary query={expected}>
        {(e) => e.closed ? <Banner tone="warn">Hôm nay đã chốt tiền mặt.</Banner> : (
          <div className="max-w-md space-y-4 rounded-[16px] border border-border bg-surface p-5">
            <p className="text-sm text-text-secondary">Hệ thống ghi nhận tiền mặt <b className="text-text-primary">{formatVND(e.expected)}</b></p>
            {error && <Banner>{error}</Banner>}
            <Field label="Tiền mặt đếm được (₫)" inputMode="numeric" value={counted} onChange={(ev) => setCounted(ev.target.value.replace(/\D/g, ""))} hint={counted ? (variance === 0 ? "Khớp" : `Lệch ${formatVND(variance)}`) : undefined} />
            {counted !== "" && variance !== 0 && <Field label="Lý do chênh lệch (bắt buộc)" value={reason} onChange={(ev) => setReason(ev.target.value)} />}
            <Button loading={close.isPending} disabled={counted === "" || (variance !== 0 && !reason.trim())} disabledReason="Nhập số tiền và lý do nếu lệch" onClick={() => { setError(null); close.mutate() }}>Chốt tiền mặt</Button>
          </div>
        )}
      </QueryBoundary>
    </section>
  )
}