import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router"
import type { Page } from "../../App"
import { homePageOf, useAuth } from "../../context/AuthContext"
import { useToast } from "../../context/ToastContext"
import { ApiError } from "../../lib/api/http"
import { authApi } from "../../lib/api/identity"
import { maskEmail, pendingSignUp } from "../../lib/signUp"

interface Props {
  navigate: (p: Page) => void
}

const EMPTY = ["", "", "", "", "", ""]

/** Step 2 of the email sign-up: the 6-digit code from the email activates the account and signs the customer in. */
export default function OTPVerification({ navigate }: Props) {
  const [pending] = useState(() => pendingSignUp.get())
  const [digits, setDigits] = useState<string[]>(EMPTY)
  const [seconds, setSeconds] = useState(() => (pending ? Math.max(0, Math.ceil((pending.resendAvailableAt - Date.now()) / 1000)) : 0))
  const [submitting, setSubmitting] = useState(false)
  const [resending, setResending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const refs = useRef<(HTMLInputElement | null)[]>([])
  const routerNavigate = useNavigate()
  const { verifySignUp } = useAuth()
  const { showToast } = useToast()

  const isFull = digits.every((d) => d !== "")
  const canResend = seconds === 0

  // Without a sign-up in progress (the page was opened directly) there is nothing to verify.
  useEffect(() => {
    if (!pending) navigate("auth-customer-register")
  }, [pending, navigate])

  useEffect(() => {
    if (seconds === 0) return
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [seconds])

  if (!pending) return null

  function handleKey(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && digits[index] === "" && index > 0) {
      refs.current[index - 1]?.focus()
    }
    if (e.key === "Enter") void handleConfirm()
  }

  /** A box can receive one digit, or several at once (fast typing, the phone's code suggestion): they fill the boxes from this one on. */
  function handleChange(index: number, value: string) {
    const typed = value.replace(/\D/g, "")
    const next = [...digits]
    if (!typed) {
      next[index] = ""
    } else {
      for (let k = 0; k < typed.length && index + k < 6; k++) next[index + k] = typed[k]
    }
    setDigits(next)
    setError(null)
    if (typed) refs.current[Math.min(index + typed.length, 5)]?.focus()
  }

  function handlePaste(e: React.ClipboardEvent) {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6)
    if (!pasted) return
    e.preventDefault()
    const next = [...EMPTY]
    for (let i = 0; i < 6; i++) next[i] = pasted[i] ?? ""
    setDigits(next)
    setError(null)
    refs.current[Math.min(pasted.length, 5)]?.focus()
  }

  async function handleResend() {
    if (!pending || !canResend || resending) return
    setResending(true)
    try {
      const res = await authApi.resendRegistration(pending.email)
      pendingSignUp.set(res.email, res.resendAfterSeconds)
      setSeconds(res.resendAfterSeconds)
      setDigits(EMPTY)
      setError(null)
      refs.current[0]?.focus()
      showToast("Đã gửi mã mới. Hãy kiểm tra hộp thư của bạn.")
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Không thể kết nối máy chủ", "error")
    } finally {
      setResending(false)
    }
  }

  async function handleConfirm() {
    if (!pending || !isFull || submitting) return
    setSubmitting(true)
    try {
      const user = await verifySignUp(pending.email, digits.join(""))
      pendingSignUp.clear()
      const back = sessionStorage.getItem("aicos.returnTo")
      sessionStorage.removeItem("aicos.returnTo")
      if (back) routerNavigate(back, { replace: true }); else navigate(homePageOf(user))
    } catch (err) {
      if (err instanceof ApiError && err.code === "auth.verification_code_invalid") {
        setError("Mã chưa đúng hoặc đã hết hạn. Hãy nhập lại hoặc yêu cầu mã mới.")
        setDigits(EMPTY)
        refs.current[0]?.focus()
      } else {
        showToast(err instanceof ApiError ? err.message : "Không thể kết nối máy chủ", "error")
      }
    } finally {
      setSubmitting(false)
    }
  }

  function changeEmail() {
    pendingSignUp.clear()
    navigate("auth-customer-register")
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12" style={{ backgroundColor: "#FAF6F0" }}>
      <div className="w-full max-w-[360px]">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-10">
          <CoffeeBean />
          <span className="font-serif text-xl font-medium" style={{ color: "#6F4E37", fontFamily: "'Fraunces', Georgia, serif" }}>
            AICOS
          </span>
        </div>

        {/* Illustration */}
        <div className="flex justify-center mb-7">
          <PhoneWaveIcon />
        </div>

        <h1
          className="font-serif text-2xl font-medium mb-2 text-center"
          style={{ color: "#3A2E22", fontFamily: "'Fraunces', Georgia, serif" }}
        >
          Nhập mã xác thực
        </h1>
        <p className="text-sm text-center mb-8" style={{ color: "#8A7A6C", lineHeight: 1.6 }}>
          Mã gồm 6 số vừa được gửi đến{" "}
          <span className="font-medium" style={{ color: "#3A2E22" }}>{maskEmail(pending.email)}</span>
        </p>

        {/* OTP inputs */}
        <div className="flex gap-2.5 justify-center mb-3" onPaste={handlePaste}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => { refs.current[i] = el }}
              type="text"
              inputMode="numeric"
              autoComplete={i === 0 ? "one-time-code" : "off"}
              maxLength={6}
              value={d}
              autoFocus={i === 0}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKey(i, e)}
              aria-label={`Chữ số ${i + 1}`}
              className="text-center text-lg font-medium outline-none transition-all duration-150"
              style={{
                width: "46px",
                height: "52px",
                border: error ? "1.5px solid #B3402F" : d ? "1.5px solid #C97B4A" : "1.5px solid #E6DCCB",
                borderRadius: "10px",
                backgroundColor: "#FFFFFF",
                color: "#3A2E22",
                fontFamily: "'Fraunces', Georgia, serif",
              }}
              onFocus={(e) => { e.currentTarget.select(); e.currentTarget.style.borderColor = "#C97B4A" }}
              onBlur={(e) => { e.currentTarget.style.borderColor = error ? "#B3402F" : e.currentTarget.value ? "#C97B4A" : "#E6DCCB" }}
            />
          ))}
        </div>

        <p role="alert" className="text-xs text-center mb-4" style={{ color: "#B3402F", minHeight: "1rem" }}>{error}</p>

        {/* Countdown / resend */}
        <div className="text-sm text-center mb-6" style={{ color: "#8A7A6C" }}>
          {canResend ? (
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="font-medium transition-colors"
              style={{ color: "#8B5E3C", background: "none", border: "none", cursor: resending ? "wait" : "pointer" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#6F4E37" }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#8B5E3C" }}
            >
              {resending ? "Đang gửi…" : "Gửi lại mã"}
            </button>
          ) : (
            <span>
              Gửi lại mã sau{" "}
              <span className="font-medium tabular-nums" style={{ color: "#3A2E22" }}>
                {String(Math.floor(seconds / 60)).padStart(2, "0")}:{String(seconds % 60).padStart(2, "0")}
              </span>
            </span>
          )}
        </div>

        <button
          type="button"
          disabled={!isFull || submitting}
          onClick={handleConfirm}
          className="w-full py-3 text-sm font-medium transition-all duration-150"
          style={{
            backgroundColor: isFull && !submitting ? "#C97B4A" : "#D6C5B3",
            color: "#FAF6F0",
            borderRadius: "10px",
            border: "none",
            cursor: isFull && !submitting ? "pointer" : "not-allowed",
            fontFamily: "'Inter', system-ui, sans-serif",
          }}
          onMouseEnter={(e) => { if (isFull && !submitting) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#8B5E3C" }}
          onMouseLeave={(e) => { if (isFull && !submitting) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#C97B4A" }}
        >
          {submitting ? "Đang xác thực…" : "Xác nhận"}
        </button>

        <p className="mt-6 text-sm text-center" style={{ color: "#8A7A6C" }}>
          Nhập sai email?{" "}
          <button
            type="button"
            onClick={changeEmail}
            className="font-medium transition-colors"
            style={{ color: "#8B5E3C", background: "none", border: "none", cursor: "pointer" }}
          >
            Đăng ký lại
          </button>
        </p>
      </div>
    </div>
  )
}

function PhoneWaveIcon() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
      <rect x="16" y="8" width="24" height="40" rx="4" stroke="#C97B4A" strokeWidth="1.5" />
      <rect x="22" y="12" width="12" height="2" rx="1" fill="#E6DCCB" />
      <circle cx="28" cy="44" r="2" fill="#C97B4A" />
      <path d="M46 22 Q50 28 46 34" stroke="#C97B4A" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <path d="M50 18 Q56 28 50 38" stroke="#C97B4A" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.4" />
    </svg>
  )
}

function CoffeeBean() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <ellipse cx="14" cy="14" rx="10" ry="13" fill="#C97B4A" />
      <path d="M14 4 Q16 14 14 24" stroke="#6F4E37" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    </svg>
  )
}
