import { useEffect, useRef, useState, type ReactNode } from "react"
import { useMutation } from "@tanstack/react-query"
import { BankAccountForm } from "../BankAccountForm"
import { Banner, Button, Field, Modal } from "../ui"
import { useToast } from "../../context/ToastContext"
import { payrollErrorMessage, payrollPeriodApi, type BankAccount, type PayoutMethod, type PayrollPeriod, type PayrollPeriodLine } from "../../lib/api/manage"
import { formatDate, formatDateTime, formatSignedVND, formatVND } from "../../lib/format"
import { monthLabel, type MonthPayState } from "../../lib/payrollPeriod"

/** One person of the month, before or after the month is finalized. */
export interface PayRow {
  id: string
  name: string
  /** What the pay is made of, in a few words: "22 ngày công · 132 giờ", "Lương tháng". */
  meta: string
  base: number
  /** Overtime and replacement shifts (staff only). */
  extra: number
  adjustments: number
  gross: number
  net: number
  /** Only once the month is finalized. */
  line?: PayrollPeriodLine
  /** Shifts still waiting for review (before finalizing). */
  waiting?: number
  /** Opens the person's own page (the staff detail). */
  onOpen?: () => void
}

export interface MonthTile { month: string; state: MonthPayState }

const STATE_TEXT: Record<MonthPayState, string> = { open: "Chưa chốt", finalized: "Đang trả", paid: "Đã trả xong" }
const STATE_DOT: Record<MonthPayState, string> = { open: "border border-current bg-transparent", finalized: "bg-state-warning", paid: "bg-olive" }
const METHOD_TEXT: Record<PayoutMethod, string> = { BankTransfer: "Chuyển khoản", Cash: "Tiền mặt" }
const REFERENCE_MAX = 100
const REASON_MAX = 500

const hasAccount = (l: PayrollPeriodLine) => !!(l.bankName && l.bankAccountNumber && l.bankAccountName)
const owed = (l: PayrollPeriodLine) => !l.isPaid && l.netPay > 0
const initials = (name: string) => name.trim().split(/\s+/).slice(-1)[0]?.charAt(0).toUpperCase() ?? "?"

/**
 * The month of pay for one payer: a strip of recent months with where each stands, the three steps of paying (count, finalize, pay)
 * with the one thing to do next, and the people of the month with what they get and whether they were paid. Paying, reopening, the bank
 * transfer list and salary accounts go through the payroll period endpoints, the same for staff and for managers.
 */
export function PayrollBoard({
  months, month, onMonth, period, reopened, rows, readOnly, blocker, finalizeLabel = "Chốt lương tháng", onFinalize, onChanged, who, notice, emptyText, showExtra = true,
}: {
  months: MonthTile[]
  month: string
  onMonth: (m: string) => void
  /** The finalized period of the month with its lines, or null while it is not finalized (or reopened). */
  period: PayrollPeriod | null
  /** The latest reopened period of the month, to say why it was reopened. */
  reopened?: PayrollPeriod | null
  rows: PayRow[]
  /** Why this viewer only reads (the brand admin on the staff payroll). */
  readOnly?: string
  /** Why the month cannot be finalized yet. */
  blocker: string | null
  finalizeLabel?: string
  onFinalize: () => void
  onChanged: (p: PayrollPeriod) => void
  /** "nhân viên" or "quản lý". */
  who: string
  /** Shown above the people (a warning about the month). */
  notice?: ReactNode
  emptyText: string
  /** Show the overtime column (staff); managers only have a salary and a bonus or deduction. */
  showExtra?: boolean
}) {
  const { showToast } = useToast()
  const [paying, setPaying] = useState<{ ids: string[]; method: PayoutMethod; reference: string } | null>(null)
  const [reopening, setReopening] = useState(false)
  const [reason, setReason] = useState("")
  const [account, setAccount] = useState<PayrollPeriodLine | null>(null)
  const [error, setError] = useState<string | null>(null)
  const activeTile = useRef<HTMLButtonElement>(null)
  useEffect(() => { activeTile.current?.scrollIntoView?.({ block: "nearest", inline: "center" }) }, [month])

  const fail = (e: Error & { code?: string }) => setError(payrollErrorMessage(e))
  const pay = useMutation({
    mutationFn: (v: { id: string; ids: string[]; method: PayoutMethod; reference: string }) =>
      payrollPeriodApi.recordPayout(v.id, { employeeIds: v.ids, method: v.method, reference: v.reference.trim() || null }),
    onSuccess: (p, v) => { onChanged(p); setPaying(null); showToast(p.status === "Paid" ? `Đã trả xong lương ${monthLabel(month).toLowerCase()}.` : `Đã ghi nhận trả lương cho ${v.ids.length} người.`, "success") },
    onError: fail,
  })
  const reopen = useMutation({
    mutationFn: (id: string) => payrollPeriodApi.reopen(id, reason.trim()),
    onSuccess: (p) => { onChanged(p); setReopening(false); showToast("Đã mở lại để sửa. Sửa xong thì chốt lại.", "success") },
    onError: fail,
  })
  const transferList = useMutation({ mutationFn: (p: PayrollPeriod) => payrollPeriodApi.bankTransfer(p), onError: (e) => showToast(payrollErrorMessage(e), "error") })
  const saveAccount = useMutation({
    mutationFn: (v: { employeeId: string; b: BankAccount }) => payrollPeriodApi.setBankAccount(v.employeeId, v.b),
    onSuccess: () => { setAccount(null); showToast("Đã lưu tài khoản. Tháng đã chốt vẫn giữ thông tin cũ: trả tiền mặt, hoặc mở lại rồi chốt lại.", "success") },
    onError: fail,
  })

  const lines = period?.lines ?? []
  const toPay = lines.filter(owed)
  const step: 1 | 2 | 3 = !period ? (blocker ? 1 : 2) : 3
  const total = period ? period.totalNet : rows.reduce((s, r) => s + Math.max(0, r.net), 0)
  const paidAmount = period?.totalPaid ?? 0
  const share = total > 0 ? Math.round((paidAmount / total) * 100) : 0

  function startPay(ids?: string[]) {
    setError(null)
    const method: PayoutMethod = ids && ids.length === 1 && !hasAccount(lines.find((l) => l.employeeId === ids[0])!) ? "Cash" : "BankTransfer"
    setPaying({ ids: ids ?? toPay.filter(hasAccount).map((l) => l.employeeId), method, reference: "" })
  }
  function submitPay() {
    if (!paying || !period) return
    if (!paying.ids.length) return setError("Chọn ít nhất một người đã nhận tiền.")
    if (paying.method === "BankTransfer" && !paying.reference.trim()) return setError("Nhập mã giao dịch chuyển khoản.")
    if (paying.reference.trim().length > REFERENCE_MAX) return setError(`Mã giao dịch tối đa ${REFERENCE_MAX} ký tự.`)
    setError(null)
    pay.mutate({ id: period.id, ...paying })
  }
  function submitReopen() {
    if (!period) return
    const r = reason.trim()
    if (r.length < 3) return setError("Nhập lý do mở lại (ít nhất 3 ký tự).")
    if (r.length > REASON_MAX) return setError(`Lý do tối đa ${REASON_MAX} ký tự.`)
    setError(null)
    reopen.mutate(period.id)
  }

  const steps = [
    { n: 1, title: "Tính lương", text: period ? "Đã khóa số liệu" : blocker ?? "Số liệu đã đủ" },
    { n: 2, title: "Chốt", text: period ? `Lúc ${formatDateTime(period.finalizedAtUtc)}` : "Cố định số tiền" },
    { n: 3, title: "Trả", text: period ? `${period.paid}/${period.employees} người đã nhận` : "Chuyển khoản hoặc tiền mặt" },
  ]

  return (
    <div className="space-y-6">
      <nav aria-label="Chọn tháng" className="-mx-1 overflow-x-auto px-1 pb-1">
        <ol className="flex min-w-max gap-2">
          {months.map((t) => {
            const active = t.month === month
            return (
              <li key={t.month}>
                <button
                  ref={active ? activeTile : undefined} type="button" aria-current={active ? "true" : undefined} onClick={() => onMonth(t.month)}
                  className={`flex min-h-14 min-w-[7.5rem] flex-col items-start justify-center rounded-[14px] border px-4 py-2 text-left transition-colors ${active ? "border-espresso bg-espresso text-bg-base" : "border-border bg-surface text-text-primary hover:border-clay"}`}
                >
                  <span className="font-serif text-base leading-tight">{monthLabel(t.month)}</span>
                  <span className={`mt-1 flex items-center gap-1.5 text-xs ${active ? "text-bg-base/80" : "text-text-secondary"}`}>
                    <span aria-hidden className={`h-2 w-2 rounded-full ${STATE_DOT[t.state]}`} />
                    {STATE_TEXT[t.state]}
                  </span>
                </button>
              </li>
            )
          })}
        </ol>
      </nav>

      <section aria-label={`Lương ${monthLabel(month).toLowerCase()}`} className="overflow-hidden rounded-[20px] border border-border bg-surface">
        <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="text-sm text-text-secondary">{period ? (period.status === "Paid" ? "Đã trả" : "Phải trả") : "Tạm tính"} · {monthLabel(month)}</p>
            <p className="mt-1 font-serif text-4xl tabular-nums text-text-primary sm:text-5xl">{formatVND(total)}</p>
            <p className="mt-2 text-sm text-text-secondary">
              {rows.length} {who}
              {period && period.status !== "Paid" && <> · đã trả <b className="font-medium text-text-primary">{formatVND(paidAmount)}</b>, còn <b className="font-medium text-text-primary">{formatVND(total - paidAmount)}</b></>}
            </p>
            {period && (
              <div className="mt-4 h-2 max-w-md overflow-hidden rounded-full bg-sand" role="progressbar" aria-label="Đã trả" aria-valuemin={0} aria-valuemax={100} aria-valuenow={share}>
                <div className={`h-full rounded-full ${period.status === "Paid" ? "bg-olive" : "bg-terracotta"}`} style={{ width: `${share}%` }} />
              </div>
            )}
          </div>
          {!readOnly && (
            <div className="flex flex-wrap gap-2 lg:justify-end">
              {!period && (
                <div className="flex flex-col items-start gap-1 lg:items-end">
                  <Button className="min-h-11" disabled={!!blocker || rows.length === 0} disabledReason={blocker ?? `Tháng này chưa có ${who} nào có lương.`} onClick={onFinalize}>{reopened ? "Chốt lại" : finalizeLabel}</Button>
                </div>
              )}
              {period?.status === "Finalized" && (
                <>
                  <Button variant="secondary" className="min-h-11" loading={transferList.isPending} disabled={!toPay.some(hasAccount)} disabledReason="Không còn ai nhận chuyển khoản." onClick={() => transferList.mutate(period)}>Tải danh sách chuyển khoản</Button>
                  <Button className="min-h-11" disabled={!toPay.length} onClick={() => startPay()}>Ghi nhận đã trả</Button>
                </>
              )}
            </div>
          )}
        </div>

        <ol className="grid grid-cols-3 border-t border-border bg-bg-warm/60" aria-label="Các bước trả lương">
          {steps.map((s) => {
            const done = s.n < step || (s.n === 3 && period?.status === "Paid")
            const now = s.n === step && !done
            return (
              <li key={s.n} aria-current={now ? "step" : undefined} className={`flex flex-col items-start gap-2 px-4 py-4 sm:flex-row sm:items-center sm:gap-3 sm:px-8 ${s.n > 1 ? "border-l border-border" : ""}`}>
                <span aria-hidden className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-semibold ${done ? "bg-olive text-white" : now ? "bg-espresso text-bg-base" : "border border-border bg-surface text-text-secondary"}`}>{done ? "✓" : s.n}</span>
                <span className="min-w-0">
                  <span className={`block text-sm font-medium ${now || done ? "text-text-primary" : "text-text-secondary"}`}>{s.title}</span>
                  <span className="hidden truncate text-xs text-text-secondary sm:block">{s.text}</span>
                </span>
              </li>
            )
          })}
        </ol>
      </section>

      {readOnly && <p className="rounded-[12px] border border-border bg-bg-warm px-4 py-3 text-sm text-text-secondary">{readOnly}</p>}
      {reopened && !period && <Banner tone="warn">Đã mở lại lúc {formatDateTime(reopened.reopenedAtUtc ?? reopened.finalizedAtUtc)}. Lý do: {reopened.reopenReason}. Sửa xong thì chốt lại để trả lương.</Banner>}
      {notice}
      {period && period.warnings.some((w) => w.code === "DeductionsExceedPay") && (
        <Banner tone="warn">Khoản trừ lớn hơn lương nên không có gì để trả: {period.warnings.filter((w) => w.code === "DeductionsExceedPay").map((w) => w.employeeName).join(", ")}.</Banner>
      )}

      <section aria-label={`Danh sách ${who}`}>
        {rows.length === 0 ? (
          <p className="rounded-[16px] border border-dashed border-border p-8 text-center text-sm text-text-secondary">{emptyText}</p>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-[16px] border border-border bg-surface">
            {rows.map((r) => {
              const l = r.line
              return (
                <li key={r.id} className="grid gap-x-6 gap-y-3 px-5 py-4 sm:px-6 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1.3fr)_auto] md:items-center">
                  <div className="flex min-w-0 items-center gap-3">
                    <span aria-hidden className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sand font-serif text-base text-clay">{initials(r.name)}</span>
                    <div className="min-w-0">
                      {r.onOpen
                        ? <button type="button" onClick={r.onOpen} className="block max-w-full truncate text-left font-medium text-text-primary hover:text-clay hover:underline">{r.name}</button>
                        : <p className="truncate font-medium text-text-primary">{r.name}</p>}
                      <p className="truncate text-xs text-text-secondary">{r.meta}{r.waiting ? <span className="text-state-warning"> · {r.waiting} ca chờ duyệt</span> : null}</p>
                    </div>
                  </div>

                  <dl className={`grid gap-3 text-xs text-text-secondary md:text-right ${showExtra ? "grid-cols-3" : "grid-cols-2"}`}>
                    <div><dt>Lương</dt><dd className="mt-0.5 text-sm tabular-nums text-text-primary">{formatVND(r.base)}</dd></div>
                    {showExtra && <div><dt>Tăng ca</dt><dd className="mt-0.5 text-sm tabular-nums text-text-primary">{r.extra ? formatVND(r.extra) : "—"}</dd></div>}
                    <div><dt>Thưởng/trừ</dt><dd className={`mt-0.5 text-sm tabular-nums ${r.adjustments < 0 ? "text-state-danger" : r.adjustments > 0 ? "text-state-success" : "text-text-primary"}`}>{r.adjustments ? formatSignedVND(r.adjustments) : "—"}</dd></div>
                  </dl>

                  <div className="flex items-center justify-between gap-4 md:min-w-[15rem] md:justify-end">
                    <div className="md:text-right">
                      <p className="font-serif text-xl tabular-nums text-text-primary">{formatVND(Math.max(0, r.net))}</p>
                      {l?.isPaid
                        ? <p className="text-xs text-state-success">Đã nhận · {METHOD_TEXT[l.payoutMethod ?? "BankTransfer"]}{l.paidAtUtc ? ` · ${formatDate(l.paidAtUtc)}` : ""}</p>
                        : l ? (l.netPay <= 0 ? <p className="text-xs text-text-secondary">Không có khoản trả</p>
                          : hasAccount(l) ? <p className="text-xs text-text-secondary">{l.bankName} ·••{l.bankAccountNumber!.slice(-4)}</p>
                            : <p className="text-xs text-state-warning">Chưa có tài khoản</p>)
                          : null}
                    </div>
                    {l && !readOnly && period?.status === "Finalized" && !owed(l) && <span aria-hidden className="hidden w-[4.25rem] shrink-0 md:block" />}
                    {l && !readOnly && period?.status === "Finalized" && owed(l) && (
                      <div className="flex w-[4.25rem] shrink-0 flex-col items-end gap-1">
                        <Button variant="secondary" className="min-h-10 px-3 text-sm" onClick={() => startPay([l.employeeId])}>Trả</Button>
                        {!hasAccount(l) && <button type="button" className="text-xs text-clay hover:underline" onClick={() => { setError(null); setAccount(l) }}>Thêm tài khoản</button>}
                      </div>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
        {period?.status === "Finalized" && !readOnly && (
          <div className="mt-3 text-right">
            <button type="button" className="text-sm text-text-secondary underline underline-offset-2 hover:text-text-primary disabled:cursor-not-allowed disabled:no-underline disabled:opacity-60"
              disabled={period.paid > 0} title={period.paid > 0 ? "Đã có người nhận tiền nên không mở lại được." : undefined}
              onClick={() => { setReason(""); setError(null); setReopening(true) }}>
              Mở lại để sửa
            </button>
          </div>
        )}
      </section>

      <Modal
        open={!!paying}
        title="Ghi nhận đã trả lương"
        onClose={() => setPaying(null)}
        footer={<><Button variant="secondary" onClick={() => setPaying(null)}>Hủy</Button><Button loading={pay.isPending} onClick={submitPay}>Ghi nhận {paying ? formatVND(toPay.filter((l) => paying.ids.includes(l.employeeId)).reduce((s, l) => s + l.netPay, 0)) : ""}</Button></>}
      >
        {paying && (
          <div className="space-y-5">
            {error && <Banner>{error}</Banner>}
            <div role="radiogroup" aria-label="Hình thức" className="grid grid-cols-2 gap-2">
              {(["BankTransfer", "Cash"] as const).map((m) => (
                <button key={m} type="button" role="radio" aria-checked={paying.method === m}
                  onClick={() => setPaying({ ...paying, method: m, ids: m === "BankTransfer" ? paying.ids.filter((id) => hasAccount(lines.find((x) => x.employeeId === id)!)) : paying.ids })}
                  className={`min-h-11 rounded-[12px] border px-3 text-sm font-medium ${paying.method === m ? "border-espresso bg-espresso text-bg-base" : "border-border text-text-primary hover:border-clay"}`}>
                  {METHOD_TEXT[m]}
                </button>
              ))}
            </div>
            <fieldset>
              <legend className="mb-2 text-sm font-medium text-text-primary">Người đã nhận tiền</legend>
              <ul className="max-h-64 space-y-1 overflow-y-auto">
                {toPay.map((l) => {
                  const off = paying.method === "BankTransfer" && !hasAccount(l)
                  return (
                    <li key={l.employeeId}>
                      <label className={`flex min-h-11 items-center justify-between gap-3 rounded-[10px] px-3 text-sm ${off ? "text-text-secondary" : "hover:bg-bg-warm"}`}>
                        <span className="flex items-center gap-2.5">
                          <input type="checkbox" className="h-4 w-4 accent-espresso" disabled={off} checked={paying.ids.includes(l.employeeId)}
                            onChange={(e) => setPaying({ ...paying, ids: e.target.checked ? [...paying.ids, l.employeeId] : paying.ids.filter((x) => x !== l.employeeId) })} />
                          <span>{l.employeeName}{off && <span className="block text-xs">Chưa có tài khoản, trả tiền mặt</span>}</span>
                        </span>
                        <b className="tabular-nums">{formatVND(l.netPay)}</b>
                      </label>
                    </li>
                  )
                })}
              </ul>
            </fieldset>
            <Field label={paying.method === "BankTransfer" ? "Mã giao dịch chuyển khoản" : "Ghi chú hoặc số phiếu chi (không bắt buộc)"} value={paying.reference} maxLength={REFERENCE_MAX}
              placeholder={paying.method === "BankTransfer" ? "Ví dụ: FT26305123456" : ""} onChange={(e) => setPaying({ ...paying, reference: e.target.value })} />
            <p className="text-xs text-text-secondary">Chỉ chọn người đã thực sự nhận tiền. Chuyển khoản lỗi thì bỏ chọn người đó và ghi nhận sau.</p>
          </div>
        )}
      </Modal>

      <Modal
        open={reopening}
        title={`Mở lại ${monthLabel(month).toLowerCase()}`}
        onClose={() => setReopening(false)}
        footer={<><Button variant="secondary" onClick={() => setReopening(false)}>Hủy</Button><Button loading={reopen.isPending} onClick={submitReopen}>Mở lại</Button></>}
      >
        <div className="space-y-4">
          {error && <Banner>{error}</Banner>}
          <p className="text-sm text-text-secondary">Số liệu được mở khóa để sửa. Chưa trả được lương cho đến khi chốt lại.</p>
          <Field label="Lý do mở lại" value={reason} maxLength={REASON_MAX} onChange={(e) => setReason(e.target.value)} />
        </div>
      </Modal>

      <Modal open={!!account} title={`Tài khoản nhận lương của ${account?.employeeName ?? ""}`} onClose={() => setAccount(null)}>
        {account && (
          <div className="space-y-3">
            <p className="text-xs text-text-secondary">Tháng đã chốt giữ thông tin lúc chốt. Sau khi lưu, trả tiền mặt, hoặc mở lại rồi chốt lại để người này có trong danh sách chuyển khoản.</p>
            <BankAccountForm saving={saveAccount.isPending} error={error} onCancel={() => setAccount(null)} onSubmit={(b) => saveAccount.mutate({ employeeId: account.employeeId, b })} />
          </div>
        )}
      </Modal>
    </div>
  )
}

/** The people of a finalized period as board rows. */
export function rowsOfPeriod(p: PayrollPeriod, meta: (l: PayrollPeriodLine) => string, open?: (l: PayrollPeriodLine) => (() => void) | undefined): PayRow[] {
  return (p.lines ?? []).map((l) => ({
    id: l.employeeId, name: l.employeeName, meta: meta(l), base: l.basePay, extra: l.overtimePay + l.replacementPay, adjustments: l.adjustments,
    gross: l.grossPay, net: l.netPay, line: l, onOpen: open?.(l),
  }))
}
