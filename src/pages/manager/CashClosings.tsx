import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { Page } from "../../App"
import { PageFrame } from "../../components/PageFrame"
import { Banner, Button, DataTable, Field, Modal, QueryBoundary, StatusPill, type Column } from "../../components/ui"
import { useToast } from "../../context/ToastContext"
import { cashClosingApi, type CashClosing } from "../../lib/api/manage"
import { formatDate, formatDateTime, formatSignedVND, formatVND } from "../../lib/format"

/** UC-33 Confirm Shift Cash Closing: the manager reviews what the cashier counted; any difference stays in the audit trail (BR-55). */
export default function ManagerCashClosings({ navigate }: { navigate: (p: Page) => void }) {
  const qc = useQueryClient()
  const { showToast } = useToast()
  const list = useQuery({ queryKey: ["cash-closings"], queryFn: cashClosingApi.list })
  const [selected, setSelected] = useState<CashClosing | null>(null)
  const [note, setNote] = useState("")
  const [acknowledged, setAcknowledged] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const details = useQuery({ queryKey: ["cash-closings", selected?.id], queryFn: () => cashClosingApi.details(selected?.id ?? ""), enabled: !!selected })
  const confirm = useMutation({
    mutationFn: () => cashClosingApi.confirm(selected?.id ?? "", { note: note.trim() || null, acknowledgeExceptions: acknowledged }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["cash-closings"] }); setSelected(null); showToast("Đã xác nhận chốt két.", "success") },
    onError: (e) => setError(e.message),
  })
  const open = (c: CashClosing) => { setSelected(c); setNote(""); setAcknowledged(false); setError(null) }
  const needsNote = (selected?.difference ?? 0) !== 0
  const exceptions = details.data?.unresolvedExceptions ?? 0
  const submit = () => {
    if (needsNote && note.trim().length < 3) return setError("Két bị lệch: nhập ghi chú xác nhận")
    if (exceptions > 0 && !acknowledged) return setError("Xác nhận đã xem các đơn ngoại lệ")
    setError(null)
    confirm.mutate()
  }
  const columns: Column<CashClosing>[] = [
    { key: "d", header: "Ngày", sort: (c) => c.workDate, render: (c) => `${formatDate(c.workDate)} · ${c.startTime.slice(0, 5)}-${c.endTime.slice(0, 5)}` },
    { key: "n", header: "Thu ngân", sort: (c) => c.employeeName, render: (c) => <span className="font-medium text-text-primary">{c.employeeName}</span> },
    { key: "e", header: "Dự kiến", render: (c) => formatVND(c.expectedAmount) },
    { key: "c", header: "Đếm được", render: (c) => formatVND(c.countedAmount) },
    { key: "x", header: "Chênh lệch", sort: (c) => c.difference, render: (c) => <span className={c.difference === 0 ? "text-text-primary" : "font-medium text-state-danger"}>{formatSignedVND(c.difference)}</span> },
    { key: "s", header: "Trạng thái", render: (c) => <StatusPill tone={c.status === "Confirmed" ? "success" : "pending"}>{c.status === "Confirmed" ? "Đã xác nhận" : "Chờ xác nhận"}</StatusPill> },
    { key: "a", header: "", className: "text-right", render: (c) => <Button variant={c.status === "Confirmed" ? "secondary" : "primary"} className="px-3 py-1.5 text-xs" onClick={() => open(c)}>{c.status === "Confirmed" ? "Xem" : "Xem và xác nhận"}</Button> },
  ]
  const isOpen = selected?.status === "PendingReview"
  return (
    <PageFrame page="branch-cash-closings" navigate={navigate} uc="UC-33" title="Chốt két" subtitle="Tiền mặt thu ngân đếm cuối ca, đối chiếu với số hệ thống ghi nhận.">
      <QueryBoundary query={list}>{(rows) => <DataTable rows={rows} rowKey={(c) => c.id} columns={columns} emptyTitle="Chưa có ca nào gửi chốt két" />}</QueryBoundary>
      <Modal
        open={!!selected}
        title={`Chốt két: ${selected?.employeeName ?? ""}`}
        onClose={() => setSelected(null)}
        footer={<><Button variant="secondary" onClick={() => setSelected(null)}>Đóng</Button>{isOpen && <Button loading={confirm.isPending} onClick={submit}>Xác nhận</Button>}</>}
      >
        {selected && (
          <div className="space-y-4 text-sm">
            {error && <Banner>{error}</Banner>}
            <QueryBoundary query={details}>
              {(d) => (
                <>
                  <dl className="grid grid-cols-2 gap-2">
                    <dt className="text-text-secondary">Tiền mặt thu</dt><dd className="text-right text-text-primary">{formatVND(d.cashReceived)}</dd>
                    <dt className="text-text-secondary">Tiền mặt hoàn</dt><dd className="text-right text-text-primary">{formatVND(d.cashRefunded)}</dd>
                    <dt className="text-text-secondary">Dự kiến trong két</dt><dd className="text-right text-text-primary">{formatVND(selected.expectedAmount)}</dd>
                    <dt className="text-text-secondary">Thu ngân đếm</dt><dd className="text-right text-text-primary">{formatVND(selected.countedAmount)}</dd>
                    <dt className="font-medium text-text-primary">Chênh lệch</dt><dd className={`text-right font-medium ${selected.difference === 0 ? "text-text-primary" : "text-state-danger"}`}>{formatSignedVND(selected.difference)}</dd>
                  </dl>
                  {selected.cashierNote && <p className="rounded-[10px] bg-bg-warm p-3 text-text-primary">Thu ngân ghi: {selected.cashierNote}</p>}
                  {d.cashTransactions.length > 0 && (
                    <details><summary className="cursor-pointer text-text-secondary">{d.cashTransactions.length} giao dịch tiền mặt</summary>
                      <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto">{d.cashTransactions.map((t, i) => <li key={i} className="flex justify-between"><span className="text-text-secondary">{formatDateTime(t.occurredAtUtc)}</span><span className={t.isRefund ? "text-state-danger" : "text-text-primary"}>{formatSignedVND(t.amount)}</span></li>)}</ul>
                    </details>
                  )}
                  {d.unresolvedExceptions > 0 && isOpen && (
                    <label className="flex items-start gap-2 rounded-[10px] bg-bg-warm p-3 text-text-primary"><input type="checkbox" className="mt-1" checked={acknowledged} onChange={(e) => setAcknowledged(e.target.checked)} /> Ca này có {d.unresolvedExceptions} đơn ngoại lệ chưa xử lý. Tôi đã xem và vẫn xác nhận.</label>
                  )}
                </>
              )}
            </QueryBoundary>
            {isOpen
              ? <Field label={needsNote ? "Ghi chú xác nhận (bắt buộc khi lệch)" : "Ghi chú (không bắt buộc)"} value={note} onChange={(e) => setNote(e.target.value)} />
              : selected.managerNote && <p className="rounded-[10px] bg-bg-warm p-3 text-text-primary">Quản lý ghi: {selected.managerNote}</p>}
          </div>
        )}
      </Modal>
    </PageFrame>
  )
}
