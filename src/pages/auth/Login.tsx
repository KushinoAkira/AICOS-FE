import { useState } from "react"
import { useTranslation } from "react-i18next"
import type { Page } from "../../App"
import { AuthShell } from "../../components/AuthShell"
import { BrandGate } from "../../components/BrandGate"
import { useBrand } from "../../context/BrandContext"
import { Banner, Button, Field } from "../../components/ui"
import { env } from "../../config/env"
import { homePageOf, useAuth } from "../../context/AuthContext"
import { useCountdown, mmss } from "../../hooks/useCountdown"
import { ApiError } from "../../lib/api/http"
import { normalizeRole } from "../../router/roles"

interface Props {
  navigate: (p: Page) => void
}

type Failure = { kind: "network" } | { kind: "invalid" } | { kind: "locked"; seconds: number } | { kind: "disabled" } | { kind: "unknown"; message: string }

const DEMO_ACCOUNTS = [
  { label: "Quản trị nền tảng", email: "admin@aicos.local", password: "Admin@12345" },
  { label: "Quản trị thương hiệu", email: "brand@aicos.local", password: "Staff@12345" },
  { label: "Quản lý chi nhánh", email: "manager@aicos.local", password: "Staff@12345" },
  { label: "Pha chế", email: "warehouse@aicos.local", password: "Staff@12345" },
  { label: "Thu ngân", email: "cashier@aicos.local", password: "Staff@12345" },
]

function classify(err: unknown): Failure {
  if (!(err instanceof ApiError)) return { kind: "unknown", message: "Đã có lỗi xảy ra" }
  if (err.isNetwork) return { kind: "network" }
  if (err.code === "account_locked" || err.code === "account.temporarily_locked" || err.status === 423) return { kind: "locked", seconds: err.retryAfterSeconds ?? 900 }
  if (err.code === "account_disabled") return { kind: "disabled" }
  if (err.status === 401) return { kind: "invalid" }
  return { kind: "unknown", message: err.message }
}

export default function Login(props: Props) {
  return <BrandGate><LoginForm {...props} /></BrandGate>
}

function LoginForm({ navigate }: Props) {
  const { t } = useTranslation()
  const brand = useBrand()
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
      const user = await login(loginName, pass)
      // Staff portal only — customer accounts belong on /customer-login (brand subset).
      if (normalizeRole(user) === "customer") {
        await logout()
        setFailure({ kind: "unknown", message: "Tài khoản khách hàng vui lòng đăng nhập tại trang khách (QR /customer-login), không dùng cổng quán." })
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
    <AuthShell hero title={t("auth.title")} subtitle={t("auth.subtitle")}>
      <form onSubmit={(e) => { e.preventDefault(); void submit() }} className="space-y-4" noValidate>
        {failure?.kind === "network" && (
          <Banner action={<button type="button" onClick={() => void submit()} className="font-medium underline">{t("common.retry")}</button>}>
            {t("auth.network")}
          </Banner>
        )}
        {locked && <Banner tone="warn">{t("auth.locked", { time: mmss(lockSeconds) })}</Banner>}
        {failure?.kind === "disabled" && <Banner>Tài khoản đã bị vô hiệu hóa. Liên hệ quản trị viên.</Banner>}
        {failure?.kind === "unknown" && <Banner>{failure.message}</Banner>}

        <Field
          label={t("auth.email")}
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={failure?.kind === "invalid" ? t("auth.wrongCredentials") : undefined}
        />
        <Field label={t("auth.password")} type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />

        <Button type="submit" loading={submitting} disabled={locked || !email || !password} disabledReason={locked ? "Tài khoản đang bị khóa tạm" : "Nhập email và mật khẩu"} className="mt-2 w-full">
          {t("auth.submit")}
        </Button>
      </form>

      <div className="mt-5 text-center">
        <button type="button" onClick={() => navigate("auth-forgot-password")} className="text-sm text-clay hover:underline">
          {t("auth.forgot")}
        </button>
        {brand.kind === "platform" && (
          <p className="mt-3 text-sm text-text-secondary">
            Chưa có quán trên AICOS?{" "}
            <button type="button" onClick={() => navigate("contact")} className="font-medium text-clay hover:underline">Liên hệ AICOS</button>
          </p>
        )}
      </div>

      {env.demo && (
        <div className="mt-8 border-t border-border pt-5">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-text-secondary">{t("auth.demo")}</p>
          <div className="flex flex-wrap gap-2">
            {DEMO_ACCOUNTS.map((a) => (
              <Button key={a.email} type="button" variant="secondary" className="px-3 py-1.5 text-xs" disabled={submitting} onClick={() => void submit(a.email, a.password)}>
                {a.label}
              </Button>
            ))}
          </div>
        </div>
      )}
    </AuthShell>
  )
}
