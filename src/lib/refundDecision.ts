/**
 * Who may decide a refund that waits for approval (BR-30), mirroring `RefundEndpoints.ApproveAsync/RejectAsync` of the Payment service
 * so the screen only offers what the server will accept. The server checks again; these rules only explain the buttons.
 */
import type { Role } from "../router/roles"

/** Who the brand lets decide refund exceptions (cancellation policy, `exceptionApprover`). */
export type RefundApprover = "BranchManager" | "BrandAdmin"

export interface RefundForDecision { status: string; requestedBy: string | null }

export interface RefundDecision {
  canApprove: boolean
  canReject: boolean
  /** Why the buttons are off, shown next to them. Null when both are on. */
  reason: string | null
}

export function refundDecision(refund: RefundForDecision, approver: RefundApprover, me: { id: string | null; role: Role | null }): RefundDecision {
  if (refund.status !== "PendingApproval") return { canApprove: false, canReject: false, reason: null }
  const admin = me.role === "brandAdmin"
  if (!admin && me.role !== "branchManager") return { canApprove: false, canReject: false, reason: "Chỉ quản lý duyệt hoàn tiền." }
  if (approver === "BrandAdmin" && !admin) return { canApprove: false, canReject: false, reason: "Thương hiệu chỉ cho chủ thương hiệu duyệt hoàn tiền ngoại lệ." }
  // The person who asked for a refund cannot approve it; turning it down is allowed. The brand admin is not held to this.
  if (!admin && !!me.id && refund.requestedBy === me.id) return { canApprove: false, canReject: true, reason: "Bạn tạo yêu cầu này nên cần người khác duyệt." }
  return { canApprove: true, canReject: true, reason: null }
}

const REFUND_ERRORS: Record<string, string> = {
  "refund.approver_required": "Thương hiệu chỉ cho chủ thương hiệu duyệt hoàn tiền ngoại lệ.",
  "refund.self_approval": "Bạn không thể tự duyệt yêu cầu hoàn tiền do chính mình tạo.",
  "refund.not_pending": "Yêu cầu này đã được xử lý. Danh sách đã được tải lại.",
  "refund.exceeds_payment": "Giao dịch không còn đủ tiền để hoàn theo yêu cầu này. Yêu cầu đã được đánh dấu lỗi.",
}

/** Vietnamese for the Payment service's refusals; anything else keeps the server's message. */
export function refundErrorMessage(e: { message: string; code?: string }): string {
  return (e.code && REFUND_ERRORS[e.code]) || e.message
}

/** Pending first (oldest first, so nothing waits forever), then the decided ones, newest first. */
export function sortRefunds<T extends { status: string; createdAtUtc: string }>(rows: T[]): T[] {
  const pending = rows.filter((r) => r.status === "PendingApproval").sort((a, b) => a.createdAtUtc.localeCompare(b.createdAtUtc))
  const rest = rows.filter((r) => r.status !== "PendingApproval").sort((a, b) => b.createdAtUtc.localeCompare(a.createdAtUtc))
  return [...pending, ...rest]
}
