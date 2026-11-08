import { useQuery } from "@tanstack/react-query"
import type { Page } from "../../App"
import { useEffect, type CSSProperties } from "react"
import { useLocation } from "react-router"
import { PublicPage } from "../../components/PublicChrome"
import { Reveal } from "../../components/Reveal"
import { FaqSection, FinalCta } from "./LandingSections"
import { BEHIND, JOURNEY } from "./landingContent"
import { OrderTicket } from "./OrderTicket"
import { Button } from "../../components/ui"
import { formatVND } from "../../lib/format"
import { publicApi } from "../../lib/api/platform"

const HERO_IMG = "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=1800&q=70&auto=format&fit=crop"

const STEPS = [
  { n: "1", title: "Liên hệ tư vấn", body: "Cho AICOS biết quy mô và nhu cầu của quán để chọn gói phù hợp." },
  { n: "2", title: "AICOS tạo thương hiệu", body: "Đội ngũ AICOS tạo thương hiệu và gửi email mời đặt mật khẩu cho chủ quán." },
  { n: "3", title: "Thiết lập và bán hàng", body: "Tạo chi nhánh, sơ đồ bàn và mã QR, nhập thực đơn, mời nhân viên rồi mở bán." },
]

/** Public home: the entry point for shop owners (register a brand); customers go through "Đặt món" (/dat-mon). */
export default function Landing({ navigate }: { navigate: (p: Page) => void }) {
  const { hash } = useLocation()
  useEffect(() => { if (hash) document.getElementById(hash.slice(1))?.scrollIntoView() }, [hash])
  const plans = useQuery({ queryKey: ["public", "plans"], queryFn: publicApi.plans, retry: 1 })
  return (
    <PublicPage navigate={navigate} uc="UC-05">
        <section className="relative isolate overflow-hidden bg-espresso text-white">
          <img src={HERO_IMG} alt="" aria-hidden className="kenburns absolute inset-0 -z-20 h-full w-full object-cover" />
          <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-r from-espresso via-espresso/90 to-espresso/60" />
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-14 sm:px-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:pb-24 lg:pt-20">
            <div className="rise-in">
              <h1 className="max-w-2xl font-serif text-4xl leading-[1.1] text-balance sm:text-6xl">Từ lúc khách gọi món tới khi chủ quán xem số liệu</h1>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/80">AICOS nối khách hàng, quầy pha chế, thu ngân và chủ quán của cả chuỗi cà phê trên một hệ thống. Khách gọi bằng QR, kiosk hay đặt mang đi; quầy pha nhận đơn ngay.</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button className="min-h-12 px-6" onClick={() => navigate("register-brand")}>Đăng ký quán của bạn</Button>
                <Button variant="secondary" className="min-h-12 px-6" onClick={() => navigate("order-start")}>Đặt món</Button>
              </div>
              <p className="mt-5 text-sm text-white/70">Dùng thử 14 ngày, không cần thẻ thanh toán. Đã có tài khoản quán? <button type="button" onClick={() => navigate("login")} className="text-white underline underline-offset-2">Đăng nhập</button></p>
            </div>
            <div className="rise-in" style={{ "--reveal-delay": "250ms" } as CSSProperties}>
              <OrderTicket />
            </div>
          </div>
        </section>

        <section id="tinh-nang" className="py-16 sm:py-20">
          <div id="doi-tuong" className="mx-auto max-w-6xl scroll-mt-20 px-4 sm:px-8">
            <h2 className="max-w-2xl font-serif text-3xl text-balance sm:text-4xl">Một đơn hàng đi qua quán của bạn</h2>
            <p className="mt-3 max-w-2xl text-text-secondary">Mỗi người dùng đúng màn hình của mình. Đơn khách gọi đi thẳng tới quầy pha, tới thu ngân rồi vào báo cáo, không ai phải nhập lại.</p>
            <ol className="relative mt-12 grid gap-10 md:grid-cols-4 md:gap-6">
              {/* The line the order travels along. */}
              <span aria-hidden className="absolute left-[15px] top-2 bottom-2 w-px bg-border md:left-2 md:right-2 md:top-[15px] md:bottom-auto md:h-px md:w-auto" />
              {JOURNEY.map((j, i) => (
                <li key={j.who} className="relative grid grid-cols-[32px_minmax(0,1fr)] gap-4 md:block">
                  <span className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full bg-espresso font-serif text-sm text-white">{i + 1}</span>
                  <div className="md:mt-5">
                    <p className="text-sm font-medium text-clay">{j.who}</p>
                    <h3 className="mt-1 font-serif text-xl leading-snug">{j.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-text-secondary">{j.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="border-y border-border bg-surface py-16">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
            <div>
              <h2 className="font-serif text-3xl text-balance">Phía sau quầy</h2>
              <p className="mt-3 text-text-secondary">Những việc chủ quán và quản lý làm mỗi tuần, đã có sẵn.</p>
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
            <h2 className="font-serif text-3xl">Bắt đầu như thế nào</h2>
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
            <h2 className="font-serif text-3xl">Bảng giá</h2>
            <p className="mt-2 text-text-secondary">Chọn gói theo số chi nhánh. Đổi gói bất cứ lúc nào.</p>
            {plans.isPending && <p className="mt-6 text-sm text-text-secondary">Đang tải bảng giá…</p>}
            {plans.isError && <p className="mt-6 text-sm text-state-danger">Chưa tải được bảng giá. <button className="underline" onClick={() => void plans.refetch()}>Thử lại</button></p>}
            {plans.data && (
              <ul className="mt-8 grid gap-4 md:grid-cols-3">
                {plans.data.map((p, i) => (
                  <Reveal as="li" key={p.id} delay={i * 100} className={`hover-lift flex flex-col rounded-[16px] border p-6 ${i === 1 ? "border-espresso bg-surface shadow-sm" : "border-border bg-surface"}`}>
                    <h3 className="font-serif text-xl">{p.name}{i === 1 && <span className="ml-2 rounded-full bg-espresso px-2 py-0.5 align-middle text-xs text-white">Phổ biến</span>}</h3>
                    <p className="mt-3 font-serif text-3xl">{formatVND(p.monthlyFee)}<span className="text-sm text-text-secondary"> / tháng</span></p>
                    <ul className="mt-4 flex-1 space-y-1.5 text-sm text-text-secondary">
                      <li>Tối đa {p.maxBranches} chi nhánh</li>
                      <li>Tối đa {p.maxUsers} tài khoản nhân viên</li>
                      <li>QR gọi món, đặt mang đi, tích điểm</li>
                    </ul>
                    <Button variant={i === 1 ? "primary" : "secondary"} className="mt-6 min-h-11 w-full" onClick={() => navigate("contact")}>Liên hệ về {p.name}</Button>
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
