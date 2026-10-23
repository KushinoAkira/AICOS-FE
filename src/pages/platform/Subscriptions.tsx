import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { Page } from "../../App"
import { Button, ConfirmDialog, DataTable, QueryBoundary, StatusPill, type Column, type Tone } from "../../components/ui"
import { useToast } from "../../context/ToastContext"
import { formatDate } from "../../lib/format"
import { platformApi, type Subscription, type SubscriptionStatus } from "../../lib/api/platform"
import { PlatformPage } from "./PlatformPage"

const LABEL: Record<SubscriptionStatus, string> = { Active: "Đang hoạt động", PastDue: "Quá hạn", Suspended: "Đã tạm ngưng" }
const TONE: Record<SubscriptionStatus, Tone> = { Active: "success", PastDue: "pending", Suspended: "danger" }

export default function PlatformSubscriptions({ navigate }: { navigate: (p: Page) => void }) {
  const qc = useQueryClient()
  const { showToast } = useToast()
  const subs = useQuery({ queryKey: ["platform", "subscriptions"], queryFn: platformApi.subscriptions })
  const plans = useQuery({ queryKey: ["platform", "plans"], queryFn: platformApi.plans })
  const [suspend, setSuspend] = useState<Subscription | null>(null)

  const change = useMutation({
    mutationFn: (v: { id: string; planId?: string; suspend?: boolean }) => platformApi.changeSubscription(v.id, v),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["platform"] }); showToast("Đã cập nhật đăng ký", "success"); setSuspend(null) },
    onError: (e) => showToast(e.message, "error"),
  })

  const columns: Column<Subscription>[] = [
    { key: "tenant", header: "Thương hiệu", sort: (s) => s.tenantName, render: (s) => <span className="font-medium text-text-primary">{s.tenantName}</span> },
    {
      key: "plan", header: "Gói",
      render: (s) => (
        <select aria-label={`Gói của ${s.tenantName}`} value={s.planId} disabled={s.status === "Suspended"} onChange={(e) => change.mutate({ id: s.id, planId: e.target.value })} className="rounded-[8px] border border-border bg-surface px-2 py-1.5 text-sm">
          {(plans.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      ),
    },
    { key: "status", header: "Trạng thái", render: (s) => <StatusPill tone={TONE[s.status]}>{LABEL[s.status]}</StatusPill> },
    { key: "pay", header: "Thanh toán", render: (s) => <StatusPill tone={s.paymentStatus === "Paid" ? "success" : "pending"}>{s.paymentStatus === "Paid" ? "Đã thanh toán" : "Chưa thanh toán"}</StatusPill> },
    { key: "renew", header: "Gia hạn", sort: (s) => s.renewsAtUtc, render: (s) => (s.overdueDays > 0 ? <span className="text-state-danger">Quá hạn {s.overdueDays} ngày</span> : formatDate(s.renewsAtUtc)) },
    { key: "act", header: "", className: "text-right", render: (s) => s.status === "PastDue" && <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => setSuspend(s)}>Tạm ngưng</Button> },
  ]

  return (
    <PlatformPage page="platform-subscriptions" navigate={navigate} uc="UC-07" title="Đăng ký của tenant" subtitle="Gói, thanh toán và hạn gia hạn của từng thương hiệu. Tạm ngưng khi quá hạn là quyết định của bạn.">
      <QueryBoundary query={subs}>{(rows) => <DataTable rows={rows} rowKey={(s) => s.id} columns={columns} />}</QueryBoundary>
      <ConfirmDialog open={!!suspend} danger title={`Tạm ngưng ${suspend?.tenantName ?? ""}?`} message="Thương hiệu sẽ bị chặn đăng nhập, API, QR và takeaway cho đến khi thanh toán." onCancel={() => setSuspend(null)} onConfirm={() => suspend && change.mutate({ id: suspend.id, suspend: true })} />
    </PlatformPage>
  )
}
