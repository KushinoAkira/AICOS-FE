import { useEffect, useRef, useState } from "react"
import { env } from "../config/env"
import { useToast } from "../context/ToastContext"

/** The part of Google Identity Services this page uses. */
interface GoogleId {
  initialize: (config: { client_id: string; callback: (response: { credential: string }) => void }) => void
  renderButton: (parent: HTMLElement, options: Record<string, string | number>) => void
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleId } }
  }
}

const SCRIPT_SRC = "https://accounts.google.com/gsi/client"
let loading: Promise<GoogleId> | null = null

function loadGoogle(): Promise<GoogleId> {
  if (window.google) return Promise.resolve(window.google.accounts.id)
  loading ??= new Promise<GoogleId>((resolve, reject) => {
    const script = document.createElement("script")
    script.src = SCRIPT_SRC
    script.async = true
    script.onload = () => (window.google ? resolve(window.google.accounts.id) : reject(new Error("Google script missing")))
    script.onerror = () => {
      loading = null
      reject(new Error("Google script blocked"))
    }
    document.head.appendChild(script)
  })
  return loading
}

interface Props {
  /** Receives the Google credential (an ID token) after the customer picks an account. */
  onCredential: (idToken: string) => void
}

/** "Continue with Google". Google draws the real button; without a client id it explains that Google sign-in is not set up. */
export function GoogleButton({ onCredential }: Props) {
  const host = useRef<HTMLDivElement>(null)
  const latest = useRef(onCredential)
  latest.current = onCredential
  const [failed, setFailed] = useState(false)
  const { showToast } = useToast()

  useEffect(() => {
    if (!env.googleClientId || !host.current) return
    const parent = host.current
    let cancelled = false
    loadGoogle()
      .then((id) => {
        if (cancelled) return
        id.initialize({ client_id: env.googleClientId, callback: (r) => latest.current(r.credential) })
        id.renderButton(parent, { type: "standard", theme: "outline", size: "large", text: "continue_with", shape: "rectangular", locale: "vi", width: Math.min(400, parent.offsetWidth || 400) })
      })
      .catch(() => !cancelled && setFailed(true))
    return () => {
      cancelled = true
    }
  }, [])

  if (!env.googleClientId || failed) {
    const message = failed ? "Không tải được Google. Kiểm tra kết nối mạng hoặc tắt trình chặn quảng cáo rồi thử lại." : "Đăng nhập bằng Google chưa được cấu hình."
    return (
      <button
        type="button"
        onClick={() => showToast(message, "error")}
        className="w-full py-3 text-sm font-medium transition-all duration-150 flex items-center justify-center gap-2.5"
        style={{ backgroundColor: "#FFFFFF", color: "#3A2E22", borderRadius: "10px", border: "1px solid #E6DCCB", cursor: "pointer", fontFamily: "'Inter', system-ui, sans-serif" }}
      >
        <GoogleIcon />
        Tiếp tục với Google
      </button>
    )
  }

  return <div ref={host} className="flex w-full justify-center" style={{ minHeight: 44 }} />
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  )
}
