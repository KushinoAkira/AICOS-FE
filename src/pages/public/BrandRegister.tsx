import { useState } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { z } from "zod"
import type { Page } from "../../App"
import { Logo } from "../../components/AuthShell"
import { BrandPreview, ColorPicker, LogoPicker } from "../../components/BrandIdentityFields"
import { Banner, Button, Field } from "../../components/ui"
import { ApiError } from "../../lib/api/http"
import { publicApi, type BrandRegistrationInput } from "../../lib/api/platform"
import { formatVND } from "../../lib/format"

const STEPS = ["Thương hiệu", "Gói dịch vụ", "Chủ quán", "Xác nhận"]
const EMPTY: BrandRegistrationInput = { name: "", slug: "", planId: "", ownerName: "", ownerEmail: "", ownerPhone: "", brandColor: "#C97B4A" }

const brandSchema = z.object({
  name: z.string().trim().min(2, "Nhập tên thương hiệu"),
  slug: z.string().regex(/^[a-z0-9-]{3,30}$/, "3-30 ký tự: chữ thường, số, dấu gạch ngang"),
})
const ownerSchema = z.object({
  ownerName: z.string().trim().min(2, "Nhập họ tên"),
  ownerEmail: z.string().email("Email không hợp lệ"),
  ownerPhone: z.string().regex(/^0\d{9}$/, "Số điện thoại gồm 10 chữ số, bắt đầu bằng 0"),
})

const toSlug = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30)
const issuesOf = (e: z.ZodError) => Object.fromEntries(e.issues.map((i) => [String(i.path[0]), i.message]))

/** Self-service brand registration (UC-05): form, e-mail code, then "waiting for review". Super Admin approves later. */
export default function BrandRegister({ navigate }: { navigate: (p: Page) => void }) {
  const plans = useQuery({ queryKey: ["public", "plans"], queryFn: publicApi.plans, retry: 1 })
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<BrandRegistrationInput>(EMPTY)
  const [slugEdited, setSlugEdited] = useState(false)
  const [agree, setAgree] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [regId, setRegId] = useState<string | null>(null)
  const [code, setCode] = useState("")
  const [done, setDone] = useState(false)

  const register = useMutation({
    mutationFn: () => publicApi.registerBrand(form),
    onSuccess: (r) => { setRegId(r.registrationId); setServerError(null) },
    onError: (e) => { setServerError(e.message); if (e instanceof ApiError && e.code === "slug_taken") setStep(0); if (e instanceof ApiError && e.code === "email_taken") setStep(2) },
  })
  const verify = useMutation({
    mutationFn: () => publicApi.verifyBrand(regId ?? "", code),
    onSuccess: () => setDone(true),
    onError: (e) => setServerError(e.message),
  })
  const resend = useMutation({ mutationFn: () => publicApi.resendCode(regId ?? ""), onSuccess: () => setServerError(null) })

  const set = (k: keyof BrandRegistrationInput, v: string) => setForm((f) => ({ ...f, [k]: v }))
  const setLogo = (v: string | undefined) => setForm((f) => ({ ...f, logoDataUrl: v }))
  const plan = plans.data?.find((p) => p.id === form.planId)

  function next() {
    setServerError(null)
    if (step === 0) { const r = brandSchema.safeParse(form); if (!r.success) return setErrors(issuesOf(r.error)) }
    if (step === 1 && !form.planId) return setErrors({ planId: "Chọn một gói" })
    if (step === 2) { const r = ownerSchema.safeParse(form); if (!r.success) return setErrors(issuesOf(r.error)) }
    setErrors({})
    setStep(step + 1)
  }

  const shell = (children: React.ReactNode) => (
    <div data-uc="UC-05" className="min-h-screen bg-bg-base">
      <header className="border-b border-border bg-surface px-4 py-3 sm:px-8">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <button onClick={() => navigate("landing")} aria-label="Về trang chủ"><Logo /></button>
          <button onClick={() => navigate("login")} className="text-sm text-text-secondary hover:underline">Đã có tài khoản? Đăng nhập</button>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-8 sm:py-12">{children}</main>
    </div>
  )

  if (done) {
    return shell(
      <div className="rounded-[20px] border border-border bg-surface p-8 text-center">
        <div aria-hidden className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success-bg text-2xl text-state-success">✓</div>
        <h1 className="mt-4 font-serif text-3xl text-text-primary">Đã gửi đăng ký</h1>
        <p className="mx-auto mt-3 max-w-md text-text-secondary"><b className="text-text-primary">{form.name}</b> đang chờ đội ngũ AICOS duyệt, thường trong vòng 1 ngày làm việc. Khi được duyệt, email mời đặt mật khẩu sẽ gửi tới <b className="text-text-primary">{form.ownerEmail}</b>.</p>
        <p className="mt-2 text-sm text-text-secondary">Địa chỉ quán sau khi kích hoạt: {form.slug}.aicos.app</p>
        <Button className="mt-6 min-h-11 px-6" onClick={() => navigate("landing")}>Về trang chủ</Button>
      </div>,
    )
  }

  if (regId) {
    return shell(
      <div className="mx-auto max-w-md rounded-[20px] border border-border bg-surface p-6 sm:p-8">
        <h1 className="font-serif text-2xl text-text-primary">Xác nhận email</h1>
        <p className="mt-2 text-sm text-text-secondary">Chúng tôi đã gửi mã 6 chữ số tới <b className="text-text-primary">{form.ownerEmail}</b>.</p>
        <p className="mt-1 text-xs text-clay">Bản demo: dùng mã 123456.</p>
        {serverError && <div className="mt-4"><Banner>{serverError}</Banner></div>}
        <div className="mt-5">
          <Field label="Mã xác nhận" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} className="text-center text-lg tracking-[0.4em]" />
        </div>
        <Button className="mt-5 min-h-12 w-full" loading={verify.isPending} disabled={code.length !== 6} disabledReason="Nhập đủ 6 chữ số" onClick={() => verify.mutate()}>Xác nhận và gửi đăng ký</Button>
        <div className="mt-3 flex justify-between text-sm">
          <button className="text-text-secondary hover:underline" onClick={() => { setRegId(null); setCode(""); setServerError(null) }}>Quay lại sửa thông tin</button>
          <button className="text-clay hover:underline disabled:opacity-50" disabled={resend.isPending} onClick={() => resend.mutate()}>{resend.isSuccess ? "Đã gửi lại mã" : "Gửi lại mã"}</button>
        </div>
      </div>,
    )
  }

  return shell(
    <>
      <h1 className="font-serif text-3xl text-text-primary">Đăng ký thương hiệu</h1>
      <p className="mt-1 text-text-secondary">Điền thông tin để bắt đầu. Đăng ký sẽ được AICOS duyệt trước khi kích hoạt.</p>
      <ol className="my-6 flex gap-2 text-xs" aria-label="Các bước">
        {STEPS.map((s, i) => (
          <li key={s} aria-current={i === step ? "step" : undefined} className={`flex-1 rounded-full px-2 py-1.5 text-center ${i === step ? "bg-terracotta text-bg-base" : i < step ? "bg-success-bg text-state-success" : "bg-bg-warm text-text-secondary"}`}><span className="hidden sm:inline">{i + 1}. </span>{s}</li>
        ))}
      </ol>
      <div className="rounded-[20px] border border-border bg-surface p-5 sm:p-8">
        {serverError && <div className="mb-4"><Banner>{serverError}</Banner></div>}
        {step === 0 && (
          <div className="space-y-4">
            <Field label="Tên thương hiệu" value={form.name} onChange={(e) => { set("name", e.target.value); if (!slugEdited) set("slug", toSlug(e.target.value)) }} error={errors.name} />
            <Field label="Mã định danh (subdomain)" value={form.slug} onChange={(e) => { setSlugEdited(true); set("slug", e.target.value.toLowerCase()) }} error={errors.slug} hint={`${form.slug || "ten-quan"}.aicos.app`} />
            <LogoPicker name={form.name} value={form.logoDataUrl} onChange={setLogo} />
            <ColorPicker value={form.brandColor} onChange={(v) => set("brandColor", v)} />
            <BrandPreview name={form.name} logo={form.logoDataUrl} color={form.brandColor} />
          </div>
        )}
        {step === 1 && (
          <fieldset>
            <legend className="sr-only">Chọn gói dịch vụ</legend>
            {plans.isPending && <p className="text-sm text-text-secondary">Đang tải các gói…</p>}
            {plans.isError && <Banner action={<button className="underline" onClick={() => void plans.refetch()}>Thử lại</button>}>Chưa tải được các gói dịch vụ.</Banner>}
            <div className="space-y-3">
              {plans.data?.map((p) => (
                <label key={p.id} className={`flex cursor-pointer items-center justify-between gap-3 rounded-[12px] border p-4 ${form.planId === p.id ? "border-terracotta bg-sand" : "border-border"}`}>
                  <span className="flex items-center gap-3">
                    <input type="radio" name="plan" className="h-5 w-5" checked={form.planId === p.id} onChange={() => set("planId", p.id)} />
                    <span><span className="font-medium text-text-primary">{p.name}</span><span className="block text-xs text-text-secondary">Tối đa {p.maxBranches} chi nhánh, {p.maxUsers} tài khoản</span></span>
                  </span>
                  <span className="shrink-0 text-sm">{formatVND(p.monthlyFee)}/tháng</span>
                </label>
              ))}
            </div>
            {errors.planId && <p className="mt-2 text-xs text-state-danger">{errors.planId}</p>}
            <p className="mt-3 text-xs text-text-secondary">Dùng thử 14 ngày sau khi được duyệt.</p>
          </fieldset>
        )}
        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-text-secondary">Người này sẽ là Brand Admin đầu tiên của thương hiệu.</p>
            <Field label="Họ tên chủ quán" autoComplete="name" value={form.ownerName} onChange={(e) => set("ownerName", e.target.value)} error={errors.ownerName} />
            <Field label="Email" type="email" autoComplete="email" value={form.ownerEmail} onChange={(e) => set("ownerEmail", e.target.value)} error={errors.ownerEmail} />
            <Field label="Số điện thoại" type="tel" inputMode="tel" autoComplete="tel" value={form.ownerPhone} onChange={(e) => set("ownerPhone", e.target.value.replace(/\D/g, "").slice(0, 10))} error={errors.ownerPhone} />
          </div>
        )}
        {step === 3 && (
          <div>
            <div className="mb-4"><BrandPreview name={form.name} logo={form.logoDataUrl} color={form.brandColor} /></div>
            <dl className="space-y-2 text-sm">
              {[["Thương hiệu", form.name], ["Subdomain", `${form.slug}.aicos.app`], ["Logo", form.logoDataUrl ? "Đã tải lên" : "Chưa có (dùng chữ cái đầu)"], ["Gói", plan ? `${plan.name} · ${formatVND(plan.monthlyFee)}/tháng` : ""], ["Chủ quán", form.ownerName], ["Email", form.ownerEmail], ["Điện thoại", form.ownerPhone]].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4"><dt className="text-text-secondary">{k}</dt><dd className="text-right text-text-primary">{v}</dd></div>
              ))}
            </dl>
            <label className="mt-5 flex items-start gap-3 text-sm text-text-secondary">
              <input type="checkbox" className="mt-0.5 h-5 w-5" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
              <span>Tôi đồng ý với <a href="/terms" target="_blank" rel="noreferrer" className="text-clay underline">điều khoản sử dụng</a> và <a href="/privacy" target="_blank" rel="noreferrer" className="text-clay underline">chính sách bảo mật</a> của AICOS.</span>
            </label>
          </div>
        )}
        <div className="mt-6 flex justify-between gap-3">
          {step > 0 ? <Button variant="secondary" className="min-h-11" onClick={() => { setErrors({}); setStep(step - 1) }}>Quay lại</Button> : <span />}
          {step < 3
            ? <Button className="min-h-11 px-6" onClick={next}>Tiếp tục</Button>
            : <Button className="min-h-11 px-6" loading={register.isPending} disabled={!agree} disabledReason="Cần đồng ý điều khoản" onClick={() => register.mutate()}>Gửi mã xác nhận</Button>}
        </div>
      </div>
    </>,
  )
}
