import { env } from "../../config/env"
import { beLoyaltyApi, beNoticeApi, beStaffApi } from "./be/staff"
import { http } from "./http"

export type Period = "morning" | "afternoon"
export const PERIOD_LABEL: Record<Period, string> = { morning: "Ca sáng (07:00-14:30)", afternoon: "Ca chiều (14:30-22:00)" }

export interface Shift { id: string; date: string; period: Period; workShiftId?: string; shiftName?: string; startTime?: string; endTime?: string; userId: string; userName: string; branchId: string; checkInAtUtc: string | null; checkOutAtUtc: string | null; reviewed?: boolean; absent?: boolean
  /** An approved colleague works it instead: it is no longer this person's to work. */
  replaced?: boolean }
/** The name and hours of the template the shift came from. */
export const shiftLabel = (s: Pick<Shift, "period" | "shiftName" | "startTime" | "endTime">) =>
  (s.shiftName ? `${s.shiftName} (${s.startTime}-${s.endTime})` : PERIOD_LABEL[s.period])

export interface Applicant { userId: string; name: string; branchName: string }
export interface Replacement { id: string; shift: Shift; reason: string; status: "open" | "filled"; applicants: Applicant[]; filledBy?: string; applied: boolean
  /** How many colleagues signed up, waiting for the manager. */
  applications?: number }

/** The shift of a replacement has ended (it can no longer be taken). Times are shop time, as shown. */
export const replacementOver = (r: Replacement, now = new Date()) => new Date(`${r.shift.date}T${r.shift.endTime ?? "23:59"}:00`) <= now
export interface CashClosing { id: string; date: string; userName: string; expected: number; counted: number; variance: number; reason: string }

export interface LoyaltyVoucher { id: string; code: string; title: string; value: number; expiresAtUtc: string }
export interface LoyaltyMe { points: number; tier: string; nextTier: string | null; pointsToNext: number; redeemPoints: number; vouchers: LoyaltyVoucher[]; history: { id: string; delta: number; reason: string; atUtc: string }[] }
export interface Notice { id: string; title: string; body: string; atUtc: string; read: boolean }

/** What the cashier closes next. `noShift`: they have not checked in to any shift yet. */
export interface CashExpected { expected: number; closed: boolean; noShift?: boolean; shiftLabel?: string }

const S = "/api/v1/staff"
const mockStaffApi = {
  shifts: (from: string) => http.get<Shift[]>(`${S}/shifts?from=${from}`),
  assign: (b: { date: string; period: Period; userId: string; workShiftId?: string }) => http.post<Shift>(`${S}/shifts`, b),
  unassign: (id: string) => http.delete<{ ok: true }>(`${S}/shifts/${id}`),
  myShifts: () => http.get<Shift[]>(`${S}/my-shifts`),
  checkIn: (id: string) => http.post<Shift>(`${S}/shifts/${id}/check-in`, {}),
  checkOut: (id: string) => http.post<Shift>(`${S}/shifts/${id}/check-out`, {}),
  replacements: () => http.get<Replacement[]>(`${S}/replacements`),
  openReplacement: (b: { shiftId: string; reason: string }) => http.post<Replacement>(`${S}/replacements`, b),
  apply: (id: string) => http.post<Replacement>(`${S}/replacements/${id}/apply`, {}),
  /** The requester takes back their own request while nobody is approved. */
  retract: (id: string) => http.post<Replacement>(`${S}/replacements/${id}/retract`, {}),
  approve: (id: string, userId: string) => http.post<Replacement>(`${S}/replacements/${id}/approve`, { userId }),
  cashExpected: () => http.get<CashExpected>(`${S}/cash/expected`),
  cashClosings: () => http.get<CashClosing[]>(`${S}/cash/closings`),
  closeCash: (b: { counted: number; reason: string }) => http.post<CashClosing>(`${S}/cash/close`, b),
}
const mockLoyaltyApi = {
  me: () => http.get<LoyaltyMe>("/api/v1/loyalty/me"),
  redeem: () => http.post<LoyaltyMe>("/api/v1/loyalty/redeem", {}),
}
const mockNoticeApi = {
  mine: () => http.get<Notice[]>("/api/v1/notifications/mine"),
  readAll: () => http.post<{ ok: true }>("/api/v1/notifications/read-all", {}),
}

/** Mock data in demo mode, the real gateway otherwise. */
export const staffApi: typeof mockStaffApi = env.useMock ? mockStaffApi : beStaffApi
export const loyaltyApi: typeof mockLoyaltyApi = env.useMock ? mockLoyaltyApi : beLoyaltyApi
export const noticeApi: typeof mockNoticeApi = env.useMock ? mockNoticeApi : beNoticeApi
