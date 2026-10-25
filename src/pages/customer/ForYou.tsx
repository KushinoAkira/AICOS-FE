import { useQuery } from "@tanstack/react-query"
import type { Page } from "../../router/pages"
import { CustomerFrame } from "../../components/CustomerFrame"
import { Button, EmptyState, QueryBoundary } from "../../components/ui"
import { aiModelsApi } from "../../lib/api/engage"
import { ordersApi } from "../../lib/api/orders"
import { formatVND } from "../../lib/format"

/** Personal recommendations from the self-hosted recommender (UC-54): based on the customer's own order history. */
export default function CustomerForYou({ navigate }: { navigate: (p: Page) => void }) {
  const picks = useQuery({
    queryKey: ["ai", "for-you"],
    queryFn: async () => {
      const orders = await ordersApi.mine()
      const history = orders.flatMap((o) => o.lines.map((l) => l.productId))
      return aiModelsApi.recommend(history, 6)
    },
  })
  return (
    <CustomerFrame page="customer-for-you" navigate={navigate} uc="UC-54" title="Gợi ý cho bạn">
      <h2 className="mb-1 font-serif text-lg text-text-primary">Gợi ý cho bạn</h2>
      <p className="mb-4 text-sm text-text-secondary">Dựa trên những món bạn từng gọi và độ phổ biến tại quán.</p>
      <QueryBoundary query={picks}>
        {(rows) => rows.length === 0
          ? <EmptyState title="Chưa có gợi ý" description="Hãy đặt vài món để chúng tôi hiểu khẩu vị của bạn." />
          : <ul className="grid gap-3 sm:grid-cols-2">{rows.map((r) => (
              <li key={r.productId} className="flex items-center justify-between gap-3 rounded-[16px] border border-border bg-surface p-4">
                <div>
                  <p className="font-medium text-text-primary">{r.name}</p>
                  <p className="text-sm text-text-secondary">{r.reason}</p>
                  <p className="mt-1 text-sm text-text-primary">{formatVND(r.price)}</p>
                </div>
                <Button variant="secondary" onClick={() => navigate("customer-menu")}>Đặt món</Button>
              </li>))}</ul>}
      </QueryBoundary>
    </CustomerFrame>
  )
}
