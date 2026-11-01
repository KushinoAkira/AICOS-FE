import { HttpResponse, delay, http } from "msw"
import type { ContactInput, Tenant } from "../../lib/api/platform"
import { BRAND_STAFF, denyUnless, tenantSlugOf, userFromRequest } from "./auth"
import * as db from "./db"
import * as fdb from "./floorDb"
import * as odb from "./orderDb"

const problem = (status: number, title: string, code?: string) => HttpResponse.json({ title, detail: title, code }, { status })
const ok = <T,>(b: T) => HttpResponse.json(b as never)

export const publicHandlers = [
  http.get("*/api/v1/public/plans", () => ok(db.plans)),
  http.post("*/api/v1/public/contact", async ({ request }) => {
    const b = (await request.json()) as Partial<ContactInput>
    if (!b.name?.trim() || !b.email?.includes("@") || (b.message?.trim().length ?? 0) < 10) return problem(422, "Vui lòng điền đủ họ tên, email và nội dung (ít nhất 10 ký tự)")
    await delay(300)
    return ok({ received: true })
  }),
  http.get("*/api/v1/public/brands", () => {
    const list = db.tenants
      .filter((t) => t.status === "Active")
      .map((t) => ({ name: t.name, slug: t.slug, status: "Active" as const, logoUrl: t.logoUrl, brandColor: t.brandColor }))
    return ok(list)
  }),
  http.get("*/api/v1/public/brands/:slug", ({ params }) => {
    const slug = String(params.slug ?? "").trim()
    if (!slug) return problem(404, "Không tìm thấy thương hiệu")
    const t = db.tenants.find((x) => x.slug === slug)
    if (!t || t.status === "Pending" || t.status === "Rejected") return problem(404, "Không tìm thấy thương hiệu")
    const status = t.status === "Active" ? "Active" : t.status === "Suspended" ? "Suspended" : "Closed"
    return ok({ name: t.name, slug: t.slug, status, logoUrl: t.logoUrl, brandColor: t.brandColor })
  }),
  /** Resolve brand + branch for a table QR (token globally unique). */
  http.get("*/api/v1/public/qr/:token", ({ params }) => {
    const token = String(params.token ?? "")
    const dining = fdb.diningTables.find((x) => x.qrToken === token)
    const table = dining ?? odb.tables.find((x) => x.qrToken === token)
    if (!table) return problem(404, "Mã QR không hợp lệ")
    const isActive = "isActive" in table ? table.isActive !== false : true
    if (!isActive) return problem(403, "Bàn không còn hoạt động")
    const branchId = table.branchId
    const br = db.branches.find((b) => b.id === branchId)
    if (br && br.status !== "Active") return problem(403, "Chi nhánh không khả dụng")
    const slug = Object.entries(db.branchesOfTenant).find(([, ids]) => ids.includes(branchId))?.[0]
    const t = slug ? db.tenantBySlug(slug) : undefined
    if (!t || t.status !== "Active") return problem(403, "Chi nhánh hoặc thương hiệu không khả dụng")
    return ok({ token, tenantSlug: t.slug, brandName: t.name, branchId })
  }),
  http.get("*/api/v1/brand/profile", ({ request }) => {
    const denied = denyUnless(request, BRAND_STAFF)
    if (denied) return denied
    const slug = tenantSlugOf(userFromRequest(request)!) ?? request.headers.get("x-tenant")
    const t = db.tenantBySlug(slug ?? "") as Tenant | undefined
    if (!t) return problem(404, "Không tìm thấy thương hiệu")
    return ok({ name: t.name, slug: t.slug, logoUrl: t.logoUrl, brandColor: t.brandColor })
  }),
  http.put("*/api/v1/brand/profile", async ({ request }) => {
    const denied = denyUnless(request, BRAND_STAFF)
    if (denied) return denied
    const b = (await request.json()) as { logoUrl?: string; brandColor?: string }
    if (b.brandColor && !/^#[0-9a-fA-F]{6}$/.test(b.brandColor)) return problem(422, "Màu thương hiệu không hợp lệ")
    if (b.logoUrl && b.logoUrl.length > 700_000) return problem(422, "Logo quá lớn (tối đa 512 KB)")
    const slug = tenantSlugOf(userFromRequest(request)!) ?? request.headers.get("x-tenant")
    const t = db.tenantBySlug(slug ?? "") as Tenant | undefined
    if (!t) return problem(404, "Không tìm thấy thương hiệu")
    t.logoUrl = b.logoUrl || undefined
    t.brandColor = b.brandColor || undefined
    return ok({ name: t.name, slug: t.slug, logoUrl: t.logoUrl, brandColor: t.brandColor })
  }),
]
