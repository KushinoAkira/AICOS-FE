import { useState } from "react"
import { useParams } from "react-router"
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
import { clearActiveBranchId, setActiveBranchId } from "../../lib/branch"
import { setActiveBrandSlug } from "../../lib/brand"
import { normalizeRole } from "../../router/roles"

interface Props {
  navigate: (p: Page, params?: Record<string, string>) => void
}

type Failure = { kind: "network" } | { kind: "invalid" } | { kind: "locked"; seconds: number } | { kind: "disabled" } | { kind: "unknown"; message: string }

const DEMO_STAFF = [
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

/** Staff login for one brand: `/{slug}/login`. Tenant comes from the path, then from the session JWT. */
export default function Login(props: Props) {
  return <BrandGate><LoginForm {...props} /></BrandGate>
}

function LoginForm({ navigate }: Props) {
  const { t } = useTranslation()
  const { tenantSlug = "" } = useParams()
  const brand = useBrand()
  const { login, logout } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [failure, setFailure] = useState<Failure | null>(null)
  const lockSeconds = useCountdown(failure?.kind === "locked" ? failure.seconds : 0)
  const locked = failure?.kind === "locked" && lockSeconds > 0
  const slug = brand.kind === "ready" || brand.kind === "loading" || brand.kind === "notFound" || brand.kind === "error" ? brand.slug : tenantSlug
  const brandName = brand.kind === "ready" ? brand.brand.name : slug

  async function submit(loginName = email, pass = password) {
    if (!slug) return
    setSubmitting(true)
    setFailure(null)
    try {
      setActiveBrandSlug(slug)
      const user = await login(loginName, pass, { tenantSlug: slug })
      if (normalizeRole(user) === "customer") {
        await logout()
        setFailure({ kind: "unknown", message: "Tài khoản khách hàng vui lòng đăng nhập tại trang khách (/customer-login)." })
        return
      }
      if (normalizeRole(user) === "superAdmin") {
        await logout()
        setFailure({ kind: "unknown", message: "Tài khoản quản trị nền tảng vui lòng dùng /admin/login." })
        return
      }
      // BR-05: branch-locked roles bind to account branch; Brand Admin picks after login.
      const role = normalizeRole(user)
      if (user.branchId && (role === "branchManager" || role === "cashier" || role === "barista")) {
        setActiveBranchId(user.branchId)
      } else {
        clearActiveBranchId()
      }
      navigate(homePageOf(user), { tenantSlug: slug })
    } catch (err) {
      setFailure(classify(err))
    } finally {
      setSubmitting(false)
    }
  }

  const title = brand.kind === "ready" ? `Đăng nhập · ${brand.brand.name}` : t("auth.title")
  const subtitle = brand.kind === "ready"
    ? `Nhân viên và quản trị của ${brand.brand.name}`
    : t("auth.subtitle")

  return (
    <AuthShell hero title={title} subtitle={subtitle}>
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

        <Button type="submit" loading={submitting} disabled={locked || !email || !password || !slug} disabledReason={locked ? "Tài khoản đang bị khóa tạm" : "Nhập email và mật khẩu"} className="mt-2 w-full">
          {t("auth.submit")}
        </Button>
      </form>

      <div className="mt-5 text-center text-sm text-text-secondary">
        <button type="button" onClick={() => navigate("auth-forgot-password")} className="text-clay hover:underline">
          {t("auth.forgot")}
        </button>
        <p className="mt-3">
          Sai quán?{" "}
          <button type="button" onClick={() => navigate("staff-entry")} className="font-medium text-clay hover:underline">
            Chọn thương hiệu khác
          </button>
        </p>
      </div>

      {env.demo && slug && (
        <div className="mt-8 border-t border-border pt-5">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-text-secondary">
            {t("auth.demo")} · {brandName}
          </p>
          <div className="flex flex-wrap gap-2">
            {DEMO_STAFF.filter((a) => slug === "caphenha" || a.email === "brand@aicos.local" || a.email === "manager@aicos.local").map((a) => (
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
