import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { Page } from "../../App"
import { PageFrame } from "../../components/PageFrame"
import { Banner, Button, Card, EmptyState, Field, QueryBoundary, StatusPill } from "../../components/ui"
import { useAuth } from "../../context/AuthContext"
import { useToast } from "../../context/ToastContext"
import { brandApi, type BranchPickup, type PickupSettings } from "../../lib/api/brand"
import { PICKUP_FIELDS, pickupRule } from "./SettingsPages"

/** UC-21 for the Branch Manager: inherit the chain default or override it for this branch. */
export default function BranchPickupPage({ navigate }: { navigate: (p: Page) => void }) {
  const { user } = useAuth()
  const branchId = user?.branchId
  const query = useQuery({ queryKey: ["branch", branchId, "pickup"], queryFn: () => brandApi.branchPickup(branchId!), enabled: !!branchId })
  return (
    <PageFrame page="branch-pickup" navigate={navigate} uc="UC-21" title="Khung giờ lấy hàng" subtitle="Mặc định do thương hiệu đặt. Bạn có thể ghi đè riêng cho chi nhánh này.">
      {!branchId ? <EmptyState title="Tài khoản chưa gán chi nhánh" description="Liên hệ quản trị thương hiệu để được gán chi nhánh." /> : (
        <QueryBoundary query={query}>{(data) => <Editor key={JSON.stringify(data)} data={data} branchId={branchId} />}</QueryBoundary>
      )}
    </PageFrame>
  )
}

function Editor({ data, branchId }: { data: BranchPickup; branchId: string }) {
  const qc = useQueryClient()
  const { showToast } = useToast()
  const [override, setOverride] = useState(!data.inherited)
  const [draft, setDraft] = useState<Record<string, string>>(() => Object.fromEntries(Object.entries(data.values).map(([k, v]) => [k, String(v)])))
  const [error, setError] = useState<string | null>(null)

  const save = useMutation({
    mutationFn: (v: PickupSettings | null) => brandApi.saveBranchPickup(branchId, v),
    onSuccess: (res) => { qc.setQueryData(["branch", branchId, "pickup"], res); showToast("Đã lưu", "success") },
    onError: (e) => setError(e.message),
  })

  function submit() {
    if (!override) return save.mutate(null)
    const value = {} as Record<string, number>
    for (const f of PICKUP_FIELDS) {
      const n = Number(draft[f.key])
      if (draft[f.key] === "" || Number.isNaN(n) || n < f.min || n > f.max) return setError(`"${f.label}" phải từ ${f.min} đến ${f.max}`)
      value[f.key] = n
    }
    const typed = value as unknown as PickupSettings
    const rule = pickupRule(typed)
    if (rule) return setError(rule)
    save.mutate(typed)
  }

  return (
    <Card className="max-w-2xl">
      <div className="mb-5 flex items-center justify-between">
        <StatusPill tone={override ? "info" : "neutral"}>{override ? "Đang ghi đè cho chi nhánh" : "Đang kế thừa mặc định thương hiệu"}</StatusPill>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" className="h-4 w-4 accent-[var(--color-terracotta)]" checked={override} onChange={(e) => { setOverride(e.target.checked); setError(null) }} />
          Ghi đè cho chi nhánh này
        </label>
      </div>
      {error && <div className="mb-4"><Banner>{error}</Banner></div>}
      <div className="space-y-4">
        {PICKUP_FIELDS.map((f) => (
          <div key={f.key} className="flex items-end gap-2">
            <div className="flex-1">
              <Field
                label={f.label}
                inputMode="numeric"
                disabled={!override}
                value={override ? draft[f.key] : String(data.defaults[f.key])}
                onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value.replace(/\D/g, "") }))}
                hint={override ? `Mặc định thương hiệu: ${data.defaults[f.key]} ${f.suffix}` : "Kế thừa từ thương hiệu"}
              />
            </div>
            <span className="pb-3 text-sm text-text-secondary">{f.suffix}</span>
          </div>
        ))}
      </div>
      <Button className="mt-6" loading={save.isPending} onClick={submit}>Lưu</Button>
    </Card>
  )
}
