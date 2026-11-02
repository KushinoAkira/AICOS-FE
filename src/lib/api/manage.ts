import { http, downloadFile } from "./http"
import { itemsOf, type Raw } from "./be/util"

/** Real backend, management side: reports, staff records, attendance, cash closing, payroll, tables, reconciliation, audit. */

export const addDays = (day: string, n: number) => {
  const d = new Date(`${day}T00:00:00`)
  d.setDate(d.getDate() + n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}
export const today = () => addDays(new Date().toLocaleDateString("en-CA"), 0)

/** First and last day of a `yyyy-mm` month. */
export const monthRange = (month: string) => {
  const [y, m] = month.split("-").map(Number)
  const last = new Date(y!, m!, 0).getDate()
  return { from: `${month}-01`, to: `${month}-${String(last).padStart(2, "0")}` }
}

// ---------- reports
export interface RevenueTotals { orders: number; paidOrders: number; grossRevenue: number; refunded: number; netRevenue: number; averageOrderValue: number }
export interface BranchRevenue extends RevenueTotals { branchId: string; branchName: string; revenueShare: number }
export interface ChainReport { from: string; to: string; totals: RevenueTotals; branches: BranchRevenue[] }
export interface MethodRevenue { method: string; orders: number; grossRevenue: number; refunded: number; netRevenue: number; share: number }
export interface HourCount { hour: number; orders: number }
export interface DayRevenue { date: string; orders: number; grossRevenue: number }
export interface BranchReport {
  from: string; to: string; branchId: string; branchName: string; totals: RevenueTotals
  paymentMethods: MethodRevenue[]; orderTypes: { orderType: string; orders: number }[]; hours: HourCount[]; peakHours: HourCount[]; days: DayRevenue[]
}
export const reportApi = {
  chain: (q: { from: string; to: string }) => http.get<ChainReport>("/reporting/chain", { query: q }),
  branch: (q: { from: string; to: string; branchId?: string }) => http.get<BranchReport>("/reporting/branch", { query: q }),
  exportChain: (q: { from: string; to: string }) => downloadFile("/reporting/chain/export", q, `bao-cao-chuoi-${q.from}-${q.to}.csv`),
  exportBranch: (q: { from: string; to: string; branchId?: string }) => downloadFile("/reporting/branch/export", q, `bao-cao-chi-nhanh-${q.from}-${q.to}.csv`),
}

// ---------- staff records
export type ContractType = "FullTime" | "PartTime"
export interface Employee { id: string; branchId: string; userId: string; fullName: string; role: string; position: string | null; hireDate: string | null; contractType: ContractType; status: "Active" | "Inactive" }
export const employeeApi = {
  list: async () => itemsOf(await http.get<Employee[]>("/workforce/employees")),
  create: (b: { userId: string; branchId: string | null; fullName: string; position: string | null; hireDate: string | null; contractType: ContractType }) => http.post<Employee>("/workforce/employees", b),
  update: (id: string, b: { fullName: string; position: string | null; hireDate: string | null; contractType: ContractType }) => http.put<Employee>(`/workforce/employees/${id}`, b),
  setStatus: (id: string, status: Employee["status"]) => http.patch<Employee>(`/workforce/employees/${id}/status`, { status }),
}

// ---------- attendance
export interface AssignmentRow {
  id: string; branchId: string; employeeId: string; employeeName: string; shiftName: string; workDate: string; startTime: string; endTime: string
  isReplacement: boolean; checkInAtUtc: string | null; checkOutAtUtc: string | null; reviewStatus: "Unreviewed" | "Approved"; isAbsent: boolean
  adjustedCheckInAtUtc: string | null; adjustedCheckOutAtUtc: string | null; reviewNote: string | null; workedHours: number
}
export type AttendanceState = "Upcoming" | "InProgress" | "Worked" | "MissingCheckOut" | "NoShow" | string
export interface AttendanceRow { shift: AssignmentRow; state: AttendanceState; isLate: boolean; lateMinutes: number; leftEarly: boolean; scheduledHours: number; workedHours: number }
export interface AttendanceSummary { employeeId: string; employeeName: string; contractType: ContractType; shifts: number; scheduledHours: number; workedHours: number; lateCount: number; absences: number; noShows: number; pendingReview: number }
/** A shift template of the branch: what a row of the schedule is. */
export interface WorkShift { id: string; branchId: string; name: string; startTime: string; endTime: string; hours: number; isActive: boolean }
export const workShiftApi = {
  list: () => http.get<WorkShift[]>("/workforce/work-shifts"),
  save: (id: string | null, b: { name: string; startTime: string; endTime: string }) => (id ? http.put<WorkShift>(`/workforce/work-shifts/${id}`, b) : http.post<WorkShift>("/workforce/work-shifts", b)),
  setActive: (id: string, isActive: boolean) => http.patch<WorkShift>(`/workforce/work-shifts/${id}/status`, { isActive }),
}

export const attendanceApi = {
  report: (q: { from: string; to: string; employeeId?: string; reviewStatus?: string }) => http.get<{ from: string; to: string; rows: AttendanceRow[]; summary: AttendanceSummary[] }>("/workforce/attendance/report", { query: q }),
  approve: (id: string, note?: string) => http.post<Raw>(`/workforce/attendance/${id}/approve`, { note: note ?? null }),
  approveRange: (b: { from: string; to: string }) => http.post<{ approved: number; needsAttention: number }>("/workforce/attendance/approve-range", b),
  adjust: (id: string, b: { checkInAt: string | null; checkOutAt: string | null; reason: string }) => http.post<Raw>(`/workforce/attendance/${id}/adjust`, b),
  absent: (id: string, reason: string) => http.post<Raw>(`/workforce/attendance/${id}/absent`, { reason }),
}

// ---------- cash closing
export interface CashClosing {
  id: string; branchId: string; employeeName: string; workDate: string; startTime: string; endTime: string; expectedAmount: number; countedAmount: number; difference: number
  cashierNote: string | null; status: "PendingReview" | "Confirmed"; managerNote: string | null; submittedAtUtc: string; confirmedAtUtc: string | null
}
export interface CashClosingDetails {
  closing: CashClosing; cashReceived: number; cashRefunded: number
  cashTransactions: { orderId: string | null; amount: number; occurredAtUtc: string; isRefund: boolean }[]
  orderExceptions: Raw[]; unresolvedExceptions: number
}
export const cashClosingApi = {
  list: async () => itemsOf(await http.get<CashClosing[]>("/workforce/cash-closings")),
  details: (id: string) => http.get<CashClosingDetails>(`/workforce/cash-closings/${id}/details`),
  confirm: (id: string, b: { note: string | null; acknowledgeExceptions: boolean }) => http.post<CashClosing>(`/workforce/cash-closings/${id}/confirm`, b),
}

// ---------- payroll
export interface PayrollLine {
  employeeId: string; employeeName: string; branchId: string; contractType: ContractType; workedDays: number; regularHours: number; overtimeHours: number; replacementHours: number
  absences: number; unreviewedRecords: number; basePay: number; overtimePay: number; replacementPay: number; adjustments: number; totalPay: number
}
export interface PayrollSummary {
  from: string; to: string
  rules: { isConfigured: boolean }
  lines: PayrollLine[]
  totals: { basePay: number; overtimePay: number; replacementPay: number; adjustments: number; totalPay: number; unreviewedRecords: number }
}
export interface PayrollAdjustment { id: string; employeeId: string; employeeName: string; workDate: string; amount: number; reason: string; createdAtUtc: string }
export const payrollApi = {
  summary: (q: { from: string; to: string }) => http.get<PayrollSummary>("/workforce/payroll/summary", { query: q }),
  exportSummary: (q: { from: string; to: string }) => downloadFile("/workforce/payroll/export", { ...q, format: "xlsx" }, `bang-luong-${q.from}.xlsx`),
  exportRecords: (q: { from: string; to: string }) => downloadFile("/workforce/payroll/records/export", { ...q, format: "xlsx" }, `cham-cong-${q.from}.xlsx`),
  adjustments: async (q: { from: string; to: string; employeeId?: string }) => itemsOf(await http.get<PayrollAdjustment[]>("/workforce/payroll/adjustments", { query: q })),
  addAdjustment: (b: { employeeId: string; workDate: string; amount: number; reason: string }) => http.post<PayrollAdjustment>("/workforce/payroll/adjustments", b),
  removeAdjustment: (id: string) => http.delete<void>(`/workforce/payroll/adjustments/${id}`),
}

// ---------- tables and areas
export interface Area { id: string; branchId: string; name: string; sortOrder: number; tableCount: number }
/** What the plan of the brand allows; null is unlimited. */
export interface PlanLimits { hasPlan: boolean; planName: string | null; maxBranches: number | null; maxStaffAccounts: number | null; maxTablesPerBranch: number | null }
export const planLimitsApi = { get: () => http.get<PlanLimits>("/identity/subscription/limits") }

export interface DiningTable { id: string; branchId: string; areaId: string; areaName: string; tableCode: string; capacity: number; positionX: number | null; positionY: number | null; status: "Available" | "Occupied" | "OutOfService"; qrToken: string; qrIssuedAtUtc: string }
/** One table to create: the area by id (generate) or by name (CSV, where a new name creates it). */
export interface TableBatchRow { areaId?: string; areaName?: string; tableCode: string; capacity: number; positionX?: number; positionY?: number }

/** A Brand Admin names the branch; a manager always works on their own. */
export const tableApi = {
  list: async (branchId?: string) => itemsOf(await http.get<DiningTable[]>("/tables/dining-tables", { query: { branchId } })),
  areas: async (branchId?: string) => itemsOf(await http.get<Area[]>("/tables/areas", { query: { branchId } })),
  addArea: (name: string, branchId?: string) => http.post<Area>("/tables/areas", { branchId, name, sortOrder: 0 }),
  cloneFloorPlan: (fromBranchId: string, toBranchIds: string[]) => http.post<{ branches: { branchId: string; tables: number; areasCreated: number }[] }>("/tables/floor-plan/clone", { fromBranchId, toBranchIds }),
  saveLayout: (positions: { tableId: string; positionX: number; positionY: number }[], branchId?: string) => http.put<{ moved: number }>("/tables/floor-plan/layout", { branchId, positions }),
  batch: (rows: TableBatchRow[], branchId?: string) => http.post<{ created: number; areasCreated: number; tables: DiningTable[] }>("/tables/dining-tables/batch", { branchId, rows }),
  removeArea: (id: string) => http.delete<void>(`/tables/areas/${id}`),
  create: (b: { branchId?: string; areaId: string; tableCode: string; capacity: number }) => http.post<DiningTable>("/tables/dining-tables", b),
  update: (id: string, b: { areaId: string; tableCode: string; capacity: number }) => http.put<DiningTable>(`/tables/dining-tables/${id}`, b),
  setStatus: (id: string, status: DiningTable["status"]) => http.patch<DiningTable>(`/tables/dining-tables/${id}/status`, { status }),
  regenerateQr: (id: string) => http.post<DiningTable>(`/tables/dining-tables/${id}/qr/regenerate`, {}),
  remove: (id: string) => http.delete<void>(`/tables/dining-tables/${id}`),
}

// ---------- reconciliation and refunds
export interface Discrepancy { code: string; message: string; paymentId: string | null; orderId: string | null; amount: number | null }
export interface ReconciliationReport {
  from: string; to: string; paymentCount: number; paidCount: number; gross: number; refunded: number; net: number; refundsPendingApproval: number
  byMethod: { method: string; count: number; gross: number; refunded: number; net: number }[]
  byStatus: Record<string, number>
  discrepancies: Discrepancy[]
}
export interface Refund { id: string; paymentId: string; branchId: string; orderId: string; amount: number; kind: string; reason: string; status: string; withinPolicy: boolean; decisionNote: string | null; createdAtUtc: string }
export const reconciliationApi = {
  report: (q: { from: string; to: string }) => http.get<ReconciliationReport>("/payments/reconciliation", { query: q }),
  auto: (q: { from: string; to: string }) => http.get<{ orders: number; matched: number; discrepancies: Discrepancy[] }>("/payments/reconciliation/auto", { query: q }),
  refunds: async () => itemsOf(await http.get<Refund[]>("/payments/refunds")),
  approveRefund: (id: string, note: string) => http.post<Refund>(`/payments/refunds/${id}/approve`, { note }),
  rejectRefund: (id: string, note: string) => http.post<Refund>(`/payments/refunds/${id}/reject`, { note }),
}

// ---------- audit
export interface AuditEntry { id: string; actorName: string | null; actorRole: string | null; action: string; entityType: string; entityId: string | null; before: unknown; after: unknown; occurredAtUtc: string }
export const auditApi = {
  list: (q: { page: number; pageSize: number; action?: string; entityType?: string; from?: string; to?: string }) =>
    http.get<{ items: AuditEntry[]; page: number; pageSize: number; totalCount: number }>("/identity/audit-logs", { query: q }),
}

// ---------- the brand's own invoices
export interface Invoice { id: string; amount: number; paidAtUtc: string; method: string; reference: string | null; periodStartUtc: string }
export const invoiceApi = {
  list: async () => itemsOf(await http.get<Invoice[]>("/identity/subscription/payments")),
}

/** One device a person is signed in on. Only the person's own sessions are ever returned. */
export interface DeviceSession {
  id: string
  device: string | null
  ipAddress: string | null
  createdAtUtc: string
  lastActiveAtUtc: string
  isCurrent: boolean
}

export const sessionApi = {
  list: () => http.get<DeviceSession[]>("/identity/auth/sessions"),
  revoke: (id: string) => http.delete<void>(`/identity/auth/sessions/${id}`),
  revokeOthers: () => http.post<{ revoked: number }>("/identity/auth/sessions/revoke-others", {}),
}

export interface StaffNotice {
  id: string
  kind: string
  title: string
  body: string
  createdAtUtc: string
  isRead: boolean
}

const STAFF_NOTICES = "/customers/staff/notifications"

export const staffNoticeApi = {
  list: async (unreadOnly: boolean) => itemsOf(await http.get<StaffNotice[]>(STAFF_NOTICES, { query: { pageSize: 50, unreadOnly: unreadOnly || undefined } })) as StaffNotice[],
  unread: async () => (await http.get<{ unread: number }>(`${STAFF_NOTICES}/unread-count`)).unread,
  read: (id: string) => http.post<void>(`${STAFF_NOTICES}/${id}/read`, {}),
  readAll: () => http.post<{ unread: number }>(`${STAFF_NOTICES}/read-all`, {}),
}
