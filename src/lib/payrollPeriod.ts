/** Pure rules of paying staff (payroll periods), shared by the manager's payroll page and the employee's payslips. */
import type { BankAccount, PayrollPeriod } from "./api/manage"

const today = () => new Date().toLocaleDateString("en-CA")

/** The period of the month, if any: the one that is not reopened, else the latest reopened one (to finalize it again). */
export function periodOf(periods: PayrollPeriod[], range: { from: string; to: string }): PayrollPeriod | null {
  const same = periods.filter((p) => p.from === range.from && p.to === range.to)
  return same.find((p) => p.status !== "Reopened") ?? same.sort((a, b) => b.finalizedAtUtc.localeCompare(a.finalizedAtUtc))[0] ?? null
}

/** Why the month cannot be finalized yet, or null. Mirrors `payroll.period_not_over` and `payroll.unreviewed_records`. */
export function finalizeBlocker(range: { to: string }, unreviewed: number, now = today()): string | null {
  if (range.to >= now) return "Chỉ chốt được khi tháng đã qua."
  if (unreviewed > 0) return `Còn ${unreviewed} ca chưa duyệt.`
  return null
}

/** Mirrors the Workforce service: the bank, the number and the name together (or none, to clear it); 6-30 letters or digits. */
export function bankAccountError(b: BankAccount): string | null {
  const parts = [b.bankName, b.accountNumber, b.accountName].filter((p) => !!p?.trim()).length
  if (parts !== 0 && parts !== 3) return "Nhập đủ ngân hàng, số tài khoản và tên chủ tài khoản (hoặc để trống cả ba để xóa)."
  if ((b.bankName ?? "").trim().length > 50) return "Tên ngân hàng tối đa 50 ký tự."
  if ((b.accountName ?? "").trim().length > 100) return "Tên chủ tài khoản tối đa 100 ký tự."
  const n = (b.accountNumber ?? "").trim()
  if (n && !/^[A-Za-z0-9]{6,30}$/.test(n)) return "Số tài khoản gồm 6-30 chữ hoặc số, không có khoảng trắng."
  return null
}
