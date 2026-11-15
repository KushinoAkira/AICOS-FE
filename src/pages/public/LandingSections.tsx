import { Link } from "react-router"
import { Reveal } from "../../components/Reveal"
import { Button } from "../../components/ui"
import { FAQ } from "./landingContent"
import { QuickAsk } from "./QuickAsk"
import type { Plan } from "../../lib/api/platform"
import { protectOrphans } from "../../lib/typography"

export function FaqSection({ plans = [] }: { plans?: Plan[] }) {
  return (
    <section id="hoi-dap" className="border-t border-border bg-surface py-14">
      <div className="mx-auto max-w-3xl px-4 sm:px-8">
        <h2 className="type-title text-[1.85rem] text-text-primary sm:text-[2.15rem]">{protectOrphans("Câu hỏi thường gặp")}</h2>
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
        <p className="mt-5 text-sm text-text-secondary">{protectOrphans("Chưa thấy câu trả lời?")} <Link to="/contact" className="text-clay underline">{protectOrphans("Liên hệ chúng tôi")}</Link>.</p>
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
        <h2 className="type-title text-[1.85rem] text-white sm:text-[2.35rem]">{protectOrphans("Sẵn sàng đưa quán lên AICOS?")}</h2>
        <p className="type-lead mx-auto mt-5 max-w-xl text-white/80">{protectOrphans("Để lại thông tin, AICOS sẽ tư vấn và tạo tài khoản quản trị cho thương hiệu của bạn. Dùng thử 14 ngày, không cần thẻ thanh toán.")}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button className="min-h-12 bg-white px-6 text-espresso hover:bg-sand" onClick={onContact}>{protectOrphans("Liên hệ để dùng thử")}</Button>
        </div>
      </Reveal>
    </section>
  )
}
