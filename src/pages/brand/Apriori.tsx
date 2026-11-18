import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { Page } from "../../App"
import { PageFrame } from "../../components/PageFrame"
import { Button, DataTable, EmptyState, QueryBoundary, StatusPill, type Column } from "../../components/ui"
import { useToast } from "../../context/ToastContext"
import { aprioriApi, type AssociationRule } from "../../lib/api/apriori"
import { formatDateTime } from "../../lib/format"

/** Brand Admin: Apriori buy-together rules and combo voucher status. */
export default function BrandApriori({ navigate }: { navigate: (p: Page) => void }) {
  const qc = useQueryClient()
  const { showToast } = useToast()
  const rules = useQuery({ queryKey: ["brand", "apriori-rules"], queryFn: aprioriApi.listRules })
  const run = useMutation({
    mutationFn: aprioriApi.run,
    onSuccess: (r) => {
      void qc.invalidateQueries({ queryKey: ["brand", "apriori-rules"] })
      showToast(`Đã chạy Apriori: ${r.ruleCount} luật, ${r.promotedCount} voucher combo mới`, "success")
    },
    onError: (e) => showToast(e.message, "error"),
  })

  const columns: Column<AssociationRule>[] = [
    { key: "a", header: "Món A", render: (r) => <span className="font-medium text-text-primary">{r.antecedentNames}</span> },
    { key: "b", header: "Thường mua kèm", render: (r) => <span className="text-text-primary">{r.consequentNames}</span> },
    { key: "sup", header: "Support", sort: (r) => r.support, render: (r) => `${(r.support * 100).toFixed(1)}%` },
    { key: "conf", header: "Confidence", sort: (r) => r.confidence, render: (r) => `${(r.confidence * 100).toFixed(1)}%` },
    { key: "lift", header: "Lift", sort: (r) => r.lift, render: (r) => r.lift.toFixed(2) },
    { key: "n", header: "Giỏ", sort: (r) => r.transactionCount, render: (r) => String(r.transactionCount) },
    { key: "voucher", header: "Voucher", render: (r) => <StatusPill tone={r.voucherCreated ? "success" : "pending"}>{r.voucherCreated ? "Đã tạo" : "Chưa"}</StatusPill> },
    { key: "at", header: "Mine lúc", sort: (r) => r.minedAtUtc, render: (r) => formatDateTime(r.minedAtUtc) },
  ]

  return (
    <PageFrame
      page="brand-apriori"
      navigate={navigate}
      uc="UC-AI"
      title="Mua kèm (Apriori)"
      subtitle="Luật kết hợp từ đơn đã thanh toán: nếu khách hay gọi A thì thường gọi B — đủ mạnh sẽ tự tạo voucher combo."
      action={<Button loading={run.isPending} onClick={() => run.mutate()}>Chạy Apriori</Button>}
    >
      <QueryBoundary query={rules}>
        {(rows) => rows.length === 0
          ? <EmptyState title="Chưa có luật" description="Cần vài đơn thanh toán có từ 2 món trở lên, rồi bấm Chạy Apriori (dịch vụ AI :8090 phải chạy)." />
          : <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} />}
      </QueryBoundary>
    </PageFrame>
  )
}
