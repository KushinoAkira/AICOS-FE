import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { Page } from "../../App"
import { CustomerFrame } from "../../components/CustomerFrame"
import { Button, EmptyState, QueryBoundary } from "../../components/ui"
import { noticeApi } from "../../lib/api/staff"
import { pollWhile, useMemberRealtime } from "../../lib/realtime"
import { formatDateTime } from "../../lib/format"

export default function CustomerNotifications({ navigate }: { navigate: (p: Page) => void }) {
  const qc = useQueryClient()
  const live = useMemberRealtime()
  const list = useQuery({ queryKey: ["notices"], queryFn: noticeApi.mine, refetchInterval: pollWhile(live, 15000) })
  const readAll = useMutation({ mutationFn: noticeApi.readAll, onSuccess: () => void qc.invalidateQueries({ queryKey: ["notices"] }) })
  const unread = (list.data ?? []).filter((n) => !n.read).length
  return (
    <CustomerFrame
      page="customer-notifications" navigate={navigate} uc="UC-59" title="Thông báo"
      subtitle={list.data?.length ? (unread ? `${unread} thông báo chưa đọc` : "Bạn đã đọc hết") : undefined}
      action={unread > 0 ? <Button variant="secondary" loading={readAll.isPending} onClick={() => readAll.mutate()}>Đánh dấu đã đọc</Button> : undefined}
    >
      <QueryBoundary query={list}>
        {(rows) => rows.length === 0 ? <EmptyState title="Chưa có thông báo" description="Trạng thái đơn và ưu đãi sẽ hiện ở đây." /> : (
          <ul className="divide-y divide-border overflow-hidden rounded-[16px] border border-border bg-surface">
            {rows.map((n) => (
              <li key={n.id} className={`flex gap-3 px-5 py-4 ${n.read ? "" : "bg-sand/50"}`}>
                <span aria-hidden className={`mt-2 h-2 w-2 shrink-0 rounded-full ${n.read ? "bg-transparent" : "bg-terracotta"}`} />
                <div className="min-w-0">
                  <p className={`text-text-primary ${n.read ? "" : "font-medium"}`}>{n.title}{!n.read && <span className="sr-only"> (chưa đọc)</span>}</p>
                  <p className="mt-0.5 text-sm text-text-secondary">{n.body}</p>
                  <p className="mt-1 text-xs text-text-secondary">{formatDateTime(n.atUtc)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </QueryBoundary>
    </CustomerFrame>
  )
}
