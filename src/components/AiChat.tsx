import { useEffect, useRef, useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { ApiError } from "../lib/api/http"
import { aiApi, type AiReply } from "../lib/api/engage"
import { formatVND } from "../lib/format"
import { Button } from "./ui"

interface Msg { role: "user" | "ai"; text: string; suggestions?: AiReply["suggestions"]; failed?: boolean }
const QUICK = ["Món ít ngọt?", "Cà phê không đắng?", "Đồ uống mát?"]

/** Menu-only assistant (UC-44). Never prices an order itself: the server recomputes at checkout. */
export function AiChat() {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState("")
  const [msgs, setMsgs] = useState<Msg[]>([{ role: "ai", text: "Xin chào! Mình có thể gợi ý món theo khẩu vị. Bạn đang muốn uống gì?" }])
  const [cooldown, setCooldown] = useState(0)
  const end = useRef<HTMLDivElement>(null)
  const ask = useMutation({
    mutationFn: aiApi.chat,
    onSuccess: (r) => setMsgs((m) => [...m, { role: "ai", text: r.reply, suggestions: r.suggestions }]),
    onError: (e) => {
      if (e instanceof ApiError && e.retryAfterSeconds) setCooldown(e.retryAfterSeconds)
      setMsgs((m) => [...m, { role: "ai", text: e.message, failed: true }])
    },
  })
  useEffect(() => { end.current?.scrollIntoView({ block: "end" }) }, [msgs, ask.isPending])
  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown(cooldown - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  function send(q: string) {
    if (!q.trim() || ask.isPending || cooldown > 0) return
    setMsgs((m) => [...m, { role: "user", text: q.trim() }])
    setText("")
    ask.mutate(q.trim())
  }

  if (!open) return <button onClick={() => setOpen(true)} aria-label="Mở trợ lý AI" className="fixed bottom-20 right-4 z-40 rounded-full lg:bottom-5 lg:right-5 bg-espresso px-5 py-3 text-sm font-medium text-white shadow-lg">Hỏi AI</button>
  return (
    <section data-uc="UC-44" aria-label="Trợ lý AI" className="fixed bottom-20 right-4 z-40 flex h-[480px] w-[min(92vw,360px)] flex-col overflow-hidden rounded-[20px] border border-border bg-surface shadow-xl">
      <header className="flex items-center justify-between bg-espresso px-4 py-3 text-white"><span className="font-serif">Trợ lý AICOS</span><button aria-label="Đóng" onClick={() => setOpen(false)}>✕</button></header>
      <div className="flex-1 space-y-3 overflow-y-auto p-4 text-sm" aria-live="polite">
        {msgs.map((m, i) => (
          <div key={i} className={m.role === "user" ? "text-right" : ""}>
            <p className={`inline-block max-w-[90%] rounded-[14px] px-3 py-2 text-left ${m.role === "user" ? "bg-espresso text-white" : m.failed ? "bg-danger-bg text-state-danger" : "bg-sand text-text-primary"}`}>{m.text}</p>
            {m.suggestions?.map((s) => <p key={s.productId} className="mt-2 rounded-[12px] border border-border p-3 text-left"><b className="text-text-primary">{s.name}</b> · {formatVND(s.price)}<br /><span className="text-xs text-text-secondary">{s.reason}</span></p>)}
          </div>
        ))}
        {ask.isPending && <p className="text-text-secondary">Đang soạn câu trả lời...</p>}
        <div ref={end} />
      </div>
      <div className="border-t border-border p-3">
        <div className="mb-2 flex flex-wrap gap-1.5">{QUICK.map((q) => <button key={q} onClick={() => send(q)} className="rounded-full bg-sand px-3 py-1 text-xs text-text-secondary">{q}</button>)}</div>
        <form onSubmit={(e) => { e.preventDefault(); send(text) }} className="flex gap-2">
          <input aria-label="Câu hỏi" value={text} maxLength={200} onChange={(e) => setText(e.target.value)} className="min-w-0 flex-1 rounded-[10px] border border-border px-3 py-2 text-sm" placeholder="Hỏi về món..." />
          <Button type="submit" disabled={ask.isPending || cooldown > 0 || !text.trim()} disabledReason={cooldown > 0 ? `Thử lại sau ${cooldown}s` : undefined}>{cooldown > 0 ? `${cooldown}s` : "Gửi"}</Button>
        </form>
        <p className="mt-2 text-[11px] text-text-secondary">Gợi ý do AI tạo, chỉ mang tính tham khảo. Giá cuối do hệ thống tính.</p>
      </div>
    </section>
  )
}