import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { Page } from "../../App"
import { PageFrame } from "../../components/PageFrame"
import { Banner, Button, ConfirmDialog, DataTable, Field, Modal, QueryBoundary, StatusPill, type Column } from "../../components/ui"
import { useToast } from "../../context/ToastContext"
import { addDays, attendanceApi, today, type AttendanceRow } from "../../lib/api/manage"
import { formatDate, formatTime } from "../../lib/format"

const STATE_TEXT: Record<string, string> = { Upcoming: "Sắp tới", InProgress: "Đang làm", Worked: "Đã làm", MissingCheckOut: "Thiếu giờ ra", NoShow: "Không đến", Absent: "Vắng" }

/** `2026-11-02T08:15` in the browser's local time, for a date-time input. */
const checkedIn = (r: AttendanceRow) => r.shift.adjustedCheckInAtUtc ?? r.shift.checkInAtUtc

const toLocalInput = (iso: string | null) => {
  if (!iso) return ""
  const d = new Date(iso)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

/** UC-29 Review Attendance: compare shifts with what happened, correct mistakes, and approve records for payroll (BR-54). */
export default function ManagerAttendance({ navigate }: { navigate: (p: Page) => void }) {
  const qc = useQueryClient()
  const { showToast } = useToast()
  const [to, setTo] = useState(today())
  const [from, setFrom] = useState(addDays(today(), -6))
  const [onlyPending, setOnlyPending] = useState(true)
  const report = useQuery({ queryKey: ["attendance", from, to, onlyPending], queryFn: () => attendanceApi.report({ from, to, reviewStatus: onlyPending ? "Unreviewed" : undefined }) })
  const [adjusting, setAdjusting] = useState<AttendanceRow | null>(null)
  const [checkIn, setCheckIn] = useState("")
  const [checkOut, setCheckOut] = useState("")
  const [reason, setReason] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [absent, setAbsent] = useState<AttendanceRow | null>(null)
  const [absentReason, setAbsentReason] = useState("")
  const [running, setRunning] = useState<AttendanceRow | null>(null)
  const refresh = () => { void qc.invalidateQueries({ queryKey: ["attendance"] }); void qc.invalidateQueries({ queryKey: ["payroll"] }) }
  const fail = (e: Error) => showToast(e.message, "error")
  const approve = useMutation({ mutationFn: (id: string) => attendanceApi.approve(id), onSuccess: () => { refresh(); setRunning(null); showToast("Đã duyệt.", "success") }, onError: (e) => { setRunning(null); fail(e) } })
  const approveAll = useMutation({
    mutationFn: () => attendanceApi.approveRange({ from, to }),
    onSuccess: (r) => { refresh(); showToast(`Đã duyệt ${r.approved} ca.${r.needsAttention ? ` ${r.needsAttention} ca cần xem lại.` : ""}`, "success") },
    onError: fail,
  })
  const adjust = useMutation({
    mutationFn: () => attendanceApi.adjust(adjusting?.shift.id ?? "", { checkInAt: checkIn ? new Date(checkIn).toISOString() : null, checkOutAt: checkOut ? new Date(checkOut).toISOString() : null, reason: reason.trim() }),
    onSuccess: () => { refresh(); setAdjusting(null); showToast("Đã sửa giờ công.", "success") },
    onError: (e) => setError(e.message),
  })
  const markAbsent = useMutation({
    mutationFn: () => attendanceApi.absent(absent?.shift.id ?? "", absentReason.trim()),
    onSuccess: () => { refresh(); setAbsent(null); setAbsentReason(""); showToast("Đã ghi vắng.", "success") },
    onError: fail,
  })
  const openAdjust = (r: AttendanceRow) => {
    setAdjusting(r)
    setError(null)
    setReason("")
    setCheckIn(toLocalInput(r.shift.adjustedCheckInAtUtc ?? r.shift.checkInAtUtc))
    setCheckOut(toLocalInput(r.shift.adjustedCheckOutAtUtc ?? r.shift.checkOutAtUtc))
  }
  const submitAdjust = () => {
    if (reason.trim().length < 3) return setError("Nhập lý do sửa giờ công")
    setError(null)
    adjust.mutate()
  }
  /** A shift still running: approving it sets the check-out to now, so the manager confirms first. */
  const isRunning = (r: AttendanceRow) => r.state === "InProgress" && !!checkedIn(r) && !(r.shift.adjustedCheckOutAtUtc ?? r.shift.checkOutAtUtc)
  const columns: Column<AttendanceRow>[] = [
    { key: "d", header: "Ngày", sort: (r) => r.shift.workDate, render: (r) => formatDate(r.shift.workDate) },
    { key: "n", header: "Nhân sự", sort: (r) => r.shift.employeeName, render: (r) => <span className="font-medium text-text-primary">{r.shift.employeeName}{r.shift.isReplacement && <span className="ml-1 text-xs text-text-secondary">(ca thay)</span>}</span> },
    { key: "s", header: "Ca", render: (r) => `${r.shift.startTime.slice(0, 5)}-${r.shift.endTime.slice(0, 5)}` },
    { key: "i", header: "Vào / Ra", render: (r) => { const a = r.shift.adjustedCheckInAtUtc ?? r.shift.checkInAtUtc, b = r.shift.adjustedCheckOutAtUtc ?? r.shift.checkOutAtUtc; return `${a ? formatTime(a) : "-"} / ${b ? formatTime(b) : "-"}` } },
    { key: "w", header: "Giờ", render: (r) => r.workedHours.toFixed(1) },
    { key: "f", header: "Tình trạng", render: (r) => <span>{r.shift.isAbsent ? "Vắng" : STATE_TEXT[r.state] ?? r.state}{r.isLate && <span className="ml-1 text-xs text-state-warning">trễ {r.lateMinutes} phút</span>}{r.leftEarly && <span className="ml-1 text-xs text-state-warning">về sớm</span>}</span> },
    { key: "r", header: "Duyệt", render: (r) => <StatusPill tone={r.shift.reviewStatus === "Approved" ? "success" : "pending"}>{r.shift.reviewStatus === "Approved" ? "Đã duyệt" : "Chờ duyệt"}</StatusPill> },
    {
      key: "a", header: "", className: "text-right", render: (r) => (
        <div className="flex justify-end gap-2">
          {r.shift.reviewStatus !== "Approved" && <Button className="px-3 py-1.5 text-xs" loading={approve.isPending && approve.variables === r.shift.id} disabled={!checkedIn(r) && (r.state === "Upcoming" || r.state === "InProgress")} disabledReason="Nhân viên chưa vào ca" onClick={() => (isRunning(r) ? setRunning(r) : approve.mutate(r.shift.id))}>Duyệt</Button>}
          <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => openAdjust(r)}>Sửa giờ</Button>
          {!r.shift.checkInAtUtc && !r.shift.isAbsent && <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => setAbsent(r)}>Ghi vắng</Button>}
        </div>
      ),
    },
  ]
  return (
    <PageFrame page="branch-attendance" navigate={navigate} uc="UC-29" title="Chấm công" subtitle="Giờ công chỉ vào bảng lương sau khi bạn duyệt." action={<Button loading={approveAll.isPending} onClick={() => approveAll.mutate()}>Duyệt tất cả ca hợp lệ</Button>}>
      <div className="mb-6 flex flex-wrap items-end gap-3">
        <div className="w-40"><Field label="Từ ngày" type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} /></div>
        <div className="w-40"><Field label="Đến ngày" type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} /></div>
        <label className="mb-3 flex items-center gap-2 text-sm text-text-primary"><input type="checkbox" checked={onlyPending} onChange={(e) => setOnlyPending(e.target.checked)} /> Chỉ ca chờ duyệt</label>
      </div>
      <QueryBoundary query={report}>{(r) => <DataTable rows={r.rows} rowKey={(x) => x.shift.id} columns={columns} emptyTitle={onlyPending ? "Không có ca nào chờ duyệt" : "Không có ca trong khoảng này"} />}</QueryBoundary>

      <Modal open={!!adjusting} title={`Sửa giờ công: ${adjusting?.shift.employeeName ?? ""}`} onClose={() => setAdjusting(null)} footer={<><Button variant="secondary" onClick={() => setAdjusting(null)}>Hủy</Button><Button loading={adjust.isPending} onClick={submitAdjust}>Lưu</Button></>}>
        <div className="space-y-4">
          {error && <Banner>{error}</Banner>}
          <Field label="Giờ vào" type="datetime-local" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
          <Field label="Giờ ra" type="datetime-local" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
          <Field label="Lý do" hint="Được lưu trong nhật ký." value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
      </Modal>
      <ConfirmDialog open={!!running} title={`Duyệt ca đang diễn ra của ${running?.shift.employeeName ?? ""}?`} message="Giờ ra được chốt tại thời điểm này và công tính đến lúc duyệt. Nhân viên sẽ không bấm Kết thúc ca nữa. Có thể chỉnh lại bằng Sửa giờ." confirmLabel="Duyệt" onCancel={() => setRunning(null)} onConfirm={() => running && approve.mutate(running.shift.id)} />
      <ConfirmDialog open={!!absent} danger requireReason reason={absentReason} onReason={setAbsentReason} title={`Ghi vắng ${absent?.shift.employeeName ?? ""}?`} message="Ca này sẽ không được tính công." confirmLabel="Ghi vắng" onCancel={() => setAbsent(null)} onConfirm={() => markAbsent.mutate()} />
    </PageFrame>
  )
}
