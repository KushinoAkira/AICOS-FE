import { HttpResponse, delay, http } from "msw"
import type { BrandRegistrationInput, ContactInput, Tenant } from "../../lib/api/platform"
import * as db from "./db"

const problem = (status: number, title: string, code?: string) => HttpResponse.json({ title, detail: title, code }, { status })
const ok = <T,>(b: T) => HttpResponse.json(b as never)

/** Demo e-mail code. In real mode the backend e-mails a random 6-digit code. */
export const DEMO_CODE = "123456"

interface Registration { input: BrandRegistrationInput; verified: boolean; attempts: number }
const registrations = new Map<string, Registration>()
let seq = 1

const slugTaken = (slug: string) => db.tenants.some((t) => t.slug === slug) || [...registrations.values()].some((r) => r.input.slug === slug)
const emailTaken = (email: string) => db.tenants.some((t) => t.applicantEmail?.toLowerCase() === email.toLowerCase())

export const publicHandlers = [
  http.get("*/api/v1/public/plans", () => ok(db.plans)),
  http.post("*/api/v1/public/contact", async ({ request }) => {
    const b = (await request.json()) as Partial<ContactInput>
    if (!b.name?.trim() || !b.email?.includes("@") || (b.message?.trim().length ?? 0) < 10) return problem(422, "Vui lòng điền đủ họ tên, email và nội dung (ít nhất 10 ký tự)")
    await delay(300)
    return ok({ received: true })
  }),
  http.get("*/api/v1/public/brands/:slug", ({ params }) => {
    const t = db.tenants.find((x) => x.slug === params.slug)
    if (!t || t.status === "Pending" || t.status === "Rejected") return problem(404, "Không tìm thấy thương hiệu")
    const status = t.status === "Active" ? "Active" : t.status === "Suspended" ? "Suspended" : "Closed"
    return ok({ name: t.name, slug: t.slug, status, logoUrl: t.logoUrl, brandColor: t.brandColor })
  }),
  /** Brand Admin's own brand (the demo Brand Admin belongs to "caphenha"). */
  http.get("*/api/v1/brand/profile", () => {
    const t = db.tenants.find((x) => x.slug === "caphenha") as Tenant
    return ok({ name: t.name, slug: t.slug, logoUrl: t.logoUrl, brandColor: t.brandColor })
  }),
  http.put("*/api/v1/brand/profile", async ({ request }) => {
    const b = (await request.json()) as { logoUrl?: string; brandColor?: string }
    if (b.brandColor && !/^#[0-9a-fA-F]{6}$/.test(b.brandColor)) return problem(422, "Màu thương hiệu không hợp lệ")
    if (b.logoUrl && b.logoUrl.length > 700_000) return problem(422, "Logo quá lớn (tối đa 512 KB)")
    const t = db.tenants.find((x) => x.slug === "caphenha") as Tenant
    t.logoUrl = b.logoUrl || undefined
    t.brandColor = b.brandColor || undefined
    return ok({ name: t.name, slug: t.slug, logoUrl: t.logoUrl, brandColor: t.brandColor })
  }),
  http.post("*/api/v1/public/brand-registrations", async ({ request }) => {
    await delay(300)
    const b = (await request.json()) as BrandRegistrationInput
    if (!b.name?.trim() || !b.ownerName?.trim() || !b.ownerEmail?.trim()) return problem(422, "Thiếu thông tin bắt buộc")
    if (!db.plans.some((p) => p.id === b.planId)) return problem(422, "Gói dịch vụ không hợp lệ")
    if (b.logoDataUrl && b.logoDataUrl.length > 700_000) return problem(422, "Logo quá lớn (tối đa 512 KB)")
    if (b.brandColor && !/^#[0-9a-fA-F]{6}$/.test(b.brandColor)) return problem(422, "Màu thương hiệu không hợp lệ")
    if (slugTaken(b.slug)) return problem(409, "Mã định danh (subdomain) đã tồn tại", "slug_taken")
    if (emailTaken(b.ownerEmail)) return problem(409, "Email này đã đăng ký một thương hiệu", "email_taken")
    const id = `reg${seq++}`
    registrations.set(id, { input: b, verified: false, attempts: 0 })
    return ok({ registrationId: id })
  }),
  http.post("*/api/v1/public/brand-registrations/:id/resend", () => ok({ sent: true })),
  http.post("*/api/v1/public/brand-registrations/:id/verify", async ({ params, request }) => {
    await delay(250)
    const r = registrations.get(String(params.id))
    if (!r) return problem(404, "Không tìm thấy đăng ký. Hãy điền lại biểu mẫu")
    if (r.verified) return ok({ status: "Pending" as const })
    if (r.attempts >= 5) return problem(429, "Nhập sai quá nhiều lần. Hãy gửi lại mã mới")
    const { code } = (await request.json()) as { code: string }
    if (code !== DEMO_CODE) { r.attempts++; return problem(422, "Mã xác nhận không đúng") }
    r.verified = true
    const i = r.input
    const tenant: Tenant = {
      id: `t${db.tenants.length + 1}`, name: i.name.trim(), slug: i.slug, planId: i.planId, status: "Pending", branchCount: 0, createdAtUtc: new Date().toISOString(),
      applicantName: i.ownerName.trim(), applicantEmail: i.ownerEmail.trim(), applicantPhone: i.ownerPhone.trim(),
      logoUrl: i.logoDataUrl || undefined, brandColor: i.brandColor || undefined,
    }
    db.tenants.push(tenant)
    db.audit.unshift({ id: `a${Date.now()}`, at: tenant.createdAtUtc, actor: i.ownerEmail, action: "Đăng ký thương hiệu mới (chờ duyệt)", target: tenant.name })
    return ok({ status: "Pending" as const })
  }),
]
