import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { Page } from "../../App"
import { PageFrame } from "../../components/PageFrame"
import { Banner, Button, EmptyState, Field, Modal, QueryBoundary, StatusPill } from "../../components/ui"
import { useToast } from "../../context/ToastContext"
import { shiftLabel, staffApi } from "../../lib/api/staff"
import { dayLabel, mondayOf, todayKey } from "../../lib/dates"

/** Replacement shifts: the manager opens a request, staff (including other branches of the brand, BR-51) apply, the manager picks one. */
export default function ShiftRequests({ navigate }: { navigate: (p: Page) => void }) {
  const qc = useQueryClient()
  const { showToast } = useToast()
  const reqs = useQuery({ queryKey: ["replacements"], queryFn: staffApi.replacements, refetchInterval: 10000 })
  const shifts = useQuery({ queryKey: ["shifts", mondayOf(todayKey())], queryFn: () => staffApi.shifts(todayKey()) })
  const [open, setOpen] = useState(false)
  const [shiftId, setShiftId] = useState("")
  const [reason, setReason] = useState("")
  const [error, setError] = useState<string | null>(null)
  const refresh = () => void qc.invalidateQueries({ queryKey: ["replacements"] })
  const create = useMutation({ mutationFn: () => staffApi.openReplacement({ shiftId, reason }), onSuccess: () => { refresh(); setOpen(false); setReason(""); showToast("Đã mở ca thay", "success") }, onError: (e) => setError(e.message) })
  const approve = useMutation({ mutationFn: (v: { id: string; userId: string }) => staffApi.approve(v.id, v.userId), onSuccess: () => { refresh(); void qc.invalidateQueries({ queryKey: ["shifts"] }); showToast("Đã duyệt người thay ca", "success") }, onError: (e) => { showToast(e.message, "error"); refresh() } })

  return (
    <PageFrame page="branch-shift-requests" navigate={navigate} uc="UC-47" title="Ca thay" subtitle="Mở ca thay khi có người nghỉ. Nhân viên cùng thương hiệu có thể đăng ký." action={<Button onClick={() => { setError(null); setOpen(true) }}>Mở ca thay</Button>}>
      <QueryBoundary query={reqs}>
        {(rows) => rows.length === 0 ? <EmptyState title="Chưa có yêu cầu ca thay" /> : (
          <ul className="space-y-4">
            {rows.map((r) => (
              <li key={r.id} className="rounded-[16px] border border-border bg-surface p-5">
                <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-medium text-text-primary">{dayLabel(r.shift.date)} · {shiftLabel(r.shift)}</p><StatusPill tone={r.status === "open" ? "pending" : "success"}>{r.status === "open" ? "Đang nhận đăng ký" : `Đã có người thay: ${r.filledBy}`}</StatusPill></div>
                <p className="mt-1 text-sm text-text-secondary">Người nghỉ: {r.shift.userName} · Lý do: {r.reason}</p>
                {r.status === "open" && (r.applicants.length === 0 ? <p className="mt-3 text-sm text-text-secondary">Chưa có ai đăng ký.</p> : (
                  <ul className="mt-3 divide-y divide-border text-sm">
                    {r.applicants.map((a) => <li key={a.userId} className="flex items-center justify-between py-2"><span className="text-text-primary">{a.name} <span className="text-text-secondary">· {a.branchName}</span></span><Button className="px-3 py-1.5 text-xs" loading={approve.isPending && approve.variables?.userId === a.userId} onClick={() => approve.mutate({ id: r.id, userId: a.userId })}>Duyệt</Button></li>)}
                  </ul>
                ))}
              </li>
            ))}
          </ul>
        )}
      </QueryBoundary>
      <Modal open={open} title="Mở ca thay" onClose={() => setOpen(false)} footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Hủy</Button><Button loading={create.isPending} disabled={!shiftId || !reason.trim()} disabledReason="Chọn ca và nhập lý do" onClick={() => create.mutate()}>Mở</Button></>}>
        <div className="space-y-4">
          {error && <Banner>{error}</Banner>}
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