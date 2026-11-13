import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import InternalLayout from "../../components/InternalLayout"
import { Button, EmptyState, KpiCard, QueryBoundary, StatusPill, type Tone } from "../../components/ui"
import type { Page } from "../../router/pages"
import { useAuth } from "../../context/AuthContext"
import { useToast } from "../../context/ToastContext"
import { feedbackApi, type Feedback } from "../../lib/api/engage"
import { branchesApi } from "../../lib/api/identity"
import { publicApi } from "../../lib/api/platform"
import { formatDateTime } from "../../lib/format"
import { orderTitle, shortOrderCode } from "../../lib/orderLabel"

type Group = "positive" | "neutral" | "negative"
/** By stars: 4 and 5 are positive, 2 and 3 neutral, 1 negative. */
const groupOf = (rating: number): Group => (rating >= 4 ? "positive" : rating >= 2 ? "neutral" : "negative")
const GROUP: Record<Group, { label: string; tone: Tone; hint: string }> = {
  positive: { label: "Tích cực", tone: "success", hint: "4 - 5 sao" },
  neutral: { label: "Trung tính", tone: "neutral", hint: "2 - 3 sao" },
  negative: { label: "Tiêu cực", tone: "danger", hint: "1 sao" },
}
type Filter = "all" | Group | 1 | 2 | 3 | 4 | 5

function StarRow({ value, size = "text-base" }: { value: number; size?: string }) {
  return (
    <span className={`${size} leading-none tracking-tight`} aria-label={`${value} sao`}>
      {[1, 2, 3, 4, 5].map((i) => <span key={i} className={i <= value ? "text-[#E0A526]" : "text-border"}>★</span>)}
    </span>
  )
}

/** Branch manager (and brand admin): customer ratings classified by stars, named by their drinks, with a reply for the customer (UC-37). */
export default function ManagerFeedback({ navigate }: { navigate: (p: Page) => void }) {
  const { user, role } = useAuth()
  const qc = useQueryClient()
  const { showToast } = useToast()
  const list = useQuery({ queryKey: ["feedback", "branch"], queryFn: feedbackApi.branch })
  const branches = useQuery({ queryKey: ["branches", "active"], queryFn: branchesApi.listActive, retry: false })
  const brands = useQuery({ queryKey: ["public", "brands"], queryFn: publicApi.brands, retry: false })
  const brandName = (brands.data ?? []).find((b) => b.id === user?.tenantId)?.name ?? ""
  const branchName = (id?: string) => (branches.data ?? []).find((b) => b.id === id)?.name ?? ""
  const [filter, setFilter] = useState<Filter>("all")
  const [replying, setReplying] = useState<string | null>(null)
  const [text, setText] = useState("")
  const send = useMutation({
    mutationFn: (v: { id: string; reply: string }) => feedbackApi.reply(v.id, v.reply),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["feedback"] }); setReplying(null); setText(""); showToast("Đã gửi phản hồi cho khách", "success") },
    onError: (e) => showToast(e.message, "error"),
  })
  const open = (f: Feedback) => { setReplying(f.id); setText(f.reply ?? "") }

  return (
    <InternalLayout role={role === "brandAdmin" ? "brandAdmin" : "manager"} activePage="manager-feedback" navigate={(id) => navigate(id as Page)}>
      <h1 className="mb-1 font-serif text-2xl font-medium text-text-primary">Phản hồi khách hàng</h1>
      <p className="mb-5 text-sm text-text-secondary">Đánh giá của khách sau khi nhận món. Tích cực là 4 - 5 sao, trung tính 2 - 3 sao, tiêu cực 1 sao. Bấm "Trả lời khách" để phản hồi, khách thấy câu trả lời ở trang Đánh giá của họ.</p>
      <QueryBoundary query={list}>
        {(rows) => {
          if (rows.length === 0) return <EmptyState title="Chưa có phản hồi nào" description="Phản hồi của khách sau khi nhận món sẽ xuất hiện ở đây." />
          const byGroup = (g: Group) => rows.filter((r) => groupOf(r.rating) === g).length
          const byStar = (s: number) => rows.filter((r) => r.rating === s).length
          const average = rows.reduce((s, r) => s + r.rating, 0) / rows.length
          const shown = rows.filter((r) => filter === "all" || (typeof filter === "number" ? r.rating === filter : groupOf(r.rating) === filter))
          const chip = (active: boolean) => `inline-flex min-h-9 items-center gap-1.5 rounded-full px-4 text-sm ${active ? "bg-espresso text-white" : "border border-border bg-surface text-text-secondary hover:border-clay"}`
          return (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <KpiCard label="Phản hồi" value={rows.length} />
                <KpiCard label="Điểm trung bình" value={`${average.toFixed(1)} ★`} />
                <KpiCard label="Tích cực (4 - 5 sao)" value={byGroup("positive")} />
                <KpiCard label="Trung tính (2 - 3 sao)" value={byGroup("neutral")} />
                <KpiCard label="Tiêu cực (1 sao)" value={byGroup("negative")} tone={byGroup("negative") > 0 ? "danger" : "neutral"} />
              </div>

              <div className="space-y-3">
                <div role="radiogroup" aria-label="Lọc theo nhóm" className="flex flex-wrap gap-2">
                  <button role="radio" aria-checked={filter === "all"} onClick={() => setFilter("all")} className={chip(filter === "all")}>Tất cả · {rows.length}</button>
                  {(["positive", "neutral", "negative"] as const).map((g) => (
                    <button key={g} role="radio" aria-checked={filter === g} onClick={() => setFilter(g)} className={chip(filter === g)}>{GROUP[g].label} · {byGroup(g)}</button>
                  ))}
                </div>
                <div role="radiogroup" aria-label="Lọc theo số sao" className="flex flex-wrap gap-2">
                  {([5, 4, 3, 2, 1] as const).map((s) => (
                    <button key={s} role="radio" aria-checked={filter === s} onClick={() => setFilter(s)} className={chip(filter === s)}>
                      <StarRow value={s} size="text-sm" /> <span>{byStar(s)}</span>
                    </button>
                  ))}
                </div>
              </div>

              {shown.length === 0 ? <p className="rounded-[14px] border border-dashed border-border p-8 text-center text-sm text-text-secondary">Không có phản hồi nào trong nhóm này.</p> : (
                <ul className="space-y-3">
                  {shown.map((f) => {
                    const g = GROUP[groupOf(f.rating)]
                    const where = [branchName(f.branchId), brandName].filter(Boolean).join(" · ")
                    return (
                      <li key={f.id} className="rounded-[14px] border border-border bg-surface p-4 text-sm">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="font-medium text-text-primary">{f.items?.length ? orderTitle(f.items) : "Đơn hàng"} <span className="text-xs font-normal text-text-secondary">{shortOrderCode(f.orderCode)}</span></p>
                            {where && <p className="mt-0.5 text-xs text-text-secondary">{where}</p>}
                          </div>
                          <span className="text-xs text-text-secondary">{formatDateTime(f.createdAtUtc)}</span>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2"><StarRow value={f.rating} /><StatusPill tone={g.tone}>{g.label}</StatusPill></div>
                        {f.comment ? <p className="mt-2 text-text-primary">{f.comment}</p> : <p className="mt-2 text-xs italic text-text-secondary">Khách không viết góp ý.</p>}

                        {f.reply && replying !== f.id && (
                          <div className="mt-3 rounded-[10px] border-l-4 border-terracotta bg-sand px-3 py-2">
                            <p className="text-xs font-medium text-clay">Quán đã trả lời{f.repliedAtUtc ? ` · ${formatDateTime(f.repliedAtUtc)}` : ""}</p>
                            <p className="mt-0.5 text-text-primary">{f.reply}</p>
                          </div>
                        )}

                        {replying === f.id ? (
                          <div className="mt-3 space-y-2">
                            <textarea aria-label="Câu trả lời cho khách" autoFocus maxLength={500} rows={3} value={text} onChange={(e) => setText(e.target.value)}
                              placeholder="Ví dụ: Cảm ơn bạn đã góp ý, lần sau quán sẽ pha ít ngọt hơn." className="w-full rounded-[10px] border border-border p-3 text-sm outline-none focus:border-terracotta" />
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="text-xs text-text-secondary">{text.length}/500</span>
                              <span className="flex gap-2">
                                <Button variant="secondary" onClick={() => { setReplying(null); setText("") }}>Hủy</Button>
                                <Button loading={send.isPending} disabled={!text.trim()} disabledReason="Nhập câu trả lời" onClick={() => send.mutate({ id: f.id, reply: text })}>Gửi phản hồi</Button>
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-3"><Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => open(f)}>{f.reply ? "Sửa câu trả lời" : "Trả lời khách"}</Button></div>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )
        }}
      </QueryBoundary>
    </InternalLayout>
  )
}
