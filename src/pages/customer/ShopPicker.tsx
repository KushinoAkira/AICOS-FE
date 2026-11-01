import { useQuery } from "@tanstack/react-query"
import type { Page } from "../../router/pages"
import { Logo } from "../../components/AuthShell"
import { ErrorState, LoadingState } from "../../components/ui"
import { useAuth } from "../../context/AuthContext"
import { useBrand } from "../../context/BrandContext"
import { publicApi } from "../../lib/api/platform"
import { setActiveBrandSlug } from "../../lib/brand"

/** After platform login, customer picks an Active shop to enter. */
export default function ShopPicker({ navigate }: { navigate: (p: Page) => void }) {
  const { logout } = useAuth()
  const brand = useBrand()
  const list = useQuery({
    queryKey: ["public", "brands"],
    queryFn: () => publicApi.brands(),
    staleTime: 60_000,
  })

  function enter(slug: string) {
    setActiveBrandSlug(slug)
    navigate("customer-menu")
  }

  return (
    <div className="min-h-screen bg-bg-base px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-lg">
        <div className="mb-8 flex items-center justify-between gap-4">
          <Logo linked />
          <button
            type="button"
            onClick={() => { void logout(); navigate("landing") }}
            className="text-sm text-text-secondary hover:text-text-primary"
          >
            Đăng xuất
          </button>
        </div>

        <h1 className="font-serif text-3xl text-text-primary">Chọn quán</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Đăng nhập một lần trên AICOS, rồi vào quán bạn muốn đặt món hoặc tích điểm.
        </p>

        {brand.kind === "ready" && (
          <p className="mt-4 rounded-[12px] border border-border bg-surface px-4 py-3 text-sm text-text-secondary">
            Đang ở <span className="font-medium text-text-primary">{brand.brand.name}</span>
            {" · "}
            <button type="button" className="text-clay underline-offset-2 hover:underline" onClick={() => navigate("customer-menu")}>
              Tiếp tục vào quán
            </button>
          </p>
        )}

        <div className="mt-8">
          {list.isPending && <LoadingState />}
          {list.isError && (
            <ErrorState title="Không tải được danh sách quán" description={list.error.message} onRetry={() => void list.refetch()} />
          )}
          {list.data && list.data.length === 0 && (
            <p className="rounded-[16px] border border-border bg-surface p-6 text-sm text-text-secondary">
              Hiện chưa có quán nào đang hoạt động trên AICOS.
            </p>
          )}
          {list.data && list.data.length > 0 && (
            <ul className="space-y-3">
              {list.data.map((b) => {
                const accent = b.brandColor || "#C97B4A"
                const selected = brand.kind === "ready" && brand.slug === b.slug
                return (
                  <li key={b.slug}>
                    <button
                      type="button"
                      onClick={() => enter(b.slug)}
                      className={`flex w-full items-center gap-4 rounded-[16px] border bg-surface p-4 text-left transition-colors hover:border-clay ${selected ? "border-espresso" : "border-border"}`}
                    >
                      {b.logoUrl ? (
                        <img src={b.logoUrl} alt="" className="h-12 w-12 rounded-[12px] border border-border object-contain" />
                      ) : (
                        <span
                          aria-hidden
                          className="flex h-12 w-12 items-center justify-center rounded-[12px] font-serif text-xl text-white"
                          style={{ backgroundColor: accent }}
                        >
                          {b.name.charAt(0)}
                        </span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium text-text-primary">{b.name}</span>
                        <span className="block text-xs text-text-secondary">{b.slug}</span>
                      </span>
                      <span className="text-sm text-clay">{selected ? "Đang chọn" : "Vào quán"}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
