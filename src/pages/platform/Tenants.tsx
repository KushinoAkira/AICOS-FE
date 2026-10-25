import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { z } from "zod"
import type { Page } from "../../App"
import { Banner, Button, ConfirmDialog, DataTable, Field, Modal, QueryBoundary, StatusPill, type Column, type Tone } from "../../components/ui"
import { env } from "../../config/env"
import { useToast } from "../../context/ToastContext"
import { formatDate, formatVND } from "../../lib/format"
import { ApiError } from "../../lib/api/http"
import { platformApi, type Plan, type Tenant, type TenantInput, type TenantStatus } from "../../lib/api/platform"
import { PLAN_NAME, PlatformPage } from "./PlatformPage"

const STATUS_LABEL: Record<TenantStatus, string> = { Pending: "Chờ duyệt", Active: "Đang hoạt động", Suspended: "Tạm ngưng", Closed: "Đã đóng", Rejected: "Đã từ chối" }
const STATUS_TONE: Record<TenantStatus, Tone> = { Pending: "info", Active: "success", Suspended: "pending", Closed: "neutral", Rejected: "danger" }

const infoSchema = z.object({
  name: z.string().trim().min(2, "Nhập tên thương hiệu"),
  slug: z.string().regex(/^[a-z0-9-]{3,30}$/, "3-30 ký tự: chữ thường, số, dấu gạch ngang"),
})
const adminSchema = z.object({ adminName: z.string().trim().min(2, "Nhập họ tên"), adminEmail: z.string().email("Email không hợp lệ") })
/** Real backend: the first Brand Admin is created with a phone and an initial password (no invite email yet). */
const realAdminSchema = adminSchema.extend({
  adminPhone: z.string().regex(/^0\d{9}$/, "SĐT 10 số, bắt đầu bằng 0"),
  adminPassword: z.string().min(8, "Tối thiểu 8 ký tự").regex(/[A-Z]/, "Cần 1 chữ hoa").regex(/\d/, "Cần 1 chữ số"),
})

const EMPTY: TenantInput = { name: "", slug: "", planId: "", adminName: "", adminEmail: "", adminPhone: "", adminPassword: "" }
const STEPS = ["Thương hiệu", "Gói dịch vụ", "Brand Admin", "Xác nhận"]

export default function PlatformTenants({ navigate }: { navigate: (p: Page) => void }) {
  const qc = useQueryClient()
  const { showToast } = useToast()
  const tenants = useQuery({ queryKey: ["platform", "tenants"], queryFn: platformApi.tenants })
  const plans = useQuery({ queryKey: ["platform", "plans"], queryFn: platformApi.plans })
  const [wizard, setWizard] = useState(false)
  const [action, setAction] = useState<{ tenant: Tenant; status: TenantStatus } | null>(null)
  const [reason, setReason] = useState("")

  const setStatus = useMutation({
    mutationFn: (v: { id: string; status: TenantStatus; reason?: string }) => platformApi.setTenantStatus(v.id, v.status, v.reason),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["platform"] }); showToast("Đã cập nhật tenant", "success"); setAction(null); setReason("") },
    onError: (e) => showToast(e.message, "error"),
  })

  const planList = plans.data ?? []
  const columns: Column<Tenant>[] = [
    { key: "name", header: "Thương hiệu", sort: (t) => t.name, render: (t) => <div className="flex items-center gap-3">{t.logoUrl ? <img src={t.logoUrl} alt="" className="h-9 w-9 shrink-0 rounded-[10px] border border-border object-contain" /> : <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-sand font-serif text-clay">{t.name.charAt(0)}</span>}<div><p className="font-medium text-text-primary">{t.name}</p><p className="text-xs text-text-secondary">{t.slug}.aicos.app</p>{t.applicantEmail && <p className="text-xs text-text-secondary">{t.applicantName} · {t.applicantEmail}{t.applicantPhone ? ` · ${t.applicantPhone}` : ""}</p>}{t.rejectReason && <p className="text-xs text-state-danger">Lý do từ chối: {t.rejectReason}</p>}</div></div> },
    { key: "plan", header: "Gói", sort: (t) => t.planId, render: (t) => PLAN_NAME(planList, t.planId) },
    { key: "branches", header: "Chi nhánh", sort: (t) => t.branchCount, render: (t) => t.branchCount },
    { key: "status", header: "Trạng thái", render: (t) => <StatusPill tone={STATUS_TONE[t.status]}>{STATUS_LABEL[t.status]}</StatusPill> },
    { key: "created", header: "Tạo ngày", sort: (t) => t.createdAtUtc, render: (t) => formatDate(t.createdAtUtc) },
    {
      key: "actions", header: "", className: "text-right",
      render: (t) => (
        <span className="flex justify-end gap-2">
          {t.status === "Pending" && <><Button className="px-3 py-1.5 text-xs" onClick={() => setAction({ tenant: t, status: "Active" })}>Duyệt</Button><Button variant="ghost" className="px-3 py-1.5 text-xs text-state-danger" onClick={() => setAction({ tenant: t, status: "Rejected" })}>Từ chối</Button></>}
          {t.status === "Active" && <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => setAction({ tenant: t, status: "Suspended" })}>Tạm ngưng</Button>}
          {t.status === "Suspended" && <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => setAction({ tenant: t, status: "Active" })}>Kích hoạt lại</Button>}
          {(t.status === "Active" || t.status === "Suspended") && <Button variant="ghost" className="px-3 py-1.5 text-xs text-state-danger" onClick={() => setAction({ tenant: t, status: "Closed" })}>Đóng</Button>}
        </span>
      ),
    },
  ]

  const suspending = action?.status === "Suspended"
  const approving = action?.status === "Active" && action.tenant.status === "Pending"
  const verb = (a: { tenant: Tenant; status: TenantStatus }) => a.status === "Active" ? (a.tenant.status === "Pending" ? "Duyệt đăng ký của" : "Kích hoạt lại") : a.status === "Suspended" ? "Tạm ngưng" : a.status === "Rejected" ? "Từ chối đăng ký của" : "Đóng"
  return (
    <PlatformPage page="platform-tenants" navigate={navigate} uc="UC-05" title="Quản lý tenant" subtitle="Các thương hiệu đang dùng nền tảng." action={<Button onClick={() => setWizard(true)}>Tạo tenant</Button>}>
      <QueryBoundary query={tenants}>{(rows) => {
        const pending = rows.filter((t) => t.status === "Pending").length
        const sorted = [...rows].sort((a, b) => Number(b.status === "Pending") - Number(a.status === "Pending"))
        return (
          <>
            {pending > 0 && <div className="mb-4"><Banner tone="warn">{pending} thương hiệu mới đăng ký đang chờ bạn duyệt.</Banner></div>}
            <DataTable rows={sorted} rowKey={(t) => t.id} columns={columns} emptyTitle="Chưa có tenant nào" />
          </>
        )
      }}</QueryBoundary>

      <TenantWizard open={wizard} plans={planList} onClose={() => setWizard(false)} onCreated={() => { setWizard(false); void qc.invalidateQueries({ queryKey: ["platform"] }); showToast("Đã tạo tenant", "success") }} />

      <ConfirmDialog
        open={!!action}
        danger={action?.status !== "Active"}
        title={action ? `${verb(action)} ${action.tenant.name}?` : ""}
        message={approving ? "Thương hiệu sẽ được kích hoạt với thời gian dùng thử 14 ngày. Chủ quán nhận email mời đặt mật khẩu." : action?.status === "Rejected" ? "Lý do sẽ được gửi tới email của chủ quán." : suspending ? "Tạm ngưng sẽ chặn đăng nhập, API, QR bàn và đặt takeaway của toàn bộ thương hiệu này (BR-07)." : action?.status === "Closed" ? "Đóng tenant là hành động khó hoàn tác." : "Thương hiệu sẽ hoạt động trở lại."}
        requireReason={action?.status !== "Active"}
        reason={reason}
        onReason={setReason}
        confirmLabel="Xác nhận"
        onCancel={() => { setAction(null); setReason("") }}
        onConfirm={() => action && setStatus.mutate({ id: action.tenant.id, status: action.status, reason })}
      />
    </PlatformPage>
  )
}

function TenantWizard({ open, plans, onClose, onCreated }: { open: boolean; plans: Plan[]; onClose: () => void; onCreated: () => void }) {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<TenantInput>(EMPTY)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const create = useMutation({
    mutationFn: platformApi.createTenant,
    onSuccess: () => { setStep(0); setForm(EMPTY); onCreated() },
    onError: (e) => { setServerError(e.message); if (e instanceof ApiError && e.code === "slug_taken") setStep(0) },
  })
  const set = (k: keyof TenantInput, v: string) => setForm((f) => ({ ...f, [k]: v }))
  const plan = plans.find((p) => p.id === form.planId)

  function next() {
    setServerError(null)
    if (step === 0) {
      const r = infoSchema.safeParse(form)
      if (!r.success) return setErrors(Object.fromEntries(r.error.issues.map((i) => [String(i.path[0]), i.message])))
    }
    if (step === 1 && !form.planId) return setErrors({ planId: "Chọn một gói" })
    if (step === 2) {
      const r = (env.useMock ? adminSchema : realAdminSchema).safeParse(form)
      if (!r.success) return setErrors(Object.fromEntries(r.error.issues.map((i) => [String(i.path[0]), i.message])))
    }
    setErrors({})
    setStep(step + 1)
  }

  return (
    <Modal
      open={open}
      title="Tạo tenant mới"
      onClose={onClose}
      footer={
        <>
          {step > 0 && <Button variant="secondary" onClick={() => setStep(step - 1)}>Quay lại</Button>}
          {step < 3 ? <Button onClick={next}>Tiếp tục</Button> : <Button loading={create.isPending} onClick={() => create.mutate(form)}>Kích hoạt tenant</Button>}
        </>
      }
    >
      <ol className="mb-5 flex gap-2 text-xs" aria-label="Các bước">
        {STEPS.map((s, i) => (
          <li key={s} aria-current={i === step ? "step" : undefined} className={`flex-1 rounded-full px-2 py-1 text-center ${i === step ? "bg-terracotta text-bg-base" : i < step ? "bg-success-bg text-state-success" : "bg-bg-warm text-text-secondary"}`}>{i + 1}. {s}</li>
        ))}
      </ol>
      {serverError && <div className="mb-4"><Banner>{serverError}</Banner></div>}
      {step === 0 && (
        <div className="space-y-4">
          <Field label="Tên thương hiệu" value={form.name} onChange={(e) => set("name", e.target.value)} error={errors.name} />
          <Field label="Mã định danh (subdomain)" value={form.slug} onChange={(e) => set("slug", e.target.value.toLowerCase())} error={errors.slug} hint={`${form.slug || "ten-brand"}.aicos.app`} />
        </div>
      )}
      {step === 1 && (
        <div className="space-y-3">
          {plans.map((p) => (
            <label key={p.id} className={`flex cursor-pointer items-center justify-between rounded-[12px] border p-4 ${form.planId === p.id ? "border-terracotta bg-sand" : "border-border"}`}>
              <span className="flex items-center gap-3">
                <input type="radio" name="plan" checked={form.planId === p.id} onChange={() => set("planId", p.id)} />
                <span><span className="font-medium text-text-primary">{p.name}</span><span className="block text-xs text-text-secondary">Tối đa {p.maxBranches} chi nhánh, {p.maxUsers} người dùng</span></span>
              </span>
              <span className="text-sm">{formatVND(p.monthlyFee)}/tháng</span>
            </label>
          ))}
          {errors.planId && <p className="text-xs text-state-danger">{errors.planId}</p>}
        </div>
      )}
      {step === 2 && (
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">{env.useMock ? "Tài khoản Brand Admin đầu tiên sẽ nhận email mời đặt mật khẩu." : "Gửi mật khẩu ban đầu này cho chủ quán; họ nên đổi sau lần đăng nhập đầu."}</p>
          <Field label="Họ tên" value={form.adminName} onChange={(e) => set("adminName", e.target.value)} error={errors.adminName} />
          <Field label="Email" type="email" value={form.adminEmail} onChange={(e) => set("adminEmail", e.target.value)} error={errors.adminEmail} />
          {!env.useMock && <>
            <Field label="Số điện thoại" type="tel" value={form.adminPhone ?? ""} onChange={(e) => set("adminPhone", e.target.value)} error={errors.adminPhone} />
            <Field label="Mật khẩu ban đầu" type="text" autoComplete="off" value={form.adminPassword ?? ""} onChange={(e) => set("adminPassword", e.target.value)} error={errors.adminPassword} />
          </>}
        </div>
      )}
      {step === 3 && (
        <dl className="space-y-2 text-sm">
          {[["Thương hiệu", form.name], ["Subdomain", `${form.slug}.aicos.app`], ["Gói", plan ? `${plan.name} · ${formatVND(plan.monthlyFee)}/tháng` : ""], ["Brand Admin", `${form.adminName} (${form.adminEmail})`]].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4"><dt className="text-text-secondary">{k}</dt><dd className="text-right text-text-primary">{v}</dd></div>
          ))}
        </dl>
      )}
    </Modal>
  )
}
