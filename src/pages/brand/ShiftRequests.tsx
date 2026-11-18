import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { Page } from "../../App"
import { PageFrame } from "../../components/PageFrame"
import { Banner, Button, EmptyState, Field, Modal, QueryBoundary, StatusPill } from "../../components/ui"
import { useToast } from "../../context/ToastContext"
import { usersApi } from "../../lib/api/identity"
import { replacementOver, shiftLabel, staffApi, type Replacement } from "../../lib/api/staff"
import { dayLabel, mondayOf, todayKey } from "../../lib/dates"
import { normalizeRole } from "../../router/roles"

/**
 * Replacement shifts: a barista or cashier tells the manager they are busy for a coming shift (or the manager opens one), and the manager
 * puts somebody of the branch on it. Staff do not pick up each other's shifts themselves.
 */
export default function ShiftRequests({ navigate }: { navigate: (p: Page) => void }) {
  const qc = useQueryClient()
  const { showToast } = useToast()
  const reqs = useQuery({ queryKey: ["replacements"], queryFn: staffApi.replacements, refetchInterval: 10000 })
  const shifts = useQuery({ queryKey: ["shifts", mondayOf(todayKey())], queryFn: () => staffApi.shifts(todayKey()) })
  const users = useQuery({ queryKey: ["users"], queryFn: () => usersApi.list({ pageSize: 200 }) })
  const staff = (users.data?.items ?? []).filter((u) => { const r = normalizeRole(u); return r === "barista" || r === "cashier" })
  const [open, setOpen] = useState(false)
  const [shiftId, setShiftId] = useState("")
  const [reason, setReason] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [picked, setPicked] = useState<Record<string, string>>({})
  const refresh = () => void qc.invalidateQueries({ queryKey: ["replacements"] })
  const create = useMutation({ mutationFn: () => staffApi.openReplacement({ shiftId, reason }), onSuccess: () => { refresh(); setOpen(false); setReason(""); showToast("Đã mở ca cần người thay", "success") }, onError: (e) => setError(e.message) })
  const approve = useMutation({
    mutationFn: (v: { id: string; userId: string }) => staffApi.approve(v.id, v.userId),
    onSuccess: (r) => { refresh(); void qc.invalidateQueries({ queryKey: ["shifts"] }); showToast(`Đã xếp ${r.filledBy ?? "người"} thay ca`, "success") },
    onError: (e) => { showToast(e.message, "error"); refresh() },
  })

  const candidates = (r: Replacement) => staff.filter((u) => u.fullName !== r.shift.userName)
  // Requests still waiting for a decision first, then the rest by date, newest first.
  const waitingFirst = (r: Replacement) => Number(r.status === "open" && !replacementOver(r))
  const sorted = (rows: Replacement[]) => [...rows].sort((a, b) => waitingFirst(b) - waitingFirst(a) || b.shift.date.localeCompare(a.shift.date))

  return (
    <PageFrame page="branch-shift-requests" navigate={navigate} uc="UC-47" title="Ca thay" subtitle="Nhân viên báo bận sẽ hiện ở đây. Bạn chọn người trong chi nhánh để thay ca." action={<Button variant="secondary" onClick={() => { setError(null); setOpen(true) }}>Mở ca cần người thay</Button>}>
      <QueryBoundary query={reqs}>
        {(rows) => {
          const waiting = rows.filter((r) => r.status === "open" && !replacementOver(r)).length
          return rows.length === 0 ? <EmptyState title="Chưa có ai báo bận" description="Khi nhân viên bấm Báo bận ở ca của họ, yêu cầu sẽ hiện ở đây." /> : (
            <>
              {waiting > 0 && <div className="mb-4"><Banner tone="warn">{waiting} ca đang chờ bạn xếp người thay.</Banner></div>}
              <ul className="space-y-4">
                {sorted(rows).map((r) => {
                  const over = r.status === "open" && replacementOver(r)
                  const choice = picked[r.id] ?? ""
                  return (
                    <li key={r.id} className={`rounded-[16px] border bg-surface p-5 ${r.status === "open" && !over ? "border-clay" : "border-border"}`}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium text-text-primary">{dayLabel(r.shift.date)} · {shiftLabel(r.shift)}</p>
                        <StatusPill tone={r.status === "filled" ? "success" : over ? "danger" : "pending"}>{r.status === "filled" ? `Đã xếp: ${r.filledBy}` : over ? "Đã qua giờ, không có người thay" : "Chờ xếp người thay"}</StatusPill>
                      </div>
                      <p className="mt-1 text-sm text-text-secondary">{r.shift.userName ? <>Người báo bận: <b className="text-text-primary">{r.shift.userName}</b></> : "Ca thêm người"} · Lý do: {r.reason}</p>
                      {r.status === "open" && !over && (
                        <div className="mt-3 flex flex-wrap items-end gap-2">
                          <label className="block min-w-56 flex-1 text-sm font-medium text-text-primary">Người thay ca
                            <select value={choice} onChange={(e) => setPicked((p) => ({ ...p, [r.id]: e.target.value }))} className="mt-1.5 w-full rounded-[10px] border border-border bg-surface px-3 py-2.5 text-sm font-normal">
                              <option value="">Chọn nhân viên</option>
                              {candidates(r).map((u) => <option key={u.id} value={u.id}>{u.fullName} · {normalizeRole(u) === "cashier" ? "Thu ngân" : "Pha chế"}</option>)}
                            </select>
                          </label>
                          <Button loading={approve.isPending && approve.variables?.id === r.id} disabled={!choice} disabledReason="Chọn người thay ca" onClick={() => approve.mutate({ id: r.id, userId: choice })}>Xếp thay ca</Button>
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            </>
          )
        }}
      </QueryBoundary>
      <Modal open={open} title="Mở ca cần người thay" onClose={() => setOpen(false)} footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Hủy</Button><Button loading={create.isPending} disabled={!shiftId || !reason.trim()} disabledReason="Chọn ca và nhập lý do" onClick={() => create.mutate()}>Mở</Button></>}>
        <div className="space-y-4">
          {error && <Banner>{error}</Banner>}
          <p className="text-sm text-text-secondary">Dùng khi nhân viên báo nghỉ trực tiếp với bạn. Sau khi mở, chọn người thay ở danh sách.</p>
          <label className="block text-sm font-medium text-text-primary">Ca cần thay
            <select value={shiftId} onChange={(e) => setShiftId(e.target.value)} className="mt-1.5 w-full rounded-[10px] border border-border bg-surface px-3 py-3 text-sm">
              <option value="">Chọn ca</option>
              {(shifts.data ?? []).map((s) => <option key={s.id} value={s.id}>{dayLabel(s.date)} · {shiftLabel(s)} · {s.userName}</option>)}
            </select>
          </label>
          <Field label="Lý do" value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
      </Modal>
    </PageFrame>
  )
}
