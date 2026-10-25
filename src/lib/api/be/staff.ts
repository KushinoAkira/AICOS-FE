import { http } from "../http"
import type { CashClosing, LoyaltyMe, Notice, Period, Replacement, Shift } from "../staff"
import { tokenStore } from "../tokenStore"
import { itemsOf, num, rec, recs, str, unsupported, ymd, type Raw } from "./util"

/** Real backend, workforce + customer loyalty (reference sections 4 and 8). */
const W = "/workforce"

const periodOf = (startTime: string): Period => (Number(startTime.slice(0, 2)) < 12 ? "morning" : "afternoon")

async function userIdByEmployee(): Promise<Map<string, string>> {
  const list = recs(itemsOf(await http.get<Raw[]>(`${W}/employees`)))
  return new Map(list.map((e) => [str(e.id), str(e.userId)]))
}

function toShift(a: Raw, users: Map<string, string>): Shift {
  const employeeId = str(a.employeeId)
  return {
    id: str(a.id), date: str(a.workDate).slice(0, 10), period: periodOf(str(a.startTime, "07:00")), userId: users.get(employeeId) ?? employeeId,
    userName: str(a.employeeName), branchId: str(a.branchId), checkInAtUtc: str(a.checkInAtUtc) || null, checkOutAtUtc: str(a.checkOutAtUtc) || null,
  }
}

function toReplacement(r: Raw, users: Map<string, string>, applied = false): Replacement {
  const apps = recs(r.applications).map((x) => ({ userId: users.get(str(x.employeeId)) ?? str(x.employeeId), name: str(x.employeeName), branchName: str(x.branchName) }))
  return {
    id: str(r.id), shift: toShift(rec(r.assignment ?? r), users), reason: str(r.reason), status: str(r.status).toLowerCase().includes("fill") || str(r.status) === "Approved" ? "filled" : "open",
    applicants: apps, filledBy: str(r.filledByName) || undefined, applied,
  }
}

const addDays = (from: string, n: number) => { const d = new Date(`${from}T00:00:00`); d.setDate(d.getDate() + n); return ymd(d) }

export const beStaffApi = {
  /** Manager roster: the attendance report lists every assignment of the week. */
  async shifts(from: string): Promise<Shift[]> {
    const [report, users] = await Promise.all([http.get<Raw>(`${W}/attendance/report`, { query: { from, to: addDays(from, 6) } }), userIdByEmployee()])
    return recs(rec(report).rows).map((r) => toShift(r, users))
  },
  async assign(b: { date: string; period: Period; userId: string }): Promise<Shift> {
    const [employees, shifts] = await Promise.all([http.get<Raw[]>(`${W}/employees`), http.get<Raw[]>(`${W}/work-shifts`)])
    const employee = recs(itemsOf(employees)).find((e) => str(e.userId) === b.userId)
    if (!employee) return unsupported("xếp ca: nhân viên này chưa có hồ sơ nhân sự (tạo ở mục Hồ sơ nhân sự)")
    const template = recs(itemsOf(shifts)).find((s) => periodOf(str(s.startTime, "07:00")) === b.period && s.isActive !== false)
    if (!template) return unsupported("xếp ca: chưa có ca mẫu cho buổi này (tạo ở mục Ca làm việc)")
    const created = rec(await http.post<Raw>(`${W}/shift-assignments`, { employeeId: str(employee.id), workShiftId: str(template.id), workDate: b.date }))
    return toShift(created, new Map([[str(employee.id), b.userId]]))
  },
  unassign: (): Promise<{ ok: true }> => unsupported("gỡ nhân viên khỏi ca"),
  async myShifts(): Promise<Shift[]> {
    const users = new Map<string, string>()
    return recs(itemsOf(await http.get<Raw[]>(`${W}/shift-assignments/mine`))).map((a) => ({ ...toShift(a, users), userId: tokenStore.get()?.user.id ?? "" }))
  },
  checkIn: async (id: string) => toShift(rec(await http.post<Raw>(`${W}/attendance/check-in`, { assignmentId: id })), new Map()),
  checkOut: async (id: string) => toShift(rec(await http.post<Raw>(`${W}/attendance/check-out`, { assignmentId: id })), new Map()),

  replacements: (): Promise<Replacement[]> => unsupported("danh sách ca thay đang mở (chưa có API liệt kê)"),
  async openReplacement(b: { shiftId: string; reason: string }): Promise<Replacement> {
    return toReplacement(rec(await http.post<Raw>(`${W}/replacement-shifts`, { assignmentId: b.shiftId, reason: b.reason })), await userIdByEmployee())
  },
  async apply(id: string): Promise<Replacement> {
    return toReplacement(rec(await http.post<Raw>(`${W}/replacement-shifts/${id}/register`, { note: "" })), await userIdByEmployee(), true)
  },
  async approve(id: string, userId: string): Promise<Replacement> {
    const users = await userIdByEmployee()
    const apps = recs(itemsOf(await http.get<Raw[]>(`${W}/replacement-shifts/${id}/applications`)))
    const hit = apps.find((a) => users.get(str(a.employeeId)) === userId)
    if (!hit) return unsupported("duyệt ca thay: không tìm thấy đơn đăng ký của nhân viên này")
    return toReplacement(rec(await http.post<Raw>(`${W}/replacement-shifts/${id}/approve`, { applicationId: str(hit.id), note: null })), users)
  },

  cashExpected: (): Promise<{ expected: number; closed: boolean }> => unsupported("xem số tiền mặt dự kiến trước khi chốt két (chỉ có sau khi gửi chốt ca)"),
  async cashClosings(): Promise<CashClosing[]> {
    const manager = tokenStore.get()?.user.role !== "Cashier"
    const list = itemsOf(await http.get<Raw[]>(`${W}/cash-closings${manager ? "" : "/mine"}`, manager ? { query: { pageSize: 50 } } : undefined))
    return recs(list).map((c) => ({
      id: str(c.id), date: (str(c.workDate) || str(c.createdAtUtc)).slice(0, 10), userName: str(c.cashierName) || str(c.employeeName),
      expected: num(c.expectedAmount), counted: num(c.countedAmount), variance: num(c.difference), reason: str(c.note),
    }))
  },
  async closeCash(b: { counted: number; reason: string }): Promise<CashClosing> {
    const mine = recs(itemsOf(await http.get<Raw[]>(`${W}/shift-assignments/mine`)))
    const open = mine.filter((a) => str(a.checkInAtUtc)).sort((x, y) => str(y.workDate).localeCompare(str(x.workDate)))[0]
    if (!open) return unsupported("chốt két: bạn chưa check-in ca nào")
    const c = rec(await http.post<Raw>(`${W}/cash-closings`, { assignmentId: str(open.id), countedAmount: b.counted, note: b.reason }))
    return { id: str(c.id), date: str(open.workDate).slice(0, 10), userName: str(open.employeeName), expected: num(c.expectedAmount), counted: num(c.countedAmount), variance: num(c.difference), reason: b.reason }
  },
}

async function loyaltyMe(): Promise<LoyaltyMe> {
  const [me, rules, vouchers] = await Promise.all([
    http.get<Raw>("/customers/me/loyalty"), http.get<Raw>("/customers/loyalty/rules").catch(() => ({} as Raw)), http.get<Raw[]>("/customers/me/vouchers", { query: { status: "Active", pageSize: 50 } }),
  ])
  const m = rec(me), r = rec(rules)
  const points = num(m.pointsBalance ?? m.points), silver = num(r.silverThreshold, 100), gold = num(r.goldThreshold, 500)
  const next = points < silver ? { name: "Silver", at: silver } : points < gold ? { name: "Gold", at: gold } : null
  return {
    points, tier: str(m.tier, "Member"), nextTier: next?.name ?? null, pointsToNext: next ? next.at - points : 0, redeemPoints: num(r.minPointsToRedeem, 10),
    vouchers: recs(itemsOf(vouchers)).map((v) => ({ id: str(v.id), code: str(v.code), title: `Voucher ${str(v.code)}`, value: num(v.value), expiresAtUtc: str(v.expiresAtUtc) })),
    history: recs(m.history ?? m.transactions).map((h) => ({ id: str(h.id), delta: num(h.points ?? h.delta), reason: str(h.note) || str(h.type), atUtc: str(h.createdAtUtc) || str(h.atUtc) })),
  }
}

export const beLoyaltyApi = {
  me: loyaltyMe,
  async redeem(): Promise<LoyaltyMe> {
    const rules = rec(await http.get<Raw>("/customers/loyalty/rules"))
    await http.post<Raw>("/customers/me/redemptions", { points: num(rules.minPointsToRedeem, 10) })
    return loyaltyMe()
  },
}

/** The backend has no notification inbox: show an empty one rather than an error. */
export const beNoticeApi = {
  mine: async (): Promise<Notice[]> => [],
  readAll: async (): Promise<{ ok: true }> => ({ ok: true }),
}
