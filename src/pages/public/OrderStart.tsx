import { useEffect, useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link, useNavigate } from "react-router"
import type { Page } from "../../App"
import { useAuth } from "../../context/AuthContext"
import { publicApi, type BrandCard } from "../../lib/api/platform"
import { tokenStore } from "../../lib/api/tokenStore"
import { BRAND_SEARCH_FROM, BRANDS_SHOWN, filterBrands } from "../../lib/brandSearch"
import { CONTACT } from "../../lib/siteInfo"
import { PlatformLogo } from "../../components/AuthShell"
import { ErrorState, LoadingState } from "../../components/ui"
import { C } from "../../lib/tokens"
import { protectOrphans } from "../../lib/typography"

const FALLBACK_BRANDS: BrandCard[] = [
  { id: "demo-1", slug: "demo-coffee", name: "Demo Coffee", description: "Cà phê phin · minh hoạ", brandColor: C.green, branchCount: 3 },
  { id: "demo-2", slug: "tra-xanh-house", name: "Trà Xanh House", description: "Trà và matcha · minh hoạ", brandColor: C.roast, branchCount: 1 },
  { id: "demo-3", slug: "brand-mau-c", name: "Brand mẫu C", description: "Mô tả ngắn của thương hiệu", brandColor: "#5E4234", branchCount: 1 },
]

const DEMO_DRINKS: Record<string, string[]> = {
  "demo-coffee": ["Cà phê phin", "Bạc xỉu", "Cold brew"],
  "tra-xanh-house": ["Trà xanh sữa", "Matcha latte", "Trà xanh chanh"],
  "brand-mau-c": ["Món 1", "Món 2", "Món 3"],
}

const MARQUEE = ["Demo Coffee", "Trà Xanh House", "Brand mẫu C", "Gọi món QR", "Đặt mang đi", "Tích điểm", "Theo dõi đơn"]

const FAQS = [
  {
    q: protectOrphans("Tôi có cần tài khoản riêng cho từng thương hiệu không?"),
    a: protectOrphans("Không. Bạn chỉ cần một tài khoản AICOS, sau khi đăng nhập hãy chọn thương hiệu muốn dùng. Điểm và voucher được tính riêng theo từng thương hiệu."),
  },
  {
    q: protectOrphans("Nếu tôi đặt mà không đến nhận thì sao?"),
    a: protectOrphans("Quán giữ ly nước của bạn trong tủ lạnh 60 phút. Quá thời gian này đồ uống sẽ bị hủy và không hoàn tiền. Điều này được thông báo rõ trước khi bạn thanh toán."),
  },
  {
    q: protectOrphans("Khung giờ nhận được giữ khi nào?"),
    a: protectOrphans("Khung giờ chỉ được xác nhận sau khi thanh toán thành công. Nếu khung giờ đầy trong lúc bạn thanh toán, hệ thống sẽ hoàn tiền tự động."),
  },
  {
    q: protectOrphans("Uống tại quán thì thanh toán thế nào?"),
    a: protectOrphans("Sau khi bạn gửi đơn, nhân viên mang hóa đơn và mã QR ra bàn. Bạn chọn trả tiền mặt hoặc chuyển khoản."),
  },
]

const SLOTS = [
  { time: "07:30", n: 3 },
  { time: "08:00", n: 1 },
  { time: "08:30", n: 0 },
  { time: "09:00", n: 4 },
]

const STEPS = [
  protectOrphans("Đã thanh toán"),
  "Đang pha",
  protectOrphans("Sẵn sàng nhận"),
  protectOrphans("Đã nhận món"),
]

function CupHero() {
  return (
    <svg width="360" height="400" viewBox="0 0 360 400" role="img" aria-label="Ly cà phê đang bốc khói" className="relative max-w-full">
      <g fill="none" stroke={C.creamText} strokeWidth="7" strokeLinecap="round">
        <path className="ch-steam" d="M140 120 C 120 90, 160 70, 140 40" />
        <path className="ch-steam-2" d="M180 124 C 160 94, 200 74, 180 44" />
        <path className="ch-steam-3" d="M220 120 C 200 90, 240 70, 220 40" />
      </g>
      <path d="M70 150 H290 V240 C290 300 250 340 180 340 C110 340 70 300 70 240 Z" fill={C.creamText} />
      <path d="M290 175 H322 C346 175 346 250 306 262 L286 266" fill="none" stroke={C.creamText} strokeWidth="22" strokeLinecap="round" strokeLinejoin="round" />
      <ellipse cx="180" cy="150" rx="110" ry="16" fill="#7A4A32" />
      <ellipse cx="180" cy="150" rx="90" ry="10" fill="#4E2E1F" />
      <path d="M96 215 H264" stroke={C.roast} strokeWidth="10" strokeLinecap="round" />
      <g transform="translate(180 268)">
        <ellipse rx="19" ry="26" fill={C.roast} />
        <path d="M0 -26 C -9 -9, 9 9, 0 26" stroke={C.creamText} strokeWidth="4" fill="none" strokeLinecap="round" />
      </g>
      <ellipse cx="180" cy="352" rx="150" ry="18" fill={C.creamText} opacity={0.9} />
      <ellipse cx="180" cy="358" rx="150" ry="14" fill="#000" opacity={0.25} />
    </svg>
  )
}

function qrCells(): string[] {
  const cells: string[] = []
  const fin = (x: number, y: number, ox: number, oy: number) => {
    const dx = x - ox
    const dy = y - oy
    if (dx < 0 || dy < 0 || dx > 4 || dy > 4) return null
    const edge = dx === 0 || dy === 0 || dx === 4 || dy === 4
    const core = dx >= 1 && dx <= 3 && dy >= 1 && dy <= 3 && !(dx === 2 && dy === 2)
    return edge || (dx === 2 && dy === 2) || core
  }
  for (let y = 0; y < 11; y++) {
    for (let x = 0; x < 11; x++) {
      let v = fin(x, y, 0, 0)
      if (v === null) v = fin(x, y, 6, 0)
      if (v === null) v = fin(x, y, 0, 6)
      if (v === null) v = (x * 7 + y * 13 + x * y) % 5 < 2
      cells.push(v ? C.ink : "transparent")
    }
  }
  return cells
}

/**
 * Customer marketing home (`/dat-mon`): hero, brand explorer, perks, FAQ, auth CTAs.
 * Signed-in customers with one shop jump straight to that brand menu.
 */
export default function OrderStart({ navigate }: { navigate: (p: Page) => void }) {
  const routerNavigate = useNavigate()
  const { role } = useAuth()
  const activeBrand = role === "customer" ? tokenStore.get()?.activeBrandCode ?? null : null
  const brandsQ = useQuery({ queryKey: ["public", "brands"], queryFn: publicApi.brands, retry: 1, staleTime: 60_000 })
  const live = brandsQ.data ?? []
  const usingFallback = !brandsQ.isPending && live.length === 0
  const all = usingFallback ? FALLBACK_BRANDS : live
  const only = all.length === 1 ? all[0] : null
  const [query, setQuery] = useState("")
  const [showAll, setShowAll] = useState(false)
  const [brandIdx, setBrandIdx] = useState(0)
  const [slotIdx, setSlotIdx] = useState(1)
  const [stage, setStage] = useState(1)
  const found = filterBrands(all, query)
  const shown = showAll ? found : found.slice(0, BRANDS_SHOWN)
  const isCustomer = role === "customer"
  const qr = useMemo(() => qrCells(), [])
  const marquee = useMemo(() => [...MARQUEE, ...MARQUEE], [])

  useEffect(() => {
    if (only && isCustomer && !activeBrand) routerNavigate(`/b/${only.slug}`, { replace: true })
  }, [only, isCustomer, activeBrand, routerNavigate])

  useEffect(() => {
    if (brandIdx >= all.length) setBrandIdx(0)
  }, [all.length, brandIdx])

  const sel = all[brandIdx] ?? all[0]
  const drinks =
    (sel && DEMO_DRINKS[sel.slug]) ||
    (sel ? [`${sel.name} signature`, "Đá xay", "Trà sữa"] : ["Cà phê phin", "Bạc xỉu", "Cold brew"])

  const goJoin = (page: Page) => {
    sessionStorage.setItem("aicos.returnTo", "/dat-mon")
    navigate(page)
  }

  return (
    <div className="overflow-x-hidden bg-bg-base font-sans text-text-primary">
      {/* HERO */}
      <section id="top" className="relative overflow-hidden bg-ink px-5 pb-0 pt-5 text-on-dark sm:px-10">
        <div aria-hidden className="pointer-events-none absolute -right-44 -top-40 h-[620px] w-[620px] rounded-full bg-ink-lift" />
        <div aria-hidden className="pointer-events-none absolute -bottom-72 -left-56 h-[640px] w-[640px] rounded-full bg-ink-lift/80" />

        <header className="relative mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-4 rounded-full border border-white/12 bg-white/7 px-4 py-3.5 sm:px-6">
          <a href="#top" aria-label="AICOS" className="inline-flex">
            <PlatformLogo tone="light" layout="horizontal" />
          </a>
          <nav className="flex flex-wrap items-center gap-4 text-[15px] tracking-[-0.01em] text-on-dark-muted sm:gap-6">
            <a href="#brands" className="hidden sm:inline">Thương hiệu</a>
            <a href="#perks" className="hidden md:inline">Điểm nhấn</a>
            <a href="#faq" className="hidden md:inline">Hỏi đáp</a>
            {isCustomer ? (
              <button
                type="button"
                onClick={() => navigate(activeBrand ? "customer-menu" : "customer-shops")}
                className="rounded-full bg-terracotta px-5 py-3 font-semibold text-on-espresso"
              >
                Vào đặt món
              </button>
            ) : (
              <button
                type="button"
                onClick={() => goJoin("auth-customer-login")}
                className="rounded-full bg-terracotta px-5 py-3 font-semibold text-on-espresso"
              >
                Đăng nhập / Đăng ký
              </button>
            )}
          </nav>
        </header>

        <div className="relative mx-auto flex max-w-[1240px] flex-wrap items-center gap-10 py-16 sm:py-20 lg:py-24">
          <div className="flex min-w-0 flex-[1_1_520px] flex-col gap-7">
            <span className="inline-flex w-fit items-center gap-2.5 rounded-full bg-white/10 px-4 py-2 text-sm font-medium">
              <span className="ch-pulse inline-block h-2.5 w-2.5 rounded-full bg-terracotta" />
              {protectOrphans("Một tài khoản, mọi thương hiệu cà phê")}
            </span>
            <h1 className="type-display m-0 text-5xl text-on-dark sm:text-6xl lg:text-[5.15rem]">
              Quán nào
              <br />
              cũng là <em className="text-terracotta italic">quán&nbsp;quen</em>
            </h1>
            <p className="type-lead m-0 max-w-[560px] text-on-dark-muted sm:text-[1.3rem]">
              {protectOrphans("Chọn thương hiệu bạn thích, hẹn giờ lấy ly nước, trả trước và đi ngang là cầm. Ngồi tại quán thì quét mã QR trên bàn, không cần tải gì.")}
            </p>
            <div className="mt-1 flex flex-wrap gap-3.5">
              <button
                type="button"
                onClick={() => (isCustomer ? navigate(activeBrand ? "customer-menu" : "customer-shops") : goJoin("auth-customer-register"))}
                className="rounded-full bg-terracotta px-8 py-4 text-[17px] font-semibold text-on-espresso"
              >
                {protectOrphans("Bắt đầu đặt món")}
              </button>
              <a
                href="#brands"
                className="rounded-full border-[1.5px] border-white/40 px-8 py-4 text-[17px] font-medium text-on-dark"
              >
                {protectOrphans("Khám phá thương hiệu")}
              </a>
            </div>
            <p className="m-0 text-[15px] text-on-dark-soft">{protectOrphans("Chưa đăng nhập vẫn xem được menu và chi nhánh.")}</p>
          </div>

          <div className="relative flex min-w-0 flex-[1_1_440px] items-center justify-center" style={{ height: 540 }}>
            <div aria-hidden className="absolute h-[420px] w-[420px] max-w-full rounded-full bg-terracotta/15" />
            <CupHero />
            <div className="ch-float-1 absolute left-0 top-[70px] flex min-w-[200px] flex-col gap-2 rounded-[20px] bg-surface/96 px-4 py-3.5 text-text-primary shadow-[0_16px_40px_rgba(0,0,0,0.35)]">
              <div className="text-[13px] text-text-secondary">Đơn của bạn</div>
              <div className="font-semibold">Đang pha</div>
              <div className="h-1.5 rounded-full bg-sand">
                <div className="h-full w-[62%] rounded-full bg-clay" />
              </div>
            </div>
            <div className="ch-float-2 absolute right-0 top-[150px] rounded-[20px] bg-clay px-4 py-3.5 text-white shadow-[0_16px_40px_rgba(0,0,0,0.35)]">
              <div className="text-[13px] opacity-90">Khung giờ nhận</div>
              <div className="text-xl font-semibold">08:00 · còn chỗ</div>
            </div>
            <div className="ch-float-3 absolute bottom-[30px] left-[30px] flex items-center gap-3 rounded-[20px] bg-surface/96 px-4 py-3.5 text-text-primary shadow-[0_16px_40px_rgba(0,0,0,0.35)]">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-state-success font-semibold text-white">D</div>
              <div>
                <div className="font-semibold">Demo Coffee</div>
                <div className="text-[13px] text-text-secondary">Đã tích điểm</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MARQUEE */}
      <section className="overflow-hidden bg-terracotta py-4 text-ink">
        <div className="ch-marq flex items-center gap-14 whitespace-nowrap font-serif text-[28px]">
          {marquee.map((m, i) => (
            <span key={`${m}-${i}`} className="flex items-center gap-14">
              {m}
              <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-full bg-ink" />
            </span>
          ))}
        </div>
      </section>

      {/* BRANDS */}
      <section id="brands" className="scroll-mt-8 px-5 py-20 sm:px-10 sm:py-24">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-12">
          <div className="flex max-w-[760px] flex-col gap-3.5">
            <span className="type-eyebrow text-clay">Thương hiệu</span>
            <h2 className="type-title m-0 text-4xl text-text-primary sm:text-5xl lg:text-[3.4rem]">
              Chạm vào một quán, xem ngay menu của quán
            </h2>
          </div>

          {brandsQ.isPending ? (
            <LoadingState label="Đang tải thương hiệu…" />
          ) : brandsQ.isError && live.length === 0 ? (
            <ErrorState description={brandsQ.error.message} onRetry={() => void brandsQ.refetch()} />
          ) : (
            <div className="flex flex-wrap items-center gap-10 lg:gap-14">
              <div className="flex min-w-0 flex-[1_1_440px] flex-col gap-4">
                {all.slice(0, 6).map((b, i) => {
                  const on = i === brandIdx
                  const color = b.brandColor || C.roast
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setBrandIdx(i)}
                      className="flex w-full items-center gap-5 rounded-[24px] border-2 px-6 py-5 text-left transition-colors"
                      style={{
                        borderColor: on ? color : "#DCCDB4",
                        background: on ? "#FFFFFF" : "transparent",
                        color: C.ink,
                      }}
                    >
                      {b.logoUrl ? (
                        <img src={b.logoUrl} alt="" className="h-[60px] w-[60px] shrink-0 rounded-[18px] object-contain" />
                      ) : (
                        <span
                          className="flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-[18px] font-serif text-[28px] text-white"
                          style={{ background: color }}
                        >
                          {b.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                      <span className="flex min-w-0 flex-col gap-1">
                        <span className="font-serif text-[26px] leading-tight">{b.name}</span>
                        <span className="text-[15px] opacity-85">
                          {b.description || `${b.branchCount} chi nhánh`}
                        </span>
                      </span>
                    </button>
                  )
                })}
                {all.length >= BRAND_SEARCH_FROM && (
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <label htmlFor="brand-search" className="sr-only">Tìm quán</label>
                    <input
                      id="brand-search"
                      type="search"
                      value={query}
                      placeholder="Tìm quán theo tên…"
                      autoComplete="off"
                      onChange={(e) => { setQuery(e.target.value); setShowAll(false) }}
                      className="min-h-11 min-w-0 flex-1 rounded-[12px] border px-4"
                      style={{ borderColor: C.line, background: "#fff" }}
                    />
                    <span className="text-sm" style={{ color: C.mute }}>{found.length} quán</span>
                  </div>
                )}
                {query.trim() && (
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {shown.map((b) => (
                      <li key={b.id}>
                        <Link
                          to={usingFallback ? "#brands" : `/b/${b.slug}`}
                          onClick={(e) => { if (usingFallback) e.preventDefault() }}
                          className="flex items-center gap-3 rounded-[16px] border bg-white p-3 hover:border-terracotta"
                          style={{ borderColor: C.line }}
                        >
                          <span
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] font-serif text-lg text-white"
                            style={{ background: b.brandColor || C.roast }}
                          >
                            {b.name.charAt(0)}
                          </span>
                          <span className="truncate font-medium">{b.name}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
                {found.length > shown.length && (
                  <button type="button" className="text-sm font-medium underline" style={{ color: C.roast }} onClick={() => setShowAll(true)}>
                    Xem thêm {found.length - shown.length} quán
                  </button>
                )}
                <p className="m-0 mt-2 text-[15px]" style={{ color: C.mute }}>
                  {usingFallback
                    ? protectOrphans("Thương hiệu minh hoạ — dữ liệu thật do từng Brand Admin cập nhật.")
                    : protectOrphans("Chọn một quán để xem menu công khai. Đặt mang đi cần tài khoản khách hàng.")}
                </p>
              </div>

              {/* phone mock */}
              {sel && (
                <div className="flex min-w-0 flex-[1_1_360px] justify-center">
                  <div className="w-[330px] max-w-full overflow-hidden rounded-[48px] border-[10px] border-ink bg-white shadow-[0_30px_70px_rgba(42,27,20,0.3)]">
                    <div className="flex flex-col gap-3.5 px-[22px] pb-[22px] pt-[30px] text-white" style={{ background: sel.brandColor || C.roast }}>
                      <div className="flex items-center gap-3">
                        <div className="flex h-[46px] w-[46px] items-center justify-center rounded-[14px] bg-white/22 font-serif text-2xl">
                          {sel.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-serif text-[22px]">{sel.name}</div>
                          <div className="text-[13px] opacity-90">{sel.description || `${sel.branchCount} chi nhánh`}</div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <span className="rounded-full bg-white px-3.5 py-2 text-[13px] font-semibold text-text-primary">Mang đi</span>
                        <span className="rounded-full bg-white/20 px-3.5 py-2 text-[13px]">Tại quán</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-3 bg-bg-base px-[18px] pb-5 pt-[18px]">
                      {drinks.map((d) => (
                        <div key={d} className="flex items-center gap-3.5 rounded-[18px] border border-border bg-white p-3">
                          <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-[14px] bg-sand">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={sel.brandColor || C.roast} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                              <path d="M5 8h12v6a5 5 0 01-5 5h-2a5 5 0 01-5-5zM17 10h2a2 2 0 010 4h-2M9 3v2M13 3v2" />
                            </svg>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-[15px] font-semibold">{d}</div>
                            <div className="text-xs text-text-secondary">Size · đường · đá · topping</div>
                          </div>
                          {!usingFallback ? (
                            <Link
                              to={`/b/${sel.slug}`}
                              aria-label={`Xem ${d}`}
                              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[22px] text-white"
                              style={{ background: sel.brandColor || C.roast }}
                            >
                              +
                            </Link>
                          ) : (
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[22px] text-white" style={{ background: sel.brandColor || C.roast }}>+</span>
                          )}
                        </div>
                      ))}
                      {!usingFallback ? (
                        <Link
                          to={`/b/${sel.slug}`}
                          className="mt-1 rounded-2xl bg-ink px-4 py-3.5 text-center text-[15px] font-semibold text-white"
                        >
                          Xem thực đơn
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onClick={() => goJoin("auth-customer-register")}
                          className="mt-1 rounded-2xl bg-ink px-4 py-3.5 text-center text-[15px] font-semibold text-white"
                        >
                          Đăng ký để đặt món
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* PERKS */}
      <section id="perks" className="scroll-mt-8 bg-sand px-5 py-20 sm:px-10 sm:py-24">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-12">
          <div className="flex max-w-[760px] flex-col gap-3.5">
            <span className="type-eyebrow text-clay">Điểm nhấn</span>
            <h2 className="type-title m-0 text-4xl text-text-primary sm:text-5xl lg:text-[3.4rem]">
              Đặt trước thông minh, nhận nước không phải chờ
            </h2>
          </div>

          <div className="flex flex-wrap gap-6">
            <div className="flex min-w-0 flex-[1_1_560px] flex-col gap-[22px] rounded-[32px] bg-white p-9">
              <div className="flex flex-col gap-2">
                <div className="type-title text-[1.7rem] leading-snug">Chọn giờ nhận, thấy ngay còn bao nhiêu chỗ</div>
                <p className="m-0 text-base leading-relaxed" style={{ color: C.mute }}>
                  Chỉ giữ chỗ sau khi thanh toán thành công. Nếu khung giờ đầy trong lúc bạn trả tiền, hệ thống hoàn tiền tự động.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                {SLOTS.map((s, i) => {
                  const off = s.n === 0
                  const on = i === slotIdx && !off
                  return (
                    <button
                      key={s.time}
                      type="button"
                      disabled={off}
                      onClick={() => setSlotIdx(i)}
                      className="flex min-w-[120px] flex-[1_1_120px] flex-col items-start gap-1 rounded-[18px] border-2 px-[18px] py-4 disabled:cursor-not-allowed"
                      style={{
                        borderColor: on ? C.ink : C.line,
                        background: off ? C.sand : on ? C.ink : C.cream,
                        color: off ? "#7A6858" : on ? "#fff" : C.ink,
                      }}
                    >
                      <span className="text-2xl font-semibold">{s.time}</span>
                      <span className="text-sm">{off ? "Hết chỗ" : `Còn ${s.n} chỗ`}</span>
                    </button>
                  )
                })}
              </div>
              <div className="text-sm" style={{ color: C.mute }}>Số chỗ trong ví dụ chỉ để minh hoạ giao diện.</div>
            </div>

            <div className="flex min-w-0 flex-[1_1_400px] flex-col gap-5 rounded-[32px] bg-ink p-9 text-on-dark">
              <div className="type-title text-[1.7rem] leading-snug">Theo dõi đơn theo thời gian thực</div>
              <div className="flex flex-col gap-3">
                {STEPS.map((label, i) => (
                  <div key={label} className="flex items-center gap-3.5" style={{ opacity: i <= stage ? 1 : 0.7 }}>
                    <span
                      className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full text-sm font-semibold text-on-espresso"
                      style={{ background: i <= stage ? C.accent : "rgba(250,246,240,0.25)" }}
                    >
                      {i + 1}
                    </span>
                    <span className="text-[17px]" style={{ fontWeight: i === stage ? 600 : 400 }}>{label}</span>
                  </div>
                ))}
              </div>
              <div className="h-2 rounded-full bg-white/15">
                <div className="h-full rounded-full bg-terracotta" style={{ width: `${((stage + 1) / 4) * 100}%` }} />
              </div>
              <button
                type="button"
                onClick={() => setStage((s) => (s >= 3 ? 0 : s + 1))}
                className="w-fit rounded-full bg-terracotta px-6 py-3.5 text-base font-semibold text-on-espresso"
              >
                {stage >= 3 ? "Chạy lại" : "Giả lập bước tiếp theo"}
              </button>
            </div>

            <div className="flex min-w-0 flex-[1_1_400px] flex-col gap-[18px] rounded-[32px] bg-clay p-9 text-white">
              <div className="type-title text-[1.7rem] leading-snug">Hỏi Smart Barista, chọn nhanh món hợp gu</div>
              <div className="max-w-[85%] self-end rounded-[20px_20px_4px_20px] bg-white px-[18px] py-3.5 text-base text-text-primary">
                Mình muốn món lạnh, không quá ngọt
              </div>
              <div className="max-w-[90%] self-start rounded-[20px_20px_20px_4px] bg-ink px-[18px] py-3.5 text-base leading-relaxed text-on-dark">
                {protectOrphans("Bạn thử Cold brew ít đường nhé. Món còn hàng ở chi nhánh bạn chọn.")}
              </div>
              <p className="m-0 text-[15px] leading-relaxed opacity-95">
                {protectOrphans("Gợi ý dựa trên những món bạn từng chọn và sở thích bạn khai báo, chỉ trong menu hiện tại của quán.")}
              </p>
            </div>

            <div className="flex min-w-0 flex-[1_1_360px] flex-col gap-5 rounded-[32px] bg-white p-9">
              <div className="type-title text-[1.7rem] leading-snug">{protectOrphans("Điểm và voucher của từng quán")}</div>
              <p className="m-0 text-base leading-relaxed" style={{ color: C.mute }}>
                {protectOrphans("Một tài khoản, nhưng điểm tính riêng theo mỗi thương hiệu.")}
              </p>
              <div className="flex flex-col gap-3.5">
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-[15px] font-semibold"><span>Demo Coffee</span><span style={{ color: C.green }}>Điểm</span></div>
                  <div className="h-2.5 rounded-full bg-sand"><div className="h-full w-[72%] rounded-full" style={{ background: C.green }} /></div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-[15px] font-semibold"><span>Trà Xanh House</span><span style={{ color: C.roast }}>Điểm</span></div>
                  <div className="h-2.5 rounded-full bg-sand"><div className="h-full w-[38%] rounded-full" style={{ background: C.roast }} /></div>
                </div>
              </div>
            </div>

            <div className="flex min-w-0 flex-[1_1_400px] flex-wrap items-center gap-7 rounded-[32px] bg-white p-9">
              <div className="flex min-w-0 flex-[1_1_200px] flex-col gap-2.5">
                <div className="type-title text-[1.7rem] leading-snug">Ngồi tại quán? Quét QR</div>
                <p className="m-0 text-base leading-relaxed" style={{ color: C.mute }}>
                  {protectOrphans("Gọi món không cần tài khoản. Nhân viên mang hóa đơn và mã thanh toán ra tận bàn.")}
                </p>
              </div>
              <div
                className="grid w-[154px] shrink-0 grid-cols-11 gap-0.5 rounded-[18px] bg-bg-base p-2.5"
                role="img"
                aria-label="Mã QR minh hoạ"
              >
                {qr.map((c, i) => (
                  <div key={i} className="aspect-square rounded-[2px]" style={{ background: c }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-8 px-5 py-20 sm:px-10 sm:pb-16 sm:pt-24">
        <div className="mx-auto flex max-w-[900px] flex-col gap-8">
          <h2 className="type-title m-0 text-4xl text-text-primary sm:text-5xl">{protectOrphans("Câu hỏi thường gặp")}</h2>
          <div className="flex flex-col gap-3">
            {FAQS.map((f) => (
              <details key={f.q} className="rounded-[20px] border border-border bg-white px-7 py-[22px]">
                <summary className="cursor-pointer list-none text-lg font-semibold [&::-webkit-details-marker]:hidden">{f.q}</summary>
                <p className="mt-3.5 mb-0 text-base leading-relaxed" style={{ color: C.mute }}>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* JOIN CTA */}
      <section id="join" className="px-5 pb-24 sm:px-10">
        <div className="relative mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-10 overflow-hidden rounded-[40px] bg-ink px-8 py-14 text-on-dark sm:px-14 sm:py-16">
          <div aria-hidden className="pointer-events-none absolute -right-28 -top-28 h-[380px] w-[380px] rounded-full bg-ink-lift" />
          <div className="relative flex min-w-0 flex-[1_1_460px] flex-col gap-4">
            <h2 className="type-title m-0 text-4xl text-on-dark sm:text-[3.25rem]">
              Sẵn sàng cho ly <em className="text-terracotta italic">tiếp theo</em>?
            </h2>
            <p className="m-0 text-lg leading-relaxed text-on-dark-muted sm:text-[19px]">
              Đăng ký một lần, dùng cho mọi thương hiệu trên AICOS.
            </p>
          </div>
          <div className="relative flex flex-wrap gap-3.5">
            {isCustomer ? (
              <button
                type="button"
                onClick={() => navigate(activeBrand ? "customer-menu" : "customer-shops")}
                className="rounded-full bg-terracotta px-8 py-4 text-[17px] font-semibold text-on-espresso"
              >
                Tiếp tục đặt món
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => goJoin("auth-customer-register")}
                  className="rounded-full bg-terracotta px-8 py-4 text-[17px] font-semibold text-on-espresso"
                >
                  Đăng ký miễn phí
                </button>
                <button
                  type="button"
                  onClick={() => goJoin("auth-customer-login")}
                  className="rounded-full border-[1.5px] border-white/45 px-8 py-4 text-[17px] font-medium text-on-dark"
                >
                  Đăng nhập
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      <footer className="flex flex-wrap items-center justify-between gap-5 bg-ink px-5 py-9 text-[15px] text-on-dark-soft sm:px-10">
        <PlatformLogo tone="light" layout="horizontal" />
        <div className="flex flex-wrap gap-6">
          <a href="#brands">Thương hiệu</a>
          <a href="#faq">Hỏi đáp</a>
          <button type="button" onClick={() => navigate("landing")} className="hover:text-white">Dành cho chủ quán</button>
        </div>
        <a href={`mailto:${CONTACT.email}`} className="hover:text-white">{CONTACT.email}</a>
      </footer>
    </div>
  )
}
