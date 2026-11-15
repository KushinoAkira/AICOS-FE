import { useState } from "react"
import type { Page } from "../../router/pages"
import { AuthShell } from "../../components/AuthShell"
import { Banner, Button, Field } from "../../components/ui"
import { env } from "../../config/env"
import { homePageOf, useAuth } from "../../context/AuthContext"
import { useCountdown, mmss } from "../../hooks/useCountdown"
import { ApiError } from "../../lib/api/http"
import { tokenStore } from "../../lib/api/tokenStore"
import { clearActiveBranchId, setActiveBranchId } from "../../lib/branch"
import { setActiveBrandSlug } from "../../lib/brand"
import { normalizeRole } from "../../router/roles"
import { protectOrphans } from "../../lib/typography"

interface Props {
  navigate: (p: Page, params?: Record<string, string>) => void
}

type Failure =
  | { kind: "network" }
  | { kind: "invalid" }
  | { kind: "locked"; seconds: number }
  | { kind: "disabled" }
  | { kind: "unknown"; message: string }

const DEMO_STAFF = [
  { label: protectOrphans("Quản trị thương hiệu"), email: "brand@aicos.local", password: "Staff@12345" },
  { label: protectOrphans("Quản lý chi nhánh"), email: "manager@aicos.local", password: "Staff@12345" },
  { label: "Pha chế", email: "warehouse@aicos.local", password: "Staff@12345" },
  { label: "Thu ngân", email: "cashier@aicos.local", password: "Staff@12345" },
]

function classify(err: unknown): Failure {
  if (!(err instanceof ApiError)) return { kind: "unknown", message: "Đã có lỗi xảy ra" }
  if (err.isNetwork) return { kind: "network" }
  if (err.code === "account_locked" || err.code === "account.temporarily_locked" || err.status === 423) {
    return { kind: "locked", seconds: err.retryAfterSeconds ?? 900 }
  }
  if (err.code === "account_disabled") return { kind: "disabled" }
  if (err.status === 401) return { kind: "invalid" }
  return { kind: "unknown", message: err.message }
}

/**
 * Staff portal: email/password only.
 * Tenant, branch and role come from the account (JWT / session) — no brand picker.
 */
export default function StaffEntry({ navigate }: Props) {
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
      if (normalizeRole(user) === "customer") {
        await logout()
        setFailure({
          kind: "unknown",
          message: "Tài khoản khách hàng vui lòng đăng nhập tại trang khách (/customer-login).",
        })
        return
      }
      if (normalizeRole(user) === "superAdmin") {
        await logout()
        setFailure({ kind: "unknown", message: "Tài khoản quản trị nền tảng vui lòng dùng /admin/login." })
        return
      }

      const session = tokenStore.get()
      const slug = session?.tenantSlug ?? session?.activeBrandCode ?? null
      if (!slug) {
        await logout()
        setFailure({ kind: "unknown", message: "Tài khoản không gắn thương hiệu. Liên hệ quản trị viên." })
        return
      }
      setActiveBrandSlug(slug)

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

  return (
    <AuthShell
      hero
      title={protectOrphans("Đăng nhập nhân viên")}
      subtitle={protectOrphans("Cổng nhân viên — thương hiệu và chi nhánh lấy từ tài khoản của bạn.")}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
        className="space-y-4"
        noValidate
      >
        {failure?.kind === "network" && (
          <Banner action={<button type="button" onClick={() => void submit()} className="font-medium underline">Thử lại</button>}>
            Không kết nối được máy chủ.
          </Banner>
        )}
        {locked && <Banner tone="warn">Tài khoản bị khóa tạm. Thử lại sau {mmss(lockSeconds)}.</Banner>}
        {failure?.kind === "disabled" && <Banner>Tài khoản đã bị vô hiệu hóa. Liên hệ quản trị viên.</Banner>}
        {failure?.kind === "unknown" && <Banner>{failure.message}</Banner>}

        <Field
          label="Email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={failure?.kind === "invalid" ? "Email hoặc mật khẩu không đúng" : undefined}
        />
        <Field
          label="Mật khẩu"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <Button type="submit" loading={submitting} disabled={locked || !email || !password} className="mt-2 w-full">
          Đăng nhập
        </Button>
      </form>

      <div className="mt-5 text-center text-sm text-text-secondary">
        <button type="button" onClick={() => navigate("auth-forgot-password")} className="text-clay hover:underline">
          Quên mật khẩu?
        </button>
        <p className="mt-3">
          <button type="button" onClick={() => navigate("landing")} className="text-xs text-text-secondary hover:text-espresso">
            ← Về trang chủ
          </button>
        </p>
      </div>

      {env.demo && (
        <div className="mt-8 border-t border-border pt-5">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-text-secondary">Tài khoản demo</p>
          <div className="flex flex-wrap gap-2">
            {DEMO_STAFF.map((a) => (
              <Button
                key={a.email}
                type="button"
                variant="secondary"
                className="px-3 py-1.5 text-xs"
                disabled={submitting}
                onClick={() => void submit(a.email, a.password)}
              >
                {a.label}
              </Button>
            ))}
          </div>
        </div>
      )}
    </AuthShell>
  )
}
