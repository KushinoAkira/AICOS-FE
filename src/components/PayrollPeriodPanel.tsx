import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { BankAccountForm } from "./BankAccountForm"
import { Banner, Button, Card, DataTable, Field, KpiCard, Modal, QueryBoundary, StatusPill, type Column } from "./ui"
import { useToast } from "../context/ToastContext"
import { payrollErrorMessage, payrollPeriodApi, type BankAccount, type PayoutMethod, type PayrollPeriod, type PayrollPeriodLine } from "../lib/api/manage"
import { formatDate, formatDateTime, formatSignedVND, formatVND } from "../lib/format"
import { finalizeBlocker, periodOf } from "../lib/payrollPeriod"

const STATUS: Record<string, { text: string; tone: "success" | "pending" | "danger" | "neutral" }> = {
  Finalized: { text: "Đã chốt, chưa trả hết", tone: "pending" },
  Paid: { text: "Đã trả xong", tone: "success" },
  Reopened: { text: "Đã mở lại để sửa", tone: "danger" },
}
const METHOD_TEXT: Record<string, string> = { BankTransfer: "Chuyển khoản", Cash: "Tiền mặt" }
const REFERENCE_MAX = 100
const REASON_MAX = 500

const owed = (l: PayrollPeriodLine) => !l.isPaid && l.netPay > 0
const hasAccount = (l: PayrollPeriodLine) => !!(l.bankName && l.bankAccountNumber && l.bankAccountName)

/**
 * Paying staff for the month (after UC-32): finalize the period (the pay freezes and its shifts and adjustments lock), download the bank
 * transfer list, record who was paid and how, or reopen it to correct something while nobody is paid yet.
 */
export function PayrollPeriodPanel({ range, unreviewed }: { range: { from: string; to: string }; unreviewed: number }) {
  const qc = useQueryClient()
  const { showToast } = useToast()
  const periods = useQuery({ queryKey: ["payroll-periods"], queryFn: payrollPeriodApi.list })
  const current = periods.data ? periodOf(periods.data, range) : null
  const detail = useQuery({ queryKey: ["payroll-periods", current?.id], queryFn: () => payrollPeriodApi.get(current!.id), enabled: !!current && current.status !== "Reopened" })
  const [confirming, setConfirming] = useState(false)
  const [paying, setPaying] = useState<{ ids: string[]; method: PayoutMethod; reference: string } | null>(null)
  const [reopening, setReopening] = useState(false)
  const [reason, setReason] = useState("")
  const [account, setAccount] = useState<PayrollPeriodLine | null>(null)
  const [error, setError] = useState<string | null>(null)

  const settle = (p: PayrollPeriod) => {
    qc.setQueryData(["payroll-periods", p.id], p)
    void qc.invalidateQueries({ queryKey: ["payroll-periods"] })
    void qc.invalidateQueries({ queryKey: ["payroll"] })
  }
  const fail = (e: Error & { code?: string }) => {
    setError(payrollErrorMessage(e))
    if (e.code === "payroll.already_paid" || e.code === "payroll.period_reopened" || e.code === "payroll.period_paid") void qc.invalidateQueries({ queryKey: ["payroll-periods"] })
  }
  const finalize = useMutation({
    mutationFn: () => payrollPeriodApi.finalize(range),
    onSuccess: (p) => { settle(p); setConfirming(false); showToast(`Đã chốt kỳ lương: ${formatVND(p.totalNet)} cho ${p.employees} người.`, "success") },
    onError: fail,
  })
  const pay = useMutation({
    mutationFn: (v: { id: string; ids: string[]; method: PayoutMethod; reference: string }) =>
      payrollPeriodApi.recordPayout(v.id, { employeeIds: v.ids, method: v.method, reference: v.reference.trim() || null }),
    onSuccess: (p, v) => { settle(p); setPaying(null); showToast(p.status === "Paid" ? "Đã trả xong lương kỳ này." : `Đã ghi nhận trả lương cho ${v.ids.length} người.`, "success") },
    onError: fail,
  })
  const reopen = useMutation({
    mutationFn: (id: string) => payrollPeriodApi.reopen(id, reason.trim()),
    onSuccess: (p) => { settle(p); setReopening(false); showToast("Đã mở lại kỳ lương. Sửa xong thì chốt lại.", "success") },
    onError: fail,
  })
  const transferList = useMutation({ mutationFn: (p: PayrollPeriod) => payrollPeriodApi.bankTransfer(p), onError: (e) => showToast(payrollErrorMessage(e), "error") })
  const saveAccount = useMutation({
    mutationFn: (v: { employeeId: string; b: BankAccount }) => payrollPeriodApi.setBankAccount(v.employeeId, v.b),
    onSuccess: () => { setAccount(null); showToast("Đã lưu tài khoản nhận lương. Kỳ đã chốt vẫn giữ thông tin cũ: mở lại và chốt lại, hoặc trả tiền mặt.", "success") },
    onError: (e) => setError(payrollErrorMessage(e)),
  })

  const blocker = finalizeBlocker(range, unreviewed)
  const startFinalize = () => { setError(null); setConfirming(true) }

  function submitPay(p: PayrollPeriod) {
    if (!paying) return
    if (!paying.ids.length) return setError("Chọn ít nhất một người đã được trả.")
    if (paying.method === "BankTransfer" && !paying.reference.trim()) return setError("Nhập mã giao dịch chuyển khoản.")
    if (paying.reference.trim().length > REFERENCE_MAX) return setError(`Mã giao dịch tối đa ${REFERENCE_MAX} ký tự.`)
    setError(null)
    pay.mutate({ id: p.id, ...paying })
  }
  function submitReopen(p: PayrollPeriod) {
    const r = reason.trim()
    if (r.length < 3) return setError("Nhập lý do mở lại (ít nhất 3 ký tự).")
    if (r.length > REASON_MAX) return setError(`Lý do tối đa ${REASON_MAX} ký tự.`)
    setError(null)
    reopen.mutate(p.id)
  }

  const finalizeButton = (label: string) => (
    <div className="flex flex-col items-end gap-1">
      <Button disabled={!!blocker} disabledReason={blocker ?? undefined} onClick={startFinalize}>{label}</Button>
      {blocker && <span className="text-xs text-text-secondary">{blocker}</span>}
    </div>
  )

  return (
    <section aria-label="Kỳ lương" className="mb-8">
      <QueryBoundary query={periods}>
        {() => !current || current.status === "Reopened" ? (
          <Card>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="font-serif text-lg text-text-primary">Kỳ lương {formatDate(range.from)} - {formatDate(range.to)}</h2>
                <p className="mt-1 text-sm text-text-secondary">
                  {current
                    ? <>Kỳ lương đã mở lại lúc {formatDateTime(current.reopenedAtUtc ?? current.finalizedAtUtc)}. Lý do: {current.reopenReason}. Sửa xong thì chốt lại để trả lương.</>
                    : <>Chưa chốt. Chốt kỳ lương để cố định số tiền, khóa chấm công và điều chỉnh của các ngày này, rồi trả lương.</>}
                </p>
              </div>
              {finalizeButton(current ? "Chốt lại kỳ lương" : "Chốt kỳ lương")}
            </div>
          </Card>
        ) : (
          <QueryBoundary query={detail}>
            {(p) => {
              const lines = p.lines ?? []
              const toPay = lines.filter(owed)
              const noAccount = p.warnings.filter((w) => w.code === "NoBankAccount")
              const deductions = p.warnings.filter((w) => w.code === "DeductionsExceedPay")
              const columns: Column<PayrollPeriodLine>[] = [
                { key: "n", header: "Nhân sự", sort: (l) => l.employeeName, render: (l) => <span className="font-medium text-text-primary">{l.employeeName}</span> },
                { key: "g", header: "Tổng", render: (l) => formatSignedVND(l.grossPay) },
                { key: "t", header: "Thực trả", sort: (l) => l.netPay, render: (l) => <b className="text-text-primary">{formatVND(l.netPay)}</b> },
                {
                  key: "b", header: "Tài khoản nhận", render: (l) => hasAccount(l)
                    ? <span>{l.bankName} · {l.bankAccountNumber}<br /><span className="text-xs text-text-secondary">{l.bankAccountName}</span></span>
                    : owed(l) ? <button className="text-sm text-clay hover:underline" onClick={() => { setError(null); setAccount(l) }}>Thêm tài khoản</button> : <span className="text-text-secondary">-</span>,
                },
                {
                  key: "s", header: "Trạng thái", render: (l) => l.isPaid
                    ? <span><StatusPill tone="success">Đã trả</StatusPill><br /><span className="text-xs text-text-secondary">{METHOD_TEXT[l.payoutMethod ?? ""] ?? ""}{l.payoutReference ? ` · ${l.payoutReference}` : ""}{l.paidAtUtc ? ` · ${formatDateTime(l.paidAtUtc)}` : ""}</span></span>
                    : l.netPay > 0 ? <StatusPill tone="pending">Chưa trả</StatusPill> : <StatusPill tone="neutral">Không có khoản trả</StatusPill>,
                },
              ]
              return (
                <>
                  <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h2 className="font-serif text-lg text-text-primary">Kỳ lương {formatDate(p.from)} - {formatDate(p.to)} <StatusPill tone={STATUS[p.status]?.tone ?? "neutral"}>{STATUS[p.status]?.text ?? p.status}</StatusPill></h2>
                      <p className="mt-1 text-sm text-text-secondary">Chốt lúc {formatDateTime(p.finalizedAtUtc)}. Chấm công và điều chỉnh của các ngày này đã khóa.</p>
                    </div>
                    {p.status === "Finalized" && (
                      <div className="flex flex-wrap gap-2">
                        <Button variant="secondary" disabled={p.paid > 0} disabledReason="Đã có người được trả nên không mở lại được. Sửa bằng điều chỉnh ở kỳ sau." onClick={() => { setReason(""); setError(null); setReopening(true) }}>Mở lại kỳ</Button>
                        <Button variant="secondary" loading={transferList.isPending} disabled={!toPay.some(hasAccount)} disabledReason="Không còn ai nhận chuyển khoản." onClick={() => transferList.mutate(p)}>Tải danh sách chuyển khoản</Button>
                        <Button disabled={!toPay.length} onClick={() => { setError(null); setPaying({ ids: toPay.filter(hasAccount).map((l) => l.employeeId), method: "BankTransfer", reference: "" }) }}>Ghi nhận đã trả</Button>
                      </div>
                    )}
                  </div>
                  <div className="mb-4 grid grid-cols-2 gap-4 xl:grid-cols-4">
                    <KpiCard label="Phải trả" value={formatVND(p.totalNet)} />
                    <KpiCard label="Đã trả" value={formatVND(p.totalPaid)} />
                    <KpiCard label="Còn lại" value={formatVND(p.totalNet - p.totalPaid)} tone={p.totalNet > p.totalPaid ? "warn" : "neutral"} hint={p.totalNet > p.totalPaid ? `${toPay.length} người chưa trả` : undefined} />
                    <KpiCard label="Đã trả / nhân sự" value={`${p.paid}/${p.employees}`} />
                  </div>
                  {noAccount.length > 0 && <div className="mb-3"><Banner tone="warn">Chưa có tài khoản nhận lương: {noAccount.map((w) => w.employeeName).join(", ")}. Trả tiền mặt, hoặc thêm tài khoản rồi mở lại và chốt lại kỳ lương để có trong danh sách chuyển khoản.</Banner></div>}
                  {deductions.length > 0 && <div className="mb-3"><Banner tone="warn">Khoản trừ lớn hơn lương nên không có gì để trả: {deductions.map((w) => w.employeeName).join(", ")}. Phần trừ còn lại không tự chuyển sang kỳ sau.</Banner></div>}
                  <DataTable rows={lines} rowKey={(l) => l.employeeId} columns={columns} emptyTitle="Kỳ này không có ai có công" />

                  <Modal
                    open={!!paying}
                    title="Ghi nhận đã trả lương"
                    onClose={() => setPaying(null)}
                    footer={<><Button variant="secondary" onClick={() => setPaying(null)}>Hủy</Button><Button loading={pay.isPending} onClick={() => submitPay(p)}>Ghi nhận</Button></>}
                  >
                    {paying && (
                      <div className="space-y-4">
                        {error && <Banner>{error}</Banner>}
                        <fieldset>
                          <legend className="mb-1.5 text-sm font-medium text-text-primary">Hình thức</legend>
                          <div className="flex gap-4 text-sm">
                            {(["BankTransfer", "Cash"] as const).map((m) => (
                              <label key={m} className="flex items-center gap-2">
                                <input type="radio" name="payout-method" checked={paying.method === m}
                                  onChange={() => setPaying({ ...paying, method: m, ids: m === "BankTransfer" ? paying.ids.filter((id) => hasAccount(lines.find((l) => l.employeeId === id)!)) : paying.ids })} />
                                {METHOD_TEXT[m]}
                              </label>
                            ))}
                          </div>
                        </fieldset>
                        <fieldset>
                          <legend className="mb-1.5 text-sm font-medium text-text-primary">Người đã được trả</legend>
                          <ul className="max-h-64 space-y-1 overflow-y-auto">
                            {toPay.map((l) => {
                              const off = paying.method === "BankTransfer" && !hasAccount(l)
                              return (
                                <li key={l.employeeId}>
                                  <label className={`flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-sm ${off ? "text-text-secondary" : "hover:bg-bg-warm"}`}>
                                    <span className="flex items-center gap-2">
                                      <input type="checkbox" disabled={off} checked={paying.ids.includes(l.employeeId)}
                                        onChange={(e) => setPaying({ ...paying, ids: e.target.checked ? [...paying.ids, l.employeeId] : paying.ids.filter((x) => x !== l.employeeId) })} />
                                      {l.employeeName}{off && " (chưa có tài khoản)"}
                                    </span>
                                    <b>{formatVND(l.netPay)}</b>
                                  </label>
                                </li>
                              )
                            })}
                          </ul>
                          <p className="mt-2 text-right text-sm text-text-secondary">Tổng: <b className="text-text-primary">{formatVND(toPay.filter((l) => paying.ids.includes(l.employeeId)).reduce((s, l) => s + l.netPay, 0))}</b></p>
                        </fieldset>
                        <Field label={paying.method === "BankTransfer" ? "Mã giao dịch chuyển khoản (bắt buộc)" : "Ghi chú / số phiếu chi"} value={paying.reference} maxLength={REFERENCE_MAX} onChange={(e) => setPaying({ ...paying, reference: e.target.value })} />
                        <p className="text-xs text-text-secondary">Chỉ ghi nhận người đã thực sự nhận tiền. Chuyển khoản lỗi thì bỏ chọn người đó và ghi nhận sau.</p>
                      </div>
                    )}
                  </Modal>

                  <Modal
                    open={reopening}
                    title="Mở lại kỳ lương"
                    onClose={() => setReopening(false)}
                    footer={<><Button variant="secondary" onClick={() => setReopening(false)}>Hủy</Button><Button loading={reopen.isPending} onClick={() => submitReopen(p)}>Mở lại</Button></>}
                  >
                    <div className="space-y-4">
                      {error && <Banner>{error}</Banner>}
                      <p className="text-sm text-text-secondary">Mở lại sẽ mở khóa chấm công và điều chỉnh của kỳ này. Chưa trả được lương cho đến khi chốt lại.</p>
                      <Field label="Lý do mở lại (bắt buộc)" value={reason} maxLength={REASON_MAX} onChange={(e) => setReason(e.target.value)} />
                    </div>
                  </Modal>
                </>
              )
            }}
          </QueryBoundary>
        )}
      </QueryBoundary>

      <Modal
        open={confirming}
        title="Chốt kỳ lương"
        onClose={() => setConfirming(false)}
        footer={<><Button variant="secondary" onClick={() => setConfirming(false)}>Hủy</Button><Button loading={finalize.isPending} onClick={() => finalize.mutate()}>Chốt kỳ lương</Button></>}
      >
        <div className="space-y-3 text-sm text-text-secondary">
          {error && <Banner>{error}</Banner>}
          <p>Chốt lương từ <b className="text-text-primary">{formatDate(range.from)}</b> đến <b className="text-text-primary">{formatDate(range.to)}</b>.</p>
          <p>Sau khi chốt, số tiền được cố định; chấm công và điều chỉnh của các ngày này bị khóa. Tài khoản nhận lương được lấy theo thông tin hiện tại của từng người.</p>
        </div>
      </Modal>

      <Modal open={!!account} title={`Tài khoản nhận lương · ${account?.employeeName ?? ""}`} onClose={() => setAccount(null)}>
        {account && (
          <div className="space-y-3">
            <p className="text-xs text-text-secondary">Kỳ đã chốt giữ thông tin lúc chốt. Sau khi lưu, mở lại và chốt lại kỳ lương để người này có trong danh sách chuyển khoản, hoặc trả tiền mặt.</p>
            <BankAccountForm saving={saveAccount.isPending} error={error} onCancel={() => setAccount(null)} onSubmit={(b) => saveAccount.mutate({ employeeId: account.employeeId, b })} />
          </div>
        )}
      </Modal>
    </section>
  )
}
