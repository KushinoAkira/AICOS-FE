import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { Page } from "../../App"
import { PageFrame } from "../../components/PageFrame"
import { Banner, Button, DataTable, EmptyState, QueryBoundary, StatusPill, type Column } from "../../components/ui"
import { useToast } from "../../context/ToastContext"
import { useActiveBranch } from "../../hooks/useActiveBranch"
import { brandApi, type Product, type ProductInput } from "../../lib/api/brand"
import { formatVND } from "../../lib/format"
import { ProductImage } from "../../components/OrderComposer"
import { MenuEditor } from "./MenuEditor"

/** Brand Admin + Branch Manager: CRUD menu of the active branch. */
export default function MenuPage({ navigate }: { navigate: (p: Page) => void }) {
  const { branchId, branch, needsSelection, canSwitch } = useActiveBranch()
  const products = useQuery({
    queryKey: ["brand", "products", branchId],
    queryFn: () => brandApi.products(),
    enabled: !!branchId,
  })
  const qc = useQueryClient()
  const refresh = () => void qc.invalidateQueries({ queryKey: ["brand", "products", branchId] })

  if (needsSelection) {
    return (
      <PageFrame page="manager-menu" navigate={navigate} uc="UC-14" title="Thực đơn" subtitle="Chọn chi nhánh trên thanh bên để quản lý thực đơn riêng của quán đó.">
        <EmptyState title="Chưa chọn chi nhánh" description={canSwitch ? "Dùng bộ chọn chi nhánh ở sidebar để bắt đầu." : "Tài khoản chưa gán chi nhánh."} />
      </PageFrame>
    )
  }

  return (
    <PageFrame
      page="manager-menu"
      navigate={navigate}
      uc="UC-14"
      title="Thực đơn"
      subtitle={`Thực đơn riêng của ${branch?.name ?? "chi nhánh"} — QR, POS và mang đi dùng cùng catalog này.`}
    >
      <QueryBoundary query={products}>
        {(rows) => <BranchMenu rows={rows} branchId={branchId!} onChanged={refresh} />}
      </QueryBoundary>
    </PageFrame>
  )
}

function BranchMenu({ rows, branchId, onChanged }: { rows: Product[]; branchId: string; onChanged: () => void }) {
  const { showToast } = useToast()
  const [editing, setEditing] = useState<Product | null | "new">(null)
  const [serverError, setServerError] = useState<string | null>(null)

  const save = useMutation({
    mutationFn: (input: ProductInput) => brandApi.saveProduct(editing && editing !== "new" ? editing.id : null, input),
    onSuccess: () => { onChanged(); setEditing(null); setServerError(null); showToast("Đã lưu món", "success") },
    onError: (e) => setServerError(e.message),
  })
  const toggle = useMutation({
    mutationFn: (v: { id: string; available: boolean }) => brandApi.setAvailability(v.id, branchId, v.available),
    onSuccess: () => { onChanged(); showToast("Đã cập nhật tình trạng món", "success") },
    onError: (e) => showToast(e.message, "error"),
  })

  const columns: Column<Product>[] = [
    {
      key: "name", header: "Món", sort: (p) => p.name,
      render: (p) => (
        <div className="flex items-center gap-3">
          <ProductImage src={p.imageUrl} name={p.name} className="h-10 w-10" />
          <div>
            <p className="font-medium text-text-primary">{p.name}</p>
            <p className="text-xs text-text-secondary">{p.sizes.length} cỡ · {p.toppings.length} topping</p>
          </div>
        </div>
      ),
    },
    { key: "cat", header: "Danh mục", sort: (p) => p.category, render: (p) => p.category },
    { key: "price", header: "Giá", sort: (p) => p.basePrice, render: (p) => formatVND(p.basePrice) },
    {
      key: "state", header: "Tình trạng",
      render: (p) => (!p.published
        ? <StatusPill tone="neutral">Ẩn</StatusPill>
        : p.soldOutAt.includes(branchId)
          ? <StatusPill tone="danger">Hết hàng</StatusPill>
          : <StatusPill tone="success">Còn bán</StatusPill>),
    },
    {
      key: "act", header: "", className: "text-right",
      render: (p) => {
        const out = p.soldOutAt.includes(branchId)
        return (
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              className="px-3 py-1.5 text-xs"
              loading={toggle.isPending && toggle.variables?.id === p.id}
              onClick={() => toggle.mutate({ id: p.id, available: out })}
            >
              {out ? "Còn" : "Hết"}
            </Button>
            <Button variant="ghost" className="px-3 py-1.5 text-xs" onClick={() => { setServerError(null); setEditing(p) }}>Sửa</Button>
          </div>
        )
      },
    },
  ]

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm text-text-secondary">{rows.length} món tại chi nhánh này</span>
        <Button onClick={() => { setServerError(null); setEditing("new") }}>Thêm món</Button>
      </div>
      {rows.length === 0 ? (
        <EmptyState title="Chưa có món" description="Thêm món đầu tiên cho chi nhánh này." action={<Button onClick={() => setEditing("new")}>Thêm món</Button>} />
      ) : (
        <DataTable rows={rows} rowKey={(p) => p.id} columns={columns} pageSize={12} />
      )}
      {editing && (
        <MenuEditor
          key={editing === "new" ? "new" : editing.id}
          product={editing === "new" ? null : editing}
          saving={save.isPending}
          serverError={serverError}
          onSave={(i) => save.mutate(i)}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  )
}
