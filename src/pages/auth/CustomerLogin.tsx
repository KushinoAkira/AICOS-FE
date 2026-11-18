import { useState } from "react"
import { useNavigate } from "react-router"
import type { Page } from "../../App"
import { BrandGate } from "../../components/BrandGate"
import { CustomerAuthLayout, customerAuthInputClass, customerAuthPrimaryBtn } from "../../components/CustomerAuthLayout"
import { homePageOf, useAuth } from "../../context/AuthContext"
import { useToast } from "../../context/ToastContext"
import { ApiError } from "../../lib/api/http"
import { getActiveBrandSlug } from "../../lib/brand"
import { normalizeRole } from "../../router/roles"
import { protectOrphans } from "../../lib/typography"

interface Props {
  navigate: (p: Page) => void
}

export default function CustomerLogin(props: Props) {
  return (
    <BrandGate>
      <CustomerLoginForm {...props} />
    </BrandGate>
  )
}

function CustomerLoginForm({ navigate }: Props) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPass, setShowPass] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const routerNavigate = useNavigate()
  const { login, logout } = useAuth()
  const { showToast } = useToast()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const user = await login(email, password)
      if (normalizeRole(user) !== "customer") {
        await logout()
        showToast("Tài khoản quản lý / nhân viên vui lòng dùng trang Đăng nhập quán.", "error")
        return
      }
      const back = sessionStorage.getItem("aicos.returnTo")
      sessionStorage.removeItem("aicos.returnTo")
      if (back) routerNavigate(back, { replace: true })
      else if (getActiveBrandSlug()) navigate("customer-menu")
      else navigate(homePageOf(user))
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Không đăng nhập được. Thử tải lại trang (F5).", "error")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <CustomerAuthLayout
      title="Chào bạn quay lại"
      subtitle={protectOrphans("Đăng nhập AICOS một lần, rồi chọn quán để đặt món và tích điểm.")}
      footer={
        <p className="mt-10 text-center text-sm text-text-secondary">
          {protectOrphans("Chưa có tài khoản?")}{" "}
          <button type="button" className="font-semibold text-clay hover:text-espresso" onClick={() => navigate("auth-customer-register")}>
            {protectOrphans("Đăng ký miễn phí")}
          </button>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="mb-2 block text-sm font-medium text-text-primary">Email</label>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ten@email.com"
            required
            className={customerAuthInputClass}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-text-primary">Mật khẩu</label>
          <div className="relative">
            <input
              type={showPass ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className={`${customerAuthInputClass} pr-11`}
            />
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-primary opacity-45 hover:opacity-100"
              aria-label={showPass ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            >
              {showPass ? <EyeOff /> : <EyeOn />}
            </button>
          </div>
          <div className="mt-2 text-right">
            <button type="button" className="text-xs font-medium text-clay hover:text-espresso" onClick={() => navigate("auth-forgot-password")}>
              Quên mật khẩu?
            </button>
          </div>
        </div>

        <button type="submit" disabled={submitting} className={customerAuthPrimaryBtn}>
          {submitting ? "Đang đăng nhập…" : "Đăng nhập"}
        </button>
      </form>

      <p className="mt-8 text-center text-xs text-text-secondary">
        <button type="button" className="underline underline-offset-2 hover:text-espresso" onClick={() => navigate("order-start")}>
          ← Về trang chủ khách hàng
        </button>
      </p>
    </CustomerAuthLayout>
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
