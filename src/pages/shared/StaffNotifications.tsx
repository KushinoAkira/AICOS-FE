import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { Page } from "../../App"
import { PageFrame } from "../../components/PageFrame"
import { Button, EmptyState, QueryBoundary } from "../../components/ui"
import { useAuth } from "../../context/AuthContext"
import { staffNoticeApi, type StaffNotice } from "../../lib/api/manage"
import { formatDateTime } from "../../lib/format"

/** Where a notification leads, so the person can act on it right away. */
function targetOf(kind: string, role: string | null): Page | null {
  switch (kind) {
    case "NewOrder":
    case "Remake": return "barista-queue"
    case "TableOrder":
    case "BillRequested":
    case "OnlinePaid": return "cashier-tables"
    case "OrderReady": return "cashier-serve"
    case "ReplacementOpened": return "cashier-shift"
    case "ReplacementRegistered": return "branch-shift-requests"
    case "CashClosing": return "branch-cash-closings"
    case "RefundRequested":
    case "RefundFailed": return role === "brandAdmin" ? "brand-reconciliation" : "branch-orders"
    case "RenewalDue": return "brand-subscription"
    case "Overdue": return role === "superAdmin" ? "platform-subscriptions" : "brand-subscription"
    case "BrandRegistered": return "platform-tenants"
    default: return null
  }
}

/** UC-59 for the people working in a brand: what concerns their role and branch, read one by one or all at once. */
export default function StaffNotifications({ navigate }: { navigate: (p: Page) => void }) {
  const qc = useQueryClient()
  const { role } = useAuth()
  const [unreadOnly, setUnreadOnly] = useState(false)
  const list = useQuery({ queryKey: ["staff-notices", "list", unreadOnly], queryFn: () => staffNoticeApi.list(unreadOnly), refetchInterval: 15_000 })
  const refresh = () => void qc.invalidateQueries({ queryKey: ["staff-notices"] })
  const read = useMutation({ mutationFn: staffNoticeApi.read, onSuccess: refresh })
  const readAll = useMutation({ mutationFn: staffNoticeApi.readAll, onSuccess: refresh })

  function open(n: StaffNotice) {
    if (!n.isRead) read.mutate(n.id)
    const target = targetOf(n.kind, role)
    if (target) navigate(target)
  }

  const tabClass = (on: boolean) => `min-h-10 rounded-full border px-4 text-sm ${on ? "border-espresso bg-espresso text-white" : "border-border bg-surface text-text-primary"}`
  return (
    <PageFrame
      page="staff-notifications"
      navigate={navigate}
      uc="UC-59"
      title="Thông báo"
      subtitle="Việc cần bạn xử lý theo vai trò và chi nhánh. Tự làm mới mỗi 15 giây."
      action={<Button variant="secondary" loading={readAll.isPending} onClick={() => readAll.mutate()}>Đánh dấu đã đọc tất cả</Button>}
    >
      <div role="tablist" aria-label="Lọc thông báo" className="mb-4 flex gap-2">
        <button role="tab" aria-selected={!unreadOnly} className={tabClass(!unreadOnly)} onClick={() => setUnreadOnly(false)}>Tất cả</button>
        <button role="tab" aria-selected={unreadOnly} className={tabClass(unreadOnly)} onClick={() => setUnreadOnly(true)}>Chưa đọc</button>
      </div>
      <QueryBoundary query={list}>
        {(rows) => rows.length === 0
          ? <EmptyState title={unreadOnly ? "Bạn đã đọc hết thông báo" : "Chưa có thông báo"} description="Đơn mới, yêu cầu duyệt và cảnh báo sẽ hiện ở đây." />
          : (
            <ul className="space-y-3">
              {rows.map((n) => (
                <li key={n.id}>
                  <button onClick={() => open(n)} className={`w-full rounded-[14px] border p-4 text-left ${n.isRead ? "border-border bg-surface" : "border-clay bg-sand"}`}>
                    <span className="flex items-start justify-between gap-3">
                      <span className="font-medium text-text-primary">{n.title}</span>
                      <span className="shrink-0 text-xs text-text-secondary">{formatDateTime(n.createdAtUtc)}</span>
                    </span>
                    <span className="mt-1 block text-sm text-text-secondary">{n.body}</span>
                    {!n.isRead && <span className="sr-only">Chưa đọc</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
      </QueryBoundary>
    </PageFrame>
  )
}
