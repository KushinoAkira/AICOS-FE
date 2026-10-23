import { HttpResponse, http } from "msw"
import type { Applicant, CashClosing, LoyaltyMe, LoyaltyVoucher, Notice, Period, Replacement, Shift } from "../../lib/api/staff"
import { tierOf } from "../../lib/loyalty"
import * as bdb from "./brandDb"
import * as db from "./db"
import * as odb from "./orderDb"

const problem = (status: number, title: string) => HttpResponse.json({ title, detail: title }, { status })
const ok = <T,>(b: T) => HttpResponse.json(b as never)
const meOf = (req: Request) => req.headers.get("authorization")?.replace("Bearer mock-", "") ?? "anon"
const nameOf = (id: string) => db.users.find((u) => u.id === id)?.fullName ?? "Nhân viên"

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
const today = () => ymd(new Date())
const addDays = (day: string, n: number) => { const d = new Date(`${day}T12:00:00`); d.setDate(d.getDate() + n); return ymd(d) }

// ---- shifts ----
type ShiftRow = Omit<Shift, "userName" | "branchId">
const shifts: ShiftRow[] = []
let shiftSeq = 1
const nextShiftId = () => `s${shiftSeq++}`
;[0, 1, 2].forEach((n) => {
  const date = addDays(today(), n)
  shifts.push({ id: nextShiftId(), date, period: "morning", userId: "u5", checkInAtUtc: null, checkOutAtUtc: null })
  shifts.push({ id: nextShiftId(), date, period: "afternoon", userId: "u4", checkInAtUtc: null, checkOutAtUtc: null })
})
const shiftDto = (s: ShiftRow): Shift => ({ ...s, userName: nameOf(s.userId), branchId: odb.BRANCH_ID })

// ---- replacement requests (BR-51: any branch's staff may apply) ----
interface ReplacementRow { id: string; shiftId: string; reason: string; status: "open" | "filled"; applicants: Applicant[]; filledBy?: string }
const replacements: ReplacementRow[] = []
const replacementDto = (r: ReplacementRow, me: string): Replacement => ({
  id: r.id, shift: shiftDto(shifts.find((s) => s.id === r.shiftId) as ShiftRow), reason: r.reason, status: r.status,
  applicants: r.applicants, filledBy: r.filledBy, applied: r.applicants.some((a) => a.userId === me),
})

// ---- cash closing ----
const closings: (CashClosing & { day: string })[] = []
const cashExpected = () => odb.orders.filter((o) => o.paymentMethod === "cash").reduce((n, o) => n + o.paidAmount - o.refundedAmount, 0)

// ---- loyalty (points are derived from completed orders; ledger entries are kept for spending) ----
const spent = new Map<string, { points: number; vouchers: LoyaltyVoucher[]; history: LoyaltyMe["history"] }>()
function loyalty(me: string): LoyaltyMe {
  const s = spent.get(me) ?? { points: 0, vouchers: [], history: [] }
  const { earnPer10k, redeemPoints } = bdb.settings.loyalty
  // Dine-in points count only once the cashier has completed the table; takeaway counts once paid.
  const paid = odb.orders.filter((o) => o.customerId === me && o.paidAmount > 0 && (o.channel === "takeaway" || !!o.completedAtUtc))
  const earn = (o: (typeof paid)[number]) => Math.floor((o.paidAmount - o.refundedAmount) / 10000) * earnPer10k
  const earned = 120 + paid.reduce((n, o) => n + earn(o), 0)
  const points = earned - s.points
  const t = tierOf(earned)
  const history = [
    ...s.history,
    ...paid.map((o) => ({ id: `e${o.id}`, delta: earn(o), reason: `Đơn ${o.code}`, atUtc: o.createdAtUtc })),
    { id: "welcome", delta: 120, reason: "Chào mừng thành viên mới", atUtc: new Date(Date.now() - 86_400_000 * 5).toISOString() },
  ].sort((a, b) => b.atUtc.localeCompare(a.atUtc))
  return { points, tier: t.name, nextTier: t.next, pointsToNext: t.toNext, redeemPoints, vouchers: s.vouchers, history }
}

// ---- notifications are derived from the customer's orders; "read" is remembered here ----
const readNotices = new Set<string>()

export const staffHandlers = [
  http.get("*/api/v1/staff/shifts", ({ request }) => {
    const from = new URL(request.url).searchParams.get("from") ?? today()
    const to = addDays(from, 6)
    return ok(shifts.filter((s) => s.date >= from && s.date <= to).map(shiftDto))
  }),
  http.post("*/api/v1/staff/shifts", async ({ request }) => {
    const b = (await request.json()) as { date: string; period: Period; userId: string }
    if (b.date < today()) return problem(422, "Không thể xếp ca trong quá khứ")
    if (shifts.some((s) => s.date === b.date && s.period === b.period && s.userId === b.userId)) return problem(409, `${nameOf(b.userId)} đã có ca này`)
    const row: ShiftRow = { id: nextShiftId(), ...b, checkInAtUtc: null, checkOutAtUtc: null }
    shifts.push(row)
    return ok(shiftDto(row))
  }),
  http.delete("*/api/v1/staff/shifts/:id", ({ params }) => {
    const i = shifts.findIndex((s) => s.id === params.id)
    if (i < 0) return problem(404, "Không tìm thấy ca")
    if (shifts[i].checkInAtUtc) return problem(409, "Ca đã chấm công, không thể xóa")
    shifts.splice(i, 1)
    return ok({ ok: true })
  }),
  http.get("*/api/v1/staff/my-shifts", ({ request }) =>
    ok(shifts.filter((s) => s.userId === meOf(request) && s.date >= today()).sort((a, b) => a.date.localeCompare(b.date) || a.period.localeCompare(b.period)).map(shiftDto))),
  http.post("*/api/v1/staff/shifts/:id/check-in", ({ params, request }) => {
    const s = shifts.find((x) => x.id === params.id && x.userId === meOf(request))
    if (!s) return problem(404, "Không tìm thấy ca của bạn")
    if (s.date !== today()) return problem(409, "Chưa đến ngày của ca này")
    if (s.checkInAtUtc) return problem(409, "Bạn đã vào ca rồi")
    s.checkInAtUtc = new Date().toISOString()
    return ok(shiftDto(s))
  }),
  http.post("*/api/v1/staff/shifts/:id/check-out", ({ params, request }) => {
    const s = shifts.find((x) => x.id === params.id && x.userId === meOf(request))
    if (!s) return problem(404, "Không tìm thấy ca của bạn")
    if (!s.checkInAtUtc) return problem(409, "Bạn chưa vào ca")
    if (s.checkOutAtUtc) return problem(409, "Bạn đã kết thúc ca")
    s.checkOutAtUtc = new Date().toISOString()
    return ok(shiftDto(s))
  }),
  http.get("*/api/v1/staff/replacements", ({ request }) =>
    ok(replacements.filter((r) => shifts.some((s) => s.id === r.shiftId)).map((r) => replacementDto(r, meOf(request))).reverse())),
  http.post("*/api/v1/staff/replacements", async ({ request }) => {
    const b = (await request.json()) as { shiftId: string; reason: string }
    if (!b.reason.trim()) return problem(422, "Nhập lý do cần ca thay")
    if (!shifts.some((s) => s.id === b.shiftId)) return problem(404, "Không tìm thấy ca")
    if (replacements.some((r) => r.shiftId === b.shiftId && r.status === "open")) return problem(409, "Ca này đã có yêu cầu thay")
    const r: ReplacementRow = { id: `r${replacements.length + 1}`, shiftId: b.shiftId, reason: b.reason.trim(), status: "open", applicants: [] }
    replacements.push(r)
    return ok(replacementDto(r, meOf(request)))
  }),
  http.post("*/api/v1/staff/replacements/:id/apply", ({ params, request }) => {
    const r = replacements.find((x) => x.id === params.id)
    const me = meOf(request)
    if (!r || r.status !== "open") return problem(409, "Ca này không còn nhận đăng ký")
    const shift = shifts.find((s) => s.id === r.shiftId) as ShiftRow
    if (shift.userId === me) return problem(409, "Đây là ca của bạn")
    if (shifts.some((s) => s.userId === me && s.date === shift.date && s.period === shift.period)) return problem(409, "Bạn đã có ca trùng giờ")
    if (r.applicants.some((a) => a.userId === me)) return problem(409, "Bạn đã đăng ký rồi")
    r.applicants.push({ userId: me, name: nameOf(me), branchName: "Chi nhánh Quận 1" })
    return ok(replacementDto(r, me))
  }),
  http.post("*/api/v1/staff/replacements/:id/approve", async ({ params, request }) => {
    const r = replacements.find((x) => x.id === params.id)
    if (!r || r.status !== "open") return problem(409, "Yêu cầu đã được xử lý")
    const { userId } = (await request.json()) as { userId: string }
    if (!r.applicants.some((a) => a.userId === userId)) return problem(422, "Người này chưa đăng ký")
    const shift = shifts.find((s) => s.id === r.shiftId) as ShiftRow
    shift.userId = userId
    r.status = "filled"
    r.filledBy = nameOf(userId)
    return ok(replacementDto(r, meOf(request)))
  }),
  http.get("*/api/v1/staff/cash/expected", () => ok({ expected: cashExpected(), closed: closings.some((c) => c.day === today()) })),
  http.get("*/api/v1/staff/cash/closings", () => ok(closings.map(({ day: _day, ...c }) => c).reverse())),
  http.post("*/api/v1/staff/cash/close", async ({ request }) => {
    if (closings.some((c) => c.day === today())) return problem(409, "Hôm nay đã chốt tiền mặt")
    const b = (await request.json()) as { counted: number; reason: string }
    const expected = cashExpected()
    const variance = b.counted - expected
    if (variance !== 0 && !b.reason.trim()) return problem(422, "Số tiền lệch, cần nhập lý do")
    const c = { id: `c${closings.length + 1}`, day: today(), date: new Date().toISOString(), userName: nameOf(meOf(request)), expected, counted: b.counted, variance, reason: b.reason.trim() }
    closings.push(c)
    return ok(c)
  }),
  http.get("*/api/v1/loyalty/me", ({ request }) => ok(loyalty(meOf(request)))),
  http.post("*/api/v1/loyalty/redeem", ({ request }) => {
    const me = meOf(request)
    const cur = loyalty(me)
    const { redeemPoints, voucherValue } = bdb.settings.loyalty
    if (cur.points < redeemPoints) return problem(409, `Cần tối thiểu ${redeemPoints} điểm để đổi voucher`)
    const s = spent.get(me) ?? { points: 0, vouchers: [], history: [] }
    const v: LoyaltyVoucher = { id: `v${s.vouchers.length + 1}`, code: `LOY${Math.floor(Math.random() * 9000 + 1000)}`, title: "Voucher đổi điểm", value: voucherValue, expiresAtUtc: new Date(Date.now() + 30 * 86_400_000).toISOString() }
    s.points += redeemPoints
    s.vouchers.unshift(v)
    s.history.push({ id: `x${s.history.length + 1}`, delta: -redeemPoints, reason: "Đổi voucher", atUtc: new Date().toISOString() })
    spent.set(me, s)
    return ok(loyalty(me))
  }),
  http.get("*/api/v1/notifications/mine", ({ request }) => {
    const me = meOf(request)
    const body = (status: string) =>
      status === "Ready" ? "Đơn của bạn đã sẵn sàng để nhận." : status === "PickedUp" ? "Cảm ơn bạn! Hãy để lại đánh giá nhé." : status === "Cancelled" ? "Đơn đã được hủy." : `Trạng thái: ${status}`
    const list: Notice[] = odb.orders.filter((o) => o.customerId === me).map((o) => ({ id: `n${o.id}-${o.status}`, title: `Đơn ${o.code}`, body: body(o.status), atUtc: o.createdAtUtc, read: readNotices.has(`n${o.id}-${o.status}`) })).reverse()
    return ok(list)
  }),
  http.post("*/api/v1/notifications/read-all", ({ request }) => {
    odb.orders.filter((o) => o.customerId === meOf(request)).forEach((o) => readNotices.add(`n${o.id}-${o.status}`))
    return ok({ ok: true })
  }),
]
