import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { Page } from "../../App"
import { PageFrame } from "../../components/PageFrame"
import { Banner, Button, ConfirmDialog, DataTable, Field, Modal, QueryBoundary, StatusPill, type Column } from "../../components/ui"
import { useToast } from "../../context/ToastContext"
import { branchesApi, usersApi, type ApiRole, type UserDto } from "../../lib/api/identity"
import { formatDateTime } from "../../lib/format"
import { ROLE_LABEL, normalizeRole } from "../../router/roles"

/** Roles are fixed (no custom roles): a Brand Admin only assigns these. */
const ASSIGNABLE: { value: ApiRole; label: string }[] = [
  { value: "BranchManager", label: ROLE_LABEL.branchManager },
  { value: "Barista", label: ROLE_LABEL.barista },
  { value: "Cashier", label: ROLE_LABEL.cashier },
]

export default function BrandAccounts({ navigate }: { navigate: (p: Page) => void }) {
  const qc = useQueryClient()
  const { showToast } = useToast()
  const users = useQuery({ queryKey: ["users"], queryFn: () => usersApi.list({ pageSize: 200 }) })
  const branches = useQuery({ queryKey: ["branches", "active"], queryFn: branchesApi.listActive })
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ fullName: "", email: "", password: "", role: "Cashier" as ApiRole, branchId: "" })
  const [error, setError] = useState<string | null>(null)
  const [target, setTarget] = useState<UserDto | null>(null)
  const [reason, setReason] = useState("")

  const create = useMutation({
    mutationFn: () => usersApi.create({ fullName: form.fullName.trim(), email: form.email.trim(), password: form.password, role: form.role, branchId: form.branchId }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["users"] }); setOpen(false); showToast("Đã tạo tài khoản", "success") },
    onError: (e) => setError(e.message),
  })
  const toggle = useMutation({
    mutationFn: (u: UserDto) => usersApi.changeStatus(u.id, u.status === "Active" ? "Locked" : "Active"),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["users"] }); setTarget(null); setReason(""); showToast("Đã cập nhật tài khoản", "success") },
    onError: (e) => showToast(e.message, "error"),
  })

  function submit() {
    if (form.fullName.trim().length < 2) return setError("Nhập họ tên")
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return setError("Email không hợp lệ")
    if (form.password.length < 8 || !/[A-Z]/.test(form.password) || !/\d/.test(form.password)) return setError("Mật khẩu tối thiểu 8 ký tự, có chữ hoa và chữ số")
    if (!form.branchId) return setError("Chọn chi nhánh")
    setError(null)
    create.mutate()
  }

  const staff = (users.data?.items ?? []).filter((u) => normalizeRole(u) !== "superAdmin" && normalizeRole(u) !== "customer")
  const branchName = (id: string | null) => branches.data?.find((b) => b.id === id)?.name ?? "Toàn thương hiệu"

  const columns: Column<UserDto>[] = [
    { key: "name", header: "Nhân sự", sort: (u) => u.fullName, render: (u) => <div><p className="font-medium text-text-primary">{u.fullName}</p><p className="text-xs text-text-secondary">{u.email}</p></div> },
    { key: "role", header: "Vai trò", render: (u) => { const r = normalizeRole(u); return r ? ROLE_LABEL[r] : u.role } },
    { key: "branch", header: "Chi nhánh", render: (u) => branchName(u.branchId) },
    { key: "login", header: "Đăng nhập gần nhất", sort: (u) => u.lastLoginAtUtc ?? "", render: (u) => (u.lastLoginAtUtc ? formatDateTime(u.lastLoginAtUtc) : "Chưa đăng nhập") },
    { key: "status", header: "Trạng thái", render: (u) => <StatusPill tone={u.status === "Active" ? "success" : "danger"}>{u.status === "Active" ? "Hoạt động" : "Đã khóa"}</StatusPill> },
    { key: "act", header: "", className: "text-right", render: (u) => <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => setTarget(u)}>{u.status === "Active" ? "Khóa" : "Mở khóa"}</Button> },
  ]

  return (
    <PageFrame page="admin-users" navigate={navigate} uc="UC-13" title="Tài khoản" subtitle="Tạo tài khoản nhân sự, gán vai trò cố định và chi nhánh. Mở khóa tài khoản bị khóa do đăng nhập sai." action={<Button onClick={() => { setForm({ fullName: "", email: "", password: "", role: "Cashier", branchId: "" }); setError(null); setOpen(true) }}>Tạo tài khoản</Button>}>
      <QueryBoundary query={users}>{() => <DataTable rows={staff} rowKey={(u) => u.id} columns={columns} emptyTitle="Chưa có tài khoản nhân sự" />}</QueryBoundary>

      <Modal open={open} title="Tạo tài khoản" onClose={() => setOpen(false)} footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Hủy</Button><Button loading={create.isPending} onClick={submit}>Tạo</Button></>}>
        <div className="space-y-4">
          {error && <Banner>{error}</Banner>}
          <Field label="Họ tên" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
          <Field label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Field label="Mật khẩu tạm" type="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} hint="Nhân viên phải đổi ở lần đăng nhập đầu." />
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm font-medium text-text-primary">Vai trò
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as ApiRole })} className="mt-1.5 w-full rounded-[10px] border border-border bg-surface px-3 py-3 text-sm">
                {ASSIGNABLE.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </label>
            <label className="block text-sm font-medium text-text-primary">Chi nhánh
              <select value={form.branchId} onChange={(e) => setForm({ ...form, branchId: e.target.value })} className="mt-1.5 w-full rounded-[10px] border border-border bg-surface px-3 py-3 text-sm">
                <option value="">Chọn chi nhánh</option>
                {(branches.data ?? []).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </label>
          </div>
        </div>
      </Modal>
      <ConfirmDialog open={!!target} danger={target?.status === "Active"} requireReason={target?.status === "Active"} reason={reason} onReason={setReason} title={`${target?.status === "Active" ? "Khóa" : "Mở khóa"} ${target?.fullName ?? ""}?`} message={target?.status === "Active" ? "Người này sẽ không thể đăng nhập cho đến khi được mở khóa. Hành động được ghi vào nhật ký." : "Người này sẽ đăng nhập lại được."} onCancel={() => { setTarget(null); setReason("") }} onConfirm={() => target && toggle.mutate(target)} />
    </PageFrame>
  )
}
