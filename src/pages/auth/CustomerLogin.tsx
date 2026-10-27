import AuthHero from "../../components/AuthHero"
import { Logo } from "../../components/AuthShell"
import { BrandGate } from "../../components/BrandGate"
import { useState } from "react"
import { useNavigate } from "react-router"
import type { Page } from "../../App"
import { homePageOf, useAuth } from "../../context/AuthContext"
import { useToast } from "../../context/ToastContext"
import { ApiError } from "../../lib/api/http"
import { normalizeRole } from "../../router/roles"

interface Props {
  navigate: (p: Page) => void
}

export default function CustomerLogin(props: Props) {
  return <BrandGate><CustomerLoginForm {...props} /></BrandGate>
}

function CustomerLoginForm({ navigate }: Props) {
  const [email, setEmail] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const routerNavigate = useNavigate()
  const { login, logout } = useAuth()
  const { showToast } = useToast()
  const [password, setPassword] = useState("")
  const [showPass, setShowPass] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const user = await login(email, password)
      // Customer portal only — staff must use /login (SaaS ops surface).
      if (normalizeRole(user) !== "customer") {
        await logout()
        showToast("Tài khoản quản lý / nhân viên vui lòng dùng trang Đăng nhập quán.", "error")
        return
      }
      const back = sessionStorage.getItem("aicos.returnTo")
      sessionStorage.removeItem("aicos.returnTo")
      if (back) routerNavigate(back, { replace: true }); else navigate(homePageOf(user))
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Không đăng nhập được. Thử tải lại trang (F5).", "error")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: "#FAF6F0" }}>
      <AuthHero />
      <div className="flex-1 flex items-center justify-center px-6 sm:px-8 py-12">
      <div className="w-full max-w-[420px]">
        {/* Logo */}
        <div className="mb-8"><Logo linked /></div>

        <h1
          className="font-serif text-2xl font-medium mb-2"
          style={{ color: "#3A2E22", fontFamily: "'Fraunces', Georgia, serif", lineHeight: 1.25 }}
        >
          Chào bạn quay lại
        </h1>
        <p className="text-sm mb-7" style={{ color: "#8A7A6C", lineHeight: 1.6 }}>
          Đăng nhập để xem điểm tích lũy và theo dõi đơn hàng của bạn.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "#3A2E22" }}>Email</label>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ten@email.com"
              required
              className="w-full px-4 py-3 text-sm outline-none"
              style={{ border: "1px solid #E6DCCB", borderRadius: "10px", backgroundColor: "#FFFFFF", color: "#3A2E22", fontFamily: "'Inter', system-ui, sans-serif" }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "#3A2E22" }}>Mật khẩu</label>
            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-3 pr-11 text-sm outline-none transition-all duration-150"
                style={{ border: "1px solid #E6DCCB", borderRadius: "10px", backgroundColor: "#FFFFFF", color: "#3A2E22", fontFamily: "'Inter', system-ui, sans-serif" }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "#C97B4A" }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "#E6DCCB" }}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ background: "none", border: "none", cursor: "pointer", opacity: 0.45, color: "#3A2E22" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "1" }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.45" }}
                aria-label={showPass ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              >
                {showPass ? <EyeOff /> : <EyeOn />}
              </button>
            </div>
            <div className="mt-1.5 text-right">
              <button
                type="button"
                className="text-xs transition-colors"
                style={{ color: "#8B5E3C", background: "none", border: "none", cursor: "pointer" }}
                onClick={() => navigate("auth-forgot-password")}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#6F4E37" }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#8B5E3C" }}
              >
                Quên mật khẩu?
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 text-sm font-medium transition-all duration-150 mt-1"
            style={{
              backgroundColor: "#C97B4A",
              color: "#FAF6F0",
              borderRadius: "10px",
              border: "none",
              cursor: "pointer",
              fontFamily: "'Inter', system-ui, sans-serif",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#8B5E3C" }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#C97B4A" }}
          >
            Đăng nhập
          </button>
        </form>

        <p className="mt-7 text-sm text-center" style={{ color: "#8A7A6C" }}>
          Chưa có tài khoản?{" "}
          <button
            type="button"
            className="font-medium transition-colors"
            style={{ color: "#8B5E3C", background: "none", border: "none", cursor: "pointer" }}
            onClick={() => navigate("auth-customer-register")}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#6F4E37" }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#8B5E3C" }}
          >
            Tạo tài khoản mới
          </button>
        </p>
      </div>
      </div>
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

