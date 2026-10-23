import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { Page } from "../../App"
import { PageFrame } from "../../components/PageFrame"
import { Banner, Button, Modal, QueryBoundary } from "../../components/ui"
import { useToast } from "../../context/ToastContext"
import { usersApi } from "../../lib/api/identity"
import { PERIOD_LABEL, staffApi, type Period } from "../../lib/api/staff"
import { addDays, dayLabel, mondayOf, todayKey } from "../../lib/dates"
import { normalizeRole } from "../../router/roles"

const PERIODS: Period[] = ["morning", "afternoon"]

/** Weekly schedule for the branch (UC-45). One person cannot hold the same shift twice. */
export default function BranchSchedule({ navigate }: { navigate: (p: Page) => void }) {
  const qc = useQueryClient()
  const { showToast } = useToast()
  const [week, setWeek] = useState(mondayOf(todayKey()))
  const shifts = useQuery({ queryKey: ["shifts", week], queryFn: () => staffApi.shifts(week) })
  const users = useQuery({ queryKey: ["users"], queryFn: () => usersApi.list({ pageSize: 200 }) })
  const staff = (users.data?.items ?? []).filter((u) => { const r = normalizeRole(u); return r === "barista" || r === "cashier" })
  const [cell, setCell] = useState<{ date: string; period: Period } | null>(null)
  const [userId, setUserId] = useState("")
  const [error, setError] = useState<string | null>(null)
  const refresh = () => void qc.invalidateQueries({ queryKey: ["shifts"] })
  const assign = useMutation({
    mutationFn: () => staffApi.assign({ ...cell!, userId }),
    onSuccess: () => { refresh(); setCell(null); showToast("Đã xếp ca", "success") },
    onError: (e) => setError(e.message),
  })
  const remove = useMutation({ mutationFn: staffApi.unassign, onSuccess: refresh, onError: (e) => showToast(e.message, "error") })
  const days = Array.from({ length: 7 }, (_, i) => addDays(week, i))

  return (
    <PageFrame page="branch-schedule" navigate={navigate} uc="UC-45" title="Lịch làm việc" subtitle="Xếp ca cho nhân viên chi nhánh theo tuần."
      action={<div className="flex items-center gap-2"><Button variant="secondary" aria-label="Tuần trước" onClick={() => setWeek(addDays(week, -7))}>‹</Button><span className="text-sm text-text-secondary">{dayLabel(week)} - {dayLabel(addDays(week, 6))}</span><Button variant="secondary" aria-label="Tuần sau" onClick={() => setWeek(addDays(week, 7))}>›</Button></div>}>
      <QueryBoundary query={shifts}>
        {(rows) => (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-separate border-spacing-2 text-sm">
              <thead><tr><th className="w-28" />{days.map((d) => <th key={d} className={`rounded-[10px] py-2 font-medium ${d === todayKey() ? "bg-sand text-clay" : "text-text-secondary"}`}>{dayLabel(d)}</th>)}</tr></thead>
              <tbody>
                {PERIODS.map((p) => (
                  <tr key={p}>
                    <th scope="row" className="text-left text-xs font-medium text-text-secondary">{PERIOD_LABEL[p]}</th>
                    {days.map((d) => (
                      <td key={d} className="h-24 rounded-[12px] border border-border bg-surface p-2 align-top">
                        {rows.filter((s) => s.date === d && s.period === p).map((s) => (
                          <p key={s.id} className="mb-1 flex items-center justify-between rounded-md bg-bg-warm px-2 py-1 text-xs text-text-primary">{s.userName}<button aria-label={`Bỏ ${s.userName} khỏi ca`} onClick={() => remove.mutate(s.id)} className="text-state-danger">✕</button></p>
                        ))}
                        {d >= todayKey() && <button onClick={() => { setCell({ date: d, period: p }); setUserId(""); setError(null) }} aria-label={`Thêm người vào ${dayLabel(d)} ${PERIOD_LABEL[p]}`} className="text-xs text-clay hover:underline">+ Thêm</button>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </QueryBoundary>
      <Modal open={!!cell} title={cell ? `${dayLabel(cell.date)} · ${PERIOD_LABEL[cell.period]}` : ""} onClose={() => setCell(null)} footer={<><Button variant="secondary" onClick={() => setCell(null)}>Hủy</Button><Button loading={assign.isPending} disabled={!userId} disabledReason="Chọn nhân viên" onClick={() => assign.mutate()}>Xếp ca</Button></>}>
        <div className="space-y-3">
          {error && <Banner>{error}</Banner>}
          <label className="block text-sm font-medium text-text-primary">Nhân viên
            <select value={userId} onChange={(e) => setUserId(e.target.value)} className="mt-1.5 w-full rounded-[10px] border border-border bg-surface px-3 py-3 text-sm">
              <option value="">Chọn nhân viên</option>
              {staff.map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
            </select>
          </label>
        </div>
      </Modal>
    </PageFrame>
  )
}