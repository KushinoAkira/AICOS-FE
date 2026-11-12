import { useQuery } from "@tanstack/react-query"
import type { CSSProperties } from "react"
import type { Page } from "../../router/pages"
import { AuthShell } from "../../components/AuthShell"
import { ErrorState, LoadingState } from "../../components/ui"
import { publicApi, type BrandCard, type BrandPublic } from "../../lib/api/platform"
import { setActiveBrandSlug } from "../../lib/brand"

/** Marketing entry: pick a tenant, then open `/{slug}/login`. AICOS stays the product; brands are destinations. */
export default function StaffEntry({ navigate }: { navigate: (p: Page, params?: Record<string, string>) => void }) {
  const list = useQuery({
    queryKey: ["public", "brands"],
    queryFn: () => publicApi.brands(),
    staleTime: 60_000,
  })

  const brands = list.data ?? []
  const showLoading = list.isPending && !list.data
  const showError = list.isError && !list.data

  return (
    <AuthShell
      hero
      subtitle="Cổng nhân viên — chọn thương hiệu bạn đang làm việc để tiếp tục đăng nhập."
    >
      <div className="space-y-6">
        <div>
          <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.14em] text-text-secondary">
            Thương hiệu trên AICOS
          </p>

          {showLoading && <LoadingState />}
          {showError && (
            <ErrorState
              title="Không tải được danh sách"
              description={list.error.message}
              onRetry={() => void list.refetch()}
            />
          )}
          {!showLoading && !showError && brands.length === 0 && (
            <p className="rounded-[16px] border border-dashed border-border bg-bg-warm/60 px-4 py-8 text-center text-sm text-text-secondary">
              Chưa có thương hiệu nào đang hoạt động.
            </p>
          )}
          {brands.length > 0 && (
            <ul className="divide-y divide-border border-y border-border">
              {brands.map((b, i) => (
                <li key={b.slug} className="rise-in" style={{ "--reveal-delay": `${i * 60}ms` } as CSSProperties}>
                  <BrandRow
                    brand={b}
                    onPick={() => {
                      setActiveBrandSlug(b.slug)
                      navigate("login", { tenantSlug: b.slug })
                    }}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>

        <button
          type="button"
          onClick={() => navigate("landing")}
          className="text-left text-xs text-text-secondary transition-colors hover:text-espresso"
        >
          ← Về trang chủ
        </button>
      </div>
    </AuthShell>
  )
}

function BrandRow({ brand, onPick }: { brand: BrandPublic | BrandCard; onPick: () => void }) {
  const accent = brand.brandColor || "var(--color-terracotta)"
  return (
    <button
      type="button"
      onClick={onPick}
      className="group flex w-full items-center gap-3.5 py-3.5 text-left transition-colors hover:bg-sand/50"
    >
      <span
        aria-hidden
        className="h-10 w-1 shrink-0 rounded-full opacity-80 transition-opacity group-hover:opacity-100"
        style={{ backgroundColor: accent }}
      />
      {brand.logoUrl ? (
        <img src={brand.logoUrl} alt="" className="h-10 w-10 rounded-[10px] border border-border object-contain" />
      ) : (
        <span
          aria-hidden
          className="flex h-10 w-10 items-center justify-center rounded-[10px] font-serif text-lg text-white"
          style={{ backgroundColor: accent }}
        >
          {brand.name.charAt(0)}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium text-text-primary">{brand.name}</span>
        <span className="block text-xs text-text-secondary">Đăng nhập nhân viên</span>
      </span>
      <span aria-hidden className="text-clay opacity-0 transition-opacity group-hover:opacity-100">
        →
      </span>
    </button>
  )
}
