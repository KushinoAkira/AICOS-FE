import { useQuery } from "@tanstack/react-query"
import type { Page } from "../../router/pages"
import { CustomerFrame } from "../../components/CustomerFrame"
import { ProductImage } from "../../components/OrderComposer"
import { Button, EmptyState, QueryBoundary } from "../../components/ui"
import { aiModelsApi } from "../../lib/api/engage"
import { branchesApi } from "../../lib/api/identity"
import { ordersApi } from "../../lib/api/orders"
import { toAiMenuItems } from "../../lib/aiMenu"
import { currentBrandSlug } from "../../lib/brand"
import { formatVND } from "../../lib/format"
import { defaultBranch, rememberedBranch } from "../../lib/takeawayBranch"

/** UC-54: thường gọi (ordering recommendations) + gợi ý AI theo menu chi nhánh đang chọn. */
export default function CustomerForYou({ navigate }: { navigate: (p: Page) => void }) {
  const brand = currentBrandSlug()
  const branches = useQuery({
    queryKey: ["takeaway", "branches", brand],
    queryFn: () => branchesApi.listActiveOf(brand!),
    enabled: !!brand,
  })
  const branch = defaultBranch(branches.data ?? [], rememberedBranch(brand))
  const branchId = branch?.id ?? ""
  const menu = useQuery({
    queryKey: ["takeaway", "menu", branchId],
    queryFn: () => ordersApi.takeawayMenu(branchId),
    enabled: !!branchId,
  })
  const habitual = useQuery({
    queryKey: ["recommendations", "for-you", brand, branchId],
    queryFn: () => ordersApi.recommendations(branchId),
    enabled: !!branchId,
    retry: false,
  })
  const picks = useQuery({
    queryKey: ["ai", "for-you", brand, branchId, menu.dataUpdatedAt],
    enabled: !!brand && !!branchId && !!menu.data,
    queryFn: async () => {
      const orders = await ordersApi.mine()
      const history = orders.flatMap((o) => o.lines.map((l) => l.productId))
      return aiModelsApi.recommend(history, 6, {
        tenantCode: brand,
        branchId,
        branchName: branch?.name,
        menuItems: toAiMenuItems(menu.data!.products),
      })
    },
  })

  const products = menu.data?.products ?? []
  const often = (habitual.data?.forYou ?? [])
    .map((r) => {
      const product = products.find((p) => p.id === r.productId && !p.soldOut)
      return product ? { product, quantity: r.quantity } : null
    })
    .filter((x): x is { product: (typeof products)[number]; quantity: number } => !!x)

  return (
    <CustomerFrame
      page="customer-for-you"
      navigate={navigate}
      uc="UC-54"
      title="Gợi ý cho bạn"
      aiTenantCode={brand}
      aiBranchId={branchId || null}
      aiBranchName={branch?.name}
      aiMenuItems={menu.data ? toAiMenuItems(menu.data.products) : undefined}
    >
      <section className="mb-10" aria-labelledby="often-ordered">
        <h2 id="often-ordered" className="mb-1 font-serif text-xl text-text-primary">Món bạn hay gọi</h2>
        <p className="mb-5 text-sm text-text-secondary">
          Theo lịch sử đơn tại {branch?.name ?? "chi nhánh đang chọn"}.
        </p>
        <QueryBoundary query={habitual}>
          {() =>
            often.length === 0 ? (
              <EmptyState title="Chưa có món hay gọi" description="Đặt vài món mang đi để chúng tôi ghi nhớ khẩu vị của bạn." />
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {often.map(({ product, quantity }, i) => (
                  <li key={product.id} className="stagger-item" style={{ animationDelay: `${i * 50}ms` }}>
                    <article className="hover-lift flex items-center gap-3.5 rounded-[18px] border border-border/80 bg-surface p-3.5 shadow-[0_10px_24px_-18px_rgb(60_40_25/0.5)]">
                      <ProductImage src={product.imageUrl} name={product.name} className="h-[4.75rem] w-[4.75rem]" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-text-primary">{product.name}</p>
                        <p className="mt-0.5 text-sm text-text-secondary">Bạn đã gọi {quantity} lần</p>
                        <p className="mt-1.5 text-sm font-medium text-clay">{formatVND(product.price)}</p>
                      </div>
                      <Button variant="secondary" className="shrink-0" onClick={() => navigate("customer-menu")}>Đặt món</Button>
                    </article>
                  </li>
                ))}
              </ul>
            )}
        </QueryBoundary>
      </section>

      <section aria-labelledby="ai-picks">
        <h2 id="ai-picks" className="mb-1 font-serif text-xl text-text-primary">Gợi ý thêm</h2>
        <p className="mb-5 text-sm text-text-secondary">
          Dựa trên món bạn từng gọi và menu tại {branch?.name ?? "chi nhánh đang chọn"} — không lấy món của quán khác.
        </p>
        <QueryBoundary query={picks}>
          {(rows) => {
            const extra = rows.filter((r) => !often.some((o) => o.product.id === r.productId))
            return extra.length === 0 ? (
              <EmptyState title="Chưa có gợi ý thêm" description="Hãy đặt vài món để chúng tôi hiểu khẩu vị của bạn." />
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {extra.map((r, i) => {
                  const product = products.find((p) => p.id === r.productId)
                  return (
                    <li key={r.productId} className="stagger-item" style={{ animationDelay: `${i * 50}ms` }}>
                      <article className="hover-lift flex items-center gap-3.5 rounded-[18px] border border-border/80 bg-surface p-3.5 shadow-[0_10px_24px_-18px_rgb(60_40_25/0.5)]">
                        <ProductImage src={product?.imageUrl} name={r.name} className="h-[4.75rem] w-[4.75rem]" />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-text-primary">{r.name}</p>
                          <p className="mt-0.5 line-clamp-2 text-sm text-text-secondary">{r.reason}</p>
                          <p className="mt-1.5 text-sm font-medium text-clay">{formatVND(r.price)}</p>
                        </div>
                        <Button variant="secondary" className="shrink-0" onClick={() => navigate("customer-menu")}>Đặt món</Button>
                      </article>
                    </li>
                  )
                })}
              </ul>
            )
          }}
        </QueryBoundary>
      </section>
    </CustomerFrame>
  )
}
