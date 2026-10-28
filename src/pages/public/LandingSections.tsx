import { Link } from "react-router"
import { Reveal } from "../../components/Reveal"
import { Button } from "../../components/ui"
import { FAQ, ROLES } from "./landingContent"
import { QuickAsk } from "./QuickAsk"
import type { Plan } from "../../lib/api/platform"

export function RolesSection() {
  return (
    <section id="doi-tuong" className="mx-auto max-w-6xl px-4 py-14 sm:px-8">
      <h2 className="font-serif text-3xl">Mỗi vai trò một màn hình riêng</h2>
      <p className="mt-2 max-w-2xl text-text-secondary">Mỗi người chỉ thấy đúng những gì cần cho công việc của mình, nên đào tạo nhân viên mới rất nhanh.</p>
      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {ROLES.map((r, i) => (
          <Reveal as="li" key={r.who} delay={i * 70} className="hover-lift rounded-[16px] border border-border bg-surface p-5">
            <h3 className="font-serif text-lg">{r.who}</h3>
            <p className="mt-2 text-sm leading-relaxed text-text-secondary">{r.body}</p>
          </Reveal>
        ))}
      </ul>
    </section>
  )
}

export function FaqSection({ plans = [] }: { plans?: Plan[] }) {
  return (
    <section id="hoi-dap" className="border-t border-border bg-surface py-14">
      <div className="mx-auto max-w-3xl px-4 sm:px-8">
        <h2 className="font-serif text-3xl">Câu hỏi thường gặp</h2>
        <QuickAsk plans={plans} />
        <div className="mt-8 divide-y divide-border rounded-[16px] border border-border bg-bg-base">
          {FAQ.map((f) => (
            <details key={f.q} className="group p-5">
              <summary className="flex min-h-8 cursor-pointer list-none items-center justify-between gap-4 font-medium">
                {f.q}
                <span aria-hidden className="text-text-secondary transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-text-secondary">{f.a}</p>
            </details>
          ))}
        </div>
        <p className="mt-5 text-sm text-text-secondary">Chưa thấy câu trả lời? <Link to="/contact" className="text-clay underline">Liên hệ chúng tôi</Link>.</p>
      </div>
    </section>
  )
}

export function FinalCta({ onContact }: { onContact: () => void }) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-14 sm:px-8">
      <Reveal className="relative isolate overflow-hidden rounded-[20px] bg-espresso p-8 text-center text-white sm:p-12">
        <img src="/media/photo-1442512595331-e89e73853f31.jpg?v=lfs2" alt="" aria-hidden loading="lazy" className="absolute inset-0 -z-20 h-full w-full object-cover" />
        <div aria-hidden className="absolute inset-0 -z-10 bg-espresso/85" />
        <h2 className="font-serif text-3xl">Sẵn sàng đưa quán lên AICOS?</h2>
        <p className="mx-auto mt-3 max-w-xl text-white/75">Để lại thông tin, AICOS sẽ tư vấn và tạo tài khoản quản trị cho thương hiệu của bạn. Dùng thử 14 ngày, không cần thẻ thanh toán.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button className="min-h-12 bg-white px-6 text-espresso hover:bg-sand" onClick={onContact}>Liên hệ để dùng thử</Button>
        </div>
      </Reveal>
    </section>
  )
}
