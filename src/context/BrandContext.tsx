import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react"
import { useQuery } from "@tanstack/react-query"
import { ApiError } from "../lib/api/http"
import { publicApi, type BrandPublic } from "../lib/api/platform"
import { applyBrandColor, currentBrandSlug } from "../lib/brand"

type BrandState =
  | { kind: "platform" }
  | { kind: "loading"; slug: string }
  | { kind: "notFound"; slug: string }
  | { kind: "error"; slug: string }
  | { kind: "ready"; slug: string; brand: BrandPublic }

const Ctx = createContext<BrandState>({ kind: "platform" })

/** Resolves the brand from the host name (or ?brand=) and applies its colour. The platform site has no brand. */
export function BrandProvider({ children }: { children: ReactNode }) {
  const slug = useMemo(() => currentBrandSlug(), [])
  const q = useQuery({
    queryKey: ["public", "brand", slug],
    queryFn: () => publicApi.brand(slug ?? ""),
    enabled: !!slug,
    retry: false,
    staleTime: 60_000,
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
