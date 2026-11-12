import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { Page } from "../../App"
import { PageFrame } from "../../components/PageFrame"
import { Banner, Button, DataTable, Field, Modal, QueryBoundary, StatusPill, type Column } from "../../components/ui"
import { useToast } from "../../context/ToastContext"
import { brandApi, type Voucher, type VoucherInput } from "../../lib/api/brand"
import { formatDate, formatVND } from "../../lib/format"
import { env } from "../../config/env"

/** The backend keeps one redemption per code (a voucher is used once), so the usage limit is only a mock-data feature. */
const SINGLE_USE = !env.useMock

const EMPTY = { code: "", kind: "percent" as const, value: "", minOrder: "0", expiresAt: "", maxUses: "100" }

function state(v: Voucher): { tone: "success" | "neutral" | "danger" | "pending"; label: string } {
  if (!v.active) return { tone: "neutral", label: "Đã tắt" }
  if (new Date(v.expiresAt) < new Date()) return { tone: "danger", label: "Hết hạn" }
  if (v.used >= v.maxUses) return { tone: "pending", label: "Hết lượt" }
  return { tone: "success", label: "Đang chạy" }
}

export default function BrandVouchers({ navigate }: { navigate: (p: Page) => void }) {
  const qc = useQueryClient()
  const { showToast } = useToast()
  const vouchers = useQuery({ queryKey: ["brand", "vouchers"], queryFn: brandApi.vouchers })
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<Record<string, string>>(EMPTY)
  const [error, setError] = useState<string | null>(null)

  const create = useMutation({
    mutationFn: (v: VoucherInput) => brandApi.createVoucher(v),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["brand", "vouchers"] }); showToast("Đã tạo voucher", "success"); setOpen(false); setForm(EMPTY) },
    onError: (e) => setError(e.message),
  })
  const toggle = useMutation({
    mutationFn: (v: { id: string; active: boolean }) => brandApi.setVoucherActive(v.id, v.active),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["brand", "vouchers"] }),
  })

  function submit() {
    const value = Number(form.value)
    if (!/^[A-Za-z0-9]{4,16}$/.test(form.code)) return setError("Mã gồm 4-16 chữ và số")
    if (!(value > 0) || (form.kind === "percent" && value > 100)) return setError(form.kind === "percent" ? "Phần trăm giảm từ 1 đến 100" : "Số tiền giảm phải lớn hơn 0")
    if (!form.expiresAt || new Date(form.expiresAt) < new Date()) return setError("Chọn ngày hết hạn trong tương lai")
    if (!SINGLE_USE && !(Number(form.maxUses) > 0)) return setError("Số lượt dùng tối đa phải lớn hơn 0")
    setError(null)
    create.mutate({ code: form.code, kind: form.kind as VoucherInput["kind"], value, minOrder: Number(form.minOrder) || 0, expiresAt: new Date(form.expiresAt).toISOString(), maxUses: SINGLE_USE ? 1 : Number(form.maxUses) })
  }

  const columns: Column<Voucher>[] = [
    { key: "code", header: "Mã", sort: (v) => v.code, render: (v) => <span className="font-mono font-medium text-text-primary">{v.code}</span> },
    { key: "value", header: "Giảm", render: (v) => (v.kind === "percent" ? `${v.value}%` : formatVND(v.value)) },
    { key: "min", header: "Đơn tối thiểu", render: (v) => (v.minOrder ? formatVND(v.minOrder) : "Không") },
    { key: "uses", header: SINGLE_USE ? "Đã dùng" : "Lượt dùng", sort: (v) => v.used, render: (v) => (SINGLE_USE ? (v.used ? "Đã dùng" : "Chưa dùng") : `${v.used}/${v.maxUses}`) },
    { key: "exp", header: "Hết hạn", sort: (v) => v.expiresAt, render: (v) => formatDate(v.expiresAt) },
    { key: "state", header: "Trạng thái", render: (v) => { const s = state(v); return <StatusPill tone={s.tone}>{s.label}</StatusPill> } },
    { key: "act", header: "", className: "text-right", render: (v) => <Button variant="ghost" className="px-3 py-1.5 text-xs" onClick={() => toggle.mutate({ id: v.id, active: !v.active })}>{v.active ? "Tắt" : "Bật"}</Button> },
  ]

  return (
    <PageFrame page="brand-promotions" navigate={navigate} uc="UC-17" title="Khuyến mãi" subtitle="Voucher hết hạn, hết lượt hoặc sai điều kiện sẽ bị từ chối khi khách áp dụng." action={<Button onClick={() => setOpen(true)}>Tạo voucher</Button>}>
      <QueryBoundary query={vouchers}>{(rows) => <DataTable rows={rows} rowKey={(v) => v.id} columns={columns} emptyTitle="Chưa có voucher nào" />}</QueryBoundary>
      <Modal open={open} title="Tạo voucher" onClose={() => setOpen(false)} footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Hủy</Button><Button loading={create.isPending} onClick={submit}>Tạo</Button></>}>
        <div className="space-y-4">
          {error && <Banner>{error}</Banner>}
          <Field label="Mã voucher" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm font-medium text-text-primary">Loại giảm
              <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })} className="mt-1.5 w-full rounded-[10px] border border-border bg-surface px-3 py-3 text-sm">
                <option value="percent">Phần trăm</option>
                <option value="amount">Số tiền</option>
              </select>
            </label>
            <Field label={form.kind === "percent" ? "Giảm (%)" : "Giảm (₫)"} inputMode="numeric" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value.replace(/\D/g, "") })} />
          </div>
          <Field label="Đơn tối thiểu (₫)" inputMode="numeric" value={form.minOrder} onChange={(e) => setForm({ ...form, minOrder: e.target.value.replace(/\D/g, "") })} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Hết hạn" type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} />
            {SINGLE_USE ? <p className="text-sm text-text-secondary">Mỗi mã dùng được một lần. Cần nhiều lượt thì tạo nhiều mã.</p> : <Field label="Số lượt tối đa" inputMode="numeric" value={form.maxUses} onChange={(e) => setForm({ ...form, maxUses: e.target.value.replace(/\D/g, "") })} />}
          </div>
        </div>
      </Modal>
    </PageFrame>
  )
}
