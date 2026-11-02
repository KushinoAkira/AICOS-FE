import { http } from "../http"
import { pickClosingShift } from "../../closingShift"
import { shiftLabel, type CashClosing, type CashExpected, type LoyaltyMe, type Notice, type Period, type Replacement, type Shift } from "../staff"
import { tokenStore } from "../tokenStore"
import { bool, itemsOf, num, rec, recs, str, unsupported, ymd, type Raw } from "./util"

/** Real backend, workforce + customer loyalty (reference sections 4 and 8). */
const W = "/workforce"

const periodOf = (startTime: string): Period => (Number(startTime.slice(0, 2)) < 12 ? "morning" : "afternoon")

async function userIdByEmployee(): Promise<Map<string, string>> {
  const list = recs(itemsOf(await http.get<Raw[]>(`${W}/employees`)))
  return new Map(list.map((e) => [str(e.id), str(e.userId)]))
}

/** The times that count: a manager's correction wins over what the employee tapped, and an absence has none. */
const workedTimes = (a: Raw) => (bool(a.isAbsent)
  ? { checkInAtUtc: null, checkOutAtUtc: null }
  : { checkInAtUtc: str(a.adjustedCheckInAtUtc) || str(a.checkInAtUtc) || null, checkOutAtUtc: str(a.adjustedCheckOutAtUtc) || str(a.checkOutAtUtc) || null })

const templateOf = (a: Raw) => ({ workShiftId: str(a.workShiftId) || undefined, shiftName: str(a.shiftName) || undefined, startTime: str(a.startTime).slice(0, 5) || undefined, endTime: str(a.endTime).slice(0, 5) || undefined })

function toShift(a: Raw, users: Map<string, string>): Shift {
  const employeeId = str(a.employeeId)
  return {
    id: str(a.id), date: str(a.workDate).slice(0, 10), period: periodOf(str(a.startTime, "07:00")), ...templateOf(a), userId: users.get(employeeId) ?? employeeId,
    userName: str(a.employeeName), branchId: str(a.branchId), ...workedTimes(a), reviewed: str(a.reviewStatus) === "Approved", absent: bool(a.isAbsent),
  }
}

/** A replacement shift as the backend lists it; `applicants` come from the separate applications call (managers only). */
function toReplacement(r: Raw, users: Map<string, string>, applicants: Raw[] = []): Replacement {
  const mine = str(r.myApplication)
  return {
    id: str(r.id), reason: str(r.reason), status: str(r.status) === "Filled" ? "filled" : "open",
    shift: { id: str(r.originalAssignmentId) || str(r.id), date: str(r.workDate).slice(0, 10), period: periodOf(str(r.startTime, "07:00")), ...templateOf(r), userId: "", userName: str(r.originalEmployeeName), branchId: str(r.branchId), checkInAtUtc: null, checkOutAtUtc: null },
    applicants: applicants.filter((x) => str(x.status) === "Pending").map((x) => ({ userId: users.get(str(x.employeeId)) ?? str(x.employeeId), name: str(x.employeeName), branchName: "" })),
    filledBy: str(r.approvedEmployeeName) || undefined, applied: mine === "Pending" || mine === "Approved",
  }
}

const addDays = (from: string, n: number) => { const d = new Date(`${from}T00:00:00`); d.setDate(d.getDate() + n); return ymd(d) }

/** The shift whose cash the signed-in cashier closes next, among the ones they checked in to. */
async function closingAssignment() {
  const [mine, closings] = await Promise.all([http.get<Raw[]>(`${W}/shift-assignments/mine`), http.get<Raw[]>(`${W}/cash-closings/mine`, { query: { pageSize: 100 } })])
  const shifts = recs(itemsOf(mine)).map((a) => ({ ...a, id: str(a.id), employeeName: str(a.employeeName), workDate: str(a.workDate), startTime: str(a.startTime), ...workedTimes(a) }))
  return pickClosingShift(shifts, recs(itemsOf(closings)).map((c) => str(c.assignmentId)))
}

export const beStaffApi = {
  /** Manager roster: the attendance report lists every assignment of the week. */
  async shifts(from: string): Promise<Shift[]> {
    const [report, users] = await Promise.all([http.get<Raw>(`${W}/attendance/report`, { query: { from, to: addDays(from, 6) } }), userIdByEmployee()])
    // Each row of the report wraps the assignment; declined and replaced ones no longer belong on the roster.
    return recs(rec(report).rows).map((r) => rec(r.shift)).filter((a) => ["Assigned", "Confirmed"].includes(str(a.status))).map((a) => toShift(a, users))
  },
  async assign(b: { date: string; period: Period; userId: string; workShiftId?: string }): Promise<Shift> {
    const [employees, shifts] = await Promise.all([http.get<Raw[]>(`${W}/employees`), http.get<Raw[]>(`${W}/work-shifts`)])
    const employee = recs(itemsOf(employees)).find((e) => str(e.userId) === b.userId)
    if (!employee) return unsupported("xếp ca: nhân viên này chưa có hồ sơ nhân sự (tạo ở mục Hồ sơ nhân sự)")
    const template = recs(itemsOf(shifts)).find((s) => (b.workShiftId ? str(s.id) === b.workShiftId : periodOf(str(s.startTime, "07:00")) === b.period && s.isActive !== false))
    if (!template) return unsupported("xếp ca: chưa có ca mẫu cho buổi này (tạo ở mục Lịch làm việc)")
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

  /** The cash the system expects in the drawer for the shift to close next: the running one first, so a second shift of the day is not blocked by the first. */
  async cashExpected(): Promise<CashExpected> {
    const { shift, allClosed } = await closingAssignment()
    if (!shift) return { expected: 0, closed: allClosed, noShift: !allClosed }
    const e = rec(await http.get<Raw>(`${W}/cash-closings/expected`, { query: { assignmentId: shift.id } }))
    return { expected: num(e.expectedAmount), closed: false, shiftLabel: shiftLabel({ period: periodOf(shift.startTime), ...templateOf(shift) }) }
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
    const { shift: open } = await closingAssignment()
    if (!open) return unsupported("chốt két: bạn chưa vào ca nào, hoặc các ca đã chốt hết")
    const c = rec(await http.post<Raw>(`${W}/cash-closings`, { assignmentId: open.id, countedAmount: b.counted, note: b.reason }))
    return { id: str(c.id), date: open.workDate.slice(0, 10), userName: str(open.employeeName), expected: num(c.expectedAmount), counted: num(c.countedAmount), variance: num(c.difference), reason: b.reason }
  },
}

async function loyaltyMe(): Promise<LoyaltyMe> {
  const [me, vouchers] = await Promise.all([
    http.get<Raw>("/customers/me/loyalty"), http.get<Raw[]>("/customers/me/vouchers", { query: { status: "Active", pageSize: 50 } }),
  ])
  const m = rec(me)
  const points = num(m.pointsBalance), tier = str(m.tier, "Member")
  return {
    points, tier, nextTier: m.nextTierAt == null ? null : tier === "Member" ? "Silver" : "Gold", pointsToNext: num(m.pointsToNextTier), redeemPoints: num(m.minPointsToRedeem, 10),
    vouchers: recs(itemsOf(vouchers)).map((v) => ({ id: str(v.id), code: str(v.code), title: `Voucher ${str(v.code)}`, value: num(v.value), expiresAtUtc: str(v.expiresAtUtc) })),
    history: recs(rec(m.history).items).map((h) => ({ id: str(h.id), delta: num(h.points), reason: str(h.note) || str(h.type), atUtc: str(h.createdAtUtc) })),
  }
}

export const beLoyaltyApi = {
  me: loyaltyMe,
  async redeem(): Promise<LoyaltyMe> {
    const me = rec(await http.get<Raw>("/customers/me/loyalty"))
    await http.post<Raw>("/customers/me/redemptions", { points: num(me.minPointsToRedeem, 10) })
    return loyaltyMe()
  },
}

/** The customer's inbox at the chosen brand. */
export const beNoticeApi = {
  async mine(): Promise<Notice[]> {
    return recs(itemsOf(await http.get<Raw[]>("/customers/me/notifications", { query: { pageSize: 50 } }))).map((n) => ({
      id: str(n.id), title: str(n.title), body: str(n.body), atUtc: str(n.createdAtUtc), read: !!str(n.readAtUtc),
    } as Notice))
  },
  async readAll(): Promise<{ ok: true }> {
    await http.post<Raw>("/customers/me/notifications/read-all", {})
    return { ok: true }
  },
}
