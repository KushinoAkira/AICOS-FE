import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import type { Page } from "../../App"
import { PageFrame } from "../../components/PageFrame"
import { RefundApprovals } from "../../components/RefundApprovals"
import { Field } from "../../components/ui"
import { addDays, today } from "../../lib/api/manage"
import { ordersApi } from "../../lib/api/orders"

/**
 * Refunds of the branch (BR-30): the branch manager decides the requests of their own branch, including the transfers to a customer's
 * bank account, and looks back at the ones handled in a period. The brand admin no longer handles every branch's refunds.
 */
export default function BranchRefunds({ navigate }: { navigate: (p: Page) => void }) {
  const [to, setTo] = useState(today())
  const [from, setFrom] = useState(addDays(today(), -29))
  const orders = useQuery({ queryKey: ["orders"], queryFn: ordersApi.orders, staleTime: 60_000 })
  return (
    <PageFrame page="branch-refunds" navigate={navigate} uc="UC-27" title="Hoàn tiền" subtitle="Duyệt yêu cầu hoàn tiền của chi nhánh. Khách nhận tiền qua cổng thanh toán, tại quầy hoặc chuyển khoản về tài khoản khách đã cung cấp.">
      <div className="mb-6 flex flex-wrap items-end gap-3">
        <div className="w-40"><Field label="Lịch sử từ ngày" type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} /></div>
        <div className="w-40"><Field label="Đến ngày" type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} /></div>
      </div>
      <RefundApprovals title="Hoàn tiền" range={{ from, to }} orderCodes={Object.fromEntries((orders.data ?? []).map((o) => [o.id, o.code]))} />
    </PageFrame>
  )
}
