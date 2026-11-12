import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { Page } from "../../App"
import { PageFrame } from "../../components/PageFrame"
import { Banner, Button, EmptyState, Field, Modal, QueryBoundary } from "../../components/ui"
import { useToast } from "../../context/ToastContext"
import { ApiError } from "../../lib/api/http"
import { usersApi } from "../../lib/api/identity"
import { workShiftApi, type WorkShift } from "../../lib/api/manage"
import { staffApi } from "../../lib/api/staff"
import { addDays, dayLabel, mondayOf, todayKey } from "../../lib/dates"
import { normalizeRole } from "../../router/roles"

const hhmm = (time: string) => time.slice(0, 5)
const timeOf = (s: WorkShift) => `${hhmm(s.startTime)}-${hhmm(s.endTime)}`
const pad = (n: number) => String(n).padStart(2, "0")

/** A new template starts at the current time and lasts two hours, so a shift for right now takes one click. */
function timesFromNow() {
  const now = new Date()
  const minutes = pad(Math.floor(now.getMinutes() / 5) * 5)
  const end = now.getHours() + 2
  return { startTime: `${pad(now.getHours())}:${minutes}`, endTime: end > 23 ? "23:59" : `${pad(end)}:${minutes}` }
}

const minutesOf = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5))

/** The server's refusals in the words of the schedule screen. */
function scheduleError(e: Error): string {
  const code = e instanceof ApiError ? e.code : undefined
  if (code === "shift.has_replacement") return "Ca này đã được duyệt cho người khác làm thay nên không bỏ được. Xem ở trang Ca thay."
  if (code === "shift.already_started") return "Nhân viên đã vào ca hoặc ca đã được duyệt chấm công nên không bỏ được."
  if (code === "work_shift.in_use") return "Còn ca sắp tới đang dùng ca mẫu này. Bỏ các ca đó khỏi lịch trước rồi xóa."
  if (code === "work_shift.active") return "Ngừng dùng ca mẫu trước rồi mới xóa."
  return e.message
}

/** Weekly schedule for the branch (UC-45), one row per shift template. Changing a template leaves the shifts already assigned as they are. */
export default function BranchSchedule({ navigate }: { navigate: (p: Page) => void }) {
  const qc = useQueryClient()
  const { showToast } = useToast()
  const [week, setWeek] = useState(mondayOf(todayKey()))
  const shifts = useQuery({ queryKey: ["shifts", week], queryFn: () => staffApi.shifts(week) })
  const templates = useQuery({ queryKey: ["work-shifts"], queryFn: workShiftApi.list })
  const users = useQuery({ queryKey: ["users"], queryFn: () => usersApi.list({ pageSize: 200 }) })
  const staff = (users.data?.items ?? []).filter((u) => { const r = normalizeRole(u); return r === "barista" || r === "cashier" })
  const [cell, setCell] = useState<{ date: string; template: WorkShift } | null>(null)
  const [userId, setUserId] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<WorkShift | "new" | null>(null)
  const [form, setForm] = useState({ name: "", startTime: "", endTime: "" })
  const [formError, setFormError] = useState<string | null>(null)
  const refresh = () => void qc.invalidateQueries({ queryKey: ["shifts"] })
  const refreshTemplates = () => void qc.invalidateQueries({ queryKey: ["work-shifts"] })
  const assign = useMutation({
    mutationFn: () => staffApi.assign({ date: cell!.date, period: minutesOf(cell!.template.startTime) < 720 ? "morning" : "afternoon", userId, workShiftId: cell!.template.id }),
    onSuccess: () => { refresh(); setCell(null); showToast("Đã xếp ca", "success") },
    onError: (e) => setError(e.message),
  })
  // Taking someone off a shift also cancels an open "find a replacement" request for it (the server does that).
  const remove = useMutation({ mutationFn: staffApi.unassign, onSuccess: () => { refresh(); void qc.invalidateQueries({ queryKey: ["replacements"] }); showToast("Đã bỏ khỏi ca", "success") }, onError: (e) => showToast(scheduleError(e), "error") })
  const [deleting, setDeleting] = useState<WorkShift | null>(null)
  const del = useMutation({
    mutationFn: (t: WorkShift) => workShiftApi.remove(t.id),
    onSuccess: () => { refreshTemplates(); setDeleting(null); showToast("Đã xóa ca mẫu", "success") },
    onError: (e) => { setDeleting(null); showToast(scheduleError(e), "error") },
  })
  const save = useMutation({
    mutationFn: () => workShiftApi.save(editing && editing !== "new" ? editing.id : null, { name: form.name.trim(), startTime: form.startTime, endTime: form.endTime }),
    onSuccess: () => { refreshTemplates(); setEditing(null); showToast("Đã lưu ca mẫu", "success") },
    onError: (e) => setFormError(e.message),
  })
  const setActive = useMutation({
    mutationFn: (v: { id: string; isActive: boolean }) => workShiftApi.setActive(v.id, v.isActive),
    onSuccess: refreshTemplates,
    onError: (e) => showToast(scheduleError(e), "error"),
  })
  const days = Array.from({ length: 7 }, (_, i) => addDays(week, i))

  function openTemplate(t: WorkShift | "new") {
    setEditing(t)
    setFormError(null)
    setForm(t === "new" ? { name: "", ...timesFromNow() } : { name: t.name, startTime: hhmm(t.startTime), endTime: hhmm(t.endTime) })
  }
  function submitTemplate() {
    if (!form.name.trim()) return setFormError("Nhập tên ca")
    if (!form.startTime || !form.endTime) return setFormError("Nhập giờ bắt đầu và giờ kết thúc")
    const length = minutesOf(form.endTime) - minutesOf(form.startTime)
    if (length <= 0) return setFormError("Giờ kết thúc phải sau giờ bắt đầu. Ca không được qua đêm.")
    if (length < 60 || length > 720) return setFormError("Một ca dài từ 1 đến 12 giờ.")
    setFormError(null)
    save.mutate()
  }

  return (
    <PageFrame page="branch-schedule" navigate={navigate} uc="UC-45" title="Lịch làm việc" subtitle="Tạo ca mẫu với giờ thực tế của quán, rồi xếp nhân viên theo tuần."
      action={<div className="flex flex-wrap items-center gap-2"><Button variant="secondary" aria-label="Tuần trước" onClick={() => setWeek(addDays(week, -7))}>‹</Button><span className="text-sm text-text-secondary">{dayLabel(week)} - {dayLabel(addDays(week, 6))}</span><Button variant="secondary" aria-label="Tuần sau" onClick={() => setWeek(addDays(week, 7))}>›</Button><Button onClick={() => openTemplate("new")}>Tạo ca mẫu</Button></div>}>
      <QueryBoundary query={templates}>
        {(all) => (
          <QueryBoundary query={shifts}>
            {(rows) => {
              const inWeek = (t: WorkShift) => rows.some((s) => s.workShiftId === t.id)
              const shown = all.filter((t) => t.isActive || inWeek(t))
              const stopped = all.filter((t) => !t.isActive)
              return (
                <>
                  {shown.length === 0 ? <EmptyState title="Chưa có ca mẫu" description="Tạo ca mẫu đầu tiên, ví dụ Ca sáng 06:00 đến 14:00, để bắt đầu xếp lịch." /> : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[920px] border-separate border-spacing-2 text-sm">
                        <thead><tr><th className="w-40" />{days.map((d) => <th key={d} className={`rounded-[10px] py-2 font-medium ${d === todayKey() ? "bg-sand text-clay" : "text-text-secondary"}`}>{dayLabel(d)}</th>)}</tr></thead>
                        <tbody>
                          {shown.map((t) => (
                            <tr key={t.id}>
                              <th scope="row" className="text-left align-top font-normal">
                                <p className="text-sm font-medium text-text-primary">{t.name}</p>
                                <p className="text-xs text-text-secondary">{timeOf(t)}{!t.isActive && " · ngừng dùng"}</p>
                                <p className="mt-1 flex gap-2 text-xs">
                                  <button aria-label={`Sửa ca mẫu ${t.name}`} onClick={() => openTemplate(t)} className="text-clay hover:underline">Sửa</button>
                                  {!t.isActive && <button aria-label={`Dùng lại ca mẫu ${t.name}`} onClick={() => setActive.mutate({ id: t.id, isActive: true })} className="text-clay hover:underline">Dùng lại</button>}
                                  {t.isActive && <button aria-label={`Ngừng dùng ca mẫu ${t.name}`} onClick={() => setActive.mutate({ id: t.id, isActive: false })} className="text-text-secondary hover:underline">Ngừng dùng</button>}
                                </p>
                              </th>
                              {days.map((d) => (
                                <td key={d} className="h-24 rounded-[12px] border border-border bg-surface p-2 align-top">
                                  {rows.filter((s) => s.date === d && s.workShiftId === t.id).map((s) => (
                                    <p key={s.id} className="mb-1 flex items-center justify-between rounded-md bg-bg-warm px-2 py-1 text-xs text-text-primary">{s.userName}<button aria-label={`Bỏ ${s.userName} khỏi ca`} onClick={() => remove.mutate(s.id)} className="text-state-danger">✕</button></p>
                                  ))}
                                  {!t.isActive && d >= todayKey() && <p className="text-[11px] leading-tight text-text-secondary">Ca mẫu đang ngừng dùng. Bấm "Dùng lại" để xếp thêm.</p>}
                                  {t.isActive && d >= todayKey() && <button onClick={() => { setCell({ date: d, template: t }); setUserId(""); setError(null) }} aria-label={`Thêm người vào ${dayLabel(d)} ${t.name}`} className="text-xs text-clay hover:underline">+ Thêm</button>}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {stopped.length > 0 && (
                    <section aria-label="Ca mẫu đã ngừng dùng" className="mt-6">
                      <h2 className="mb-2 text-sm font-medium text-text-primary">Ca mẫu đã ngừng dùng</h2>
                      <ul className="flex flex-wrap gap-2">
                        {stopped.map((t) => (
                          <li key={t.id} className="flex items-center gap-2 rounded-full bg-bg-warm px-3 py-1.5 text-sm text-text-primary">
                            {t.name} <span className="text-xs text-text-secondary">{timeOf(t)}</span>
                            <button aria-label={`Dùng lại ca mẫu ${t.name}`} onClick={() => setActive.mutate({ id: t.id, isActive: true })} className="text-xs text-clay hover:underline">Dùng lại</button>
                            <button aria-label={`Xóa ca mẫu ${t.name}`} onClick={() => setDeleting(t)} className="text-xs text-state-danger hover:underline">Xóa</button>
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}
                </>
              )
            }}
          </QueryBoundary>
        )}
      </QueryBoundary>

      <Modal open={!!cell} title={cell ? `${dayLabel(cell.date)} · ${cell.template.name} (${timeOf(cell.template)})` : ""} onClose={() => setCell(null)} footer={<><Button variant="secondary" onClick={() => setCell(null)}>Hủy</Button><Button loading={assign.isPending} disabled={!userId} disabledReason="Chọn nhân viên" onClick={() => assign.mutate()}>Xếp ca</Button></>}>
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

      <Modal open={!!editing} title={editing === "new" ? "Tạo ca mẫu" : `Sửa ca mẫu ${editing ? editing.name : ""}`} onClose={() => setEditing(null)} footer={<><Button variant="secondary" onClick={() => setEditing(null)}>Hủy</Button><Button loading={save.isPending} onClick={submitTemplate}>Lưu</Button></>}>
        <div className="space-y-4">
          {formError && <Banner>{formError}</Banner>}
          <Field label="Tên ca" placeholder="Ca demo" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Giờ bắt đầu" type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
            <Field label="Giờ kết thúc" type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
          </div>
          <p className="text-xs text-text-secondary">Một ca dài từ 1 đến 12 giờ, không qua đêm. Nhân viên vào ca được từ 15 phút trước giờ bắt đầu. Sửa ca mẫu không đổi giờ của các ca đã xếp.</p>
        </div>
      </Modal>
      <Modal open={!!deleting} title={deleting ? `Xóa ca mẫu ${deleting.name}?` : ""} onClose={() => setDeleting(null)}
        footer={<><Button variant="secondary" onClick={() => setDeleting(null)}>Hủy</Button><Button variant="danger" loading={del.isPending} onClick={() => deleting && del.mutate(deleting)}>Xóa</Button></>}>
        {deleting && <p className="text-sm text-text-secondary">Ca mẫu <b className="text-text-primary">{deleting.name} ({timeOf(deleting)})</b> sẽ không còn trong danh sách. Các ca đã làm trước đây vẫn được giữ cho chấm công và bảng lương.</p>}
      </Modal>
    </PageFrame>
  )
}
