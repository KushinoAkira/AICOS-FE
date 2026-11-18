import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate, useSearchParams } from "react-router"
import type { Page } from "../../App"
import { PageFrame } from "../../components/PageFrame"
import { PayrollBoard, rowsOfPeriod, type PayRow } from "../../components/payroll/PayrollBoard"
import { Banner, Button, Modal, QueryBoundary } from "../../components/ui"
import { useAuth } from "../../context/AuthContext"
import { useToast } from "../../context/ToastContext"
import { ApiError } from "../../lib/api/http"
import { branchesApi } from "../../lib/api/identity"
import { monthRange, payrollApi, payrollErrorMessage, payrollPeriodApi, today, type PayrollLine, type PayrollPeriod, type PayrollPeriodLine } from "../../lib/api/manage"
import { formatDate, formatVND } from "../../lib/format"
import { finalizeBlocker, monthLabel, monthPayState, periodOf, recentMonths } from "../../lib/payrollPeriod"
import { PAGE_PATHS } from "../../router/pages"

const contract = (c: string) => (c === "FullTime" ? "Toàn thời gian" : "Bán thời gian")
const hours = (h: number) => (Number.isInteger(h) ? `${h}` : h.toFixed(1))
const workMeta = (l: { contractType: string; workedDays: number; regularHours: number }) =>
  `${contract(l.contractType)} · ${l.workedDays} ngày công · ${hours(l.regularHours)} giờ`

/**
 * UC-32 and paying staff: the branch manager counts the month from approved attendance, finalizes it and pays the baristas and cashiers.
 * The brand admin opens the same page per branch to check it, without paying (managers pay their staff; the brand admin pays the managers).
 */
export default function ManagerPayroll({ navigate }: { navigate: (p: Page) => void }) {
  const qc = useQueryClient()
  const routerNavigate = useNavigate()
  const { showToast } = useToast()
  const { role } = useAuth()
  const isOwner = role === "brandAdmin"
  const [params, setParams] = useSearchParams()
  const branches = useQuery({ queryKey: ["branches", "active"], queryFn: () => branchesApi.listActive(), enabled: isOwner })
  const branchId = isOwner ? params.get("branch") ?? branches.data?.[0]?.id : undefined
  const ready = !isOwner || !!branchId

  const thisMonth = today().slice(0, 7)
  const [month, setMonth] = useState(() => recentMonths(thisMonth, 2)[0])
  const range = monthRange(month)
  const summary = useQuery({ queryKey: ["payroll", month, branchId], queryFn: () => payrollApi.summary({ ...range, branchId }), retry: false, enabled: ready })
  const periods = useQuery({ queryKey: ["payroll-periods", branchId], queryFn: () => payrollPeriodApi.list(branchId), enabled: ready })
  const current = periods.data ? periodOf(periods.data, range) : null
  const live = current && current.status !== "Reopened" ? current : null
  const detail = useQuery({ queryKey: ["payroll-periods", "one", live?.id], queryFn: () => payrollPeriodApi.get(live!.id), enabled: !!live })
  const noRules = summary.error instanceof ApiError && summary.error.code === "payroll.rules_missing"

  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const changed = (p: PayrollPeriod) => {
    qc.setQueryData(["payroll-periods", "one", p.id], p)
    void qc.invalidateQueries({ queryKey: ["payroll-periods"] })
    void qc.invalidateQueries({ queryKey: ["payroll"] })
  }
  const finalize = useMutation({
    mutationFn: () => payrollPeriodApi.finalize(range),
    onSuccess: (p) => { changed(p); setConfirming(false); showToast(`Đã chốt ${monthLabel(month).toLowerCase()}: ${formatVND(p.totalNet)} cho ${p.employees} người.`, "success") },
    onError: (e: Error & { code?: string }) => setError(payrollErrorMessage(e)),
  })
  const exportPay = useMutation({ mutationFn: () => payrollApi.exportSummary({ ...range, branchId }), onError: (e) => showToast(e.message, "error") })
  const exportWork = useMutation({ mutationFn: () => payrollApi.exportRecords({ ...range, branchId }), onError: (e) => showToast(e.message, "error") })

  const openDetail = (employeeId: string) => isOwner ? undefined : () => routerNavigate(`${PAGE_PATHS["manager-payroll-detail"]}?employee=${employeeId}&month=${month}`)
  const draftRow = (l: PayrollLine): PayRow => ({
    id: l.employeeId, name: l.employeeName, meta: workMeta(l), base: l.basePay, extra: l.overtimePay + l.replacementPay, adjustments: l.adjustments,
    gross: l.totalPay, net: l.totalPay, waiting: l.unreviewedRecords, onOpen: openDetail(l.employeeId),
  })
  const unreviewed = summary.data?.totals.unreviewedRecords ?? 0
  const months = recentMonths(thisMonth, 6).map((m) => ({ month: m, state: periods.data ? monthPayState(periods.data, monthRange(m)) : ("open" as const) }))

  return (
    <PageFrame
      page="manager-payroll"
      navigate={navigate}
      uc="UC-32"
      title={isOwner ? "Lương nhân viên" : "Bảng lương"}
      subtitle={isOwner ? "Quản lý chi nhánh chốt và trả lương cho nhân viên. Bạn xem để kiểm tra." : "Tính từ chấm công đã duyệt và quy tắc lương của thương hiệu, rồi chốt và trả lương cho nhân viên."}
      action={
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" loading={exportWork.isPending} disabled={!ready} onClick={() => exportWork.mutate()}>Xuất chấm công</Button>
          <Button variant="secondary" loading={exportPay.isPending} disabled={!ready} onClick={() => exportPay.mutate()}>Xuất bảng lương</Button>
        </div>
      }
    >
      {isOwner && (
        <label className="mb-6 flex max-w-xs flex-col gap-1.5 text-sm font-medium text-text-primary">
          Chi nhánh
          <select value={branchId ?? ""} onChange={(e) => setParams({ branch: e.target.value }, { replace: true })} className="min-h-11 rounded-[12px] border border-border bg-surface px-3 text-base">
            {(branches.data ?? []).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </label>
      )}
      {noRules ? (
        <Banner tone="warn">Thương hiệu chưa cấu hình quy tắc lương nên chưa tính được lương. {isOwner ? <>Vào <button className="underline" onClick={() => navigate("brand-pay-rules")}>Cấu hình lương</button> để nhập mức lương theo ngày và theo giờ.</> : "Chủ thương hiệu vào mục Cấu hình lương để nhập mức lương theo ngày và theo giờ."}</Banner>
      ) : !ready ? null : (
        <QueryBoundary query={summary}>
          {(s) => (
            <QueryBoundary query={periods}>
              {() => {
                const finalized = live ? detail.data ?? null : null
                if (live && !finalized) return <p className="py-10 text-center text-sm text-text-secondary">Đang tải tháng đã chốt…</p>
                const rows = finalized ? rowsOfPeriod(finalized, (l: PayrollPeriodLine) => workMeta(l), (l) => openDetail(l.employeeId)) : s.lines.map(draftRow)
                return (
                  <PayrollBoard
                    months={months} month={month} onMonth={setMonth}
                    period={finalized} reopened={current?.status === "Reopened" ? current : null} rows={rows}
                    readOnly={isOwner ? "Bạn đang xem lương nhân viên của chi nhánh. Quản lý chi nhánh là người chốt tháng và trả lương; lương của quản lý bạn trả ở mục Lương quản lý." : undefined}
                    blocker={finalizeBlocker(range, unreviewed)}
                    onFinalize={() => { setError(null); setConfirming(true) }}
                    onChanged={changed}
                    who="nhân viên"
                    emptyText="Tháng này chưa có ai có công."
                    notice={!finalized && unreviewed > 0 && (
                      <Banner tone="warn" action={!isOwner && <Button variant="secondary" className="shrink-0 px-3 py-1.5 text-xs" onClick={() => navigate("branch-attendance")}>Duyệt chấm công</Button>}>
                        Còn {unreviewed} ca chưa duyệt. Duyệt hết rồi mới chốt được tháng này.
                      </Banner>
                    )}
                  />
                )
              }}
            </QueryBoundary>
          )}
        </QueryBoundary>
      )}

      <Modal
        open={confirming}
        title={`Chốt lương ${monthLabel(month).toLowerCase()}`}
        onClose={() => setConfirming(false)}
        footer={<><Button variant="secondary" onClick={() => setConfirming(false)}>Hủy</Button><Button loading={finalize.isPending} onClick={() => finalize.mutate()}>Chốt lương</Button></>}
      >
        <div className="space-y-3 text-sm text-text-secondary">
          {error && <Banner>{error}</Banner>}
          <p>Chốt lương từ <b className="text-text-primary">{formatDate(range.from)}</b> đến <b className="text-text-primary">{formatDate(range.to)}</b>, tổng <b className="text-text-primary">{formatVND(summary.data?.totals.totalPay ?? 0)}</b>.</p>
          <p>Sau khi chốt, số tiền được cố định; chấm công và thưởng, trừ của tháng này bị khóa. Tài khoản nhận lương lấy theo thông tin hiện tại của từng người.</p>
        </div>
      </Modal>
    </PageFrame>
  )
}
