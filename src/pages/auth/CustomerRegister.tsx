import { useState } from "react"
import { useNavigate } from "react-router"
import type { Page } from "../../App"
import { CustomerAuthLayout, customerAuthInputClass, customerAuthPrimaryBtn } from "../../components/CustomerAuthLayout"
import { GoogleButton } from "../../components/GoogleButton"
import { homePageOf, useAuth } from "../../context/AuthContext"
import { useToast } from "../../context/ToastContext"
import { ApiError } from "../../lib/api/http"
import { protectOrphans } from "../../lib/typography"

interface Props {
  navigate: (p: Page) => void
}

type FieldName = "fullName" | "email" | "password" | "confirmPassword"
type FieldErrors = Partial<Record<FieldName, string>>

const SERVER_FIELDS: Record<string, FieldName> = {
  FullName: "fullName",
  Email: "email",
  Password: "password",
  ConfirmPassword: "confirmPassword",
}

function validate(v: Record<FieldName, string>): FieldErrors {
  const errors: FieldErrors = {}
  if (!v.fullName.trim()) errors.fullName = "Vui lòng nhập họ và tên."
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email.trim())) errors.email = "Email chưa đúng định dạng."
  if (v.password.length < 8 || v.password.length > 100) errors.password = "Mật khẩu dài từ 8 đến 100 ký tự."
  else if (!/[A-Za-z]/.test(v.password) || !/\d/.test(v.password)) errors.password = "Mật khẩu cần có ít nhất một chữ cái và một chữ số."
  if (v.confirmPassword !== v.password) errors.confirmPassword = "Mật khẩu xác nhận chưa khớp."
  return errors
}

/** One account for every shop on AICOS: registering signs the customer in at once, then they pick a brand. */
export default function CustomerRegister({ navigate }: Props) {
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPass, setShowPass] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})
  const routerNavigate = useNavigate()
  const { googleLogin, signUp } = useAuth()
  const { showToast } = useToast()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const found = validate({ fullName, email, password, confirmPassword })
    setErrors(found)
    if (Object.keys(found).length > 0) return
    setSubmitting(true)
    try {
      const user = await signUp({ fullName: fullName.trim(), email: email.trim(), password, confirmPassword })
      showToast("Tạo tài khoản thành công. Chọn quán để bắt đầu gọi món.", "success")
      const back = sessionStorage.getItem("aicos.returnTo")
      sessionStorage.removeItem("aicos.returnTo")
      if (back) routerNavigate(back, { replace: true })
      else navigate(homePageOf(user))
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors) {
        const mapped: FieldErrors = {}
        for (const [key, messages] of Object.entries(err.fieldErrors)) {
          const field = SERVER_FIELDS[key]
          if (field && messages[0]) mapped[field] = messages[0]
        }
        setErrors(mapped)
        if (Object.keys(mapped).length > 0) return
      }
      if (err instanceof ApiError && err.code === "user.duplicate_email") setErrors({ email: "Email này đã được đăng ký. Hãy đăng nhập." })
      else showToast(err instanceof ApiError ? err.message : "Không thể kết nối máy chủ", "error")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleGoogle(idToken: string) {
    try {
      const user = await googleLogin(idToken)
      const back = sessionStorage.getItem("aicos.returnTo")
      sessionStorage.removeItem("aicos.returnTo")
      if (back) routerNavigate(back, { replace: true })
      else navigate(homePageOf(user))
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Không thể kết nối máy chủ", "error")
    }
  }

  return (
    <CustomerAuthLayout
      title={protectOrphans("Một tài khoản, mọi quán trên AICOS")}
      subtitle={protectOrphans("Đăng ký miễn phí — đặt mang đi, gọi món tại bàn và tích điểm theo từng thương hiệu.")}
      footer={
        <p className="mt-8 text-center text-sm text-text-secondary">
          Đã có tài khoản?{" "}
          <button type="button" className="font-semibold text-clay hover:text-espresso" onClick={() => navigate("auth-customer-login")}>
            Đăng nhập
          </button>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Field label="Họ và tên" error={errors.fullName}>
          <input
            type="text"
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Nguyễn Văn An"
            maxLength={255}
            className={customerAuthInputClass}
          />
        </Field>

        <Field label="Email" error={errors.email}>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ten@email.com"
            className={customerAuthInputClass}
          />
        </Field>

        <Field label="Mật khẩu" error={errors.password} hint="Từ 8 ký tự, có chữ cái và chữ số.">
          <PasswordInput value={password} onChange={setPassword} show={showPass} onToggle={() => setShowPass(!showPass)} />
        </Field>

        <Field label="Xác nhận mật khẩu" error={errors.confirmPassword}>
          <PasswordInput value={confirmPassword} onChange={setConfirmPassword} show={showPass} onToggle={() => setShowPass(!showPass)} />
        </Field>

        <label className="flex cursor-pointer select-none items-start gap-3">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 h-[15px] w-[15px] shrink-0"
            style={{ accentColor: "#D98B54" }}
          />
          <span className="text-sm leading-relaxed text-text-secondary">
            Tôi đồng ý với{" "}
            <a href="/terms" target="_blank" rel="noreferrer" className="font-medium text-clay underline underline-offset-2">
              Điều khoản sử dụng
            </a>{" "}
            và{" "}
            <a href="/privacy" target="_blank" rel="noreferrer" className="font-medium text-clay underline underline-offset-2">
              Chính sách bảo mật
            </a>
          </span>
        </label>

        <button type="submit" disabled={!agreed || submitting} className={customerAuthPrimaryBtn}>
          {submitting ? "Đang tạo tài khoản…" : "Đăng ký miễn phí"}
        </button>
      </form>

      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-[#E8DDCB]" />
        <span className="text-xs text-text-secondary">hoặc</span>
        <div className="h-px flex-1 bg-[#E8DDCB]" />
      </div>

      <GoogleButton onCredential={handleGoogle} />

      <p className="mt-6 text-center text-xs text-text-secondary">
        <button type="button" className="underline underline-offset-2 hover:text-espresso" onClick={() => navigate("order-start")}>
          ← Về trang chủ khách hàng
        </button>
      </p>
    </CustomerAuthLayout>
  )
}

function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-text-primary">{label}</label>
      {children}
      {error ? (
        <p role="alert" className="mt-1.5 text-xs text-state-danger">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-text-secondary">{hint}</p>
      ) : null}
    </div>
  )
}

function PasswordInput({
  value,
  onChange,
  show,
  onToggle,
}: {
  value: string
  onChange: (v: string) => void
  show: boolean
  onToggle: () => void
}) {
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        autoComplete="new-password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="••••••••"
        maxLength={100}
        className={`${customerAuthInputClass} pr-11`}
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-primary opacity-45 hover:opacity-100"
        aria-label={show ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
      >
        {show ? <EyeOff /> : <EyeOn />}
      </button>
    </div>
  )
}

function EyeOn() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12c2-4 5-6 10-6s8 2 10 6c-2 4-5 6-10 6S4 16 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function EyeOff() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-5 0-8-2-10-6a18 18 0 015.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0112 4c5 0 8 2 10 6a18 18 0 01-1.72 2.28" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}
