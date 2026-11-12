import { useState } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { useNavigate } from "react-router"
import type { Page } from "../../App"
import { PageFrame } from "../../components/PageFrame"
import { Banner, Button, DataTable, Field, KpiCard, QueryBoundary, type Column } from "../../components/ui"
import { useToast } from "../../context/ToastContext"
import { ApiError } from "../../lib/api/http"
import { monthRange, payrollApi, today, type PayrollLine } from "../../lib/api/manage"
import { formatSignedVND, formatVND } from "../../lib/format"
import { PAGE_PATHS } from "../../router/pages"

/** UC-32: what each person earned in a month, from the attendance the manager approved and the brand's pay rules. */
export default function ManagerPayroll({ navigate }: { navigate: (p: Page) => void }) {
  const routerNavigate = useNavigate()
  const { showToast } = useToast()
  const [month, setMonth] = useState(today().slice(0, 7))
  const range = monthRange(month)
  const summary = useQuery({ queryKey: ["payroll", month], queryFn: () => payrollApi.summary(range), retry: false })
  const noRules = summary.error instanceof ApiError && summary.error.code === "payroll.rules_missing"
  const exportPay = useMutation({ mutationFn: () => payrollApi.exportSummary(range), onError: (e) => showToast(e.message, "error") })
  const exportWork = useMutation({ mutationFn: () => payrollApi.exportRecords(range), onError: (e) => showToast(e.message, "error") })
  const columns: Column<PayrollLine>[] = [
    { key: "n", header: "Nhân sự", sort: (l) => l.employeeName, render: (l) => <button className="font-medium text-clay hover:underline" onClick={() => routerNavigate(`${PAGE_PATHS["manager-payroll-detail"]}?employee=${l.employeeId}&month=${month}`)}>{l.employeeName}</button> },
    { key: "c", header: "Hợp đồng", render: (l) => (l.contractType === "FullTime" ? "Toàn thời gian" : "Bán thời gian") },
    { key: "d", header: "Ngày công", sort: (l) => l.workedDays, render: (l) => l.workedDays },
    { key: "h", header: "Giờ", sort: (l) => l.regularHours, render: (l) => l.regularHours.toFixed(1) },
    { key: "o", header: "Tăng ca", render: (l) => `${l.overtimeHours.toFixed(1)} giờ` },
    { key: "r", header: "Ca thay", render: (l) => `${l.replacementHours.toFixed(1)} giờ` },
    { key: "a", header: "Điều chỉnh", render: (l) => formatSignedVND(l.adjustments) },
    { key: "t", header: "Thực lĩnh", sort: (l) => l.totalPay, render: (l) => <b className="text-text-primary">{formatVND(l.totalPay)}</b> },
    { key: "u", header: "Chờ duyệt", sort: (l) => l.unreviewedRecords, render: (l) => (l.unreviewedRecords ? <span className="text-state-warning">{l.unreviewedRecords} ca</span> : "-") },
  ]
  return (
    <PageFrame
      page="manager-payroll"
      navigate={navigate}
      uc="UC-32"
      title="Bảng lương"
      subtitle="Tính từ chấm công đã duyệt và quy tắc lương của thương hiệu."
      action={<div className="flex flex-wrap gap-2"><Button variant="secondary" loading={exportWork.isPending} onClick={() => exportWork.mutate()}>Xuất chấm công</Button><Button loading={exportPay.isPending} onClick={() => exportPay.mutate()}>Xuất bảng lương</Button></div>}
    >
      <div className="mb-6 w-48"><Field label="Tháng" type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} /></div>
      {noRules ? <Banner tone="warn">Thương hiệu chưa cấu hình quy tắc lương nên chưa tính được bảng lương. Brand Admin cấu hình ở mục Quy tắc thanh toán.</Banner> : <QueryBoundary query={summary}>
        {(s) => (
          <>
            {s.totals.unreviewedRecords > 0 && <div className="mb-4"><Banner tone="warn">Còn {s.totals.unreviewedRecords} ca chưa duyệt. <button className="underline" onClick={() => navigate("branch-attendance")}>Duyệt chấm công</button> trước khi chốt lương.</Banner></div>}
            <div className="mb-8 grid grid-cols-2 gap-4 xl:grid-cols-4">
              <KpiCard label="Tổng lương" value={formatVND(s.totals.totalPay)} />
              <KpiCard label="Lương cơ bản" value={formatVND(s.totals.basePay)} />
              <KpiCard label="Tăng ca và ca thay" value={formatVND(s.totals.overtimePay + s.totals.replacementPay)} />
              <KpiCard label="Điều chỉnh" value={formatSignedVND(s.totals.adjustments)} />
            </div>
            <DataTable rows={s.lines} rowKey={(l) => l.employeeId} columns={columns} emptyTitle="Tháng này chưa có công" />
          </>
        )}
      </QueryBoundary>}
    </PageFrame>
  )
}
