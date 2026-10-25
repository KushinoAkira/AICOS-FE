import { useState } from "react"
import { useNavigate } from "react-router"
import type { Page } from "../../App"
import { AuthShell } from "../../components/AuthShell"
import { Banner, Button, Field } from "../../components/ui"
import { env } from "../../config/env"
import { useCountdown } from "../../hooks/useCountdown"
import { ApiError } from "../../lib/api/http"
import { authApi } from "../../lib/api/identity"

interface Props {
  navigate: (p: Page) => void
}

const RESEND_SECONDS = 60

/** UC-02 step 1: request a reset link. The answer is identical for unknown emails (no account enumeration). */
export default function ForgotPassword({ navigate }: Props) {
  const routerNavigate = useNavigate()
  const [email, setEmail] = useState("")
  const [sent, setSent] = useState<{ devToken?: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [cooldownKey, setCooldownKey] = useState(0)
  const cooldown = useCountdown(sent ? RESEND_SECONDS : 0, cooldownKey)

  async function submit() {
    setLoading(true)
    setError(null)
    try {
      const res = await authApi.forgotPassword(email.trim())
      setSent({ devToken: res.devToken })
      setCooldownKey((k) => k + 1)
    } catch (err) {
      setError(err instanceof ApiError && err.isNetwork ? "Không thể kết nối máy chủ. Thử lại sau." : "Chưa gửi được yêu cầu. Thử lại sau ít phút.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell title="Khôi phục mật khẩu" subtitle="Nhập email đã đăng ký, chúng tôi sẽ gửi liên kết đặt lại mật khẩu (có hiệu lực 30 phút).">
      {sent ? (
        <div className="space-y-4">
          <Banner tone="success">Nếu email tồn tại, liên kết đặt lại mật khẩu đã được gửi. Hãy kiểm tra hộp thư.</Banner>
          {!env.useMock && (
            <Button className="w-full" onClick={() => routerNavigate(`/reset-password/${encodeURIComponent(email.trim())}`)}>Nhập mã xác nhận</Button>
          )}
          {env.demo && sent.devToken && (
            <Button variant="secondary" className="w-full" onClick={() => routerNavigate(`/reset-password/${sent.devToken}`)}>
              Mở liên kết (chỉ hiện ở chế độ demo)
            </Button>
          )}
          <Button variant="ghost" className="w-full" disabled={cooldown > 0} disabledReason={`Gửi lại sau ${cooldown}s`} onClick={() => void submit()} loading={loading}>
            {cooldown > 0 ? `Gửi lại sau ${cooldown}s` : "Gửi lại liên kết"}
          </Button>
        </div>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); void submit() }} className="space-y-4" noValidate>
          {error && <Banner>{error}</Banner>}
          <Field label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <Button type="submit" loading={loading} disabled={!email.includes("@")} disabledReason="Nhập email hợp lệ" className="w-full">Gửi liên kết</Button>
        </form>
      )}
      <div className="mt-5 text-center">
        <button type="button" onClick={() => navigate("login")} className="text-sm text-clay hover:underline">← Quay lại đăng nhập</button>
      </div>
    </AuthShell>
  )
}
