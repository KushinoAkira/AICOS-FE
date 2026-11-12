import { useState } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import type { Page } from "../../App"
import { PublicPage } from "../../components/PublicChrome"
import { Banner, Button, Field } from "../../components/ui"
import { ApiError } from "../../lib/api/http"
import { publicApi, type RegisterBrandInput } from "../../lib/api/platform"

const EMPTY: RegisterBrandInput = { brandName: "", code: "", ownerFullName: "", email: "", phone: "", password: "", confirmPassword: "", description: "" }
type Errors = Partial<Record<keyof RegisterBrandInput, string>>

/** Server field names (PascalCase) to the form's fields. */
const SERVER_FIELDS: Record<string, keyof RegisterBrandInput> = {
  BrandName: "brandName", Code: "code", OwnerFullName: "ownerFullName", Email: "email", Phone: "phone", Password: "password", ConfirmPassword: "confirmPassword", Description: "description",
}

/** Letters without accents, digits and dashes, from the shop's name. */
const toCode = (name: string) =>
  name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "d").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 30)

function validate(f: RegisterBrandInput): Errors {
  const e: Errors = {}
  if (!f.brandName.trim()) e.brandName = "Vui lòng nhập tên thương hiệu"
  if (!/^[a-z0-9-]{3,30}$/.test(f.code)) e.code = "Mã quán dài 3-30 ký tự, gồm chữ thường không dấu, số và dấu gạch ngang"
  if (!f.ownerFullName.trim()) e.ownerFullName = "Vui lòng nhập họ tên chủ quán"
  if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) e.email = "Email chưa hợp lệ"
  if (f.phone && !/^0\d{9}$/.test(f.phone)) e.phone = "Số điện thoại gồm 10 số, bắt đầu bằng 0"
  if (f.password.length < 8 || !/[A-Za-z]/.test(f.password) || !/\d/.test(f.password)) e.password = "Mật khẩu từ 8 ký tự, có chữ cái và chữ số"
  if (f.confirmPassword !== f.password) e.confirmPassword = "Mật khẩu xác nhận chưa khớp"
  return e
}

/** Flow 1 of the platform: a shop owner registers a brand and waits for the Super Admin's approval. */
export default function RegisterBrand({ navigate }: { navigate: (p: Page) => void }) {
  const [form, setForm] = useState<RegisterBrandInput>(EMPTY)
  const [codeEdited, setCodeEdited] = useState(false)
  const [errors, setErrors] = useState<Errors>({})
  const plans = useQuery({ queryKey: ["public", "plans"], queryFn: publicApi.plans, retry: 1 })
  const set = <K extends keyof RegisterBrandInput>(k: K, v: RegisterBrandInput[K]) => setForm((f) => ({ ...f, [k]: v }))

  const send = useMutation({
    mutationFn: () => publicApi.registerBrand({ ...form, email: form.email.trim(), brandName: form.brandName.trim(), ownerFullName: form.ownerFullName.trim() }),
    onError: (err) => {
      if (err instanceof ApiError && err.fieldErrors) {
        const mapped: Errors = {}
        for (const [key, messages] of Object.entries(err.fieldErrors)) {
          const field = SERVER_FIELDS[key]
          if (field && messages[0]) mapped[field] = messages[0]
        }
        setErrors(mapped)
      }
    },
  })

  const submit = () => {
    const found = validate(form)
    setErrors(found)
    if (Object.keys(found).length === 0) send.mutate()
  }

  return (
    <PublicPage navigate={navigate} uc="UC-05">
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-8">
        <h1 className="font-serif text-4xl">Đăng ký quán trên AICOS</h1>
        <p className="mt-2 max-w-2xl text-text-secondary">Điền thông tin thương hiệu và tài khoản chủ quán. Đội ngũ AICOS xét duyệt và báo kết quả qua email; sau khi được duyệt, bạn đăng nhập để tạo chi nhánh, thực đơn và nhân viên.</p>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_320px]">
          <section aria-label="Biểu mẫu đăng ký quán" className="rounded-[16px] border border-border bg-surface p-6">
            {send.isSuccess ? (
              <div role="status" className="py-8 text-center">
                <h2 className="font-serif text-2xl">Đã nhận đăng ký</h2>
                <p className="mt-2 text-text-secondary">Thương hiệu với mã <strong>{send.data.code}</strong> đang chờ duyệt. Chúng tôi sẽ gửi kết quả tới <strong>{form.email}</strong>.</p>
                <Button variant="secondary" className="mt-6" onClick={() => navigate("login")}>Về trang đăng nhập quán</Button>
              </div>
            ) : (
              <form noValidate onSubmit={(e) => { e.preventDefault(); submit() }} className="space-y-4">
                {send.isError && !(send.error instanceof ApiError && send.error.fieldErrors) && <Banner>{send.error instanceof ApiError ? send.error.message : "Chưa gửi được đăng ký. Hãy thử lại."}</Banner>}
                <Field label="Tên thương hiệu" value={form.brandName} error={errors.brandName} onChange={(e) => { const v = e.target.value; setForm((f) => ({ ...f, brandName: v, code: codeEdited ? f.code : toCode(v) })) }} />
                <Field label="Mã quán" hint="Dùng làm định danh của quán trên AICOS" value={form.code} error={errors.code} onChange={(e) => { setCodeEdited(true); set("code", e.target.value.toLowerCase()) }} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Họ tên chủ quán" autoComplete="name" value={form.ownerFullName} error={errors.ownerFullName} onChange={(e) => set("ownerFullName", e.target.value)} />
                  <Field label="Số điện thoại (không bắt buộc)" autoComplete="tel" value={form.phone} error={errors.phone} onChange={(e) => set("phone", e.target.value)} />
                </div>
                <Field label="Email" type="email" autoComplete="email" value={form.email} error={errors.email} onChange={(e) => set("email", e.target.value)} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Mật khẩu" type="password" autoComplete="new-password" value={form.password} error={errors.password} onChange={(e) => set("password", e.target.value)} />
                  <Field label="Xác nhận mật khẩu" type="password" autoComplete="new-password" value={form.confirmPassword} error={errors.confirmPassword} onChange={(e) => set("confirmPassword", e.target.value)} />
                </div>
                <Field label="Giới thiệu ngắn (không bắt buộc)" value={form.description} error={errors.description} onChange={(e) => set("description", e.target.value)} />
                <Button type="submit" loading={send.isPending} className="min-h-11 w-full">Gửi đăng ký</Button>
              </form>
            )}
          </section>

          <aside aria-label="Các gói dịch vụ" className="rounded-[16px] bg-sand p-6">
            <h2 className="font-serif text-xl">Các gói dịch vụ</h2>
            <p className="mt-1 text-sm text-text-secondary">Bạn chốt gói với AICOS sau khi đăng ký được duyệt.</p>
            <ul className="mt-4 space-y-3">
              {(plans.data ?? []).map((p) => (
                <li key={p.id} className="rounded-[12px] bg-surface p-3">
                  <p className="font-medium text-text-primary">{p.name}</p>
                  <p className="text-sm text-text-secondary">{new Intl.NumberFormat("vi-VN").format(p.monthlyFee)} đ/tháng</p>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </div>
    </PublicPage>
  )
}
