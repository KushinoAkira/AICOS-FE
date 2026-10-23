import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { Page } from "../../App"
import { CustomerFrame } from "../../components/CustomerFrame"
import { Banner, Button, EmptyState, QueryBoundary } from "../../components/ui"
import { useToast } from "../../context/ToastContext"
import { feedbackApi } from "../../lib/api/engage"
import type { Order } from "../../lib/api/orders"
import { formatDateTime } from "../../lib/format"

function Stars({ value, onChange }: { value: number; onChange?: (n: number) => void }) {
  return (
    <div role={onChange ? "radiogroup" : "img"} aria-label={`${value} trên 5 sao`} className="flex gap-1 text-2xl">
      {[1, 2, 3, 4, 5].map((n) => onChange
        ? <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n} sao`} onClick={() => onChange(n)} className={n <= value ? "text-terracotta" : "text-border"}>★</button>
        : <span key={n} className={n <= value ? "text-terracotta" : "text-border"}>★</span>)}
    </div>
  )
}

function Form({ order, onDone }: { order: Order; onDone: () => void }) {
  const { showToast } = useToast()
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState("")
  const send = useMutation({
    mutationFn: () => feedbackApi.submit({ orderId: order.id, rating, comment }),
    onSuccess: () => { showToast("Cảm ơn bạn đã đánh giá", "success"); onDone() },
  })
  return (
    <li className="rounded-[16px] border border-border bg-surface p-5">
      <p className="font-medium text-text-primary">{order.code} <span className="text-sm font-normal text-text-secondary">· {order.lines.map((l) => l.name).join(", ")}</span></p>
      <div className="mt-3"><Stars value={rating} onChange={setRating} /></div>
      <textarea aria-label="Góp ý" maxLength={500} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Góp ý thêm (không bắt buộc)" className="mt-3 w-full rounded-[10px] border border-border p-3 text-sm" rows={2} />
      {send.isError && <div className="mt-2"><Banner>{send.error.message}</Banner></div>}
      <Button className="mt-3" loading={send.isPending} disabled={rating === 0} disabledReason="Chọn số sao" onClick={() => send.mutate()}>Gửi đánh giá</Button>
    </li>
  )
}

/** Members only (BR feedback): rate an order after pickup (UC-58). */
export default function CustomerFeedback({ navigate }: { navigate: (p: Page) => void }) {
  const qc = useQueryClient()
  const pending = useQuery({ queryKey: ["feedback", "pending"], queryFn: feedbackApi.pending })
  const mine = useQuery({ queryKey: ["feedback", "mine"], queryFn: feedbackApi.mine })
  const refresh = () => { void qc.invalidateQueries({ queryKey: ["feedback"] }) }
  return (
    <CustomerFrame page="customer-feedback" navigate={navigate} uc="UC-58" title="Đánh giá đơn hàng">
      <h2 className="mb-3 font-serif text-lg text-text-primary">Chờ đánh giá</h2>
      <QueryBoundary query={pending}>{(rows) => rows.length === 0 ? <EmptyState title="Không có đơn nào cần đánh giá" description="Đơn đã nhận sẽ xuất hiện ở đây." /> : <ul className="space-y-4">{rows.map((o) => <Form key={o.id} order={o} onDone={refresh} />)}</ul>}</QueryBoundary>
      <h2 className="mb-3 mt-10 font-serif text-lg text-text-primary">Đã gửi</h2>
      <QueryBoundary query={mine}>{(rows) => rows.length === 0 ? <p className="text-sm text-text-secondary">Bạn chưa gửi đánh giá nào.</p> : <ul className="space-y-3">{rows.map((f) => <li key={f.id} className="rounded-[14px] border border-border bg-surface p-4 text-sm"><div className="flex items-center justify-between"><b className="text-text-primary">{f.orderCode}</b><span className="text-text-secondary">{formatDateTime(f.createdAtUtc)}</span></div><Stars value={f.rating} />{f.comment && <p className="mt-1 text-text-secondary">{f.comment}</p>}</li>)}</ul>}</QueryBoundary>
    </CustomerFrame>
  )
}