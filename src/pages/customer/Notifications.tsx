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
  return (
    <CustomerFrame page="customer-notifications" navigate={navigate} uc="UC-59" title="Thông báo">
      <QueryBoundary query={list}>
        {(rows) => rows.length === 0 ? <EmptyState title="Chưa có thông báo" description="Trạng thái đơn và ưu đãi sẽ hiện ở đây." /> : (
          <>
            <Button variant="secondary" className="mb-4" loading={readAll.isPending} disabled={rows.every((n) => n.read)} onClick={() => readAll.mutate()}>Đánh dấu đã đọc</Button>
            <ul className="space-y-3">{rows.map((n) => <li key={n.id} className={`rounded-[14px] border p-4 ${n.read ? "border-border bg-surface" : "border-clay bg-sand"}`}><p className="font-medium text-text-primary">{n.title}</p><p className="text-sm text-text-secondary">{n.body}</p><p className="mt-1 text-xs text-text-secondary">{formatDateTime(n.atUtc)}</p></li>)}</ul>
          </>
        )}
      </QueryBoundary>
    </CustomerFrame>
  )
}