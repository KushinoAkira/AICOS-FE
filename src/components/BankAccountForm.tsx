import { useState } from "react"
import { Banner, Button, Field } from "./ui"
import type { BankAccount } from "../lib/api/manage"
import { bankAccountError } from "../lib/payrollPeriod"

const clean = (s: string) => (s.trim() ? s.trim() : null)

/** The salary account form, for the employee's own account and for a manager filling one in. */
export function BankAccountForm({ initial, saving, error, onSubmit, onCancel, submitLabel = "Lưu tài khoản" }: {
  initial?: BankAccount | null; saving: boolean; error?: string | null; submitLabel?: string
  onSubmit: (b: BankAccount) => void; onCancel?: () => void
}) {
  const [bankName, setBankName] = useState(initial?.bankName ?? "")
  const [accountNumber, setAccountNumber] = useState(initial?.accountNumber ?? "")
  const [accountName, setAccountName] = useState(initial?.accountName ?? "")
  const [local, setLocal] = useState<string | null>(null)
  function submit() {
    const b = { bankName: clean(bankName), accountNumber: clean(accountNumber), accountName: clean(accountName)?.toUpperCase() ?? null }
    const e = bankAccountError(b)
    setLocal(e)
    if (!e) onSubmit(b)
  }
  const shown = local ?? error
  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); submit() }}>
      {shown && <Banner>{shown}</Banner>}
      <Field label="Ngân hàng" placeholder="VD: VCB, MB, Techcombank" value={bankName} maxLength={50} onChange={(e) => setBankName(e.target.value)} />
      <Field label="Số tài khoản" inputMode="numeric" autoComplete="off" value={accountNumber} maxLength={30} onChange={(e) => setAccountNumber(e.target.value)} />
      <Field label="Tên chủ tài khoản" hint="Viết đúng như trên thẻ, không dấu." value={accountName} maxLength={100} onChange={(e) => setAccountName(e.target.value)} />
      <div className="flex justify-end gap-2">
        {onCancel && <Button type="button" variant="secondary" onClick={onCancel}>Hủy</Button>}
        <Button type="submit" loading={saving}>{submitLabel}</Button>
      </div>
    </form>
  )
}
