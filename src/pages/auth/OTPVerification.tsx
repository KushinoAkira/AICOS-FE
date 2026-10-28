import { useState, useEffect, useRef } from "react"
import type { Page } from "../../App"

interface Props {
  navigate: (p: Page) => void
  flow?: "register" | "forgot-password"
}

export default function OTPVerification({ navigate, flow = "register" }: Props) {
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""])
  const [seconds, setSeconds] = useState(45)
  const [canResend, setCanResend] = useState(false)
  const refs = useRef<(HTMLInputElement | null)[]>([])

  const isFull = digits.every((d) => d !== "")

  useEffect(() => {
    if (seconds === 0) { setCanResend(true); return }
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [seconds])

  function handleKey(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && digits[index] === "" && index > 0) {
      refs.current[index - 1]?.focus()
    }
  }

  function handleChange(index: number, value: string) {
    const v = value.replace(/\D/g, "").slice(-1)
    const next = [...digits]
    next[index] = v
    setDigits(next)
    if (v && index < 5) {
      refs.current[index + 1]?.focus()
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6)
    if (!pasted) return
    e.preventDefault()
    const next = [...digits]
    for (let i = 0; i < 6; i++) next[i] = pasted[i] ?? ""
    setDigits(next)
    refs.current[Math.min(pasted.length, 5)]?.focus()
  }

  function handleResend() {
    if (!canResend) return
    setSeconds(45)
    setCanResend(false)
    setDigits(["", "", "", "", "", ""])
    refs.current[0]?.focus()
  }

  function handleConfirm() {
    if (!isFull) return
    navigate(flow === "register" ? "customer-menu" : "auth-reset-password")
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12" style={{ backgroundColor: "#FAF6F0" }}>
      <div className="w-full max-w-[360px]">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-10">
          <CoffeeBean />
          <span className="font-serif text-xl font-medium" style={{ color: "#6F4E37", fontFamily: "'Literata', 'Inter', system-ui, sans-serif" }}>
            AICOS
          </span>
        </div>

        {/* Illustration */}
        <div className="flex justify-center mb-7">
          <PhoneWaveIcon />
        </div>

        <h1
          className="font-serif text-2xl font-medium mb-2 text-center"
          style={{ color: "#3A2E22", fontFamily: "'Literata', 'Inter', system-ui, sans-serif" }}
        >
          Nhập mã xác thực
        </h1>
        <p className="text-sm text-center mb-8" style={{ color: "#8A7A6C", lineHeight: 1.6 }}>
          Mã gồm 6 số vừa được gửi đến{" "}
          <span className="font-medium" style={{ color: "#3A2E22" }}>0912***456</span>
        </p>

        {/* OTP inputs */}
        <div className="flex gap-2.5 justify-center mb-6" onPaste={handlePaste}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => { refs.current[i] = el }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKey(i, e)}
              className="text-center text-lg font-medium outline-none transition-all duration-150"
              style={{
                width: "46px",
                height: "52px",
                border: d ? "1.5px solid #C97B4A" : "1.5px solid #E6DCCB",
                borderRadius: "10px",
                backgroundColor: "#FFFFFF",
                color: "#3A2E22",
                fontFamily: "'Literata', 'Inter', system-ui, sans-serif",
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "#C97B4A" }}
              onBlur={(e) => { e.currentTarget.style.borderColor = e.currentTarget.value ? "#C97B4A" : "#E6DCCB" }}
            />
          ))}
        </div>

        {/* Countdown / resend */}
        <div className="text-sm text-center mb-6" style={{ color: "#8A7A6C" }}>
          {canResend ? (
            <button
              type="button"
              onClick={handleResend}
              className="font-medium transition-colors"
              style={{ color: "#8B5E3C", background: "none", border: "none", cursor: "pointer" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#6F4E37" }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#8B5E3C" }}
            >
              Gửi lại mã
            </button>
          ) : (
            <span>
              Gửi lại mã sau{" "}
              <span className="font-medium tabular-nums" style={{ color: "#3A2E22" }}>
                00:{String(seconds).padStart(2, "0")}
              </span>
            </span>
          )}
        </div>

        <button
          type="button"
          disabled={!isFull}
          onClick={handleConfirm}
          className="w-full py-3 text-sm font-medium transition-all duration-150"
          style={{
            backgroundColor: isFull ? "#C97B4A" : "#D6C5B3",
            color: "#FAF6F0",
            borderRadius: "10px",
            border: "none",
            cursor: isFull ? "pointer" : "not-allowed",
            fontFamily: "'Inter', system-ui, sans-serif",
          }}
          onMouseEnter={(e) => { if (isFull) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#8B5E3C" }}
          onMouseLeave={(e) => { if (isFull) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#C97B4A" }}
        >
          Xác nhận
        </button>
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
