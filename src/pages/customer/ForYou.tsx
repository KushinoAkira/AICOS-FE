import { useQuery } from "@tanstack/react-query"
import type { Page } from "../../router/pages"
import { CustomerFrame } from "../../components/CustomerFrame"
import { ProductImage } from "../../components/OrderComposer"
import { Button, EmptyState, QueryBoundary } from "../../components/ui"
import { branchesApi } from "../../lib/api/identity"
import { ordersApi, type RecommendedItem } from "../../lib/api/orders"
import { formatVND } from "../../lib/format"
import { currentBrandSlug } from "../../lib/brand"
import { defaultBranch, rememberedBranch } from "../../lib/takeawayBranch"

/** UC-54: what this customer has ordered most, and what the shop sells most. Only what is on the menu right now is shown. */
export default function CustomerForYou({ navigate }: { navigate: (p: Page) => void }) {
  const picks = useQuery({
    queryKey: ["recommendations", "for-you"],
    queryFn: async () => {
      // The branch the customer orders takeaway from, so the suggestions match the menu they will see.
      const branch = defaultBranch(await branchesApi.listActive(), rememberedBranch(currentBrandSlug()))
      if (!branch) return { forYou: [], bestSellers: [] }
      const [menu, rec] = await Promise.all([ordersApi.takeawayMenu(branch.id), ordersApi.recommendations(branch.id)])
      const shown = (rows: RecommendedItem[]) => rows.flatMap((r) => {
        const product = menu.products.find((p) => p.id === r.productId && !p.soldOut)
        return product ? [{ product, quantity: r.quantity }] : []
      })
      const forYou = shown(rec.forYou)
      return { forYou, bestSellers: shown(rec.bestSellers).filter((s) => !forYou.some((f) => f.product.id === s.product.id)) }
    },
  })
  type Pick = NonNullable<typeof picks.data>["forYou"][number]
  const section = (title: string, rows: Pick[], hint: (quantity: number) => string) => rows.length > 0 && (
    <section className="mb-8">
      <h2 className="mb-3 font-serif text-lg text-text-primary">{title}</h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {rows.map(({ product, quantity }) => (
          <li key={product.id} className="flex items-center gap-3 rounded-[16px] border border-border bg-surface p-4">
            <ProductImage src={product.imageUrl} name={product.name} className="h-16 w-16" />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-text-primary">{product.name}</p>
              <p className="text-sm text-text-secondary">{hint(quantity)}</p>
              <p className="mt-1 text-sm text-text-primary">{formatVND(product.price)}</p>
            </div>
            <Button variant="secondary" onClick={() => navigate("customer-menu")}>Đặt món</Button>
          </li>
        ))}
      </ul>
    </section>
  )
  return (
    <CustomerFrame page="customer-for-you" navigate={navigate} uc="UC-54" title="Gợi ý cho bạn">
      <QueryBoundary query={picks}>
        {(rows) => rows.forYou.length + rows.bestSellers.length === 0
          ? <EmptyState title="Chưa có gợi ý" description="Khi quán có đơn hoặc bạn đặt vài món, gợi ý sẽ hiện ở đây." />
          : (
            <>
              {section("Món bạn hay gọi", rows.forYou, (q) => `Bạn đã gọi ${q} lần`)}
              {section("Món bán chạy", rows.bestSellers, (q) => `Đã bán ${q} ly trong 30 ngày qua`)}
            </>
          )}
      </QueryBoundary>
    </CustomerFrame>
  )
}
