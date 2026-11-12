import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { Page } from "../../App"
import { PageFrame } from "../../components/PageFrame"
import { Banner, Button, ConfirmDialog, DataTable, EmptyState, QueryBoundary, StatusPill, type Column } from "../../components/ui"
import { useAuth } from "../../context/AuthContext"
import { useToast } from "../../context/ToastContext"
import { brandApi, type Product, type ProductInput } from "../../lib/api/brand"
import { branchesApi, type BranchDto } from "../../lib/api/identity"
import { formatVND } from "../../lib/format"
import { ProductImage } from "../../components/OrderComposer"
import { MenuEditor } from "./MenuEditor"

/** Brand Admin: full menu management + publish (UC-14, UC-15). Branch Manager: sold-out switch only (UC-24, BR-12). */
export default function MenuPage({ navigate }: { navigate: (p: Page) => void }) {
  const { role, user } = useAuth()
  const products = useQuery({ queryKey: ["brand", "products"], queryFn: brandApi.products })
  const branches = useQuery({ queryKey: ["branches", "active"], queryFn: branchesApi.listActive })
  const qc = useQueryClient()
  const refresh = () => void qc.invalidateQueries({ queryKey: ["brand", "products"] })

  if (role === "branchManager") {
    return (
      <PageFrame page="manager-menu" navigate={navigate} uc="UC-24" title="Tình trạng món" subtitle="Đánh dấu món còn hoặc hết tại chi nhánh. Thay đổi áp dụng ngay cho QR, POS và đặt mang đi.">
        {user?.branchId ? <QueryBoundary query={products}>{(rows) => <Availability rows={rows.filter((p) => p.published)} branchId={user.branchId!} onChanged={refresh} />}</QueryBoundary> : <EmptyState title="Tài khoản chưa gán chi nhánh" />}
      </PageFrame>
    )
  }
  return (
    <PageFrame page="manager-menu" navigate={navigate} uc="UC-14" title="Thực đơn" subtitle="Một nguồn menu duy nhất cho QR tại bàn, POS và đặt mang đi.">
      <QueryBoundary query={products}>{(rows) => <BrandMenu rows={rows} branches={branches.data ?? []} onChanged={refresh} />}</QueryBoundary>
    </PageFrame>
  )
}

function Availability({ rows, branchId, onChanged }: { rows: Product[]; branchId: string; onChanged: () => void }) {
  const { showToast } = useToast()
  const toggle = useMutation({
    mutationFn: (v: { id: string; available: boolean }) => brandApi.setAvailability(v.id, branchId, v.available),
    onSuccess: onChanged,
    onError: (e) => showToast(e.message, "error"),
  })
  const columns: Column<Product>[] = [
    { key: "name", header: "Món", sort: (p) => p.name, render: (p) => <span className="font-medium text-text-primary">{p.name}</span> },
    { key: "cat", header: "Danh mục", sort: (p) => p.category, render: (p) => p.category },
    { key: "state", header: "Tình trạng", render: (p) => (p.soldOutAt.includes(branchId) ? <StatusPill tone="danger">Hết hàng</StatusPill> : <StatusPill tone="success">Còn</StatusPill>) },
    {
      key: "act", header: "", className: "text-right",
      render: (p) => {
        const out = p.soldOutAt.includes(branchId)
        return <Button variant="secondary" className="px-3 py-1.5 text-xs" loading={toggle.isPending && toggle.variables?.id === p.id} onClick={() => toggle.mutate({ id: p.id, available: out })}>{out ? "Mở bán lại" : "Đánh dấu hết"}</Button>
      },
    },
  ]
  return <DataTable rows={rows} rowKey={(p) => p.id} columns={columns} pageSize={12} />
}

function BrandMenu({ rows, branches, onChanged }: { rows: Product[]; branches: BranchDto[]; onChanged: () => void }) {
  const { showToast } = useToast()
  const [editing, setEditing] = useState<Product | null | "new">(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const [confirmPublish, setConfirmPublish] = useState(false)
  const [removing, setRemoving] = useState<Product | null>(null)
  const remove = useMutation({
    mutationFn: (id: string) => brandApi.removeProduct(id),
    onSuccess: () => { onChanged(); setRemoving(null); showToast("Đã xóa món", "success") },
    onError: (e) => { setRemoving(null); showToast(e.message, "error") },
  })
  const pending = rows.filter((p) => p.dirty || !p.published).length

  const save = useMutation({
    mutationFn: (input: ProductInput) => brandApi.saveProduct(editing && editing !== "new" ? editing.id : null, input),
    onSuccess: () => { onChanged(); setEditing(null); setServerError(null); showToast("Đã lưu món (chưa publish)", "success") },
    onError: (e) => setServerError(e.message),
  })
  const publish = useMutation({
    mutationFn: () => brandApi.publish(branches.map((b) => b.id)),
    onSuccess: (r) => { onChanged(); setConfirmPublish(false); showToast(r.published > 0 ? `Đã thêm ${r.published} món vào thực đơn các chi nhánh.` : `Cả ${branches.length} chi nhánh đã có đủ món.`, "success") },
    onError: (e) => showToast(e.message, "error"),
  })

  const columns: Column<Product>[] = [
    { key: "name", header: "Món", sort: (p) => p.name, render: (p) => <div className="flex items-center gap-3"><ProductImage src={p.imageUrl} name={p.name} className="h-10 w-10" /><div><p className="font-medium text-text-primary">{p.name}</p><p className="text-xs text-text-secondary">{p.sizes.length} cỡ · {p.toppings.length} topping</p></div></div> },
    { key: "cat", header: "Danh mục", sort: (p) => p.category, render: (p) => p.category },
    { key: "price", header: "Giá gốc", sort: (p) => p.basePrice, render: (p) => <span>{formatVND(p.basePrice)}{Object.keys(p.branchPrices).length > 0 && <span className="ml-1 text-xs text-text-secondary">(+{Object.keys(p.branchPrices).length} giá riêng)</span>}</span> },
    { key: "state", header: "Trạng thái", render: (p) => (!p.published ? <StatusPill tone="neutral">Bản nháp</StatusPill> : p.dirty ? <StatusPill tone="pending">Có thay đổi chưa publish</StatusPill> : <StatusPill tone="success">Đã publish</StatusPill>) },
    { key: "act", header: "", className: "text-right", render: (p) => <div className="flex justify-end gap-2"><Button variant="ghost" className="px-3 py-1.5 text-xs" onClick={() => { setServerError(null); setEditing(p) }}>Sửa</Button><Button variant="danger" className="px-3 py-1.5 text-xs" onClick={() => setRemoving(p)}>Xóa</Button></div> },
  ]

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        {pending > 0 ? <Banner tone="warn" action={<Button className="px-3 py-1.5 text-xs" onClick={() => setConfirmPublish(true)}>Publish</Button>}>Có {pending} thay đổi chưa publish. Khách chưa thấy các thay đổi này.</Banner> : <Banner tone="success" action={<Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => setConfirmPublish(true)}>Publish tới mọi chi nhánh</Button>}>Thực đơn dùng chung cho {branches.length} chi nhánh. Chi nhánh mới tạo chỉ có món sau khi bấm Publish.</Banner>}
        <Button onClick={() => { setServerError(null); setEditing("new") }}>Thêm món</Button>
      </div>
      <DataTable rows={rows} rowKey={(p) => p.id} columns={columns} pageSize={12} emptyTitle="Chưa có món nào" />
      {editing && (
        <MenuEditor key={editing === "new" ? "new" : editing.id} product={editing === "new" ? null : editing} categories={rows.map((p) => p.category)} branches={branches} saving={save.isPending} serverError={serverError} onSave={(i) => save.mutate(i)} onClose={() => setEditing(null)} />
      )}
      <ConfirmDialog open={!!removing} danger title={`Xóa món ${removing?.name ?? ""}?`} message="Món sẽ không còn trên thực đơn. Các đơn đã có vẫn giữ nguyên." confirmLabel="Xóa" onCancel={() => setRemoving(null)} onConfirm={() => removing && remove.mutate(removing.id)} />
      <ConfirmDialog open={confirmPublish} title="Publish thực đơn?" message={`${rows.length} món sẽ hiển thị cho khách tại ${branches.length} chi nhánh. Giá được backend tính lại khi khách đặt.`} confirmLabel="Publish" onCancel={() => setConfirmPublish(false)} onConfirm={() => publish.mutate()} />
    </>
  )
}
