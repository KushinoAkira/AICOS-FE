import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { Page } from "../../App"
import { Banner, Button, Card, Field, Modal, QueryBoundary } from "../../components/ui"
import { useToast } from "../../context/ToastContext"
import { formatVND } from "../../lib/format"
import { platformApi, type Plan } from "../../lib/api/platform"
import { PlatformPage } from "./PlatformPage"

export default function PlatformPlans({ navigate }: { navigate: (p: Page) => void }) {
  const qc = useQueryClient()
  const { showToast } = useToast()
  const plans = useQuery({ queryKey: ["platform", "plans"], queryFn: platformApi.plans })
  const [editing, setEditing] = useState<Plan | null>(null)
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)

  const save = useMutation({
    mutationFn: (p: Plan) => platformApi.updatePlan(p.id, { name: p.name, monthlyFee: p.monthlyFee, billingCycle: p.billingCycle, maxBranches: p.maxBranches, maxUsers: p.maxUsers, graceDays: p.graceDays }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["platform"] }); showToast("Đã lưu gói", "success"); setEditing(null) },
    onError: (e) => setError(e.message),
  })

  function open(p: Plan) {
    setEditing(p)
    setError(null)
    setDraft({ monthlyFee: String(p.monthlyFee), maxBranches: String(p.maxBranches), maxUsers: String(p.maxUsers), graceDays: String(p.graceDays) })
  }

  return (
    <PlatformPage page="platform-plans" navigate={navigate} uc="UC-06" title="Gói dịch vụ" subtitle="Phí và giới hạn áp dụng cho mọi tenant dùng gói.">
      <QueryBoundary query={plans}>
        {(rows) => (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {rows.map((p) => (
              <Card key={p.id}>
                <h2 className="font-serif text-xl text-text-primary">{p.name}</h2>
                <p className="mt-2 font-serif text-3xl text-terracotta">{formatVND(p.monthlyFee)}<span className="text-sm text-text-secondary"> /tháng</span></p>
                <ul className="mt-4 space-y-1 text-sm text-text-secondary">
                  <li>Tối đa <b className="text-text-primary">{p.maxBranches}</b> chi nhánh</li>
                  <li>Tối đa <b className="text-text-primary">{p.maxUsers}</b> người dùng</li>
                  <li>Gia hạn trễ: <b className="text-text-primary">{p.graceDays}</b> ngày</li>
                </ul>
                <Button variant="secondary" className="mt-5 w-full" onClick={() => open(p)}>Chỉnh sửa</Button>
              </Card>
            ))}
          </div>
        )}
      </QueryBoundary>

      <Modal open={!!editing} title={`Chỉnh sửa gói ${editing?.name ?? ""}`} onClose={() => setEditing(null)}
        footer={<><Button variant="secondary" onClick={() => setEditing(null)}>Hủy</Button><Button loading={save.isPending} onClick={() => editing && save.mutate({ ...editing, monthlyFee: Number(draft.monthlyFee), maxBranches: Number(draft.maxBranches), maxUsers: Number(draft.maxUsers), graceDays: Number(draft.graceDays) })}>Lưu</Button></>}>
        <div className="space-y-4">
          {error && <Banner>{error}</Banner>}
          {([["monthlyFee", "Phí hàng tháng (₫)"], ["maxBranches", "Số chi nhánh tối đa"], ["maxUsers", "Số người dùng tối đa"], ["graceDays", "Số ngày gia hạn trễ"]] as const).map(([k, label]) => (
            <Field key={k} label={label} inputMode="numeric" value={draft[k] ?? ""} onChange={(e) => setDraft((d) => ({ ...d, [k]: e.target.value.replace(/\D/g, "") }))} />
          ))}
        </div>
      </Modal>
    </PlatformPage>
  )
}
