import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { Page } from "../../App"
import { Banner, Button, ConfirmDialog, DataTable, Field, Modal, QueryBoundary, StatusPill, type Column, type Tone } from "../../components/ui"
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
  const [paying, setPaying] = useState<Subscription | null>(null)
  const [amount, setAmount] = useState("")
  const [method, setMethod] = useState("BankTransfer")
  const [reference, setReference] = useState("")
  const [error, setError] = useState<string | null>(null)
  const openPay = (s: Subscription) => {
    setPaying(s)
    setAmount(String(s.outstanding || ((plans.data ?? []).find((p) => p.id === s.planId)?.monthlyFee ?? "")))
    setMethod("BankTransfer")
    setReference("")
    setError(null)
  }
  const record = useMutation({
    mutationFn: () => platformApi.recordPayment(paying?.id ?? "", { amount: Number(amount), method, reference }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["platform"] }); showToast("Đã ghi nhận thanh toán", "success"); setPaying(null) },
    onError: (e) => setError(e.message),
  })

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
          {(plans.data ?? []).filter((p) => p.isActive !== false || p.id === s.planId).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      ),
    },
    { key: "status", header: "Trạng thái", render: (s) => <StatusPill tone={TONE[s.status]}>{LABEL[s.status]}</StatusPill> },
    { key: "pay", header: "Thanh toán", render: (s) => <StatusPill tone={s.paymentStatus === "Paid" ? "success" : "pending"}>{s.paymentStatus === "Paid" ? "Đã thanh toán" : "Chưa thanh toán"}</StatusPill> },
    { key: "renew", header: "Gia hạn", sort: (s) => s.renewsAtUtc, render: (s) => (s.overdueDays > 0 ? <span className="text-state-danger">Quá hạn {s.overdueDays} ngày</span> : formatDate(s.renewsAtUtc)) },
    { key: "act", header: "", className: "text-right", render: (s) => <span className="flex justify-end gap-2">{s.paymentStatus !== "Paid" && <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => openPay(s)}>Ghi nhận thanh toán</Button>}{s.status === "PastDue" && <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => setSuspend(s)}>Tạm ngưng</Button>}</span> },
  ]

  return (
    <PlatformPage page="platform-subscriptions" navigate={navigate} uc="UC-07" title="Đăng ký của tenant" subtitle="Gói, thanh toán và hạn gia hạn của từng thương hiệu. Tạm ngưng khi quá hạn là quyết định của bạn.">
      <QueryBoundary query={subs}>{(rows) => <DataTable rows={rows} rowKey={(s) => s.id} columns={columns} />}</QueryBoundary>
      <Modal open={!!paying} title={`Ghi nhận thanh toán: ${paying?.tenantName ?? ""}`} onClose={() => setPaying(null)}
        footer={<><Button variant="secondary" onClick={() => setPaying(null)}>Hủy</Button><Button loading={record.isPending} disabled={!amount} onClick={() => record.mutate()}>Lưu</Button></>}>
        <div className="space-y-4">
          {error && <Banner>{error}</Banner>}
          <Field label="Số tiền (₫)" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))} />
          <div>
            <label htmlFor="sub-method" className="mb-1.5 block text-sm font-medium text-text-primary">Hình thức</label>
            <select id="sub-method" value={method} onChange={(e) => setMethod(e.target.value)} className="w-full rounded-[10px] border border-border bg-surface px-3 py-2.5 text-sm">
              <option value="BankTransfer">Chuyển khoản</option>
              <option value="Cash">Tiền mặt</option>
            </select>
          </div>
          <Field label="Mã tham chiếu" hint="Không bắt buộc." value={reference} onChange={(e) => setReference(e.target.value)} />
        </div>
      </Modal>
      <ConfirmDialog open={!!suspend} danger title={`Tạm ngưng ${suspend?.tenantName ?? ""}?`} message="Thương hiệu sẽ bị chặn đăng nhập, API, QR và takeaway cho đến khi thanh toán." onCancel={() => setSuspend(null)} onConfirm={() => suspend && change.mutate({ id: suspend.id, suspend: true })} />
    </PlatformPage>
  )
}
