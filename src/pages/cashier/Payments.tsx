import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { Page } from "../../App"
import { PaymentPill } from "../../components/OrderStatusPill"
import { PageFrame } from "../../components/PageFrame"
import { Banner, Button, DataTable, QueryBoundary, type Column } from "../../components/ui"
import { useToast } from "../../context/ToastContext"
import { ordersApi, type Order } from "../../lib/api/orders"
import { formatDateTime, formatVND } from "../../lib/format"

/** Look up transactions only. Staff cannot confirm a payment by eye (BR-26); the provider's answer decides. */
export default function CashierPayments({ navigate }: { navigate: (p: Page) => void }) {
  const qc = useQueryClient()
  const { showToast } = useToast()
  const [last, setLast] = useState<string | null>(null)
  const payments = useQuery({ queryKey: ["payments"], queryFn: ordersApi.payments, refetchInterval: 10000 })
  const lookup = useMutation({
    mutationFn: (o: Order) => ordersApi.lookup(o.id),
    onSuccess: (r) => {
      void qc.invalidateQueries({ queryKey: ["payments"] })
      setLast(r.providerStatus === "Success" ? `Đơn ${r.order.code}: cổng thanh toán xác nhận đã nhận tiền, đơn đã được chuyển cho quầy pha chế.` : r.providerStatus === "Failed" ? `Đơn ${r.order.code}: giao dịch thất bại. Khách cần thanh toán lại.` : `Đơn ${r.order.code}: cổng thanh toán chưa có kết quả. Thử lại sau ít phút.`)
    },
    onError: (e) => showToast(e.message, "error"),
  })
  const columns: Column<Order>[] = [
    { key: "code", header: "Đơn", sort: (o) => o.code, render: (o) => <b className="text-text-primary">{o.code}</b> },
    { key: "time", header: "Tạo lúc", sort: (o) => o.createdAtUtc, render: (o) => formatDateTime(o.createdAtUtc) },
    { key: "total", header: "Số tiền", sort: (o) => o.total, render: (o) => formatVND(o.total) },
    { key: "st", header: "Thanh toán", render: (o) => <PaymentPill status={o.paymentStatus} /> },
    { key: "act", header: "", className: "text-right", render: (o) => <Button variant="secondary" className="px-3 py-1.5 text-xs" loading={lookup.isPending && lookup.variables?.id === o.id} onClick={() => lookup.mutate(o)}>Tra cứu giao dịch</Button> },
  ]
  return (
    <PageFrame page="cashier-payments" navigate={navigate} uc="UC-43" title="Thanh toán cần xử lý" subtitle="Giao dịch lỗi hoặc chưa nhận được kết quả từ cổng thanh toán.">
      {last && <div className="mb-4"><Banner tone="warn">{last}</Banner></div>}
      <QueryBoundary query={payments}>{(rows) => <DataTable rows={rows} rowKey={(o) => o.id} columns={columns} emptyTitle="Không có giao dịch nào cần xử lý" />}</QueryBoundary>
    </PageFrame>
  )
}