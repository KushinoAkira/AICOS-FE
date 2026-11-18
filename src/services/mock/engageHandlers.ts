import { HttpResponse, delay, http } from "msw"
import type { AiReply, Feedback } from "../../lib/api/engage"
import { BRAND_STAFF, CUSTOMER_ONLY, denyUnless, userIdFromRequest } from "./auth"
import * as bdb from "./brandDb"
import * as odb from "./orderDb"

const problem = (status: number, title: string, headers?: Record<string, string>) => HttpResponse.json({ title, detail: title }, { status, headers })
const ok = <T,>(b: T) => HttpResponse.json(b as never)
const customerOf = userIdFromRequest

const seed = (id: string, rating: number, comment: string, ago: number): Feedback & { customerId: string } => ({
  id, orderId: `seed-${id}`, orderCode: `AI-${id.toUpperCase()}`, rating, comment, createdAtUtc: new Date(Date.now() - ago * 3_600_000).toISOString(), customerId: "seed",
})
const feedback: (Feedback & { customerId: string })[] = [
  seed("s1", 5, "Latte béo thơm, bạn pha chế dễ thương lắm", 3),
  seed("s2", 5, "Nước ngon nhưng chờ 25 phút mới có, chắc không quay lại", 20),
  seed("s3", 2, "Nhân viên thái độ khó chịu, ly nước thì nhạt", 30),
  seed("s4", 4, "Quán sạch, nhạc êm, ngồi làm việc rất ổn", 48),
]
const hits: number[] = []
const LIMIT = 8

type Snap = { id: string; name: string; price?: number; category?: string }

/** Recommendation is limited to the active branch menu (snapshot or published stock) so the AI never offers something unorderable. */
function liveProducts(snap?: Snap[]) {
  if (snap?.length) return snap.map((p) => ({ id: p.id, name: p.name, price: p.price ?? 0, category: p.category ?? "Khác" }))
  return bdb.products
    .filter((p) => p.published && !p.soldOutAt.includes(odb.BRANCH_ID))
    .map((p) => ({ id: p.id, name: p.name, price: p.branchPrices[odb.BRANCH_ID] ?? p.basePrice, category: p.category }))
}

function reply(message: string, snap?: Snap[]): AiReply {
  const m = message.toLowerCase()
  const live = liveProducts(snap)
  const pick = (cat: string[], reason: string, n = 3) => ({
    reply: "",
    suggestions: live.filter((p) => !cat.length || cat.some((c) => (p.category || "").includes(c) || c.includes(p.category || ""))).slice(0, n)
      .map((p) => ({ productId: p.id, name: p.name, price: p.price, reason })),
  })
  let r: { reply: string; suggestions: AiReply["suggestions"] }
  if (/ít ngọt|ít đường|không ngọt/.test(m)) { r = pick(["Cà phê", "Trà"], "Có thể chọn mức đường 0-30%"); r.reply = "Bạn có thể chọn các món này và hạ mức đường xuống 0-30%:" }
  else if (/không đắng|dễ uống|nhẹ/.test(m)) { r = pick(["Trà sữa", "Đá xay", "Bánh"], "Vị béo, ít đắng"); r.reply = "Nếu bạn không thích vị đắng, thử các món béo và ngọt dịu này:" }
  else if (/ăn kèm|bánh|combo/.test(m)) { r = pick(["Bánh", "Ăn vặt"], "Hay gọi kèm đồ uống"); r.reply = "Trong menu chi nhánh này, bạn có thể gọi kèm:" }
  else if (/trà|mát|nóng bức|mùa/.test(m)) { r = pick(["Trà", "Nước"], "Thanh mát"); r.reply = "Các món mát đang có tại chi nhánh:" }
  else if (/cà phê|caffeine|tỉnh/.test(m)) { r = pick(["Cà phê"], "Cà phê pha tại quán"); r.reply = "Một vài lựa chọn cà phê cho bạn:" }
  else {
    r = { reply: "Mình chỉ tư vấn món trong menu chi nhánh bạn đang xem. Thử hỏi ít ngọt, không đắng, đồ mát hoặc ăn kèm nhé.", suggestions: live.slice(0, 3).map((p) => ({ productId: p.id, name: p.name, price: p.price, reason: "Có trong menu chi nhánh này" })) }
  }
  return r
}

export const engageHandlers = [
  http.post("*/api/v1/ai/recommendations", async ({ request }) => {
    const denied = denyUnless(request, CUSTOMER_ONLY)
    if (denied) return denied
    await delay(300)
    const body = (await request.json()) as { history?: string[]; k?: number; menuItems?: Snap[] }
    const live = liveProducts(body.menuItems)
    return ok({ items: live.slice(0, body.k ?? 5).map((p, i) => ({ productId: p.id, name: p.name, price: p.price, reason: "Hợp với những món bạn hay gọi", score: 0.95 - i * 0.1 })) })
  }),
  http.post("*/api/v1/ai/feedback/analyze", async ({ request }) => {
    const denied = denyUnless(request, BRAND_STAFF)
    if (denied) return denied
    const { texts } = (await request.json()) as { texts: string[] }
    const topics: [RegExp, string][] = [[/nước|latte|cà phê|trà|ngon|nhạt/i, "Đồ uống"], [/nhân viên|bạn pha|thái độ/i, "Phục vụ"], [/chờ|lâu|nhanh|chậm/i, "Tốc độ"], [/quán|nhạc|sạch|ngồi/i, "Không gian"], [/giá|voucher/i, "Giá cả"]]
    return ok({
      available: true, model: "mock",
      items: texts.map((t) => {
        const aspectLabels = topics.filter(([re]) => re.test(t)).map(([, label]) => label)
        return { sentiment: /tệ|chậm|dở|lâu|nhạt|khó chịu|không quay lại/i.test(t) ? "NEGATIVE" : "POSITIVE", confidence: 0.9, aspects: aspectLabels, aspectLabels }
      }),
    })
  }),
  // Guest QR (no account) also uses the menu assistant — keep chat public, rate-limited below.
  http.post("*/api/v1/ai/chat", async ({ request }) => {
    await delay(700)
    const now = Date.now()
    while (hits.length && now - hits[0] > 60_000) hits.shift()
    if (hits.length >= LIMIT) return problem(429, "Bạn hỏi quá nhanh. Vui lòng thử lại sau ít phút.", { "Retry-After": "30" })
    hits.push(now)
    const body = (await request.json()) as { message: string; menuItems?: Snap[] }
    if (!body.message?.trim()) return problem(422, "Nhập câu hỏi")
    if (body.message.toLowerCase().includes("lỗi ai")) return problem(503, "Trợ lý AI tạm thời không khả dụng")
    return ok(reply(body.message, body.menuItems))
  }),
  http.get("*/api/v1/feedback/pending", ({ request }) => {
    const denied = denyUnless(request, CUSTOMER_ONLY)
    if (denied) return denied
    const me = customerOf(request)
    return ok(odb.orders.filter((o) => o.customerId === me && o.status === "PickedUp" && !feedback.some((f) => f.orderId === o.id)).reverse())
  }),
  http.get("*/api/v1/feedback/branch", ({ request }) => {
    const denied = denyUnless(request, BRAND_STAFF)
    if (denied) return denied
    return ok([...feedback].reverse().map(({ customerId: _c, ...f }) => f))
  }),
  http.get("*/api/v1/feedback/mine", ({ request }) => {
    const denied = denyUnless(request, CUSTOMER_ONLY)
    if (denied) return denied
    return ok(feedback.filter((f) => f.customerId === customerOf(request)).reverse())
  }),
  http.post("*/api/v1/feedback", async ({ request }) => {
    const denied = denyUnless(request, CUSTOMER_ONLY)
    if (denied) return denied
    const b = (await request.json()) as { orderId: string; rating: number; comment: string }
    const o = odb.orders.find((x) => x.id === b.orderId && x.customerId === customerOf(request))
    if (!o || o.status !== "PickedUp") return problem(409, "Chỉ đánh giá được đơn đã nhận")
    if (feedback.some((f) => f.orderId === o.id)) return problem(409, "Đơn này đã được đánh giá")
    if (!(b.rating >= 1 && b.rating <= 5)) return problem(422, "Chọn số sao từ 1 đến 5")
    const f = { id: `f${feedback.length + 1}`, orderId: o.id, orderCode: o.code, rating: b.rating, comment: b.comment.trim().slice(0, 500), createdAtUtc: new Date().toISOString(), customerId: customerOf(request) }
    feedback.push(f)
    return ok(f)
  }),
]
