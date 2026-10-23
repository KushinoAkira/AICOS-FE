import { useState } from "react"
import type { Page } from "../../App"
import { Logo } from "../../components/AuthShell"
import { BrandGate } from "../../components/BrandGate"

interface Props {
  navigate: (p: Page) => void
}

export default function CustomerRegister(props: Props) {
  return <BrandGate><CustomerRegisterForm {...props} /></BrandGate>
}

function CustomerRegisterForm({ navigate }: Props) {
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [showPass, setShowPass] = useState(false)
  const [agreed, setAgreed] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    navigate("auth-otp")
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12" style={{ backgroundColor: "#FAF6F0" }}>
      <div className="w-full max-w-[420px]">
        {/* Logo */}
        <div className="mb-8"><Logo /></div>

        <h1
          className="font-serif text-2xl font-medium mb-2 leading-snug"
          style={{ color: "#3A2E22", fontFamily: "'Fraunces', Georgia, serif" }}
        >
          Tạo tài khoản để tích điểm mỗi lần ghé quán
        </h1>
        <p className="text-sm mb-7" style={{ color: "#8A7A6C", lineHeight: 1.6 }}>
          Chỉ mất một phút — và mỗi tách cà phê sẽ có thêm ý nghĩa.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Họ tên">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nguyễn Văn An"
              required
              className="w-full px-4 py-3 text-sm outline-none transition-all duration-150"
              style={inputStyle}
              onFocus={focusBorder}
              onBlur={blurBorder}
            />
          </Field>

          <Field label="Số điện thoại">
            <div className="flex" style={{ border: "1px solid #E6DCCB", borderRadius: "10px", backgroundColor: "#FFFFFF", overflow: "hidden" }}>
              <div
                className="flex items-center px-3 text-sm flex-shrink-0"
                style={{ color: "#8A7A6C", backgroundColor: "#F5EFE6", borderRight: "1px solid #E6DCCB" }}
              >
                +84
              </div>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="912 345 678"
                required
                className="flex-1 px-4 py-3 text-sm outline-none transition-all duration-150"
                style={{ backgroundColor: "transparent", color: "#3A2E22", fontFamily: "'Inter', system-ui, sans-serif" }}
              />
            </div>
          </Field>

          <Field label="Mật khẩu">
            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-3 pr-11 text-sm outline-none transition-all duration-150"
                style={inputStyle}
                onFocus={focusBorder}
                onBlur={blurBorder}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 transition-opacity"
                style={{ background: "none", border: "none", cursor: "pointer", opacity: 0.45, color: "#3A2E22" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "1" }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.45" }}
                aria-label={showPass ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              >
                {showPass ? <EyeOff /> : <EyeOn />}
              </button>
            </div>
          </Field>

          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 flex-shrink-0"
              style={{ accentColor: "#C97B4A", width: "15px", height: "15px" }}
            />
            <span className="text-sm" style={{ color: "#8A7A6C", lineHeight: 1.6 }}>
              Tôi đồng ý với{" "}
              <a href="/terms" target="_blank" rel="noreferrer" className="font-medium text-clay underline underline-offset-2">Điều khoản sử dụng</a>
              {" "}và{" "}
              <a href="/privacy" target="_blank" rel="noreferrer" className="font-medium text-clay underline underline-offset-2">Chính sách bảo mật</a>
            </span>
          </label>

          <button
            type="submit"
            disabled={!agreed}
            className="w-full py-3 text-sm font-medium transition-all duration-150 mt-1"
            style={{
              backgroundColor: agreed ? "#C97B4A" : "#D6C5B3",
              color: "#FAF6F0",
              borderRadius: "10px",
              border: "none",
              cursor: agreed ? "pointer" : "not-allowed",
              fontFamily: "'Inter', system-ui, sans-serif",
            }}
            onMouseEnter={(e) => { if (agreed) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#8B5E3C" }}
            onMouseLeave={(e) => { if (agreed) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#C97B4A" }}
          >
            Tiếp tục
          </button>
        </form>

        {/* Divider + Google */}
        <div className="my-5 flex items-center gap-3">
          <div className="flex-1 h-px" style={{ backgroundColor: "#E6DCCB" }} />
          <span className="text-xs" style={{ color: "#8A7A6C" }}>hoặc</span>
          <div className="flex-1 h-px" style={{ backgroundColor: "#E6DCCB" }} />
        </div>

        <button
          type="button"
          className="w-full py-3 text-sm font-medium transition-all duration-150 flex items-center justify-center gap-2.5"
          style={{
            backgroundColor: "#FFFFFF",
            color: "#3A2E22",
            borderRadius: "10px",
            border: "1px solid #E6DCCB",
            cursor: "pointer",
            fontFamily: "'Inter', system-ui, sans-serif",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#F5EFE6" }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#FFFFFF" }}
        >
          <GoogleIcon />
          Tiếp tục với Google
        </button>

        <p className="mt-7 text-sm text-center" style={{ color: "#8A7A6C" }}>
          Đã có tài khoản?{" "}
          <button
            type="button"
            className="font-medium transition-colors"
            style={{ color: "#8B5E3C", background: "none", border: "none", cursor: "pointer" }}
            onClick={() => navigate("auth-customer-login")}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#6F4E37" }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#8B5E3C" }}
          >
            Đăng nhập
          </button>
        </p>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5" style={{ color: "#3A2E22" }}>{label}</label>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  border: "1px solid #E6DCCB",
  borderRadius: "10px",
  backgroundColor: "#FFFFFF",
  color: "#3A2E22",
  fontFamily: "'Inter', system-ui, sans-serif",
}

function focusBorder(e: React.FocusEvent<HTMLInputElement>) {
  e.currentTarget.style.borderColor = "#C97B4A"
}
function blurBorder(e: React.FocusEvent<HTMLInputElement>) {
  e.currentTarget.style.borderColor = "#E6DCCB"
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

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}
