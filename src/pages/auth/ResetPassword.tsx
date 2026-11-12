import { useEffect, useState } from "react"
import { useParams } from "react-router"
import { z } from "zod"
import type { Page } from "../../App"
import { AuthShell } from "../../components/AuthShell"
import { Banner, Button, Field, PasswordField } from "../../components/ui"
import { env } from "../../config/env"
import { useToast } from "../../context/ToastContext"
import { ApiError } from "../../lib/api/http"
import { authApi } from "../../lib/api/identity"

interface Props {
  navigate: (p: Page) => void
}

const schema = z
  .object({
    newPassword: z.string().min(8, "Tối thiểu 8 ký tự").regex(/[A-Z]/, "Cần ít nhất 1 chữ hoa").regex(/\d/, "Cần ít nhất 1 chữ số"),
    confirm: z.string(),
  })
  .refine((v) => v.newPassword === v.confirm, { path: ["confirm"], message: "Mật khẩu nhập lại không khớp" })

const RESEND_SECONDS = 60

/**
 * UC-02 step 2, in two screens: first the 6-digit code from the email is checked, and only once it is right is the new password asked
 * for. With the real backend `token` in the URL is the email; the mock data resets by link, so it goes straight to the password.
 */
export default function ResetPassword({ navigate }: Props) {
  const { token = "" } = useParams()
  const { showToast } = useToast()
  const [step, setStep] = useState<"code" | "password">(env.useMock ? "password" : "code")
  const [code, setCode] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [expired, setExpired] = useState(!token)
  const [loading, setLoading] = useState(false)
  const [networkError, setNetworkError] = useState(false)
  const [wait, setWait] = useState(RESEND_SECONDS)

  useEffect(() => {
    if (wait === 0) return
    const t = setTimeout(() => setWait((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [wait])

  async function checkCode() {
    if (!/^\d{6}$/.test(code.trim())) { setErrors({ code: "Nhập đủ mã 6 số trong email" }); return }
    setErrors({})
    setLoading(true)
    setNetworkError(false)
    try {
      await authApi.verifyResetCode(token, code.trim())
      setStep("password")
    } catch (err) {
      if (err instanceof ApiError && err.code === "auth.reset_code_invalid") setErrors({ code: "Mã không đúng hoặc đã hết hạn. Nhập lại hoặc gửi mã mới." })
      else setNetworkError(true)
    } finally {
      setLoading(false)
    }
  }

  async function resend() {
    setNetworkError(false)
    try {
      await authApi.forgotPassword(token)
      setCode("")
      setErrors({})
      setWait(RESEND_SECONDS)
      showToast("Đã gửi mã mới. Kiểm tra hộp thư (cả mục Spam).", "success")
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Không thể kết nối máy chủ", "error")
    }
  }

  async function submit() {
    const parsed = schema.safeParse({ newPassword, confirm })
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])))
      return
    }
    setErrors({})
    setLoading(true)
    setNetworkError(false)
    try {
      await authApi.resetPassword({ token, code: code.trim(), newPassword, confirmNewPassword: confirm })
      showToast("Đã đặt lại mật khẩu. Hãy đăng nhập.", "success")
      navigate("staff-entry")
    } catch (err) {
      // The code ran out between the two screens (expired, or a newer one was requested): back to the code screen.
      if (err instanceof ApiError && err.code === "auth.reset_code_invalid" && !env.useMock) {
        setStep("code")
        setErrors({ code: "Mã đã hết hạn hoặc không còn dùng được. Gửi mã mới để tiếp tục." })
      } else if (err instanceof ApiError && (err.status === 410 || err.status === 404)) setExpired(true)
      else setNetworkError(true)
    } finally {
      setLoading(false)
    }
  }

  if (expired) {
    return (
      <AuthShell title="Liên kết không còn hiệu lực" subtitle="Liên kết đặt lại mật khẩu đã hết hạn hoặc đã được dùng. Hãy yêu cầu liên kết mới.">
        <Button className="w-full" onClick={() => navigate("auth-forgot-password")}>Yêu cầu liên kết mới</Button>
      </AuthShell>
    )
  }

  if (step === "code") {
    return (
      <AuthShell title="Nhập mã xác nhận" subtitle={`Mã 6 số đã được gửi tới ${token}. Mã có hiệu lực 15 phút.`}>
        <form onSubmit={(e) => { e.preventDefault(); void checkCode() }} className="space-y-4" noValidate>
          {networkError && <Banner>Không thể kết nối máy chủ. Thử lại sau.</Banner>}
          <Field label="Mã xác nhận (6 số)" inputMode="numeric" maxLength={6} autoComplete="one-time-code" autoFocus value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} error={errors.code} />
          <Button type="submit" loading={loading} disabled={code.trim().length !== 6} disabledReason="Nhập đủ 6 số" className="w-full">Xác nhận mã</Button>
        </form>
        <p className="mt-5 text-center text-sm text-text-secondary">
          Chưa nhận được mã?{" "}
          {wait > 0 ? <span>Gửi lại sau {wait}s</span> : <button type="button" onClick={() => void resend()} className="font-medium text-clay underline underline-offset-2">Gửi lại mã</button>}
        </p>
        <p className="mt-2 text-center text-sm"><button type="button" onClick={() => navigate("auth-forgot-password")} className="text-text-secondary underline underline-offset-2">Đổi email khác</button></p>
      </AuthShell>
    )
  }

  return (
    <AuthShell title="Đặt mật khẩu mới" subtitle="Mã đã đúng. Mật khẩu tối thiểu 8 ký tự, có chữ hoa và chữ số.">
      <form onSubmit={(e) => { e.preventDefault(); void submit() }} className="space-y-4" noValidate>
        {networkError && <Banner>Không thể kết nối máy chủ. Thử lại sau.</Banner>}
        <PasswordField label="Mật khẩu mới" autoComplete="new-password" autoFocus value={newPassword} onChange={(e) => setNewPassword(e.target.value)} error={errors.newPassword} />
        <PasswordField label="Nhập lại mật khẩu" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} error={errors.confirm} />
        <Button type="submit" loading={loading} className="w-full">Đặt mật khẩu</Button>
      </form>
    </AuthShell>
  )
}
