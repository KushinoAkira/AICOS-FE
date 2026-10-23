import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { Page } from "../../App"
import { PageFrame } from "../../components/PageFrame"
import { Banner, Button, Card, QueryBoundary, StatusPill } from "../../components/ui"
import { featureFlags } from "../../config/featureFlags"
import { useToast } from "../../context/ToastContext"
import { brandApi } from "../../lib/api/brand"
import { formatDate, formatVND } from "../../lib/format"

function Meter({ label, used, max }: { label: string; used: number; max: number }) {
  const pct = Math.min(100, Math.round((used / max) * 100))
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm"><span className="text-text-secondary">{label}</span><span className="text-text-primary">{used}/{max}</span></div>
      <div className="h-2 rounded-full bg-bg-warm" role="progressbar" aria-valuenow={used} aria-valuemin={0} aria-valuemax={max} aria-label={label}>
        <div className={`h-2 rounded-full ${pct >= 100 ? "bg-state-danger" : "bg-terracotta"}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export default function BrandSubscription({ navigate }: { navigate: (p: Page) => void }) {
  const qc = useQueryClient()
  const { showToast } = useToast()
  const sub = useQuery({ queryKey: ["brand", "subscription"], queryFn: brandApi.subscription })
  const renew = useMutation({
    mutationFn: brandApi.renew,
    onSuccess: (data) => { qc.setQueryData(["brand", "subscription"], data); showToast("Đã gia hạn (mô phỏng)", "success") },
    onError: (e) => showToast(e.message, "error"),
  })
  return (
    <PageFrame page="brand-subscription" navigate={navigate} uc="UC-22" title="Gói đăng ký" subtitle="Gói hiện tại, mức sử dụng và ngày gia hạn.">
      <QueryBoundary query={sub}>
        {(s) => (
          <Card className="max-w-2xl">
            {s.status !== "Active" && <div className="mb-5"><Banner tone="warn">Gói đang {s.status === "PastDue" ? "quá hạn" : "bị tạm ngưng"}. Gia hạn để tiếp tục sử dụng đầy đủ.</Banner></div>}
            <div className="flex items-start justify-between">
              <div><h2 className="font-serif text-2xl text-text-primary">{s.planName}</h2><p className="text-sm text-text-secondary">{formatVND(s.monthlyFee)} / tháng</p></div>
              <StatusPill tone={s.status === "Active" ? "success" : "pending"}>{s.status === "Active" ? "Đang hoạt động" : s.status === "PastDue" ? "Quá hạn" : "Tạm ngưng"}</StatusPill>
            </div>
            <div className="mt-6 space-y-4"><Meter label="Chi nhánh" used={s.usedBranches} max={s.maxBranches} /><Meter label="Người dùng" used={s.usedUsers} max={s.maxUsers} /></div>
            <p className="mt-6 text-sm text-text-secondary">Gia hạn tiếp theo: <b className="text-text-primary">{formatDate(s.renewsAtUtc)}</b></p>
            {featureFlags.renewSimulated && <Button className="mt-4" loading={renew.isPending} onClick={() => renew.mutate()}>Gia hạn thêm 30 ngày (mô phỏng)</Button>}
          </Card>
        )}
      </QueryBoundary>
    </PageFrame>
  )
}
