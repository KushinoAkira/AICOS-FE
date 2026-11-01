import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useSearchParams } from "react-router"
import type { Page } from "../../App"
import { PageFrame } from "../../components/PageFrame"
import { Banner, Button, ConfirmDialog, DataTable, Field, KpiCard, Modal, QueryBoundary, type Column } from "../../components/ui"
import { useToast } from "../../context/ToastContext"
import { attendanceApi, monthRange, payrollApi, today, type AttendanceRow, type PayrollAdjustment } from "../../lib/api/manage"
import { formatDate, formatSignedVND, formatTime, formatVND } from "../../lib/format"

/** One person's month: the pay, the shifts behind it, and the manager's adjustments. */
export default function ManagerPayrollDetail({ navigate }: { navigate: (p: Page) => void }) {
  const [params] = useSearchParams()
  const employeeId = params.get("employee") ?? ""
  const month = params.get("month") ?? today().slice(0, 7)
  const range = monthRange(month)
  const qc = useQueryClient()
  const { showToast } = useToast()
  const summary = useQuery({ queryKey: ["payroll", month], queryFn: () => payrollApi.summary(range) })
  const attendance = useQuery({ queryKey: ["attendance", employeeId, month], queryFn: () => attendanceApi.report({ ...range, employeeId }), enabled: !!employeeId })
  const adjustments = useQuery({ queryKey: ["payroll", "adjustments", employeeId, month], queryFn: () => payrollApi.adjustments({ ...range, employeeId }), enabled: !!employeeId })
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState("")
  const [reason, setReason] = useState("")
  const [workDate, setWorkDate] = useState(range.from)
  const [error, setError] = useState<string | null>(null)
  const [removing, setRemoving] = useState<PayrollAdjustment | null>(null)
  const refresh = () => { void qc.invalidateQueries({ queryKey: ["payroll"] }) }
  const add = useMutation({
    mutationFn: () => payrollApi.addAdjustment({ employeeId, workDate, amount: Number(amount), reason: reason.trim() }),
    onSuccess: () => { refresh(); setOpen(false); setAmount(""); setReason(""); showToast("Đã thêm điều chỉnh.", "success") },
    onError: (e) => setError(e.message),
  })
  const remove = useMutation({
    mutationFn: (id: string) => payrollApi.removeAdjustment(id),
    onSuccess: () => { refresh(); setRemoving(null); showToast("Đã xóa điều chỉnh.", "success") },
    onError: (e) => showToast(e.message, "error"),
  })
  const submit = () => {
    if (!/^-?\d+$/.test(amount) || Number(amount) === 0) return setError("Nhập số tiền khác 0. Số âm là khoản trừ.")
    if (reason.trim().length < 3) return setError("Nhập lý do điều chỉnh")
    setError(null)
    add.mutate()
  }
  const line = summary.data?.lines.find((l) => l.employeeId === employeeId)
  const shiftColumns: Column<AttendanceRow>[] = [
    { key: "d", header: "Ngày", sort: (r) => r.shift.workDate, render: (r) => formatDate(r.shift.workDate) },
    { key: "s", header: "Ca", render: (r) => `${r.shift.shiftName} ${r.shift.startTime.slice(0, 5)}-${r.shift.endTime.slice(0, 5)}` },
    { key: "i", header: "Vào", render: (r) => (r.shift.adjustedCheckInAtUtc ?? r.shift.checkInAtUtc ? formatTime((r.shift.adjustedCheckInAtUtc ?? r.shift.checkInAtUtc)!) : "-") },
    { key: "o", header: "Ra", render: (r) => (r.shift.adjustedCheckOutAtUtc ?? r.shift.checkOutAtUtc ? formatTime((r.shift.adjustedCheckOutAtUtc ?? r.shift.checkOutAtUtc)!) : "-") },
    { key: "w", header: "Giờ làm", render: (r) => r.workedHours.toFixed(1) },
    { key: "r", header: "Duyệt", render: (r) => (r.shift.isAbsent ? "Vắng" : r.shift.reviewStatus === "Approved" ? "Đã duyệt" : "Chờ duyệt") },
  ]
  const adjustColumns: Column<PayrollAdjustment>[] = [
    { key: "d", header: "Ngày", render: (a) => formatDate(a.workDate) },
    { key: "a", header: "Số tiền", render: (a) => formatSignedVND(a.amount) },
    { key: "r", header: "Lý do", render: (a) => a.reason },
    { key: "x", header: "", className: "text-right", render: (a) => <Button variant="danger" className="px-3 py-1.5 text-xs" onClick={() => setRemoving(a)}>Xóa</Button> },
  ]
  return (
    <PageFrame
      page="manager-payroll-detail"
      navigate={navigate}
      uc="UC-32"
      title={line?.employeeName ?? "Chi tiết lương"}
      subtitle={`Tháng ${month.slice(5)}/${month.slice(0, 4)}`}
      action={<div className="flex gap-2"><Button variant="secondary" onClick={() => navigate("manager-payroll")}>Về bảng lương</Button><Button onClick={() => setOpen(true)}>Thêm điều chỉnh</Button></div>}
    >
      <QueryBoundary query={summary}>
        {() => !line ? <Banner tone="warn">Tháng này chưa có dữ liệu lương của nhân sự này.</Banner> : (
          <div className="mb-8 grid grid-cols-2 gap-4 xl:grid-cols-4">
            <KpiCard label="Thực lĩnh" value={formatVND(line.totalPay)} />
            <KpiCard label="Lương cơ bản" value={formatVND(line.basePay)} hint={`${line.workedDays} ngày · ${line.regularHours.toFixed(1)} giờ`} />
            <KpiCard label="Tăng ca, ca thay" value={formatVND(line.overtimePay + line.replacementPay)} hint={`${line.overtimeHours.toFixed(1)} + ${line.replacementHours.toFixed(1)} giờ`} />
            <KpiCard label="Điều chỉnh" value={formatSignedVND(line.adjustments)} hint={line.absences ? `Vắng ${line.absences} ca` : undefined} />
          </div>
        )}
      </QueryBoundary>
      <h2 className="mb-3 font-serif text-lg text-text-primary">Các ca trong tháng</h2>
      <QueryBoundary query={attendance}>{(r) => <DataTable rows={r.rows} rowKey={(x) => x.shift.id} columns={shiftColumns} emptyTitle="Tháng này chưa có ca" />}</QueryBoundary>
      <h2 className="mb-3 mt-8 font-serif text-lg text-text-primary">Điều chỉnh</h2>
      <QueryBoundary query={adjustments}>{(rows) => <DataTable rows={rows} rowKey={(a) => a.id} columns={adjustColumns} emptyTitle="Chưa có điều chỉnh" />}</QueryBoundary>

      <Modal open={open} title="Thêm điều chỉnh" onClose={() => setOpen(false)} footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Hủy</Button><Button loading={add.isPending} onClick={submit}>Lưu</Button></>}>
        <div className="space-y-4">
          {error && <Banner>{error}</Banner>}
          <Field label="Ngày" type="date" min={range.from} max={range.to} value={workDate} onChange={(e) => setWorkDate(e.target.value)} />
          <Field label="Số tiền (₫)" hint="Số âm là khoản trừ." value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d-]/g, ""))} />
          <Field label="Lý do" value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
      </Modal>
      <ConfirmDialog open={!!removing} danger title="Xóa điều chỉnh này?" message={`${formatSignedVND(removing?.amount ?? 0)} · ${removing?.reason ?? ""}`} confirmLabel="Xóa" onCancel={() => setRemoving(null)} onConfirm={() => removing && remove.mutate(removing.id)} />
    </PageFrame>
  )
}
