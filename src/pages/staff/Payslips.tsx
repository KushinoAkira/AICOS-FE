import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { Page } from "../../App"
import { BankAccountForm } from "../../components/BankAccountForm"
import { PageFrame } from "../../components/PageFrame"
import { Button, Card, DataTable, KpiCard, Modal, QueryBoundary, StatusPill, type Column } from "../../components/ui"
import { useToast } from "../../context/ToastContext"
import { myPayApi, payrollErrorMessage, type BankAccount, type Payslip } from "../../lib/api/manage"
import { formatDate, formatDateTime, formatSignedVND, formatVND } from "../../lib/format"

const METHOD_TEXT: Record<string, string> = { BankTransfer: "Chuyển khoản", Cash: "Tiền mặt" }
const masked = (n: string | null) => (n ? `••••${n.slice(-4)}` : "")

/** The signed-in employee's own pay, one row per finalized payroll period, and the account their salary is transferred to. */
export default function MyPayslips({ navigate }: { navigate: (p: Page) => void }) {
  const qc = useQueryClient()
  const { showToast } = useToast()
  const slips = useQuery({ queryKey: ["my-payslips"], queryFn: myPayApi.payslips })
  const account = useQuery({ queryKey: ["my-bank-account"], queryFn: myPayApi.bankAccount, retry: false })
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState<Payslip | null>(null)
  const save = useMutation({
    mutationFn: (b: BankAccount) => myPayApi.setBankAccount(b),
    onSuccess: (_r, b) => {
      qc.setQueryData(["my-bank-account"], b)
      void qc.invalidateQueries({ queryKey: ["my-bank-account"] })
      setEditing(false)
      showToast(b.accountNumber ? "Đã lưu tài khoản nhận lương. Áp dụng từ kỳ lương chốt sau." : "Đã xóa tài khoản nhận lương.", "success")
    },
    onError: (e) => setError(payrollErrorMessage(e)),
  })

  const columns: Column<Payslip>[] = [
    { key: "p", header: "Kỳ lương", sort: (s) => s.from, render: (s) => <button className="font-medium text-clay hover:underline" onClick={() => setOpen(s)}>{formatDate(s.from)} - {formatDate(s.to)}</button> },
    { key: "d", header: "Ngày công", render: (s) => s.workedDays },
    { key: "h", header: "Giờ", render: (s) => (s.regularHours + s.overtimeHours + s.replacementHours).toFixed(1) },
    { key: "a", header: "Điều chỉnh", render: (s) => formatSignedVND(s.adjustments) },
    { key: "n", header: "Thực nhận", sort: (s) => s.netPay, render: (s) => <b className="text-text-primary">{formatVND(s.netPay)}</b> },
    {
      key: "s", header: "Trạng thái", render: (s) => s.isPaid
        ? <span><StatusPill tone="success">Đã nhận</StatusPill><br /><span className="text-xs text-text-secondary">{METHOD_TEXT[s.payoutMethod ?? ""] ?? ""}{s.paidAtUtc ? ` · ${formatDateTime(s.paidAtUtc)}` : ""}</span></span>
        : s.netPay > 0 ? <StatusPill tone="pending">Chưa trả</StatusPill> : <StatusPill tone="neutral">Không có khoản trả</StatusPill>,
    },
  ]

  const acc = account.data
  return (
    <PageFrame page="my-payslips" navigate={navigate} uc="UC-32" title="Phiếu lương" subtitle="Lương của bạn theo từng kỳ quản lý đã chốt.">
      <div className="mb-8 grid gap-4 lg:grid-cols-[1fr_2fr]">
        <Card>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-text-secondary">Tài khoản nhận lương</p>
              {account.isPending ? <p className="mt-2 text-sm text-text-secondary">Đang tải…</p>
                : acc?.accountNumber
                  ? <p className="mt-2 text-text-primary"><b>{acc.bankName}</b> · {masked(acc.accountNumber)}<br /><span className="text-sm text-text-secondary">{acc.accountName}</span></p>
                  : <p className="mt-2 text-sm text-state-warning">Chưa có. Quản lý sẽ phải trả bạn bằng tiền mặt.</p>}
            </div>
            <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => { setError(null); setEditing(true) }}>{acc?.accountNumber ? "Sửa" : "Thêm"}</Button>
          </div>
        </Card>
        <QueryBoundary query={slips}>
          {(rows) => {
            const unpaid = rows.filter((s) => !s.isPaid && s.netPay > 0)
            const last = rows[0]
            return (
              <div className="grid grid-cols-2 gap-4">
                <KpiCard label="Kỳ gần nhất" value={last ? formatVND(last.netPay) : "-"} hint={last ? `${formatDate(last.from)} - ${formatDate(last.to)}` : "Chưa có kỳ lương nào được chốt"} />
                <KpiCard label="Chưa nhận" value={formatVND(unpaid.reduce((s, x) => s + x.netPay, 0))} tone={unpaid.length ? "warn" : "neutral"} hint={unpaid.length ? `${unpaid.length} kỳ` : undefined} />
              </div>
            )
          }}
        </QueryBoundary>
      </div>

      <QueryBoundary query={slips}>
        {(rows) => <DataTable rows={rows} rowKey={(s) => s.periodId} columns={columns} emptyTitle="Chưa có phiếu lương" />}
      </QueryBoundary>

      <Modal open={editing} title="Tài khoản nhận lương" onClose={() => setEditing(false)}>
        <div className="space-y-3">
          <p className="text-xs text-text-secondary">Tài khoản được lấy khi quản lý chốt kỳ lương; kỳ đã chốt giữ thông tin cũ. Để trống cả ba ô để xóa.</p>
          <BankAccountForm initial={acc} saving={save.isPending} error={error} onCancel={() => setEditing(false)} onSubmit={(b) => save.mutate(b)} />
        </div>
      </Modal>

      <Modal open={!!open} title={open ? `Phiếu lương ${formatDate(open.from)} - ${formatDate(open.to)}` : ""} onClose={() => setOpen(null)}>
        {open && (
          <dl className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-2 text-sm">
            <dt className="text-text-secondary">Ngày công</dt><dd className="text-right">{open.workedDays}</dd>
            <dt className="text-text-secondary">Giờ thường · tăng ca · ca thay</dt><dd className="text-right">{open.regularHours.toFixed(1)} · {open.overtimeHours.toFixed(1)} · {open.replacementHours.toFixed(1)}</dd>
            <dt className="text-text-secondary">Lương cơ bản</dt><dd className="text-right">{formatVND(open.basePay)}</dd>
            <dt className="text-text-secondary">Tăng ca</dt><dd className="text-right">{formatVND(open.overtimePay)}</dd>
            <dt className="text-text-secondary">Ca thay</dt><dd className="text-right">{formatVND(open.replacementPay)}</dd>
            <dt className="text-text-secondary">Điều chỉnh</dt><dd className="text-right">{formatSignedVND(open.adjustments)}</dd>
            <dt className="border-t border-border pt-2 font-medium text-text-primary">Thực nhận</dt><dd className="border-t border-border pt-2 text-right font-serif text-xl">{formatVND(open.netPay)}</dd>
            {open.grossPay < 0 && <dd className="col-span-2 text-xs text-state-warning">Khoản trừ lớn hơn lương kỳ này nên không có khoản trả.</dd>}
            <dt className="text-text-secondary">Trạng thái</dt>
            <dd className="text-right">{open.isPaid ? `Đã nhận (${METHOD_TEXT[open.payoutMethod ?? ""] ?? ""}${open.bankAccountHint && open.payoutMethod === "BankTransfer" ? ` vào ${open.bankName} ${open.bankAccountHint}` : ""})` : open.netPay > 0 ? "Chưa trả" : "-"}</dd>
            {open.payoutReference && <><dt className="text-text-secondary">Mã giao dịch</dt><dd className="text-right">{open.payoutReference}</dd></>}
          </dl>
        )}
      </Modal>
    </PageFrame>
  )
}
