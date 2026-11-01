import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { Page } from "../../App"
import { PageFrame } from "../../components/PageFrame"
import { Banner, Button, Card, DataTable, QueryBoundary, StatusPill } from "../../components/ui"
import { featureFlags } from "../../config/featureFlags"
import { useToast } from "../../context/ToastContext"
import { brandApi } from "../../lib/api/brand"
import { ApiError } from "../../lib/api/http"
import { invoiceApi } from "../../lib/api/manage"
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
  const sub = useQuery({ queryKey: ["brand", "subscription"], queryFn: brandApi.subscription, retry: false })
  const noPlan = sub.error instanceof ApiError && sub.error.status === 404
  const invoices = useQuery({ queryKey: ["brand", "invoices"], queryFn: invoiceApi.list })
  const renew = useMutation({
    mutationFn: brandApi.renew,
    onSuccess: (data) => { qc.setQueryData(["brand", "subscription"], data); void qc.invalidateQueries({ queryKey: ["brand", "invoices"] }); showToast("Đã gia hạn (mô phỏng)", "success") },
    onError: (e) => showToast(e.message, "error"),
  })
  return (
    <PageFrame page="brand-subscription" navigate={navigate} uc="UC-22" title="Gói đăng ký" subtitle="Gói hiện tại, mức sử dụng và ngày gia hạn.">
      {noPlan ? <Banner tone="warn">Thương hiệu chưa có gói dịch vụ. Hãy liên hệ AICOS để được gán gói.</Banner> : <QueryBoundary query={sub}>
        {(s) => (
          <Card className="max-w-2xl">
            {s.status !== "Active" && <div className="mb-5"><Banner tone="warn">Gói đang {s.status === "PastDue" ? "quá hạn" : "bị tạm ngưng"}. Gia hạn để tiếp tục sử dụng đầy đủ.</Banner></div>}
            <div className="flex items-start justify-between">
              <div><h2 className="font-serif text-2xl text-text-primary">{s.planName}</h2><p className="text-sm text-text-secondary">{formatVND(s.monthlyFee)} / tháng</p></div>
              <StatusPill tone={s.status === "Active" ? "success" : "pending"}>{s.status === "Active" ? "Đang hoạt động" : s.status === "PastDue" ? "Quá hạn" : "Tạm ngưng"}</StatusPill>
            </div>
            <div className="mt-6 space-y-4"><Meter label="Chi nhánh" used={s.usedBranches} max={s.maxBranches} /><Meter label="Người dùng" used={s.usedUsers} max={s.maxUsers} /></div>
            <p className="mt-4 text-sm text-text-secondary">Bàn và mã QR mỗi chi nhánh: <b className="text-text-primary">{s.maxTablesPerBranch ? `tối đa ${s.maxTablesPerBranch}` : "không giới hạn"}</b></p>
            <p className="mt-6 text-sm text-text-secondary">Gia hạn tiếp theo: <b className="text-text-primary">{formatDate(s.renewsAtUtc)}</b></p>
            {featureFlags.renewSimulated && <Button className="mt-4" loading={renew.isPending} onClick={() => renew.mutate()}>Gia hạn thêm 30 ngày (mô phỏng)</Button>}
          </Card>
        )}
      </QueryBoundary>}
      <h2 className="mb-3 mt-8 font-serif text-lg text-text-primary">Lịch sử hóa đơn</h2>
      <QueryBoundary query={invoices}>
        {(rows) => (
          <DataTable
            rows={rows}
            rowKey={(i) => i.id}
            emptyTitle="Chưa có hóa đơn nào"
            columns={[
              { key: "d", header: "Ngày trả", sort: (i) => i.paidAtUtc, render: (i) => formatDate(i.paidAtUtc) },
              { key: "p", header: "Kỳ bắt đầu", render: (i) => formatDate(i.periodStartUtc) },
              { key: "a", header: "Số tiền", sort: (i) => i.amount, render: (i) => formatVND(i.amount) },
              { key: "m", header: "Hình thức", render: (i) => i.method },
              { key: "r", header: "Mã tham chiếu", render: (i) => i.reference ?? "-" },
            ]}
          />
        )}
      </QueryBoundary>
    </PageFrame>
  )
}
