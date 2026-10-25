import { useState } from "react"
import { Link } from "react-router"
import type { Plan } from "../../lib/api/platform"
import { quickAsk, type Answer } from "../../lib/quickAsk"
import { Button } from "../../components/ui"

const EXAMPLES = ["Giá bao nhiêu một tháng?", "Khách có phải tải app không?", "Bao lâu thì dùng được?", "Dữ liệu có an toàn không?"]

/** "Hỏi nhanh": keyword search over this page's own FAQ and plans (no AI model, answers are the published text). */
export function QuickAsk({ plans }: { plans: Plan[] }) {
  const [text, setText] = useState("")
  const [result, setResult] = useState<{ asked: string; answers: Answer[] } | null>(null)
  const ask = (q: string) => { setText(q); if (q.trim()) setResult({ asked: q.trim(), answers: quickAsk(q, plans) }) }
  return (
    <div className="mt-6 rounded-[16px] border border-border bg-bg-base p-5">
      <h3 className="font-serif text-lg">Hỏi nhanh</h3>
      <p className="mt-1 text-sm text-text-secondary">Gõ câu hỏi của bạn, chúng tôi tìm câu trả lời trong nội dung trang này.</p>
      <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); ask(text) }}>
        <input aria-label="Câu hỏi của bạn" maxLength={200} value={text} onChange={(e) => setText(e.target.value)} placeholder="Ví dụ: gói nào có nhiều chi nhánh?" className="min-h-11 flex-1 rounded-[10px] border border-border bg-surface px-3 text-sm" />
        <Button type="submit" disabled={!text.trim()} disabledReason="Nhập câu hỏi">Hỏi</Button>
      </form>
      <div className="mt-3 flex flex-wrap gap-2">
        {EXAMPLES.map((e) => <button key={e} type="button" onClick={() => ask(e)} className="rounded-full bg-sand px-3 py-1 text-xs text-text-secondary hover:bg-border">{e}</button>)}
      </div>
      {result && (
        <div className="mt-4 space-y-3" aria-live="polite">
          {result.answers.length > 0 ? result.answers.map((a) => (
            <div key={a.title} className="rounded-[12px] bg-surface p-4">
              <p className="text-sm font-medium text-text-primary">{a.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-text-secondary">{a.body}</p>
            </div>
          )) : (
            <p className="rounded-[12px] bg-surface p-4 text-sm text-text-secondary">Mình chưa tìm thấy câu trả lời cho "{result.asked}". <Link to="/contact" className="text-clay underline">Gửi câu hỏi cho đội ngũ AICOS</Link> để được tư vấn.</p>
          )}
        </div>
      )}
    </div>
  )
}
