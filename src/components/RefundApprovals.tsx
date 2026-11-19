import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Banner, Button, DataTable, Field, Modal, QueryBoundary, StatusPill, type Column } from "./ui"
import { useAuth } from "../context/AuthContext"
import { useToast } from "../context/ToastContext"
import { reconciliationApi, type Refund } from "../lib/api/manage"
import { formatDate, formatDateTime, formatVND } from "../lib/format"
import { shortOrderCode } from "../lib/orderLabel"
import { REFUND_NEEDS_ACTION, refundDecision, refundErrorMessage, sortRefunds } from "../lib/refundDecision"

const STATUS_TEXT: Record<string, string> = { PendingApproval: "Chờ duyệt", AwaitingTransfer: "Chờ chuyển trả", Succeeded: "Đã hoàn", Failed: "Lỗi", Rejected: "Từ chối" }
const REFERENCE_MAX = 80
const KIND_TEXT: Record<string, string> = { Cancellation: "Khách hủy", NoShow: "Không đến nhận", Unfulfillable: "Không làm được", Exception: "Ngoại lệ" }
const NOTE_MAX = 300

/**
 * Refunds waiting for a decision (BR-30): the branch manager's "Hoàn tiền" page, and the brand admin's Đối soát when the brand keeps refund decisions for itself.
 * The list comes from `GET /payments/refunds`, which already keeps a branch manager to their own branch.
 * `orderCodes`: order id -> code, so a row names the order instead of its id.
 * `range`: the period picked on the page; "Lịch sử hoàn tiền" lists the refunds asked in it that were already handled. Waiting ones always stay on top.
 */
export function RefundApprovals({ orderCodes: given = {}, title = "Hoàn tiền chờ duyệt", range }: { orderCodes?: Record<string, string>; title?: string; range?: { from: string; to: string } }) {
  const qc = useQueryClient()
  const { showToast } = useToast()
  const { user, role } = useAuth()
  const refunds = useQuery({ queryKey: ["refunds", "pending"], queryFn: async () => [...await reconciliationApi.refunds({ status: "PendingApproval" }), ...await reconciliationApi.refunds({ status: "AwaitingTransfer" })], refetchInterval: 15_000 })
  const [showHistory, setShowHistory] = useState(false)
  const history = useQuery({
    queryKey: ["refunds", "history", range?.from ?? "", range?.to ?? ""],
    queryFn: () => reconciliationApi.refunds(range ?? {}),
    enabled: showHistory,
    select: (rows) => rows.filter((r) => !REFUND_NEEDS_ACTION.includes(r.status)).sort((a, b) => (b.decidedAtUtc ?? b.createdAtUtc).localeCompare(a.decidedAtUtc ?? a.createdAtUtc)),
  })
  const approver = useQuery({ queryKey: ["refunds", "approver"], queryFn: reconciliationApi.approver, retry: false })
  // Pages without an order list (Đối soát) look the codes up, pending refunds first, so the row names the order like the customer sees it.
  const missing = [...new Set([...(refunds.data ?? []), ...(history.data ?? [])].filter((r) => !given[r.orderId]).map((r) => r.orderId))].slice(0, 40)
  const looked = useQuery({ queryKey: ["refunds", "codes", missing], queryFn: () => reconciliationApi.orderCodes(missing), enabled: missing.length > 0, staleTime: 300_000 })
  const orderCodes: Record<string, string> = Object.fromEntries(Object.entries({ ...looked.data, ...given }).map(([id, code]) => [id, shortOrderCode(code)]))
  const [deciding, setDeciding] = useState<{ refund: Refund; approve: boolean } | null>(null)
  const [note, setNote] = useState("")
  const [reference, setReference] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [transferring, setTransferring] = useState<Refund | null>(null)
  const me = { id: user?.id ?? null, role }
  const manages = role === "branchManager" || role === "brandAdmin"
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["refunds"] })
    void qc.invalidateQueries({ queryKey: ["orders"] })
    void qc.invalidateQueries({ queryKey: ["reconciliation"] })
  }

  const decide = useMutation({
    mutationFn: ({ refund, approve, note, reference }: { refund: Refund; approve: boolean; note: string; reference: string }) =>
      approve ? reconciliationApi.approveRefund(refund.id, note, reference) : reconciliationApi.rejectRefund(refund.id, note),
    onSuccess: (r, v) => {
      refresh()
      setDeciding(null)
      if (!v.approve) showToast("Đã từ chối yêu cầu hoàn tiền.", "success")
      else if (r.status === "AwaitingTransfer") showToast(`Đã duyệt. Cổng thanh toán không tự hoàn được: chuyển trả ${formatVND(r.amount)} cho khách rồi bấm "Đã chuyển trả".`, "info")
      else if (r.status === "Failed") showToast(`Cổng thanh toán không hoàn được tiền: ${r.decisionNote ?? "lỗi không rõ"}.`, "error")
      else showToast(r.bankAccountNumber ? `Đã ghi nhận chuyển khoản ${formatVND(r.amount)} cho khách.` : `Đã duyệt hoàn ${formatVND(r.amount)}.`, "success")
    },
    onError: (e: Error & { code?: string }) => {
      setError(refundErrorMessage(e))
      if (e.code === "refund.not_pending" || e.code === "refund.exceeds_payment") void qc.invalidateQueries({ queryKey: ["refunds"] })
    },
  })

  const transfer = useMutation({
    mutationFn: ({ refund, reference, note }: { refund: Refund; reference: string; note: string }) => reconciliationApi.transferRefund(refund.id, reference, note),
    onSuccess: (r) => { refresh(); setTransferring(null); showToast(`Đã ghi nhận chuyển trả ${formatVND(r.amount)}.`, "success") },
    onError: (e: Error & { code?: string }) => {
      setError(refundErrorMessage(e))
      if (e.code === "refund.not_awaiting_transfer" || e.code === "refund.exceeds_payment") void qc.invalidateQueries({ queryKey: ["refunds"] })
    },
  })
  function openTransfer(refund: Refund) { setReference(""); setNote(""); setError(null); setTransferring(refund) }
  function submitTransfer() {
    if (!transferring) return
    const ref = reference.trim(), text = note.trim()
    if (!ref) return setError("Nhập mã giao dịch chuyển khoản trả khách.")
    if (ref.length > REFERENCE_MAX) return setError(`Mã giao dịch tối đa ${REFERENCE_MAX} ký tự.`)
    if (text.length > NOTE_MAX) return setError(`Ghi chú tối đa ${NOTE_MAX} ký tự.`)
    setError(null)
    transfer.mutate({ refund: transferring, reference: ref, note: text })
  }

  function open(refund: Refund, approve: boolean) { setNote(""); setReference(""); setError(null); setDeciding({ refund, approve }) }
  function submit() {
    if (!deciding) return
    const text = note.trim()
    if (!deciding.approve && text.length < 3) return setError("Nhập lý do từ chối (ít nhất 3 ký tự).")
    if (text.length > NOTE_MAX) return setError(`Ghi chú tối đa ${NOTE_MAX} ký tự.`)
    if (deciding.approve && deciding.refund.bankAccountNumber && reference.trim().length < 3) return setError("Nhập mã giao dịch chuyển khoản (in trên biên lai ngân hàng).")
    setError(null)
    decide.mutate({ refund: deciding.refund, approve: deciding.approve, note: text, reference: reference.trim() })
  }

  const policy = approver.data ?? "BranchManager"
  const columns: Column<Refund>[] = [
    { key: "t", header: "Thời gian", sort: (r) => r.createdAtUtc, render: (r) => formatDateTime(r.createdAtUtc) },
    { key: "o", header: "Đơn", render: (r) => <span className="font-medium text-text-primary">{orderCodes[r.orderId] ?? `#${r.orderId.slice(0, 8)}`}</span> },
    { key: "a", header: "Số tiền", sort: (r) => r.amount, render: (r) => formatVND(r.amount) },
    { key: "k", header: "Loại", render: (r) => <span>{KIND_TEXT[r.kind] ?? r.kind}<br /><span className="text-xs text-text-secondary">{r.withinPolicy ? "Trong chính sách" : "Ngoài chính sách"}</span></span> },
    {
      key: "w", header: "Lý do", render: (r) => (
        <span>
          {r.reason}
          {r.bankAccountNumber && <><br /><span className="text-xs text-text-primary">Chuyển về: <b>{r.bankName}</b> · <span className="font-mono">{r.bankAccountNumber}</span> · {r.bankAccountHolder}</span></>}
          {r.providerReference?.startsWith("BANK:") && <><br /><span className="text-xs text-state-success">Đã chuyển khoản, mã {r.providerReference.slice(5)}</span></>}
          {r.decisionNote && <><br /><span className="text-xs text-text-secondary">Ghi chú: {r.decisionNote}</span></>}
        </span>
      ),
    },
    { key: "s", header: "Trạng thái", render: (r) => <StatusPill tone={r.status === "Succeeded" ? "success" : REFUND_NEEDS_ACTION.includes(r.status) ? "pending" : "danger"}>{STATUS_TEXT[r.status] ?? r.status}</StatusPill> },
    {
      key: "x", header: "", className: "text-right", render: (r) => {
        if (r.status === "AwaitingTransfer") return manages ? (
          <div className="flex flex-col items-end gap-1">
            <Button className="px-3 py-1.5 text-xs" onClick={() => openTransfer(r)}>Đã chuyển trả</Button>
            <span className="max-w-[220px] text-right text-xs text-text-secondary">Chuyển khoản trả khách rồi ghi nhận tại đây.</span>
          </div>
        ) : null
        if (r.status !== "PendingApproval") return r.decidedAtUtc ? <span className="text-xs text-text-secondary">Xử lý lúc<br />{formatDateTime(r.decidedAtUtc)}</span> : null
        const d = refundDecision(r, policy, me)
        return (
          <div className="flex flex-col items-end gap-1">
            <div className="flex justify-end gap-2">
              <Button className="px-3 py-1.5 text-xs" disabled={!d.canApprove} disabledReason={d.reason ?? undefined} onClick={() => open(r, true)}>Duyệt</Button>
              <Button variant="secondary" className="px-3 py-1.5 text-xs" disabled={!d.canReject} disabledReason={d.reason ?? undefined} onClick={() => open(r, false)}>Từ chối</Button>
            </div>
            {d.reason && <span className="max-w-[220px] text-right text-xs text-text-secondary">{d.reason}</span>}
          </div>
        )
      },
    },
  ]

  return (
    <section aria-label={title} className="mb-8">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-serif text-lg text-text-primary">
          {title}
          {!!refunds.data && <span className="ml-2 rounded-full bg-pending-bg px-2 py-0.5 text-sm text-[#8A5A2B]" data-testid="pending-refunds">{refunds.data.filter((r) => REFUND_NEEDS_ACTION.includes(r.status)).length}</span>}
        </h2>
        <Button variant="secondary" className="px-3 py-1.5 text-xs" aria-expanded={showHistory} onClick={() => setShowHistory(!showHistory)}>
          {showHistory ? "Ẩn lịch sử" : "Lịch sử hoàn tiền"}
        </Button>
      </div>
      {approver.data === "BrandAdmin" && role === "branchManager" && (
        <div className="mb-3"><Banner tone="warn">Theo chính sách hủy của thương hiệu, hoàn tiền ngoại lệ do chủ thương hiệu duyệt. Bạn chỉ xem được trạng thái.</Banner></div>
      )}
      <h3 className="mb-2 text-sm font-medium text-text-primary">Chờ duyệt</h3>
      <QueryBoundary query={refunds}>
        {(rows) => <DataTable rows={sortRefunds(rows)} rowKey={(r) => r.id} columns={columns} pageSize={8} emptyTitle="Không có yêu cầu hoàn tiền nào cần xử lý" />}
      </QueryBoundary>
      {showHistory && (
        <div className="mt-6" data-testid="refund-history">
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-sm font-medium text-text-primary">Đã xử lý{range ? ` · yêu cầu từ ${formatDate(range.from)} đến ${formatDate(range.to)}` : " · gần đây"}</h3>
            {history.data && (() => {
              const done = history.data.filter((r) => r.status === "Succeeded")
              const refused = history.data.filter((r) => r.status === "Rejected").length
              const failed = history.data.filter((r) => r.status === "Failed").length
              return <p className="text-xs text-text-secondary">Đã hoàn <b className="text-text-primary">{formatVND(done.reduce((s, r) => s + r.amount, 0))}</b> ({done.length} yêu cầu){refused ? ` · Từ chối ${refused}` : ""}{failed ? ` · Lỗi ${failed}` : ""}</p>
            })()}
          </div>
          <QueryBoundary query={history}>
            {(rows) => <DataTable rows={rows} rowKey={(r) => r.id} columns={columns} pageSize={10} emptyTitle="Không có yêu cầu hoàn tiền nào đã xử lý trong khoảng này" />}
          </QueryBoundary>
        </div>
      )}

      <Modal
        open={!!deciding}
        title={deciding?.approve ? "Duyệt hoàn tiền" : "Từ chối hoàn tiền"}
        onClose={() => setDeciding(null)}
        footer={<>
          <Button variant="secondary" onClick={() => setDeciding(null)}>Hủy</Button>
          <Button loading={decide.isPending} onClick={submit}>{deciding?.approve ? (deciding.refund.bankAccountNumber ? "Đã chuyển khoản, duyệt" : "Duyệt và hoàn tiền") : "Từ chối"}</Button>
        </>}
      >
        <div className="space-y-4">
          {error && <Banner>{error}</Banner>}
          <p className="text-sm text-text-secondary">
            Đơn <b className="text-text-primary">{deciding ? orderCodes[deciding.refund.orderId] ?? `#${deciding.refund.orderId.slice(0, 8)}` : ""}</b> · Số tiền <b className="text-text-primary">{formatVND(deciding?.refund.amount ?? 0)}</b>
            <br />Lý do: {deciding?.refund.reason}
          </p>
          {deciding?.approve && deciding.refund.bankAccountNumber ? (
            <div className="space-y-3">
              <div className="rounded-[12px] border border-clay bg-sand/40 p-3 text-sm">
                <p className="text-text-secondary">Chuyển <b className="text-text-primary">{formatVND(deciding.refund.amount)}</b> đến tài khoản khách đã cung cấp:</p>
                <p className="mt-1 text-text-primary"><b>{deciding.refund.bankName}</b> · <span className="font-mono text-base">{deciding.refund.bankAccountNumber}</span></p>
                <p className="text-text-primary">Chủ tài khoản: <b>{deciding.refund.bankAccountHolder}</b></p>
                <p className="mt-1 text-xs text-text-secondary">Nội dung chuyển khoản gợi ý: Hoan tien don {deciding ? orderCodes[deciding.refund.orderId] ?? deciding.refund.orderId.slice(0, 8) : ""}</p>
              </div>
              <Field label="Mã giao dịch chuyển khoản (bắt buộc)" value={reference} maxLength={80} placeholder="Ví dụ: FT26111512345" onChange={(e) => setReference(e.target.value)} />
              <p className="text-xs text-text-secondary">Chuyển khoản trong app ngân hàng của quán trước, rồi nhập mã giao dịch và bấm duyệt. Khách sẽ thấy đơn chuyển sang "Đã hoàn".</p>
            </div>
          ) : deciding?.approve
            ? <p className="text-xs text-text-secondary">Tiền được hoàn qua cổng thanh toán ngay khi duyệt. Cổng không có hoàn tiền tự động (payOS) thì khoản hoàn chuyển sang chờ chuyển trả. Đơn trả tiền mặt thì thu ngân đã thu đơn đó trả lại tại quầy và khoản này được trừ vào tiền mặt của thu ngân.</p>
            : <Field label="Lý do từ chối (bắt buộc)" value={note} maxLength={NOTE_MAX} onChange={(e) => setNote(e.target.value)} />}
        </div>
      </Modal>

      <Modal
        open={!!transferring}
        title="Ghi nhận đã chuyển trả"
        onClose={() => setTransferring(null)}
        footer={<>
          <Button variant="secondary" onClick={() => setTransferring(null)}>Hủy</Button>
          <Button loading={transfer.isPending} onClick={submitTransfer}>Ghi nhận</Button>
        </>}
      >
        <div className="space-y-4">
          {error && <Banner>{error}</Banner>}
          <p className="text-sm text-text-secondary">
            Đơn <b className="text-text-primary">{transferring ? orderCodes[transferring.orderId] ?? `#${transferring.orderId.slice(0, 8)}` : ""}</b> · Số tiền <b className="text-text-primary">{formatVND(transferring?.amount ?? 0)}</b>
          </p>
          <p className="text-xs text-text-secondary">Chỉ ghi nhận sau khi tiền đã chuyển vào tài khoản của khách. Khoản hoàn sẽ chuyển sang Đã hoàn.</p>
          <Field label="Mã giao dịch chuyển khoản (bắt buộc)" value={reference} maxLength={REFERENCE_MAX} onChange={(e) => setReference(e.target.value)} />
          <Field label="Ghi chú" value={note} maxLength={NOTE_MAX} onChange={(e) => setNote(e.target.value)} />
        </div>
      </Modal>
    </section>
  )
}
