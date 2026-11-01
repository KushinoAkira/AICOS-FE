import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { Page } from "../../App"
import { Banner, Button, Card, Field, Modal, QueryBoundary, StatusPill } from "../../components/ui"
import { useToast } from "../../context/ToastContext"
import { formatVND } from "../../lib/format"
import { platformApi, type Plan } from "../../lib/api/platform"
import { PlatformPage } from "./PlatformPage"

const CYCLE: Record<Plan["billingCycle"], string> = { Monthly: "tháng", Quarterly: "quý", Yearly: "năm" }
const EMPTY = { name: "", monthlyFee: "", billingCycle: "Monthly", maxBranches: "", maxUsers: "", maxTables: "", description: "" }
const limit = (n: number, what: string) => (n > 0 ? <>Tối đa <b className="text-text-primary">{n}</b> {what}</> : <>Không giới hạn {what}</>)

/** UC-06: the plans brands can rent. A plan is taken off sale rather than deleted, because brands may still be on it. */
export default function PlatformPlans({ navigate }: { navigate: (p: Page) => void }) {
  const qc = useQueryClient()
  const { showToast } = useToast()
  const plans = useQuery({ queryKey: ["platform", "plans"], queryFn: platformApi.plans })
  const [editing, setEditing] = useState<Plan | null>(null)
  const [creating, setCreating] = useState(false)
  const [draft, setDraft] = useState(EMPTY)
  const [error, setError] = useState<string | null>(null)
  const close = () => { setEditing(null); setCreating(false) }

  const save = useMutation({
    mutationFn: () => {
      const body = {
        name: draft.name.trim(), monthlyFee: Number(draft.monthlyFee), billingCycle: draft.billingCycle as Plan["billingCycle"],
        maxBranches: Number(draft.maxBranches), maxUsers: Number(draft.maxUsers), maxTablesPerBranch: Number(draft.maxTables), description: draft.description.trim(), tier: editing?.tier,
      }
      return editing ? platformApi.updatePlan(editing.id, body) : platformApi.createPlan(body)
    },
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["platform"] }); showToast("Đã lưu gói", "success"); close() },
    onError: (e) => setError(e.message),
  })
  const setActive = useMutation({
    mutationFn: (p: Plan) => platformApi.setPlanActive(p.id, p.isActive === false),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["platform"] }); showToast("Đã cập nhật gói", "success") },
    onError: (e) => showToast(e.message, "error"),
  })

  function openEdit(p: Plan) {
    setEditing(p)
    setCreating(false)
    setError(null)
    setDraft({
      name: p.name, monthlyFee: String(p.monthlyFee), billingCycle: p.billingCycle,
      maxBranches: p.maxBranches ? String(p.maxBranches) : "", maxUsers: p.maxUsers ? String(p.maxUsers) : "", maxTables: p.maxTablesPerBranch ? String(p.maxTablesPerBranch) : "", description: p.description ?? "",
    })
  }
  function openCreate() {
    setEditing(null)
    setCreating(true)
    setError(null)
    setDraft(EMPTY)
  }
  function submit() {
    if (draft.name.trim().length < 2) return setError("Nhập tên gói")
    if (!draft.monthlyFee) return setError("Nhập phí của gói")
    setError(null)
    save.mutate()
  }

  return (
    <PlatformPage page="platform-plans" navigate={navigate} uc="UC-06" title="Gói dịch vụ" subtitle="Phí và giới hạn áp dụng cho mọi tenant dùng gói." action={<Button onClick={openCreate}>Tạo gói</Button>}>
      <QueryBoundary query={plans}>
        {(rows) => (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {rows.map((p) => (
              <Card key={p.id}>
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-serif text-xl text-text-primary">{p.name}</h2>
                  <StatusPill tone={p.isActive === false ? "neutral" : "success"}>{p.isActive === false ? "Ngừng bán" : "Đang bán"}</StatusPill>
                </div>
                <p className="mt-2 font-serif text-3xl text-terracotta">{formatVND(p.monthlyFee)}<span className="text-sm text-text-secondary"> /{CYCLE[p.billingCycle]}</span></p>
                {p.description && <p className="mt-2 text-sm text-text-secondary">{p.description}</p>}
                <ul className="mt-4 space-y-1 text-sm text-text-secondary">
                  <li>{limit(p.maxBranches, "chi nhánh")}</li>
                  <li>{limit(p.maxUsers, "người dùng")}</li>
                  <li>{limit(p.maxTablesPerBranch ?? 0, "bàn và mã QR mỗi chi nhánh")}</li>
                  <li><b className="text-text-primary">{p.subscribers ?? 0}</b> thương hiệu đang dùng</li>
                </ul>
                <div className="mt-5 flex gap-2">
                  <Button variant="secondary" className="flex-1" onClick={() => openEdit(p)}>Chỉnh sửa</Button>
                  <Button variant="ghost" loading={setActive.isPending && setActive.variables?.id === p.id} onClick={() => setActive.mutate(p)}>{p.isActive === false ? "Mở bán lại" : "Ngừng bán"}</Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </QueryBoundary>

      <Modal open={!!editing || creating} title={editing ? `Chỉnh sửa gói ${editing.name}` : "Tạo gói mới"} onClose={close}
        footer={<><Button variant="secondary" onClick={close}>Hủy</Button><Button loading={save.isPending} onClick={submit}>Lưu</Button></>}>
        <div className="space-y-4">
          {error && <Banner>{error}</Banner>}
          <Field label="Tên gói" value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
          <Field label="Phí mỗi kỳ (₫)" inputMode="numeric" value={draft.monthlyFee} onChange={(e) => setDraft((d) => ({ ...d, monthlyFee: e.target.value.replace(/\D/g, "") }))} />
          <div>
            <label htmlFor="plan-cycle" className="mb-1.5 block text-sm font-medium text-text-primary">Chu kỳ thanh toán</label>
            <select id="plan-cycle" value={draft.billingCycle} onChange={(e) => setDraft((d) => ({ ...d, billingCycle: e.target.value }))} className="w-full rounded-[10px] border border-border bg-surface px-3 py-2.5 text-sm">
              <option value="Monthly">Hàng tháng</option>
              <option value="Quarterly">Hàng quý</option>
              <option value="Yearly">Hàng năm</option>
            </select>
          </div>
          <Field label="Số chi nhánh tối đa" hint="Để trống là không giới hạn." inputMode="numeric" value={draft.maxBranches} onChange={(e) => setDraft((d) => ({ ...d, maxBranches: e.target.value.replace(/\D/g, "") }))} />
          <Field label="Số người dùng tối đa" hint="Để trống là không giới hạn." inputMode="numeric" value={draft.maxUsers} onChange={(e) => setDraft((d) => ({ ...d, maxUsers: e.target.value.replace(/\D/g, "") }))} />
          <Field label="Số bàn và mã QR tối đa mỗi chi nhánh" hint="Để trống là không giới hạn. Hạ gói chỉ chặn tạo thêm, không ảnh hưởng bàn đang có." inputMode="numeric" value={draft.maxTables} onChange={(e) => setDraft((d) => ({ ...d, maxTables: e.target.value.replace(/\D/g, "") }))} />
          <Field label="Mô tả" value={draft.description} onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))} />
        </div>
      </Modal>
    </PlatformPage>
  )
}
