import { useState } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { useNavigate } from "react-router"
import type { Page } from "../../App"
import { HomeLogo } from "../../components/AuthShell"
import CustomerUserMenu from "../../components/CustomerUserMenu"
import { Banner, Button, EmptyState, Field, QueryBoundary } from "../../components/ui"
import { useAuth } from "../../context/AuthContext"
import { ApiError } from "../../lib/api/http"
import { publicApi, type BrandCard } from "../../lib/api/platform"
import { currentBrandSlug } from "../../lib/brand"
import { filterBrands } from "../../lib/brandSearch"

/** After signing in the customer picks a brand: menu, takeaway, table QR and points all happen at the chosen brand. */
export default function CustomerBrands({ navigate }: { navigate: (p: Page) => void }) {
  const brands = useQuery({ queryKey: ["public", "brands"], queryFn: publicApi.brands, staleTime: 60_000 })
  const { selectBrand } = useAuth()
  const routerNavigate = useNavigate()
  const [search, setSearch] = useState("")
  const current = currentBrandSlug()
  const choose = useMutation({
    mutationFn: (brand: BrandCard) => selectBrand({ code: brand.slug }),
    onSuccess: () => {
      const back = sessionStorage.getItem("aicos.returnTo")
      sessionStorage.removeItem("aicos.returnTo")
      if (back) routerNavigate(back, { replace: true }); else navigate("customer-menu")
    },
  })
  const shown = filterBrands(brands.data ?? [], search)

  return (
    <div data-uc="UC-BRANDS" className="min-h-screen bg-bg-base">
      <header className="border-b border-border bg-surface px-4 py-3 sm:px-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <HomeLogo />
          <CustomerUserMenu navigate={navigate} />
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-8">
        <h1 className="font-serif text-3xl text-text-primary">Bạn muốn ghé quán nào?</h1>
        <p className="mt-1 text-sm text-text-secondary">Chọn một quán để xem thực đơn, đặt mang đi và tích điểm tại quán đó. Bạn có thể đổi quán bất cứ lúc nào.</p>
        <div className="mt-5 max-w-md">
          <Field label="Tìm quán" type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nhập tên quán, không cần dấu" autoComplete="off" />
        </div>
        {choose.isError && <div className="mt-4"><Banner>{choose.error instanceof ApiError ? choose.error.message : "Chưa chọn được quán. Hãy thử lại."}</Banner></div>}
        <div className="mt-6">
          <QueryBoundary query={brands}>
            {() => shown.length === 0 ? (
              <EmptyState title="Chưa có quán phù hợp" description="Hãy thử tên khác." />
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {shown.map((b) => (
                  <li key={b.id} className={`flex flex-col rounded-[16px] border bg-surface p-5 transition-colors hover:border-clay ${current === b.slug ? "border-clay" : "border-border"}`}>
                    <div className="flex items-center gap-3">
                      {b.logoUrl
                        ? <img src={b.logoUrl} alt="" className="h-11 w-11 rounded-[10px] object-contain" />
                        : <span aria-hidden className="flex h-11 w-11 items-center justify-center rounded-[10px] font-serif text-lg text-white" style={{ backgroundColor: b.brandColor ?? "#C97B4A" }}>{b.name.charAt(0).toUpperCase()}</span>}
                      <div className="min-w-0">
                        <h2 className="truncate font-serif text-lg text-text-primary">{b.name}</h2>
                        <p className="text-xs text-text-secondary">{b.branchCount} chi nhánh{current === b.slug ? ", quán bạn đang chọn" : ""}</p>
                      </div>
                    </div>
                    <p className="mt-3 line-clamp-2 flex-1 text-sm text-text-secondary">{b.description ?? "Cà phê và đồ uống pha tại quầy."}</p>
                    <Button className="mt-4 min-h-11 w-full" variant={current === b.slug ? "secondary" : "primary"} loading={choose.isPending && choose.variables?.id === b.id} disabled={choose.isPending} onClick={() => choose.mutate(b)}>
                      {current === b.slug ? "Tiếp tục với quán này" : "Chọn quán"}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </QueryBoundary>
        </div>
      </main>
    </div>
  )
}
