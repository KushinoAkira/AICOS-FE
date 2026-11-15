import { useMemo, useState } from "react"
import { Link } from "react-router"
import { useQuery } from "@tanstack/react-query"
import type { Page } from "../../router/pages"
import { PlatformLogo } from "../../components/AuthShell"
import { ErrorState, LoadingState } from "../../components/ui"
import { useAuth } from "../../context/AuthContext"
import { useBrand } from "../../context/BrandContext"
import { publicApi, type BrandCard } from "../../lib/api/platform"
import { setActiveBrandSlug } from "../../lib/brand"
import { filterBrands } from "../../lib/brandSearch"
import { PAGE_PATHS } from "../../router/pages"

const LAST_SHOP_KEY = "aicos.lastShopSlug"

type KindFilter = "all" | "cafe" | "tea"

function firstName(fullName: string | null | undefined): string {
  const parts = (fullName ?? "").trim().split(/\s+/).filter(Boolean)
  return parts[parts.length - 1] || "bạn"
}

function brandKind(b: BrandCard): "cafe" | "tea" {
  const text = `${b.name} ${b.description ?? ""} ${b.slug}`.toLowerCase()
  if (/trà|tra |tea|sữa|sua|matcha|milk/.test(text)) return "tea"
  return "cafe"
}

function kindLabel(kind: "cafe" | "tea"): string {
  return kind === "tea" ? "Trà sữa" : "Cà phê"
}

/**
 * After platform login, customer picks an Active shop.
 * Layout follows the "Chọn quán (sau đăng nhập)" design mockup: dark stage, photo cards, search + kind chips.
 */
export default function ShopPicker({ navigate }: { navigate: (p: Page) => void }) {
  const { user, logout, selectBrand } = useAuth()
  const brand = useBrand()
  const list = useQuery({
    queryKey: ["public", "brands"],
    queryFn: () => publicApi.brands(),
    staleTime: 60_000,
  })
  const [q, setQ] = useState("")
  const [kind, setKind] = useState<KindFilter>("all")
  const [entering, setEntering] = useState<string | null>(null)
  const [enterError, setEnterError] = useState<string | null>(null)
  const hello = firstName(user?.fullName)
  const lastSlug = typeof sessionStorage !== "undefined" ? sessionStorage.getItem(LAST_SHOP_KEY) : null

  const filtered = useMemo(() => {
    const base = filterBrands(list.data ?? [], q)
    if (kind === "all") return base
    return base.filter((b) => brandKind(b) === kind)
  }, [list.data, q, kind])

  async function enter(slug: string) {
    setEnterError(null)
    setEntering(slug)
    try {
      // Real BE needs select-brand so JWT carries tenant_id before takeaway/orders.
      await selectBrand({ code: slug })
      sessionStorage.setItem(LAST_SHOP_KEY, slug)
      setActiveBrandSlug(slug)
      navigate("customer-menu")
    } catch (e) {
      setEnterError(e instanceof Error ? e.message : "Chưa vào được quán. Thử lại.")
    } finally {
      setEntering(null)
    }
  }

  const chips: { key: KindFilter; label: string }[] = [
    { key: "all", label: "Tất cả" },
    { key: "cafe", label: "Cà phê" },
    { key: "tea", label: "Trà sữa" },
  ]

  return (
    <div className="relative min-h-screen overflow-hidden font-sans text-[#F6EBDC]" style={{ background: "#241610" }}>
      <div aria-hidden className="shop-drift pointer-events-none absolute -right-40 -top-44 h-[620px] w-[620px] rounded-full" style={{ background: "#3A2418" }} />
      <div aria-hidden className="shop-drift pointer-events-none absolute -bottom-80 -left-60 h-[700px] w-[700px] rounded-full" style={{ background: "#2E1D14", animationDelay: "3s" }} />
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-[120px] ml-[-100px] h-[520px] w-[520px] rounded-full opacity-[0.07]" style={{ background: "#D98B54" }} />

      <div className="relative mx-auto flex max-w-[1240px] flex-col gap-10 px-5 py-7 sm:gap-14 sm:px-10 sm:py-8 sm:pb-16">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <Link to={PAGE_PATHS["order-start"]} aria-label="AICOS" className="inline-flex">
            <PlatformLogo tone="light" className="h-10 w-auto object-contain sm:h-11" />
          </Link>
          <div className="flex items-center gap-3.5">
            <div className="flex items-center gap-2.5 rounded-full border border-white/14 bg-white/8 py-1.5 pl-1.5 pr-4">
              <span className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-[#D98B54] font-semibold text-[#241610]">
                {hello.charAt(0).toUpperCase()}
              </span>
              <span className="text-[15px]">{hello}</span>
            </div>
            <button
              type="button"
              onClick={() => { void logout(); navigate("landing") }}
              className="px-2 py-3 text-[15px] text-[#CDB9A0] hover:text-white"
            >
              Đăng xuất
            </button>
          </div>
        </header>

        <div className="flex flex-wrap items-end justify-between gap-8">
          <div className="shop-rise flex min-w-0 flex-[1_1_520px] flex-col gap-[18px]">
            <span className="type-eyebrow text-[#D98B54]">Chào {hello}</span>
            <h1 className="type-display m-0 text-5xl text-[#F6EBDC] sm:text-6xl lg:text-[4.6rem]">
              Hôm nay bạn <em className="text-[#D98B54]" style={{ fontStyle: "italic" }}>ghé quán nào?</em>
            </h1>
            <p className="type-lead m-0 max-w-[560px] text-[#E3D2BB]">
              Đăng nhập một lần trên AICOS, rồi vào quán bạn muốn đặt món hoặc tích điểm.
            </p>
            {brand.kind === "ready" && (
              <p className="m-0 text-sm text-[#CDB9A0]">
                Đang ở <span className="font-medium text-[#F6EBDC]">{brand.brand.name}</span>
                {" · "}
                <button type="button" className="underline underline-offset-2 hover:text-white" onClick={() => navigate("customer-menu")}>
                  Tiếp tục vào quán
                </button>
              </p>
            )}
          </div>
          <CupMini />
        </div>

        <div className="shop-rise shop-rise-d2 flex flex-wrap items-center gap-4">
          <label htmlFor="shop-q" className="sr-only">Tìm quán</label>
          <div className="flex min-w-0 flex-[1_1_320px] items-center gap-3 rounded-full border-[1.5px] border-white/16 bg-white/8 px-[22px]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#CDB9A0" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-4-4" />
            </svg>
            <input
              id="shop-q"
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm theo tên quán"
              className="h-14 min-w-0 flex-1 border-0 bg-transparent text-[17px] text-[#F6EBDC] outline-none placeholder:text-[#CDB9A0]/70"
            />
          </div>
          <div className="flex flex-wrap gap-2.5">
            {chips.map((c) => {
              const on = kind === c.key
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setKind(c.key)}
                  className="min-h-11 rounded-full border-[1.5px] px-[22px] text-[15px] font-medium"
                  style={{
                    borderColor: on ? "#D98B54" : "rgba(255,255,255,0.3)",
                    background: on ? "#D98B54" : "transparent",
                    color: on ? "#241610" : "#F6EBDC",
                  }}
                >
                  {c.label}
                </button>
              )
            })}
          </div>
        </div>

        {enterError && (
          <div className="shop-rise rounded-[20px] border border-[#E8A0A0]/40 bg-[#5A1E1E]/55 px-5 py-4 text-[15px] text-[#F6EBDC]">
            {enterError}
          </div>
        )}

        <div className="flex flex-wrap gap-7">
          {list.isPending && (
            <div className="w-full rounded-[36px] border border-white/10 bg-white/5 p-10">
              <LoadingState label="Đang tải quán…" />
            </div>
          )}
          {list.isError && (
            <div className="w-full">
              <ErrorState title="Không tải được danh sách quán" description={list.error.message} onRetry={() => void list.refetch()} />
            </div>
          )}
          {list.data && list.data.length === 0 && (
            <p className="w-full rounded-[36px] border border-dashed border-white/25 p-14 text-center text-lg text-[#E3D2BB]">
              Hiện chưa có quán nào đang hoạt động trên AICOS.
            </p>
          )}
          {list.data && list.data.length > 0 && filtered.length === 0 && (
            <p className="w-full rounded-[36px] border-2 border-dashed border-white/25 p-14 text-center text-lg text-[#E3D2BB]">
              Không tìm thấy quán nào khớp. Thử bỏ bộ lọc hoặc đổi từ khoá.
            </p>
          )}
          {filtered.map((b) => (
            <ShopCard
              key={b.slug}
              brand={b}
              recent={lastSlug === b.slug || (brand.kind === "ready" && brand.slug === b.slug)}
              busy={entering === b.slug}
              disabled={entering !== null}
              onEnter={() => void enter(b.slug)}
            />
          ))}
        </div>

        <div className="shop-rise shop-rise-d4 flex flex-wrap items-center gap-[18px] rounded-[24px] border border-white/12 bg-white/6 px-7 py-[22px]">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-[#D98B54] text-[#241610]">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h3v3h-3zM20 14v7M14 20h3" />
            </svg>
          </span>
          <span className="min-w-0 flex-[1_1_320px] text-base leading-relaxed text-[#E3D2BB]">
            Đang ngồi tại quán? Quét mã QR trên bàn để vào thẳng quán đó, không cần chọn lại.
          </span>
        </div>
      </div>
    </div>
  )
}

function ShopCard({ brand, recent, busy, disabled, onEnter }: { brand: BrandCard; recent: boolean; busy?: boolean; disabled?: boolean; onEnter: () => void }) {
  const accent = brand.brandColor || "#D98B54"
  const initial = brand.name.charAt(0).toUpperCase()
  const kind = brandKind(brand)

  return (
    <button
      type="button"
      onClick={onEnter}
      disabled={disabled}
      className="shop-card shop-rise shop-rise-d3 group relative flex min-h-[380px] min-w-0 flex-[1_1_440px] flex-col justify-between overflow-hidden rounded-[36px] p-9 text-left text-white shadow-[0_24px_60px_rgba(0,0,0,0.38)] disabled:cursor-wait disabled:opacity-80"
      style={{ background: accent }}
    >
      {brand.coverUrl && (
        <img
          src={brand.coverUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />
      )}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background: brand.coverUrl
            ? `linear-gradient(160deg, ${accent}cc 0%, ${accent}66 42%, rgba(20,10,6,0.82) 100%)`
            : undefined,
        }}
      />
      {!brand.coverUrl && (
        <>
          <div aria-hidden className="absolute -right-[90px] -top-[90px] h-[320px] w-[320px] rounded-full bg-white/10" />
          <div aria-hidden className="absolute -bottom-[60px] right-[30px] h-[200px] w-[200px] rounded-full bg-black/10" />
        </>
      )}
      <span
        aria-hidden
        className="shop-letter pointer-events-none absolute -bottom-[70px] right-7 font-serif text-[360px] leading-none opacity-20"
      >
        {initial}
      </span>

      <div className="relative flex flex-wrap gap-2.5">
        <span className="rounded-full bg-white/22 px-4 py-2 text-sm font-medium">{kindLabel(kind)}</span>
        {recent && (
          <span className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#241610]">Đã ghé gần nhất</span>
        )}
      </div>

      <div className="relative flex items-end justify-between gap-5">
        <div className="flex min-w-0 flex-col gap-2">
          <div className="type-title text-4xl text-[#F6EBDC] sm:text-[3rem]">{brand.name}</div>
          <div className="text-[15px] opacity-90">aicos.app/b/{brand.slug}</div>
          {brand.branchCount > 0 && (
            <div className="text-sm opacity-80">{brand.branchCount} chi nhánh</div>
          )}
        </div>
        <span className="flex shrink-0 items-center gap-3 rounded-full bg-white py-3.5 pl-6 pr-3.5 text-base font-semibold text-[#241610]">
          {busy ? "Đang vào…" : "Vào quán"}
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#241610] text-white">
            <svg className="shop-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </span>
        </span>
      </div>
    </button>
  )
}

function CupMini() {
  return (
    <svg className="shop-rise shop-rise-d2 hidden max-w-full shrink-0 sm:block" width="190" height="200" viewBox="0 0 360 400" role="img" aria-label="Ly cà phê">
      <g fill="none" stroke="#F6EBDC" strokeWidth="9" strokeLinecap="round" opacity={0.9}>
        <path className="ch-steam" d="M140 120 C 120 90, 160 70, 140 40" />
        <path className="ch-steam-2" d="M180 124 C 160 94, 200 74, 180 44" />
        <path className="ch-steam-3" d="M220 120 C 200 90, 240 70, 220 40" />
      </g>
      <path d="M70 150 H290 V240 C290 300 250 340 180 340 C110 340 70 300 70 240 Z" fill="#F6EBDC" />
      <path d="M290 175 H322 C346 175 346 250 306 262 L286 266" fill="none" stroke="#F6EBDC" strokeWidth="22" strokeLinecap="round" strokeLinejoin="round" />
      <ellipse cx="180" cy="150" rx="110" ry="16" fill="#7A4A32" />
      <ellipse cx="180" cy="150" rx="90" ry="10" fill="#4E2E1F" />
      <g transform="translate(180 268)">
        <ellipse rx="19" ry="26" fill="#A9622F" />
        <path d="M0 -26 C -9 -9, 9 9, 0 26" stroke="#F6EBDC" strokeWidth="4" fill="none" strokeLinecap="round" />
      </g>
      <ellipse cx="180" cy="352" rx="150" ry="18" fill="#F6EBDC" opacity={0.9} />
    </svg>
  )
}
