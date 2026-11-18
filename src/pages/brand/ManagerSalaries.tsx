import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { Page } from "../../App"
import { PageFrame } from "../../components/PageFrame"
import { PayrollBoard, rowsOfPeriod, type PayRow } from "../../components/payroll/PayrollBoard"
import { Banner, Button, Modal, QueryBoundary } from "../../components/ui"
import { useToast } from "../../context/ToastContext"
import { branchesApi, usersApi } from "../../lib/api/identity"
import { managerPayrollApi, monthRange, payrollErrorMessage, payrollPeriodApi, today, type PayrollPeriod } from "../../lib/api/manage"
import { formatSignedVND, formatVND } from "../../lib/format"
import { monthLabel, monthPayState, periodOf, recentMonths } from "../../lib/payrollPeriod"

/** Digits only, shown with dots: "12000000" -> "12.000.000". A leading minus is kept when `signed`. */
const digits = (v: string, signed = false) => {
  const minus = signed && v.trim().startsWith("-")
  const d = v.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, 10)
  return d ? `${minus ? "-" : ""}${Number(d).toLocaleString("vi-VN")}` : minus ? "-" : ""
}
const amountOf = (v: string) => Number(v.replace(/[^\d-]/g, "")) || 0

/**
 * The brand admin pays the branch managers: a fixed monthly salary per manager, a bonus or deduction when finalizing the month, then the
 * transfers. Staff are paid by their manager (Bảng lương of each branch).
 */
export default function ManagerSalaries({ navigate }: { navigate: (p: Page) => void }) {
  const qc = useQueryClient()
  const { showToast } = useToast()
  const accounts = useQuery({ queryKey: ["users", "managers"], queryFn: async () => (await usersApi.list({ role: "BranchManager", pageSize: 100 })).items })
  const branches = useQuery({ queryKey: ["branches", "active"], queryFn: () => branchesApi.listActive() })
  const salaries = useQuery({ queryKey: ["manager-salaries"], queryFn: managerPayrollApi.managers })
  const periods = useQuery({ queryKey: ["manager-periods"], queryFn: managerPayrollApi.periods })

  const thisMonth = today().slice(0, 7)
  const [month, setMonth] = useState(() => recentMonths(thisMonth, 2)[0])
  const range = monthRange(month)
  const current = periods.data ? periodOf(periods.data, range) : null
  const live = current && current.status !== "Reopened" ? current : null
  const detail = useQuery({ queryKey: ["manager-periods", "one", live?.id], queryFn: () => payrollPeriodApi.get(live!.id), enabled: !!live })

  const branchName = (id: string | null | undefined) => branches.data?.find((b) => b.id === id)?.name ?? "Chi nhánh"
  const salaryOf = (userId: string) => salaries.data?.find((s) => s.userId === userId)
  const [editing, setEditing] = useState<Record<string, string>>({})
  const [confirming, setConfirming] = useState(false)
  const [bonus, setBonus] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)

  const save = useMutation({
    mutationFn: (v: { userId: string; amount: number }) => managerPayrollApi.setSalary(v.userId, v.amount),
    onSuccess: (s) => {
      void qc.invalidateQueries({ queryKey: ["manager-salaries"] })
      setEditing(({ [s.userId]: _, ...rest }) => rest)
      showToast(`Đã lưu lương tháng của ${s.fullName}: ${formatVND(s.monthlySalary)}.`, "success")
    },
    onError: (e: Error & { code?: string }) => showToast(payrollErrorMessage(e), "error"),
  })
  const changed = (p: PayrollPeriod) => {
    qc.setQueryData(["manager-periods", "one", p.id], p)
    void qc.invalidateQueries({ queryKey: ["manager-periods"] })
  }
  const paid = (salaries.data ?? []).filter((s) => s.status === "Active" && s.monthlySalary > 0)
  const finalize = useMutation({
    mutationFn: () => managerPayrollApi.finalize({
      month,
      adjustments: paid.map((s) => ({ employeeId: s.employeeId, amount: amountOf(bonus[s.employeeId] ?? "") })).filter((a) => a.amount !== 0),
    }),
    onSuccess: (p) => { changed(p); setConfirming(false); setBonus({}); showToast(`Đã chốt lương quản lý ${monthLabel(month).toLowerCase()}: ${formatVND(p.totalNet)}.`, "success") },
    onError: (e: Error & { code?: string }) => setError(payrollErrorMessage(e)),
  })

  const blocker = range.to >= today() ? "Chỉ chốt được khi tháng đã qua." : paid.length === 0 ? "Chưa quản lý nào có lương tháng." : null
  const months = recentMonths(thisMonth, 6).map((m) => ({ month: m, state: periods.data ? monthPayState(periods.data, monthRange(m)) : ("open" as const) }))
  const draft: PayRow[] = paid.map((s) => ({ id: s.employeeId, name: s.fullName, meta: `Lương tháng · ${branchName(s.branchId)}`, base: s.monthlySalary, extra: 0, adjustments: 0, gross: s.monthlySalary, net: s.monthlySalary }))
  const bonusTotal = paid.reduce((sum, s) => sum + amountOf(bonus[s.employeeId] ?? ""), 0)

  return (
    <PageFrame page="brand-manager-payroll" navigate={navigate} uc="UC-32" title="Lương quản lý" subtitle="Bạn trả lương tháng cho quản lý các chi nhánh. Lương nhân viên do quản lý chi nhánh chốt và trả.">
      <QueryBoundary query={periods}>
        {() => {
          const finalized = live ? detail.data ?? null : null
          if (live && !finalized) return <p className="py-10 text-center text-sm text-text-secondary">Đang tải tháng đã chốt…</p>
          const rows = finalized ? rowsOfPeriod(finalized, (l) => `Lương tháng · ${branchName(salaries.data?.find((s) => s.employeeId === l.employeeId)?.branchId)}`) : draft
          return (
            <PayrollBoard
              months={months} month={month} onMonth={setMonth}
              period={finalized} reopened={current?.status === "Reopened" ? current : null} rows={rows}
              blocker={blocker} finalizeLabel="Chốt lương quản lý"
              onFinalize={() => { setError(null); setConfirming(true) }}
              onChanged={changed}
              who="quản lý"
              emptyText="Chưa quản lý nào có lương tháng. Nhập mức lương ở bảng bên dưới."
              showExtra={false}
            />
          )
        }}
      </QueryBoundary>

      <section aria-labelledby="salaries" className="mt-10">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 id="salaries" className="font-serif text-xl text-text-primary">Mức lương tháng</h2>
            <p className="text-sm text-text-secondary">Áp dụng cho những tháng chốt sau khi lưu. Tháng đã chốt giữ nguyên số cũ.</p>
          </div>
          <Button variant="ghost" className="text-sm" onClick={() => navigate("admin-users")}>Thêm tài khoản quản lý</Button>
        </div>
        <QueryBoundary query={accounts}>
          {(list) => list.length === 0 ? (
            <p className="rounded-[16px] border border-dashed border-border p-8 text-center text-sm text-text-secondary">Thương hiệu chưa có tài khoản quản lý chi nhánh nào.</p>
          ) : (
            <ul className="divide-y divide-border overflow-hidden rounded-[16px] border border-border bg-surface">
              {list.map((u) => {
                const s = salaryOf(u.id)
                const value = editing[u.id] ?? (s ? digits(String(s.monthlySalary)) : "")
                const dirty = editing[u.id] !== undefined && amountOf(editing[u.id]) !== (s?.monthlySalary ?? -1)
                return (
                  <li key={u.id} className="grid gap-3 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-6">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-text-primary">{u.fullName}{u.status !== "Active" && <span className="ml-2 text-xs font-normal text-state-danger">Đã khóa</span>}</p>
                      <p className="truncate text-xs text-text-secondary">
                        {branchName(u.branchId)}
                        {s ? (s.bankAccountNumber ? ` · Nhận lương: ${s.bankName} ·••${s.bankAccountNumber.slice(-4)}` : " · Chưa có tài khoản nhận lương") : " · Chưa có mức lương"}
                      </p>
                    </div>
                    <form className="flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); save.mutate({ userId: u.id, amount: amountOf(value) }) }}>
                      <label className="relative">
                        <span className="sr-only">Lương tháng của {u.fullName}</span>
                        <input inputMode="numeric" value={value} placeholder="0" onChange={(e) => setEditing({ ...editing, [u.id]: digits(e.target.value) })}
                          className="min-h-11 w-44 rounded-[12px] border border-border bg-surface py-2 pl-3 pr-8 text-right text-base tabular-nums" />
                        <span aria-hidden className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-text-secondary">đ</span>
                      </label>
                      <Button type="submit" variant={dirty ? "primary" : "secondary"} className="min-h-11" disabled={!dirty} loading={save.isPending && save.variables?.userId === u.id}>Lưu</Button>
                    </form>
                  </li>
                )
              })}
            </ul>
          )}
        </QueryBoundary>
      </section>

      <Modal
        open={confirming}
        title={`Chốt lương quản lý ${monthLabel(month).toLowerCase()}`}
        onClose={() => setConfirming(false)}
        footer={<><Button variant="secondary" onClick={() => setConfirming(false)}>Hủy</Button><Button loading={finalize.isPending} onClick={() => finalize.mutate()}>Chốt {formatVND(paid.reduce((t, s) => t + s.monthlySalary, 0) + bonusTotal)}</Button></>}
      >
        <div className="space-y-4">
          {error && <Banner>{error}</Banner>}
          <p className="text-sm text-text-secondary">Nhập thưởng (số dương) hoặc khoản trừ (thêm dấu trừ) nếu có. Sau khi chốt, số tiền được cố định để trả.</p>
          <ul className="divide-y divide-border rounded-[12px] border border-border">
            {paid.map((s) => {
              const extra = amountOf(bonus[s.employeeId] ?? "")
              return (
                <li key={s.employeeId} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-text-primary">{s.fullName}</span>
                    <span className="block text-xs text-text-secondary">{formatVND(s.monthlySalary)}{extra !== 0 && <> {formatSignedVND(extra)} = <b className="text-text-primary">{formatVND(s.monthlySalary + extra)}</b></>}</span>
                  </span>
                  <label>
                    <span className="sr-only">Thưởng hoặc trừ cho {s.fullName}</span>
                    <input inputMode="numeric" placeholder="Thưởng / trừ" value={bonus[s.employeeId] ?? ""} onChange={(e) => setBonus({ ...bonus, [s.employeeId]: digits(e.target.value, true) })}
                      className="min-h-11 w-36 rounded-[10px] border border-border px-3 text-right text-sm tabular-nums" />
                  </label>
                </li>
              )
            })}
          </ul>
        </div>
      </Modal>
    </PageFrame>
  )
}
