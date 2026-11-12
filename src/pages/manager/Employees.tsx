import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { Page } from "../../App"
import { PageFrame } from "../../components/PageFrame"
import { Banner, Button, ConfirmDialog, DataTable, Field, Modal, QueryBoundary, StatusPill, type Column } from "../../components/ui"
import { useAuth } from "../../context/AuthContext"
import { useToast } from "../../context/ToastContext"
import { usersApi, type ApiRole, type UserDto } from "../../lib/api/identity"
import { employeeApi, type ContractType, type Employee } from "../../lib/api/manage"
import { formatDate } from "../../lib/format"

const ROLE_TEXT: Record<string, string> = { Barista: "Pha chế", Cashier: "Thu ngân" }
const CONTRACT_TEXT: Record<ContractType, string> = { FullTime: "Toàn thời gian", PartTime: "Bán thời gian" }

/** One person of the branch: the login account, and the HR record once it exists. */
interface Row { user: UserDto; employee: Employee | null }

interface Form { fullName: string; email: string; phone: string; password: string; role: ApiRole; position: string; hireDate: string; contractType: ContractType }
const EMPTY: Form = { fullName: "", email: "", phone: "", password: "", role: "Barista", position: "", hireDate: "", contractType: "FullTime" }

/** UC-27 Manage Branch Staff: the manager creates, edits, locks and removes the baristas and cashiers of their own branch. */
export default function ManagerEmployees({ navigate }: { navigate: (p: Page) => void }) {
  const qc = useQueryClient()
  const { showToast } = useToast()
  const { user: me } = useAuth()
  const users = useQuery({ queryKey: ["users", "branch"], queryFn: () => usersApi.list({ pageSize: 200 }) })
  const employees = useQuery({ queryKey: ["employees"], queryFn: employeeApi.list })
  const [editing, setEditing] = useState<Row | "new" | null>(null)
  const [form, setForm] = useState<Form>(EMPTY)
  const [error, setError] = useState<string | null>(null)
  const [removing, setRemoving] = useState<Row | null>(null)
  const refresh = () => { void qc.invalidateQueries({ queryKey: ["users"] }); void qc.invalidateQueries({ queryKey: ["employees"] }) }

  const open = (row: Row | "new") => {
    setError(null)
    setEditing(row)
    setForm(row === "new" ? EMPTY : {
      fullName: row.employee?.fullName ?? row.user.fullName, email: row.user.email, phone: row.user.phone ?? "", password: "", role: row.user.role,
      position: row.employee?.position ?? "", hireDate: row.employee?.hireDate ?? "", contractType: row.employee?.contractType ?? "FullTime",
    })
  }

  const profile = () => ({ fullName: form.fullName.trim(), position: form.position.trim() || null, hireDate: form.hireDate || null, contractType: form.contractType })

  const save = useMutation({
    mutationFn: async () => {
      if (editing === "new") {
        const created = await usersApi.create({ fullName: form.fullName.trim(), email: form.email.trim(), phone: form.phone.trim() || undefined, password: form.password, role: form.role, branchId: me?.branchId ?? null })
        await employeeApi.create({ userId: created.id, branchId: me?.branchId ?? null, ...profile() })
        return
      }
      if (!editing) return
      await usersApi.update(editing.user.id, { fullName: form.fullName.trim(), email: form.email.trim(), phone: form.phone.trim() || undefined, username: editing.user.username ?? undefined, role: form.role, branchId: me?.branchId ?? null })
      if (editing.employee) await employeeApi.update(editing.employee.id, profile())
      else await employeeApi.create({ userId: editing.user.id, branchId: me?.branchId ?? null, ...profile() })
    },
    onSuccess: () => { refresh(); setEditing(null); showToast("Đã lưu nhân sự.", "success") },
    onError: (e) => setError(e.message),
  })
  const toggle = useMutation({
    mutationFn: (u: UserDto) => usersApi.changeStatus(u.id, u.status === "Active" ? "Locked" : "Active"),
    onSuccess: () => { refresh(); showToast("Đã cập nhật tài khoản.", "success") },
    onError: (e) => showToast(e.message, "error"),
  })
  const remove = useMutation({
    mutationFn: async (r: Row) => {
      if (r.employee) await employeeApi.setStatus(r.employee.id, "Inactive")
      await usersApi.remove(r.user.id)
    },
    onSuccess: () => { refresh(); setRemoving(null); showToast("Đã xóa nhân sự. Lịch sử ca và lương vẫn được giữ.", "success") },
    onError: (e) => showToast(e.message, "error"),
  })

  const submit = () => {
    if (form.fullName.trim().length < 2) return setError("Nhập họ tên")
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) return setError("Email không hợp lệ")
    if (form.phone.trim() && !/^0\d{9}$/.test(form.phone.trim())) return setError("Số điện thoại gồm 10 số, bắt đầu bằng 0")
    if (editing === "new" && (form.password.length < 8 || !/[A-Za-z]/.test(form.password) || !/\d/.test(form.password))) return setError("Mật khẩu tạm từ 8 ký tự, có chữ cái và chữ số")
    setError(null)
    save.mutate()
  }

  const rows: Row[] = (users.data?.items ?? []).map((u) => ({ user: u, employee: (employees.data ?? []).find((e) => e.userId === u.id) ?? null }))
  const columns: Column<Row>[] = [
    { key: "n", header: "Nhân sự", sort: (r) => r.user.fullName, render: (r) => <div><p className="font-medium text-text-primary">{r.employee?.fullName ?? r.user.fullName}</p><p className="text-xs text-text-secondary">{r.user.email}</p></div> },
    { key: "r", header: "Vai trò", render: (r) => ROLE_TEXT[r.user.role] ?? r.user.role },
    { key: "p", header: "Vị trí", render: (r) => r.employee?.position ?? "-" },
    { key: "c", header: "Hợp đồng", render: (r) => (r.employee ? CONTRACT_TEXT[r.employee.contractType] : <span className="text-state-warning">Chưa có hồ sơ</span>) },
    { key: "h", header: "Ngày vào làm", sort: (r) => r.employee?.hireDate ?? "", render: (r) => (r.employee?.hireDate ? formatDate(r.employee.hireDate) : "-") },
    { key: "s", header: "Trạng thái", render: (r) => <StatusPill tone={r.user.status === "Active" ? "success" : "danger"}>{r.user.status === "Active" ? "Hoạt động" : "Đã khóa"}</StatusPill> },
    {
      key: "a", header: "", className: "text-right", render: (r) => (
        <div className="flex justify-end gap-2">
          <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => open(r)}>Sửa</Button>
          <Button variant="secondary" className="px-3 py-1.5 text-xs" loading={toggle.isPending && toggle.variables?.id === r.user.id} onClick={() => toggle.mutate(r.user)}>{r.user.status === "Active" ? "Khóa" : "Mở khóa"}</Button>
          <Button variant="danger" className="px-3 py-1.5 text-xs" onClick={() => setRemoving(r)}>Xóa</Button>
        </div>
      ),
    },
  ]

  return (
    <PageFrame page="manager-staff" navigate={navigate} uc="UC-27" title="Nhân sự" subtitle="Tài khoản và hồ sơ pha chế, thu ngân của chi nhánh." action={<Button onClick={() => open("new")}>Thêm nhân sự</Button>}>
      <QueryBoundary query={users}>{() => <DataTable rows={rows} rowKey={(r) => r.user.id} columns={columns} emptyTitle="Chi nhánh chưa có nhân sự" />}</QueryBoundary>

      <Modal open={!!editing} title={editing === "new" ? "Thêm nhân sự" : "Sửa nhân sự"} onClose={() => setEditing(null)} footer={<><Button variant="secondary" onClick={() => setEditing(null)}>Hủy</Button><Button loading={save.isPending} onClick={submit}>Lưu</Button></>}>
        <div className="space-y-4">
          {error && <Banner>{error}</Banner>}
          <Field label="Họ tên" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Field label="Số điện thoại" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          {editing === "new" && <Field label="Mật khẩu tạm" type="password" autoComplete="new-password" hint="Nhân viên đổi mật khẩu khi đăng nhập lần đầu." value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-medium text-text-primary">Vai trò
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as ApiRole })} className="mt-1.5 w-full rounded-[10px] border border-border bg-surface px-3 py-3 text-sm">
                <option value="Barista">Pha chế</option>
                <option value="Cashier">Thu ngân</option>
              </select>
            </label>
            <label className="block text-sm font-medium text-text-primary">Hợp đồng
              <select value={form.contractType} onChange={(e) => setForm({ ...form, contractType: e.target.value as ContractType })} className="mt-1.5 w-full rounded-[10px] border border-border bg-surface px-3 py-3 text-sm">
                <option value="FullTime">Toàn thời gian (tính theo ngày)</option>
                <option value="PartTime">Bán thời gian (tính theo giờ)</option>
              </select>
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Vị trí" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} />
            <Field label="Ngày vào làm" type="date" value={form.hireDate} onChange={(e) => setForm({ ...form, hireDate: e.target.value })} />
          </div>
        </div>
      </Modal>
      <ConfirmDialog open={!!removing} danger title={`Xóa ${removing?.user.fullName ?? ""}?`} message="Tài khoản không đăng nhập được nữa và hồ sơ chuyển sang ngừng làm. Lịch sử ca và lương vẫn được giữ." confirmLabel="Xóa" onCancel={() => setRemoving(null)} onConfirm={() => removing && remove.mutate(removing)} />
    </PageFrame>
  )
}
