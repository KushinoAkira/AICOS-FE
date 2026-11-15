import { useQuery } from "@tanstack/react-query"
import type { Page } from "../../App"
import { useEffect } from "react"
import { useLocation } from "react-router"
import { PlatformLogo } from "../../components/AuthShell"
import { PublicPage } from "../../components/PublicChrome"
import { Reveal } from "../../components/Reveal"
import { FaqSection, FinalCta } from "./LandingSections"
import { BEHIND, JOURNEY } from "./landingContent"
import { Button } from "../../components/ui"
import { formatVND } from "../../lib/format"
import { publicApi } from "../../lib/api/platform"
import { protectOrphans } from "../../lib/typography"

const HERO_IMG = "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=1800&q=70&auto=format&fit=crop"

const STEPS = [
  { n: "1", title: protectOrphans("Liên hệ tư vấn"), body: protectOrphans("Cho AICOS biết quy mô và nhu cầu của quán để chọn gói phù hợp.") },
  { n: "2", title: protectOrphans("AICOS tạo thương hiệu"), body: protectOrphans("Đội ngũ AICOS tạo thương hiệu và gửi email mời đặt mật khẩu cho chủ quán.") },
  { n: "3", title: protectOrphans("Thiết lập và bán hàng"), body: protectOrphans("Tạo chi nhánh, sơ đồ bàn và mã QR, nhập thực đơn, mời nhân viên rồi mở bán.") },
]

/** Public B2B home: entry for shop owners (register / sign in a brand). */
export default function Landing({ navigate }: { navigate: (p: Page) => void }) {
  const { hash } = useLocation()
  useEffect(() => { if (hash) document.getElementById(hash.slice(1))?.scrollIntoView() }, [hash])
  const plans = useQuery({ queryKey: ["public", "plans"], queryFn: publicApi.plans, retry: 1 })
  return (
    <PublicPage navigate={navigate} uc="UC-05">
        <section className="relative isolate overflow-hidden bg-espresso text-white">
          <img src={HERO_IMG} alt="" aria-hidden className="kenburns absolute inset-0 -z-20 h-full w-full object-cover" />
          <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-r from-espresso via-espresso/92 to-espresso/55" />
          <div className="mx-auto max-w-6xl px-4 pb-24 pt-20 sm:px-8 lg:pb-32 lg:pt-28">
            <div className="rise-in max-w-[38rem]">
              <PlatformLogo tone="light" className="h-16 w-auto object-contain drop-shadow-[0_6px_18px_rgba(0,0,0,0.35)] sm:h-[4.5rem]" />
              <h1 className="type-display mt-12 text-[2.5rem] text-white sm:mt-14 sm:text-[3.25rem] lg:text-[3.75rem]">
                {protectOrphans("Từ lúc khách gọi món tới khi chủ quán xem số liệu")}
              </h1>
              <p className="type-lead mt-7 max-w-lg text-[1.05rem] text-white/80 sm:text-lg">
                {protectOrphans("Nền tảng cho chuỗi cà phê: QR, kiosk, mang đi, quầy pha, thu ngân và báo cáo trên một hệ thống.")}
              </p>
              <div className="mt-11 flex flex-wrap gap-3">
                <Button className="min-h-12 px-8 text-[15px] font-semibold tracking-[-0.01em]" onClick={() => navigate("register-brand")}>
                  {protectOrphans("Đăng ký quán của bạn")}
                </Button>
                <Button
                  variant="secondary"
                  className="min-h-12 border-white/35 bg-transparent px-8 text-[15px] font-semibold tracking-[-0.01em] text-white hover:bg-white/10"
                  onClick={() => navigate("order-start")}
                >
                  {protectOrphans("Đặt món / Dành cho khách")}
                </Button>
              </div>
              <p className="mt-8 text-sm leading-relaxed text-white/70">
                {protectOrphans("Dùng thử 14 ngày, không cần thẻ thanh toán. Đã có tài khoản quán?")}{" "}
                <button type="button" onClick={() => navigate("staff-entry")} className="font-semibold text-white underline decoration-white/35 underline-offset-[3px] hover:decoration-white">
                  Đăng nhập
                </button>
              </p>
            </div>
          </div>
        </section>

        <section id="tinh-nang" className="py-20 sm:py-24">
          <div id="doi-tuong" className="mx-auto max-w-6xl scroll-mt-20 px-4 sm:px-8">
            <h2 className="type-title max-w-2xl text-[1.85rem] text-text-primary sm:text-[2.35rem]">{protectOrphans("Một đơn hàng đi qua quán của bạn")}</h2>
            <p className="type-lead mt-5 max-w-2xl text-text-secondary">{protectOrphans("Mỗi người dùng đúng màn hình của mình. Đơn khách gọi đi thẳng tới quầy pha, tới thu ngân rồi vào báo cáo, không ai phải nhập lại.")}</p>
            <ol className="relative mt-14 grid gap-12 md:grid-cols-4 md:gap-8">
              <span aria-hidden className="absolute left-[15px] top-2 bottom-2 w-px bg-border md:left-2 md:right-2 md:top-[15px] md:bottom-auto md:h-px md:w-auto" />
              {JOURNEY.map((j, i) => (
                <li key={j.who} className="relative grid grid-cols-[32px_minmax(0,1fr)] gap-4 md:block">
                  <span className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full bg-espresso font-serif text-sm font-semibold text-white">{i + 1}</span>
                  <div className="md:mt-6">
                    <p className="type-eyebrow text-clay">{j.who}</p>
                    <h3 className="type-title mt-2 text-xl text-text-primary">{j.title}</h3>
                    <p className="type-body mt-2.5 text-text-secondary">{j.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="border-y border-border bg-surface py-16">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
            <div>
              <h2 className="type-title text-[1.85rem] text-text-primary sm:text-[2.15rem]">Phía sau quầy</h2>
              <p className="type-lead mt-5 text-text-secondary">{protectOrphans("Những việc chủ quán và quản lý làm mỗi tuần, đã có sẵn.")}</p>
            </div>
            <dl className="grid gap-x-10 sm:grid-cols-2">
              {BEHIND.map((b) => (
                <div key={b.title} className="border-t border-border py-5">
                  <dt className="font-medium text-text-primary">{b.title}</dt>
                  <dd className="mt-1 text-sm leading-relaxed text-text-secondary">{b.body}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className="py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-8">
            <h2 className="type-title text-[1.85rem] text-text-primary sm:text-[2.15rem]">Bắt đầu như thế nào</h2>
            <ol className="mt-8 grid gap-8 md:grid-cols-3">
              {STEPS.map((st) => (
                <li key={st.n} className="flex gap-4">
                  <span aria-hidden className="font-serif text-5xl leading-none text-terracotta">{st.n}</span>
                  <div>
                    <h3 className="font-medium text-text-primary">{st.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-text-secondary">{st.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="bang-gia" className="border-t border-border py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-8">
            <h2 className="type-title text-[1.85rem] text-text-primary sm:text-[2.15rem]">Bảng giá</h2>
            <p className="type-lead mt-5 text-text-secondary">{protectOrphans("Chọn gói theo số chi nhánh. Đổi gói bất cứ lúc nào.")}</p>
            {plans.isPending && <p className="mt-6 text-sm text-text-secondary">Đang tải bảng giá…</p>}
            {plans.isError && <p className="mt-6 text-sm text-state-danger">Chưa tải được bảng giá. <button className="underline" onClick={() => void plans.refetch()}>Thử lại</button></p>}
            {plans.data && (
              <ul className="mt-8 grid gap-4 md:grid-cols-3">
                {plans.data.map((p, i) => (
                  <Reveal as="li" key={p.id} delay={i * 100} className={`hover-lift flex flex-col rounded-[16px] border p-6 ${i === 1 ? "border-espresso bg-surface shadow-sm" : "border-border bg-surface"}`}>
                    <h3 className="type-title text-xl text-text-primary">
                      {p.name}
                      {i === 1 && (
                        <>
                          <span className="sr-only"> — </span>
                          <span className="ml-2 inline-block rounded-full bg-espresso px-2 py-0.5 align-middle text-xs font-sans font-medium tracking-normal text-white">Phổ biến</span>
                        </>
                      )}
                    </h3>
                    <p className="type-title mt-4 text-3xl text-text-primary">
                      <span className="whitespace-nowrap">{formatVND(p.monthlyFee)}<span className="type-muted font-sans text-sm tracking-normal"> / tháng</span></span>
                    </p>
                    <ul className="mt-4 flex-1 space-y-1.5 text-sm text-text-secondary">
                      <li>{protectOrphans(`Tối đa ${p.maxBranches} chi nhánh`)}</li>
                      <li>{protectOrphans(`Tối đa ${p.maxUsers} tài khoản nhân viên`)}</li>
                      <li>{protectOrphans("QR gọi món, đặt mang đi, tích điểm")}</li>
                    </ul>
                    <Button variant={i === 1 ? "primary" : "secondary"} className="mt-6 min-h-11 w-full whitespace-normal" onClick={() => navigate("contact")}>{protectOrphans(`Liên hệ về ${p.name}`)}</Button>
                  </Reveal>
                ))}
              </ul>
            )}
          </div>
        </section>

        <FaqSection plans={plans.data ?? []} />
        <FinalCta onContact={() => navigate("register-brand")} />
    </PublicPage>
  )
}
