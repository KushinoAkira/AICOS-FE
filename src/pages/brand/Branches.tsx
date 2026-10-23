import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { Page } from "../../App"
import { PageFrame } from "../../components/PageFrame"
import { Banner, Button, ConfirmDialog, DataTable, Field, Modal, QueryBoundary, StatusPill, type Column } from "../../components/ui"
import { useToast } from "../../context/ToastContext"
import { brandApi } from "../../lib/api/brand"
import { branchesApi, type BranchDto, type BranchInput } from "../../lib/api/identity"

const hhmm = (s: string | null) => (s ? s.slice(0, 5) : "")

export default function BrandBranches({ navigate }: { navigate: (p: Page) => void }) {
  const qc = useQueryClient()
  const { showToast } = useToast()
  const branches = useQuery({ queryKey: ["branches", "all"], queryFn: () => branchesApi.list({ pageSize: 100 }) })
  const sub = useQuery({ queryKey: ["brand", "subscription"], queryFn: brandApi.subscription })
  const [editing, setEditing] = useState<BranchDto | "new" | null>(null)
  const [toggle, setToggle] = useState<BranchDto | null>(null)
  const [form, setForm] = useState({ name: "", address: "", phone: "", openingTime: "07:00", closingTime: "22:00" })
  const [error, setError] = useState<string | null>(null)

  const refresh = () => { void qc.invalidateQueries({ queryKey: ["branches"] }); void qc.invalidateQueries({ queryKey: ["brand", "subscription"] }) }
  const save = useMutation({
    mutationFn: (body: BranchInput) => (editing && editing !== "new" ? branchesApi.update(editing.id, body) : branchesApi.create(body)),
    onSuccess: () => { refresh(); setEditing(null); showToast("Đã lưu chi nhánh", "success") },
    onError: (e) => setError(e.message),
  })
  const status = useMutation({
    mutationFn: (b: BranchDto) => branchesApi.changeStatus(b.id, b.status === "Active" ? "Suspended" : "Active"),
    onSuccess: () => { refresh(); setToggle(null) },
    onError: (e) => showToast(e.message, "error"),
  })

  const used = branches.data?.items.length ?? 0
  const atLimit = sub.data ? used >= sub.data.maxBranches : false

  function open(b: BranchDto | "new") {
    setError(null)
    setEditing(b)
    setForm(b === "new" ? { name: "", address: "", phone: "", openingTime: "07:00", closingTime: "22:00" } : { name: b.name, address: b.address ?? "", phone: b.phone ?? "", openingTime: hhmm(b.openingTime), closingTime: hhmm(b.closingTime) })
  }
  function submit() {
    if (!form.name.trim()) return setError("Nhập tên chi nhánh")
    if (form.openingTime >= form.closingTime) return setError("Giờ mở cửa phải trước giờ đóng cửa")
    setError(null)
    save.mutate({ name: form.name.trim(), address: form.address, phone: form.phone, openingTime: form.openingTime, closingTime: form.closingTime })
  }

  const columns: Column<BranchDto>[] = [
    { key: "name", header: "Chi nhánh", sort: (b) => b.name, render: (b) => <div><p className="font-medium text-text-primary">{b.name}</p><p className="text-xs text-text-secondary">{b.address}</p></div> },
    { key: "hours", header: "Giờ mở cửa", render: (b) => `${hhmm(b.openingTime)} - ${hhmm(b.closingTime)}` },
    { key: "phone", header: "Điện thoại", render: (b) => b.phone ?? "" },
    { key: "status", header: "Trạng thái", render: (b) => <StatusPill tone={b.status === "Active" ? "success" : "neutral"}>{b.status === "Active" ? "Đang hoạt động" : "Tạm ngưng"}</StatusPill> },
    { key: "act", header: "", className: "text-right", render: (b) => <span className="flex justify-end gap-2"><Button variant="ghost" className="px-3 py-1.5 text-xs" onClick={() => open(b)}>Sửa</Button><Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => setToggle(b)}>{b.status === "Active" ? "Tạm ngưng" : "Kích hoạt"}</Button></span> },
  ]

  return (
    <PageFrame page="admin-branches" navigate={navigate} uc="UC-12" title="Chi nhánh" subtitle={sub.data ? `Đã dùng ${used}/${sub.data.maxBranches} chi nhánh theo gói ${sub.data.planName}.` : undefined}
      action={<Button onClick={() => open("new")} disabled={atLimit} disabledReason="Đã đạt giới hạn chi nhánh của gói">Thêm chi nhánh</Button>}>
      {atLimit && <div className="mb-5"><Banner tone="warn" action={<button onClick={() => navigate("brand-subscription")} className="font-medium underline">Xem gói</button>}>Đã đạt giới hạn chi nhánh của gói. Nâng gói để thêm chi nhánh mới.</Banner></div>}
      <QueryBoundary query={branches}>{(r) => <DataTable rows={r.items} rowKey={(b) => b.id} columns={columns} emptyTitle="Chưa có chi nhánh nào" />}</QueryBoundary>

      <Modal open={!!editing} title={editing === "new" ? "Thêm chi nhánh" : "Sửa chi nhánh"} onClose={() => setEditing(null)} footer={<><Button variant="secondary" onClick={() => setEditing(null)}>Hủy</Button><Button loading={save.isPending} onClick={submit}>Lưu</Button></>}>
        <div className="space-y-4">
          {error && <Banner>{error}</Banner>}
          <Field label="Tên chi nhánh" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Field label="Địa chỉ" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          <Field label="Điện thoại" inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Mở cửa" type="time" value={form.openingTime} onChange={(e) => setForm({ ...form, openingTime: e.target.value })} />
            <Field label="Đóng cửa" type="time" value={form.closingTime} onChange={(e) => setForm({ ...form, closingTime: e.target.value })} />
          </div>
        </div>
      </Modal>
      <ConfirmDialog open={!!toggle} danger={toggle?.status === "Active"} title={`${toggle?.status === "Active" ? "Tạm ngưng" : "Kích hoạt"} ${toggle?.name ?? ""}?`} message={toggle?.status === "Active" ? "QR bàn và đặt mang đi của chi nhánh sẽ ngừng hoạt động." : "Chi nhánh sẽ nhận đơn trở lại."} onCancel={() => setToggle(null)} onConfirm={() => toggle && status.mutate(toggle)} />
    </PageFrame>
  )
}
