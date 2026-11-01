import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import type { Page } from "../../App"
import { PageFrame } from "../../components/PageFrame"
import { Button, DataTable, Field, Modal, QueryBoundary, type Column } from "../../components/ui"
import { auditApi, type AuditEntry } from "../../lib/api/manage"
import { formatDateTime } from "../../lib/format"

const PAGE_SIZE = 20

/** UC-11: the brand's audit history: who changed what. Read only (NFR-12). */
export default function AdminSystemLogs({ navigate }: { navigate: (p: Page) => void }) {
  const [page, setPage] = useState(1)
  const [action, setAction] = useState("")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [open, setOpen] = useState<AuditEntry | null>(null)
  const query = { page, pageSize: PAGE_SIZE, action: action.trim() || undefined, from: from ? `${from}T00:00:00` : undefined, to: to ? `${to}T23:59:59` : undefined }
  const logs = useQuery({ queryKey: ["audit", query], queryFn: () => auditApi.list(query) })
  const reset = () => setPage(1)
  const columns: Column<AuditEntry>[] = [
    { key: "t", header: "Thời gian", render: (a) => formatDateTime(a.occurredAtUtc) },
    { key: "w", header: "Người thực hiện", render: (a) => <span className="text-text-primary">{a.actorName ?? "Hệ thống"}<span className="block text-xs text-text-secondary">{a.actorRole ?? ""}</span></span> },
    { key: "a", header: "Hành động", render: (a) => <code className="text-xs text-text-primary">{a.action}</code> },
    { key: "e", header: "Đối tượng", render: (a) => a.entityType },
    { key: "d", header: "", className: "text-right", render: (a) => <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => setOpen(a)}>Chi tiết</Button> },
  ]
  return (
    <PageFrame page="admin-logs" navigate={navigate} uc="UC-11" title="Nhật ký" subtitle="Lịch sử các thay đổi quan trọng trong thương hiệu. Không thể sửa hay xóa.">
      <div className="mb-6 flex flex-wrap items-end gap-3">
        <div className="w-64"><Field label="Hành động" placeholder="user.password_reset" value={action} onChange={(e) => { setAction(e.target.value); reset() }} /></div>
        <div className="w-40"><Field label="Từ ngày" type="date" value={from} onChange={(e) => { setFrom(e.target.value); reset() }} /></div>
        <div className="w-40"><Field label="Đến ngày" type="date" value={to} onChange={(e) => { setTo(e.target.value); reset() }} /></div>
      </div>
      <QueryBoundary query={logs}>
        {(r) => {
          const pages = Math.max(1, Math.ceil(r.totalCount / PAGE_SIZE))
          return (
            <>
              <DataTable rows={r.items} rowKey={(a) => a.id} columns={columns} pageSize={PAGE_SIZE} emptyTitle="Chưa có nhật ký phù hợp" />
              <div className="mt-4 flex items-center justify-between text-sm text-text-secondary">
                <span>{r.totalCount} bản ghi · Trang {page}/{pages}</span>
                <span className="flex gap-2">
                  <Button variant="secondary" disabled={page <= 1} disabledReason="Đang ở trang đầu" onClick={() => setPage(page - 1)}>Trước</Button>
                  <Button variant="secondary" disabled={page >= pages} disabledReason="Đang ở trang cuối" onClick={() => setPage(page + 1)}>Sau</Button>
                </span>
              </div>
            </>
          )
        }}
      </QueryBoundary>
      <Modal open={!!open} title="Chi tiết nhật ký" onClose={() => setOpen(null)} footer={<Button variant="secondary" onClick={() => setOpen(null)}>Đóng</Button>}>
        {open && (
          <div className="space-y-3 text-sm">
            <p className="text-text-primary"><code>{open.action}</code></p>
            <p className="text-text-secondary">{open.entityType} {open.entityId ?? ""} · {formatDateTime(open.occurredAtUtc)}</p>
            {open.before != null && <div><p className="font-medium text-text-primary">Trước</p><pre className="mt-1 overflow-x-auto rounded-[10px] bg-bg-warm p-3 text-xs">{JSON.stringify(open.before, null, 2)}</pre></div>}
            {open.after != null && <div><p className="font-medium text-text-primary">Sau</p><pre className="mt-1 overflow-x-auto rounded-[10px] bg-bg-warm p-3 text-xs">{JSON.stringify(open.after, null, 2)}</pre></div>}
          </div>
        )}
      </Modal>
    </PageFrame>
  )
}
