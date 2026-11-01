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

/** A replacement shift as the backend lists it; `applicants` come from the separate applications call (managers only). */
function toReplacement(r: Raw, users: Map<string, string>, applicants: Raw[] = []): Replacement {
  const mine = str(r.myApplication)
  return {
    id: str(r.id), reason: str(r.reason), status: str(r.status) === "Filled" ? "filled" : "open",
    shift: { id: str(r.originalAssignmentId) || str(r.id), date: str(r.workDate).slice(0, 10), period: periodOf(str(r.startTime, "07:00")), userId: "", userName: str(r.originalEmployeeName), branchId: str(r.branchId), checkInAtUtc: null, checkOutAtUtc: null },
    applicants: applicants.filter((x) => str(x.status) === "Pending").map((x) => ({ userId: users.get(str(x.employeeId)) ?? str(x.employeeId), name: str(x.employeeName), branchName: "" })),
    filledBy: str(r.approvedEmployeeName) || undefined, applied: mine === "Pending" || mine === "Approved",
  }
}

const addDays = (from: string, n: number) => { const d = new Date(`${from}T00:00:00`); d.setDate(d.getDate() + n); return ymd(d) }

/** The most recent shift the signed-in employee has checked in to. */
async function lastWorkedAssignment(): Promise<Raw | undefined> {
  const mine = recs(itemsOf(await http.get<Raw[]>(`${W}/shift-assignments/mine`)))
  return mine.filter((a) => str(a.checkInAtUtc)).sort((x, y) => str(y.workDate).localeCompare(str(x.workDate)))[0]
}

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
  async unassign(id: string): Promise<{ ok: true }> {
    await http.delete<Raw>(`${W}/shift-assignments/${id}`)
    return { ok: true }
  },
  async myShifts(): Promise<Shift[]> {
    const users = new Map<string, string>()
    return recs(itemsOf(await http.get<Raw[]>(`${W}/shift-assignments/mine`))).map((a) => ({ ...toShift(a, users), userId: tokenStore.get()?.user.id ?? "" }))
  },
  checkIn: async (id: string) => toShift(rec(await http.post<Raw>(`${W}/attendance/check-in`, { assignmentId: id })), new Map()),
  checkOut: async (id: string) => toShift(rec(await http.post<Raw>(`${W}/attendance/check-out`, { assignmentId: id })), new Map()),

  /** Staff see the open shifts of their branch; managers see every status, so cancelled ones are dropped here. */
  async replacements(): Promise<Replacement[]> {
    const manager = tokenStore.get()?.user.role !== "Cashier" && tokenStore.get()?.user.role !== "Barista"
    const [list, users] = await Promise.all([http.get<Raw[]>(`${W}/replacement-shifts`), userIdByEmployee().catch(() => new Map<string, string>())])
    const rows = recs(itemsOf(list)).filter((r) => str(r.status) !== "Cancelled")
    return Promise.all(rows.map(async (r) => {
      const applicants = manager && str(r.status) === "Open" && num(r.applications) > 0 ? recs(itemsOf(await http.get<Raw[]>(`${W}/replacement-shifts/${str(r.id)}/applications`))) : []
      return toReplacement(r, users, applicants)
    }))
  },
  async openReplacement(b: { shiftId: string; reason: string }): Promise<Replacement> {
    return toReplacement(rec(await http.post<Raw>(`${W}/replacement-shifts`, { assignmentId: b.shiftId, reason: b.reason })), await userIdByEmployee())
  },
  async apply(id: string): Promise<Replacement> {
    return { ...toReplacement(rec(await http.post<Raw>(`${W}/replacement-shifts/${id}/register`, { note: "" })), new Map()), applied: true }
  },
  async approve(id: string, userId: string): Promise<Replacement> {
    const users = await userIdByEmployee()
    const apps = recs(itemsOf(await http.get<Raw[]>(`${W}/replacement-shifts/${id}/applications`)))
    const hit = apps.find((a) => users.get(str(a.employeeId)) === userId)
    if (!hit) return unsupported("duyệt ca thay: không tìm thấy đơn đăng ký của nhân viên này")
    return toReplacement(rec(await http.post<Raw>(`${W}/replacement-shifts/${id}/approve`, { applicationId: str(hit.id), note: null })), users)
  },

  /** The cash the system expects in the drawer for the shift the cashier last checked in to, and whether that shift is already closed. */
  async cashExpected(): Promise<{ expected: number; closed: boolean }> {
    const open = await lastWorkedAssignment()
    if (!open) return { expected: 0, closed: false }
    const closings = recs(itemsOf(await http.get<Raw[]>(`${W}/cash-closings/mine`)))
    if (closings.some((c) => str(c.assignmentId) === str(open.id))) return { expected: 0, closed: true }
    const e = rec(await http.get<Raw>(`${W}/cash-closings/expected`, { query: { assignmentId: str(open.id) } }))
    return { expected: num(e.expectedAmount), closed: false }
  },
  async cashClosings(): Promise<CashClosing[]> {
    const manager = tokenStore.get()?.user.role !== "Cashier"
    const list = itemsOf(await http.get<Raw[]>(`${W}/cash-closings${manager ? "" : "/mine"}`, manager ? { query: { pageSize: 50 } } : undefined))
    return recs(list).map((c) => ({
      id: str(c.id), date: (str(c.workDate) || str(c.createdAtUtc)).slice(0, 10), userName: str(c.cashierName) || str(c.employeeName),
      expected: num(c.expectedAmount), counted: num(c.countedAmount), variance: num(c.difference), reason: str(c.note),
    }))
  },
  async closeCash(b: { counted: number; reason: string }): Promise<CashClosing> {
    const open = await lastWorkedAssignment()
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
