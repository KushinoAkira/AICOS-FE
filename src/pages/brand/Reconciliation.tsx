import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { Page } from "../../App"
import { PageFrame } from "../../components/PageFrame"
import { Banner, Button, DataTable, Field, KpiCard, Modal, QueryBoundary, StatusPill, type Column } from "../../components/ui"
import { useToast } from "../../context/ToastContext"
import { addDays, reconciliationApi, today, type Discrepancy, type Refund } from "../../lib/api/manage"
import { formatDateTime, formatVND } from "../../lib/format"

const REFUND_TEXT: Record<string, string> = { PendingApproval: "Chờ duyệt", Succeeded: "Đã hoàn", Failed: "Lỗi", Rejected: "Từ chối" }

/** UC-35: payments against orders for a period, what disagrees, and the refunds waiting for a decision. */
export default function BrandReconciliation({ navigate }: { navigate: (p: Page) => void }) {
  const qc = useQueryClient()
  const { showToast } = useToast()
  const [to, setTo] = useState(today())
  const [from, setFrom] = useState(addDays(today(), -29))
  const range = { from, to }
  const report = useQuery({ queryKey: ["reconciliation", from, to], queryFn: () => reconciliationApi.report(range) })
  const compare = useQuery({ queryKey: ["reconciliation", "auto", from, to], queryFn: () => reconciliationApi.auto(range) })
  const refunds = useQuery({ queryKey: ["refunds"], queryFn: reconciliationApi.refunds })
  const [deciding, setDeciding] = useState<{ refund: Refund; approve: boolean } | null>(null)
  const [note, setNote] = useState("")
  const [error, setError] = useState<string | null>(null)
  const decide = useMutation({
    mutationFn: () => (deciding?.approve ? reconciliationApi.approveRefund(deciding.refund.id, note.trim()) : reconciliationApi.rejectRefund(deciding?.refund.id ?? "", note.trim())),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["refunds"] }); void qc.invalidateQueries({ queryKey: ["reconciliation"] }); setDeciding(null); showToast("Đã xử lý yêu cầu hoàn tiền.", "success") },
    onError: (e) => setError(e.message),
  })
  const submit = () => {
    if (deciding && !deciding.approve && note.trim().length < 3) return setError("Nhập lý do từ chối")
    setError(null)
    decide.mutate()
  }
  const issueColumns: Column<Discrepancy>[] = [
    { key: "c", header: "Loại", render: (d) => <code className="text-xs text-text-primary">{d.code}</code> },
    { key: "m", header: "Nội dung", render: (d) => d.message },
    { key: "a", header: "Số tiền", render: (d) => (d.amount === null ? "-" : formatVND(d.amount)) },
  ]
  const refundColumns: Column<Refund>[] = [
    { key: "t", header: "Thời gian", sort: (r) => r.createdAtUtc, render: (r) => formatDateTime(r.createdAtUtc) },
    { key: "a", header: "Số tiền", sort: (r) => r.amount, render: (r) => formatVND(r.amount) },
    { key: "w", header: "Lý do", render: (r) => r.reason },
    { key: "p", header: "Chính sách", render: (r) => (r.withinPolicy ? "Trong chính sách" : "Ngoại lệ") },
    { key: "s", header: "Trạng thái", render: (r) => <StatusPill tone={r.status === "Succeeded" ? "success" : r.status === "PendingApproval" ? "pending" : "danger"}>{REFUND_TEXT[r.status] ?? r.status}</StatusPill> },
    {
      key: "x", header: "", className: "text-right", render: (r) => r.status !== "PendingApproval" ? null : (
        <div className="flex justify-end gap-2">
          <Button className="px-3 py-1.5 text-xs" onClick={() => { setNote(""); setError(null); setDeciding({ refund: r, approve: true }) }}>Duyệt</Button>
          <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => { setNote(""); setError(null); setDeciding({ refund: r, approve: false }) }}>Từ chối</Button>
        </div>
      ),
    },
  ]
  return (
    <PageFrame page="brand-reconciliation" navigate={navigate} uc="UC-35" title="Đối soát" subtitle="Đối chiếu giao dịch với đơn hàng, phát hiện chênh lệch và xử lý hoàn tiền.">
      <div className="mb-6 flex flex-wrap items-end gap-3">
        <div className="w-40"><Field label="Từ ngày" type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} /></div>
        <div className="w-40"><Field label="Đến ngày" type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} /></div>
      </div>
      <QueryBoundary query={report}>
        {(r) => (
          <>
            <div className="mb-8 grid grid-cols-2 gap-4 xl:grid-cols-4">
              <KpiCard label="Đã thu" value={formatVND(r.gross)} hint={`${r.paidCount} / ${r.paymentCount} giao dịch thành công`} />
              <KpiCard label="Đã hoàn" value={formatVND(r.refunded)} />
              <KpiCard label="Thực nhận" value={formatVND(r.net)} />
              <KpiCard label="Hoàn tiền chờ duyệt" value={r.refundsPendingApproval} tone={r.refundsPendingApproval ? "warn" : "neutral"} />
            </div>
            <h2 className="mb-3 font-serif text-lg text-text-primary">Theo hình thức</h2>
            <DataTable
              rows={r.byMethod}
              rowKey={(m) => m.method}
              emptyTitle="Chưa có giao dịch"
              columns={[
                { key: "m", header: "Hình thức", render: (m) => m.method },
                { key: "c", header: "Giao dịch", render: (m) => m.count },
                { key: "g", header: "Đã thu", render: (m) => formatVND(m.gross) },
                { key: "x", header: "Đã hoàn", render: (m) => formatVND(m.refunded) },
                { key: "n", header: "Thực nhận", render: (m) => formatVND(m.net) },
              ]}
            />
          </>
        )}
      </QueryBoundary>

      <h2 className="mb-3 mt-8 font-serif text-lg text-text-primary">Đối chiếu với đơn hàng</h2>
      <QueryBoundary query={compare}>
        {(c) => (
          <>
            <div className="mb-3"><Banner tone={c.discrepancies.length ? "warn" : "success"}>{c.matched}/{c.orders} đơn khớp với giao dịch{c.discrepancies.length ? `, ${c.discrepancies.length} điểm cần xem lại.` : "."}</Banner></div>
            {c.discrepancies.length > 0 && <DataTable rows={c.discrepancies} rowKey={(d) => `${d.code}-${d.paymentId ?? ""}-${d.orderId ?? ""}`} columns={issueColumns} />}
          </>
        )}
      </QueryBoundary>

      <h2 className="mb-3 mt-8 font-serif text-lg text-text-primary">Hoàn tiền</h2>
      <QueryBoundary query={refunds}>{(rows) => <DataTable rows={rows} rowKey={(r) => r.id} columns={refundColumns} emptyTitle="Chưa có yêu cầu hoàn tiền" />}</QueryBoundary>

      <Modal open={!!deciding} title={deciding?.approve ? "Duyệt hoàn tiền" : "Từ chối hoàn tiền"} onClose={() => setDeciding(null)} footer={<><Button variant="secondary" onClick={() => setDeciding(null)}>Hủy</Button><Button loading={decide.isPending} onClick={submit}>{deciding?.approve ? "Duyệt" : "Từ chối"}</Button></>}>
        <div className="space-y-4">
          {error && <Banner>{error}</Banner>}
          <p className="text-sm text-text-secondary">Số tiền <b className="text-text-primary">{formatVND(deciding?.refund.amount ?? 0)}</b> · {deciding?.refund.reason}</p>
          <Field label={deciding?.approve ? "Ghi chú (không bắt buộc)" : "Lý do từ chối"} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
      </Modal>
    </PageFrame>
  )
}
