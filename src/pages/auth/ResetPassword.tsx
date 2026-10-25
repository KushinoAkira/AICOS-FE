import { useState } from "react"
import { useParams } from "react-router"
import { z } from "zod"
import type { Page } from "../../App"
import { AuthShell } from "../../components/AuthShell"
import { Banner, Button, Field } from "../../components/ui"
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

/** UC-02 step 2: choose a new password from the emailed link. */
export default function ResetPassword({ navigate }: Props) {
  const { token = "" } = useParams()
  const { showToast } = useToast()
  const [newPassword, setNewPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  /** Real backend: the emailed 6-digit code (`token` in the URL is then the email). */
  const [code, setCode] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [expired, setExpired] = useState(!token)
  const [loading, setLoading] = useState(false)
  const [networkError, setNetworkError] = useState(false)

  async function submit() {
    if (!env.useMock && !/^\d{6}$/.test(code.trim())) { setErrors({ code: "Nhập mã 6 số trong email" }); return }
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
      navigate("login")
    } catch (err) {
      if (err instanceof ApiError && err.code === "auth.reset_code_invalid") setErrors({ code: "Mã không đúng hoặc đã hết hạn" })
      else if (err instanceof ApiError && (err.status === 410 || err.status === 404)) setExpired(true)
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

  return (
    <AuthShell title="Đặt mật khẩu mới" subtitle="Mật khẩu tối thiểu 8 ký tự, có chữ hoa và chữ số.">
      <form onSubmit={(e) => { e.preventDefault(); void submit() }} className="space-y-4" noValidate>
        {networkError && <Banner>Không thể kết nối máy chủ. Thử lại sau.</Banner>}
        {!env.useMock && <Field label="Mã xác nhận (6 số)" inputMode="numeric" maxLength={6} autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} error={errors.code} />}
        <Field label="Mật khẩu mới" type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} error={errors.newPassword} />
        <Field label="Nhập lại mật khẩu" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} error={errors.confirm} />
        <Button type="submit" loading={loading} className="w-full">Đặt mật khẩu</Button>
      </form>
    </AuthShell>
  )
}
