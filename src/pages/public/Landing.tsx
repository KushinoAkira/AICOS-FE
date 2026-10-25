import { useQuery } from "@tanstack/react-query"
import type { Page } from "../../App"
import { useEffect, type CSSProperties } from "react"
import { useLocation } from "react-router"
import { PublicPage } from "../../components/PublicChrome"
import { Reveal } from "../../components/Reveal"
import { FaqSection, FinalCta, RolesSection } from "./LandingSections"
import { FEATURES } from "./landingContent"
import { Button } from "../../components/ui"
import { formatVND } from "../../lib/format"
import { publicApi } from "../../lib/api/platform"

const HERO_IMG = "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=1800&q=70&auto=format&fit=crop"

const STEPS = [
  { n: "1", title: "Liên hệ tư vấn", body: "Cho AICOS biết quy mô và nhu cầu của quán để chọn gói phù hợp." },
  { n: "2", title: "AICOS tạo thương hiệu", body: "Đội ngũ AICOS tạo thương hiệu và gửi email mời đặt mật khẩu cho chủ quán." },
  { n: "3", title: "Thiết lập và bán hàng", body: "Tạo chi nhánh, sơ đồ bàn và mã QR, nhập thực đơn, mời nhân viên rồi mở bán." },
]

/** Public home: the entry point for shop owners (register a brand) and for customers (sign in). */
export default function Landing({ navigate }: { navigate: (p: Page) => void }) {
  const { hash } = useLocation()
  useEffect(() => { if (hash) document.getElementById(hash.slice(1))?.scrollIntoView() }, [hash])
  const plans = useQuery({ queryKey: ["public", "plans"], queryFn: publicApi.plans, retry: 1 })
  return (
    <PublicPage navigate={navigate} uc="UC-05">
        <section className="relative isolate overflow-hidden bg-espresso text-white">
          <img src={HERO_IMG} alt="" aria-hidden className="kenburns absolute inset-0 -z-20 h-full w-full object-cover" />
          <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-r from-espresso via-espresso/80 to-espresso/30" />
          <div aria-hidden className="animate-float absolute -right-16 top-10 -z-10 hidden h-64 w-64 rounded-full bg-terracotta/30 blur-3xl md:block" />
          <div className="mx-auto max-w-6xl px-4 pb-20 pt-16 sm:px-8 sm:pb-28 sm:pt-28">
            <p className="rise-in mb-3 inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">Nền tảng quản lý quán cà phê</p>
            <h1 className="rise-in max-w-3xl font-serif text-4xl leading-tight sm:text-6xl" style={{ "--reveal-delay": "100ms" } as CSSProperties}>Bán hàng, pha chế và quản lý chuỗi cà phê trên một nền tảng</h1>
            <p className="rise-in mt-5 max-w-2xl text-lg text-white/80" style={{ "--reveal-delay": "200ms" } as CSSProperties}>Khách gọi món bằng điện thoại, quầy pha chế nhận đơn tức thì, thu ngân đối soát gọn gàng và chủ quán nắm số liệu của mọi chi nhánh.</p>
            <div className="rise-in mt-8 flex flex-wrap gap-3" style={{ "--reveal-delay": "300ms" } as CSSProperties}>
              <Button className="min-h-12 px-6" onClick={() => navigate("contact")}>Liên hệ để dùng thử</Button>
              <Button variant="secondary" className="min-h-12 px-6" onClick={() => navigate("login")}>Tôi đã có tài khoản</Button>
            </div>
            <p className="rise-in mt-4 text-sm text-white/70" style={{ "--reveal-delay": "400ms" } as CSSProperties}>AICOS tạo tài khoản quản trị cho thương hiệu của bạn sau khi tư vấn. Dùng thử 14 ngày, không cần thẻ thanh toán.</p>
          </div>
        </section>
        <section id="tinh-nang" className="border-y border-border bg-surface py-14">
          <div className="mx-auto max-w-6xl px-4 sm:px-8">
            <h2 className="font-serif text-3xl">Mọi thứ một quán cà phê cần</h2>
            <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f, i) => (
                <Reveal as="li" key={f.title} delay={i * 70} className="hover-lift rounded-[16px] border border-border bg-bg-base p-5">
                  <h3 className="font-serif text-lg">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-text-secondary">{f.body}</p>
                </Reveal>
              ))}
            </ul>
          </div>
        </section>

        <RolesSection />

        <section className="border-y border-border bg-surface py-14">
          <div className="mx-auto max-w-6xl px-4 sm:px-8">
          <h2 className="font-serif text-3xl">Bắt đầu như thế nào</h2>
          <ol className="mt-8 grid gap-4 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <Reveal as="li" key={s.n} delay={i * 100} className="hover-lift rounded-[16px] border border-border bg-bg-base p-5">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-espresso font-medium text-white">{s.n}</span>
                <h3 className="mt-3 font-serif text-lg">{s.title}</h3>
                <p className="mt-1 text-sm text-text-secondary">{s.body}</p>
              </Reveal>
            ))}
          </ol>
          </div>
        </section>

        <section id="bang-gia" className="py-14">
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
                    <Button variant={i === 1 ? "primary" : "secondary"} className="mt-6 min-h-11 w-full" onClick={() => navigate("contact")}>Liên hệ về gói {p.name}</Button>
                  </Reveal>
                ))}
              </ul>
            )}
          </div>
        </section>

        <FaqSection plans={plans.data ?? []} />
        <FinalCta onContact={() => navigate("contact")} />

        <section className="mx-auto max-w-6xl px-4 pb-14 sm:px-8">
          <div className="rounded-[20px] bg-sand p-6 sm:flex sm:items-center sm:justify-between sm:p-8">
            <div>
              <h2 className="font-serif text-2xl">Bạn là khách hàng?</h2>
              <p className="mt-1 text-sm text-text-secondary">Quét mã QR trên bàn để gọi món ngay. Đăng nhập để tích điểm và xem lịch sử mua hàng.</p>
            </div>
            <div className="mt-4 flex gap-3 sm:mt-0">
              <Button variant="secondary" className="min-h-11" onClick={() => navigate("auth-customer-register")}>Đăng ký</Button>
              <Button className="min-h-11" onClick={() => navigate("auth-customer-login")}>Đăng nhập khách hàng</Button>
            </div>
          </div>
        </section>
    </PublicPage>
  )
}
