import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import type { Page } from "../../App"
import { PageFrame } from "../../components/PageFrame"
import { RefundApprovals } from "../../components/RefundApprovals"
import { Banner, DataTable, Field, KpiCard, QueryBoundary, type Column } from "../../components/ui"
import { addDays, reconciliationApi, today, type Discrepancy } from "../../lib/api/manage"
import { formatVND } from "../../lib/format"

/** UC-35: payments against orders for a period, what disagrees, and the refunds waiting for a decision. */
export default function BrandReconciliation({ navigate }: { navigate: (p: Page) => void }) {
  const [to, setTo] = useState(today())
  const [from, setFrom] = useState(addDays(today(), -29))
  const range = { from, to }
  const report = useQuery({ queryKey: ["reconciliation", from, to], queryFn: () => reconciliationApi.report(range) })
  const compare = useQuery({ queryKey: ["reconciliation", "auto", from, to], queryFn: () => reconciliationApi.auto(range) })
  const issueColumns: Column<Discrepancy>[] = [
    { key: "c", header: "Loại", render: (d) => <code className="text-xs text-text-primary">{d.code}</code> },
    { key: "m", header: "Nội dung", render: (d) => d.message },
    { key: "a", header: "Số tiền", render: (d) => (d.amount === null ? "-" : formatVND(d.amount)) },
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

      <div className="mt-8"><RefundApprovals title="Hoàn tiền" /></div>

    </PageFrame>
  )
}
