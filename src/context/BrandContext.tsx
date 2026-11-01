import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { useLocation } from "react-router"
import { useQuery } from "@tanstack/react-query"
import { ApiError } from "../lib/api/http"
import { publicApi, type BrandPublic } from "../lib/api/platform"
import { applyBrandColor, BRAND_CHANGE_EVENT, getActiveBrandSlug, setActiveBrandSlug } from "../lib/brand"
import { tenantSlugFromPathname } from "../lib/tenantSlug"

type BrandState =
  | { kind: "platform" }
  | { kind: "loading"; slug: string }
  | { kind: "notFound"; slug: string }
  | { kind: "error"; slug: string }
  | { kind: "ready"; slug: string; brand: BrandPublic }

const Ctx = createContext<BrandState>({ kind: "platform" })

/**
 * Visual brand chrome (logo name + colour) follows the URL:
 * - `/{slug}/...` → that tenant
 * - `/t/...` guest QR and `/shops` → session slug (set by QR / shop pick)
 * - marketing, `/admin/login`, `/staff-login`, `/customer-login`, … → AICOS platform (terracotta)
 *
 * Session slug still drives `X-Tenant` via getActiveBrandSlug(); it must not rebrand the SaaS home.
 */
function slugForChrome(pathname: string, pathSlug: string | null, storedSlug: string | null): string | null {
  if (pathSlug) return pathSlug
  // Guest QR, shop picker, and staff pages outside `/{slug}` (e.g. account-settings) keep the session brand.
  if (
    pathname.startsWith("/t/")
    || pathname === "/shops"
    || pathname.startsWith("/shops/")
    || pathname === "/account-settings"
  ) {
    return storedSlug
  }
  return null
}

async function resolveBrand(slug: string): Promise<BrandPublic> {
  try {
    return await publicApi.brand(slug)
  } catch (err) {
    // Detail endpoint can 404 briefly when MSW misses; list is the same public source of truth.
    if (err instanceof ApiError && err.status === 404) {
      const list = await publicApi.brands()
      const hit = list.find((b) => b.slug === slug)
      if (hit) return hit
    }
    throw err
  }
}

export function BrandProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const pathSlug = tenantSlugFromPathname(pathname)
  const [storedSlug, setStoredSlug] = useState<string | null>(() => getActiveBrandSlug())

  useEffect(() => {
    const sync = () => setStoredSlug(getActiveBrandSlug())
    window.addEventListener(BRAND_CHANGE_EVENT, sync)
    return () => window.removeEventListener(BRAND_CHANGE_EVENT, sync)
  }, [])

  useEffect(() => {
    if (pathSlug) setActiveBrandSlug(pathSlug)
  }, [pathSlug])

  const slug = slugForChrome(pathname, pathSlug, storedSlug)

  const q = useQuery({
    queryKey: ["public", "brand", slug],
    queryFn: () => resolveBrand(slug ?? ""),
    enabled: !!slug,
    retry: 1,
    staleTime: 60_000,
    refetchOnMount: "always",
  })
  const state: BrandState = !slug ? { kind: "platform" }
    : q.isPending ? { kind: "loading", slug }
    : q.isError ? (q.error instanceof ApiError && q.error.status === 404 ? { kind: "notFound", slug } : { kind: "error", slug })
    : { kind: "ready", slug, brand: q.data }

  const color = state.kind === "ready" ? state.brand.brandColor ?? null : null
  useEffect(() => { applyBrandColor(color); return () => applyBrandColor(null) }, [color])

  return <Ctx.Provider value={state}>{children}</Ctx.Provider>
}

export const useBrand = () => useContext(Ctx)
