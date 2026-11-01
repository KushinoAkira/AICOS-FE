import { useState } from "react"
import type { Page } from "../../router/pages"
import { AuthShell } from "../../components/AuthShell"
import { Banner, Button, Field } from "../../components/ui"
import { env } from "../../config/env"
import { homePageOf, useAuth } from "../../context/AuthContext"
import { useCountdown, mmss } from "../../hooks/useCountdown"
import { ApiError } from "../../lib/api/http"
import { clearActiveBrandSlug } from "../../lib/brand"
import { normalizeRole } from "../../router/roles"

interface Props {
  navigate: (p: Page) => void
}

type Failure = { kind: "network" } | { kind: "invalid" } | { kind: "locked"; seconds: number } | { kind: "disabled" } | { kind: "unknown"; message: string }

function classify(err: unknown): Failure {
  if (!(err instanceof ApiError)) return { kind: "unknown", message: "Đã có lỗi xảy ra" }
  if (err.isNetwork) return { kind: "network" }
  if (err.code === "account_locked" || err.code === "account.temporarily_locked" || err.status === 423) return { kind: "locked", seconds: err.retryAfterSeconds ?? 900 }
  if (err.code === "account_disabled") return { kind: "disabled" }
  if (err.status === 401) return { kind: "invalid" }
  return { kind: "unknown", message: err.message }
}

/** Super Admin only — no tenant in the URL or JWT. */
export default function AdminLogin({ navigate }: Props) {
  const { login, logout } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [failure, setFailure] = useState<Failure | null>(null)
  const lockSeconds = useCountdown(failure?.kind === "locked" ? failure.seconds : 0)
  const locked = failure?.kind === "locked" && lockSeconds > 0

  async function submit(loginName = email, pass = password) {
    setSubmitting(true)
    setFailure(null)
    try {
      clearActiveBrandSlug()
      const user = await login(loginName, pass, { admin: true })
      if (normalizeRole(user) !== "superAdmin") {
        await logout()
        setFailure({ kind: "invalid" })
        return
      }
      navigate(homePageOf(user))
    } catch (err) {
      setFailure(classify(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthShell hero title="Đăng nhập quản trị nền tảng" subtitle="Cổng Super Admin — không gắn với thương hiệu nào.">
      <form onSubmit={(e) => { e.preventDefault(); void submit() }} className="space-y-4" noValidate>
        {failure?.kind === "network" && (
          <Banner action={<button type="button" onClick={() => void submit()} className="font-medium underline">Thử lại</button>}>
            Không kết nối được máy chủ.
          </Banner>
        )}
        {locked && <Banner tone="warn">Tài khoản bị khóa tạm. Thử lại sau {mmss(lockSeconds)}.</Banner>}
        {failure?.kind === "disabled" && <Banner>Tài khoản đã bị vô hiệu hóa.</Banner>}
        {failure?.kind === "unknown" && <Banner>{failure.message}</Banner>}

        <Field label="Email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} error={failure?.kind === "invalid" ? "Email hoặc mật khẩu không đúng" : undefined} />
        <Field label="Mật khẩu" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />

        <Button type="submit" loading={submitting} disabled={locked || !email || !password} className="mt-2 w-full">
          Đăng nhập
        </Button>
      </form>

      {env.demo && (
        <div className="mt-8 border-t border-border pt-5">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-text-secondary">Tài khoản demo</p>
          <Button type="button" variant="secondary" className="px-3 py-1.5 text-xs" disabled={submitting} onClick={() => void submit("admin@aicos.local", "Admin@12345")}>
            Quản trị nền tảng
          </Button>
        </div>
      )}
    </AuthShell>
  )
}
