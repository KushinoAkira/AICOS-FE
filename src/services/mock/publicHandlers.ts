import { HttpResponse, delay, http } from "msw"
import type { ContactInput, Tenant } from "../../lib/api/platform"
import * as db from "./db"

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
]
