import { useQuery } from "@tanstack/react-query"
import InternalLayout from "../../components/InternalLayout"
import { Banner, Card, EmptyState, KpiCard, QueryBoundary, StatusPill, type Tone } from "../../components/ui"
import type { Page } from "../../router/pages"
import { aiModelsApi, feedbackApi, type Feedback } from "../../lib/api/engage"
import type { FeedbackAnalysis } from "../../lib/api/be/ai"
import { formatDateTime } from "../../lib/format"

type Sentiment = FeedbackAnalysis["items"][number]["sentiment"]
const SENTIMENT: Record<Sentiment, { label: string; tone: Tone }> = {
  POSITIVE: { label: "Tích cực", tone: "success" },
  NEUTRAL: { label: "Trung tính", tone: "neutral" },
  NEGATIVE: { label: "Tiêu cực", tone: "danger" },
}

interface Row { feedback: Feedback; sentiment?: Sentiment; confidence?: number; aspects: string[] }

/** The model reads the text; a high star rating with a negative text (or the opposite) is worth a manager's attention. */
const contradicts = (r: Row) => (r.feedback.rating >= 4 && r.sentiment === "NEGATIVE") || (r.feedback.rating <= 2 && r.sentiment === "POSITIVE")

async function load(): Promise<{ rows: Row[]; available: boolean; model?: string }> {
  const list = await feedbackApi.branch()
  const withText = list.filter((f) => f.comment.trim().length > 0)
  if (withText.length === 0) return { rows: list.map((feedback) => ({ feedback, aspects: [] })), available: true }
  try {
    const res = await aiModelsApi.analyzeFeedback(withText.map((f) => f.comment))
    const byId = new Map(withText.map((f, i) => [f.id, res.items[i]]))
    const rows = list.map((feedback) => {
      const a = byId.get(feedback.id)
      return { feedback, sentiment: a?.sentiment, confidence: a?.confidence, aspects: a?.aspectLabels ?? [] }
    })
    return { rows, available: res.available, model: res.model }
  } catch {
    return { rows: list.map((feedback) => ({ feedback, aspects: [] })), available: false }
  }
}

function count(rows: Row[], s: Sentiment) {
  return rows.filter((r) => r.sentiment === s).length
}

/** Branch manager: customer feedback with sentiment and topics from the self-hosted model (UC-37 / UC-64). */
export default function ManagerFeedback({ navigate }: { navigate: (p: Page) => void }) {
  const q = useQuery({ queryKey: ["feedback", "branch-analysis"], queryFn: load })
  return (
    <InternalLayout role="manager" activePage="manager-feedback" navigate={(id) => navigate(id as Page)}>
      <h1 className="mb-1 font-serif text-2xl font-medium text-text-primary">Phản hồi khách hàng</h1>
      <p className="mb-5 text-sm text-text-secondary">Cảm xúc và chủ đề do mô hình phân tích văn bản, không chỉ dựa vào số sao.</p>
      <QueryBoundary query={q}>
        {({ rows, available, model }) => {
          if (rows.length === 0) return <EmptyState title="Chưa có phản hồi nào" description="Phản hồi của khách sau khi nhận món sẽ xuất hiện ở đây." />
          const topics = new Map<string, number>()
          rows.forEach((r) => r.aspects.forEach((a) => topics.set(a, (topics.get(a) ?? 0) + 1)))
          const flagged = rows.filter(contradicts)
          return (
            <div className="space-y-6">
              {!available && <Banner>Mô hình phân tích chưa sẵn sàng, đang hiển thị phản hồi gốc kèm số sao.</Banner>}
              <div className="grid gap-4 sm:grid-cols-4">
                <KpiCard label="Phản hồi" value={rows.length} />
                <KpiCard label="Tích cực" value={count(rows, "POSITIVE")} />
                <KpiCard label="Trung tính" value={count(rows, "NEUTRAL")} />
                <KpiCard label="Tiêu cực" value={count(rows, "NEGATIVE")} tone={count(rows, "NEGATIVE") > 0 ? "danger" : "neutral"} />
              </div>
              {topics.size > 0 && (
                <Card>
                  <h2 className="mb-3 font-serif text-lg text-text-primary">Chủ đề được nhắc nhiều</h2>
                  <div className="flex flex-wrap gap-2">
                    {[...topics.entries()].sort((a, b) => b[1] - a[1]).map(([name, n]) => <StatusPill key={name} tone="info">{name} · {n}</StatusPill>)}
                  </div>
                </Card>
              )}
              {flagged.length > 0 && <Banner>{flagged.length} phản hồi có số sao mâu thuẫn với nội dung. Nên đọc lại các phản hồi được đánh dấu bên dưới.</Banner>}
              <ul className="space-y-3">
                {rows.map((r) => (
                  <li key={r.feedback.id} className="rounded-[14px] border border-border bg-surface p-4 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <b className="text-text-primary">{r.feedback.orderCode} · {r.feedback.rating} sao</b>
                      <span className="text-text-secondary">{formatDateTime(r.feedback.createdAtUtc)}</span>
                    </div>
                    {r.feedback.comment && <p className="mt-2 text-text-primary">{r.feedback.comment}</p>}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {r.sentiment && <StatusPill tone={SENTIMENT[r.sentiment].tone}>{SENTIMENT[r.sentiment].label}</StatusPill>}
                      {r.confidence !== undefined && <span className="text-xs text-text-secondary">Độ tin cậy {Math.round(r.confidence * 100)}%</span>}
                      {r.aspects.map((a) => <StatusPill key={a} tone="info">{a}</StatusPill>)}
                      {contradicts(r) && <StatusPill tone="pending">Số sao mâu thuẫn với nội dung</StatusPill>}
                    </div>
                  </li>
                ))}
              </ul>
              {model && <p className="text-xs text-text-secondary">Mô hình: {model}</p>}
            </div>
          )
        }}
      </QueryBoundary>
    </InternalLayout>
  )
}
