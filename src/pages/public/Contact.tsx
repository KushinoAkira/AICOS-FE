import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import type { Page } from "../../App"
import { PublicPage } from "../../components/PublicChrome"
import { Banner, Button, Field } from "../../components/ui"
import { ApiError } from "../../lib/api/http"
import { publicApi, type ContactInput } from "../../lib/api/platform"
import { CONTACT } from "../../lib/siteInfo"

const TOPICS: { id: ContactInput["topic"]; label: string }[] = [
  { id: "demo", label: "Đặt lịch xem demo" },
  { id: "pricing", label: "Hỏi về bảng giá" },
  { id: "support", label: "Cần hỗ trợ kỹ thuật" },
  { id: "other", label: "Khác" },
]

const EMPTY: ContactInput = { name: "", email: "", phone: "", topic: "demo", message: "" }

export default function Contact({ navigate }: { navigate: (p: Page) => void }) {
  const [form, setForm] = useState<ContactInput>(EMPTY)
  const [errors, setErrors] = useState<Partial<Record<keyof ContactInput, string>>>({})
  const [sent, setSent] = useState(false)
  const set = <K extends keyof ContactInput>(k: K, v: ContactInput[K]) => setForm((f) => ({ ...f, [k]: v }))

  const send = useMutation({
    mutationFn: () => publicApi.contact(form),
    onSuccess: () => { setSent(true); setForm(EMPTY) },
  })

  const submit = () => {
    const e: typeof errors = {}
    if (!form.name.trim()) e.name = "Vui lòng nhập họ tên"
    if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = "Email chưa hợp lệ"
    if (form.phone && !/^0\d{9}$/.test(form.phone)) e.phone = "Số điện thoại gồm 10 số, bắt đầu bằng 0"
    if (form.message.trim().length < 10) e.message = "Nội dung ít nhất 10 ký tự"
    setErrors(e)
    if (Object.keys(e).length === 0) send.mutate()
  }

  return (
    <PublicPage navigate={navigate} uc="UC-05">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-8">
        <h1 className="font-serif text-4xl">Liên hệ AICOS</h1>
        <p className="mt-2 max-w-2xl text-text-secondary">Muốn xem demo, hỏi về bảng giá hay cần hỗ trợ? Gửi lời nhắn cho chúng tôi. {CONTACT.responseTime}</p>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_340px]">
          <section aria-label="Biểu mẫu liên hệ" className="rounded-[16px] border border-border bg-surface p-6">
            {sent ? (
              <div role="status" className="py-8 text-center">
                <h2 className="font-serif text-2xl">Đã nhận lời nhắn</h2>
                <p className="mt-2 text-text-secondary">Cảm ơn bạn. Chúng tôi sẽ trả lời qua email trong vòng 1 ngày làm việc.</p>
                <Button variant="secondary" className="mt-6" onClick={() => setSent(false)}>Gửi lời nhắn khác</Button>
              </div>
            ) : (
              <form noValidate onSubmit={(e) => { e.preventDefault(); submit() }} className="space-y-4">
                {send.isError && <Banner>{send.error instanceof ApiError ? send.error.message : "Chưa gửi được lời nhắn. Vui lòng thử lại."}</Banner>}
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Họ tên" autoComplete="name" value={form.name} onChange={(e) => set("name", e.target.value)} error={errors.name} />
                  <Field label="Email" type="email" autoComplete="email" value={form.email} onChange={(e) => set("email", e.target.value)} error={errors.email} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Số điện thoại (không bắt buộc)" type="tel" inputMode="tel" autoComplete="tel" value={form.phone ?? ""} onChange={(e) => set("phone", e.target.value.replace(/\D/g, "").slice(0, 10))} error={errors.phone} />
                  <div>
                    <label htmlFor="contact-topic" className="mb-1.5 block text-sm font-medium">Chủ đề</label>
                    <select id="contact-topic" value={form.topic} onChange={(e) => set("topic", e.target.value as ContactInput["topic"])} className="w-full rounded-[10px] border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-terracotta">
                      {TOPICS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label htmlFor="contact-message" className="mb-1.5 block text-sm font-medium">Nội dung</label>
                  <textarea id="contact-message" rows={5} maxLength={1000} value={form.message} onChange={(e) => set("message", e.target.value)} aria-invalid={!!errors.message} className={`w-full resize-y rounded-[10px] border bg-surface px-4 py-3 text-sm outline-none focus:border-terracotta ${errors.message ? "border-state-danger" : "border-border"}`} />
                  {errors.message && <p className="mt-1 text-xs text-state-danger">{errors.message}</p>}
                </div>
                <Button type="submit" className="min-h-11 px-6" loading={send.isPending}>Gửi lời nhắn</Button>
              </form>
            )}
          </section>

          <aside className="space-y-4 text-sm">
            <div className="rounded-[16px] border border-border bg-surface p-5">
              <h2 className="font-serif text-lg">Kênh liên hệ</h2>
              <dl className="mt-3 space-y-3 text-text-secondary">
                <div><dt className="font-medium text-text-primary">Hỗ trợ khách hàng</dt><dd><a className="text-clay underline" href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a></dd></div>
                <div><dt className="font-medium text-text-primary">Tư vấn gói dịch vụ</dt><dd><a className="text-clay underline" href={`mailto:${CONTACT.salesEmail}`}>{CONTACT.salesEmail}</a></dd></div>
                <div><dt className="font-medium text-text-primary">Giờ làm việc</dt><dd>{CONTACT.hours}</dd></div>
              </dl>
            </div>
            <div className="rounded-[16px] bg-sand p-5 text-text-secondary">
              <h2 className="font-serif text-lg text-text-primary">Bạn là khách của một quán?</h2>
              <p className="mt-2">Vấn đề về đơn hàng, điểm tích luỹ hay hoàn tiền sẽ được quán xử lý nhanh nhất. Hãy liên hệ trực tiếp quán nơi bạn đã mua.</p>
            </div>
          </aside>
        </div>
      </div>
    </PublicPage>
  )
}
