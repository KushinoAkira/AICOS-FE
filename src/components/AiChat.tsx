import { useEffect, useMemo, useRef, useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { useAuth } from "../context/AuthContext"
import { ApiError } from "../lib/api/http"
import { aiApi, type AiContext, type AiMenuItem, type AiReply } from "../lib/api/engage"
import { aiChatKey, loadAiChat, saveAiChat } from "../lib/aiChatStore"
import { currentBrandSlug } from "../lib/brand"
import { formatVND } from "../lib/format"
import { Button } from "./ui"

// Re-export for callers that build snapshots.
export type { AiMenuItem }

interface Msg { role: "user" | "ai"; text: string; suggestions?: AiReply["suggestions"]; failed?: boolean }
const QUICK = ["Món ít ngọt?", "Cà phê không đắng?", "Đồ uống mát?", "Có gì ăn kèm?"]
const GREETING = "Xin chào! Mình gợi ý món theo menu chi nhánh bạn đang xem. Bạn muốn uống gì?"

type Suggestion = NonNullable<AiReply["suggestions"]>[number]

const SOFT_COFFEE = /latte|bạc xỉu|bac xiu|cà phê sữa|ca phe sua|cappuccino|cold brew|cà phê muối|matcha latte/i
const BITTER_BLACK = /cà phê đen|ca phe den|\bespresso\b|\bamericano\b/i
const COFFEE_ASK = /cà phê|ca phe|cafe|coffee|latte|cappuccino|espresso|americano|bạc xỉu|cold brew/i
const SOFT_ASK = /không đắng|ít đắng|không chát|không gắt|êm dịu|dễ uống/i
const SIDE_ASK = /ăn kèm|an kem|có gì ăn|đồ ăn kèm|ăn vặt|an vat|bánh mặn|bánh ngọt/i
const FOOD_SIDE = /bánh|banh|croissant|tiramisu|pate|hạt|hat |flan|ăn vặt|an vat|sừng|sung bo/i
const DRINK_NAME = /cà phê|ca phe|latte|cappuccino|espresso|americano|cold brew|trà|tra |soda|nước|nuoc|matcha|sinh tố/i
const PREGNANT_ASK = /bà bầu|mẹ bầu|đang bầu|bầu bí|mang thai|mang tha\b|phụ nữ mang|cho bầu|dành cho bầu/i
const CAFFEINE_NAME = /cà phê|ca phe|espresso|americano|latte|cappuccino|cold brew|matcha|trà sữa|tra sua|trà đào|tra dao|hồng trà|trà đen/i
const CAFFEINE_FREE = /hoa cúc|gừng|gung|nước ép|nuoc ep|soda|hạt điều|hat dieu|bánh mì|banh mi|croissant|không caffeine|khong caffeine/i
const DENIAL = /chưa có thông tin|không (có|rõ) thông tin|hỏi nhân viên.{0,40}(tư vấn|chi tiết)/i

function sideReason(name: string): string {
  const n = name.toLowerCase()
  if (/tiramisu|socola|chocolate/.test(n)) return "Bánh ngọt đậm — hợp cà phê đen / espresso"
  if (/croissant|sừng|sung bo|bơ/.test(n)) return "Bánh bơ nhẹ — hợp latte / cappuccino"
  if (/mì que|mi que|pate|bánh mì|banh mi/.test(n)) return "Mặn nhẹ kiểu Việt — hợp cà phê sữa / bạc xỉu"
  if (/hạt|hat |điều|dieu/.test(n)) return "Snack giòn — hợp trà trái cây / cold brew"
  return "Ăn kèm có trên menu chi nhánh này"
}

/** Local taste grounding — keeps FE correct even if an older AI service is still running. */
function localSoftCoffeePicks(q: string, menu: AiMenuItem[]): Suggestion[] {
  if (!SOFT_ASK.test(q) || !COFFEE_ASK.test(q)) return []
  return menu
    .filter((m) => SOFT_COFFEE.test(`${m.name} ${m.description ?? ""}`) || (SOFT_COFFEE.test(m.name) && !BITTER_BLACK.test(m.name)))
    .filter((m) => !BITTER_BLACK.test(m.name) || SOFT_COFFEE.test(m.name))
    .slice(0, 3)
    .map((m) => ({
      productId: m.id,
      name: m.name,
      price: m.price,
      reason: "Êm hơn, ít đắng — hợp yêu cầu của bạn",
    }))
}

/** Ăn kèm = bánh / snack on THIS branch menu — never another drink. */
function localSidePicks(q: string, menu: AiMenuItem[]): Suggestion[] {
  if (!SIDE_ASK.test(q)) return []
  return menu
    .filter((m) => FOOD_SIDE.test(`${m.name} ${m.category ?? ""}`) && !DRINK_NAME.test(m.name))
    .slice(0, 3)
    .map((m) => ({
      productId: m.id,
      name: m.name,
      price: m.price,
      reason: sideReason(m.name),
    }))
}

/** Chat bubble is plain text — strip markdown the model sometimes emits (`**bold**`). */
function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/\*\*/g, "")
    .replace(/__/g, "")
    .replace(/`/g, "")
    .replace(/^#+\s*/gm, "")
    .replace(/^[-*]\s+/gm, "")
    .trim()
}

/** Prefer exact menu spellings (pate not pâté) when the model freestyles accents. */
function canonicalizeMenuNames(text: string, menu: AiMenuItem[]): string {
  let out = text
  const sorted = [...menu].sort((a, b) => b.name.length - a.name.length)
  for (const item of sorted) {
    const flex = item.name
      .split("")
      .map((ch) => {
        const low = ch.toLowerCase()
        const map: Record<string, string> = {
          a: "aáàảãạăắằẳẵặâấầẩẫậ",
          e: "eéèẻẽẹêếềểễệ",
          i: "iíìỉĩị",
          o: "oóòỏõọôốồổỗộơớờởỡợ",
          u: "uúùủũụưứừửữự",
          y: "yýỳỷỹỵ",
          d: "dđ",
        }
        if (map[low]) {
          const chars = map[low]
          return `[${chars}${chars.toUpperCase()}]`
        }
        if (/\s/.test(ch)) return "\\s+"
        return ch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      })
      .join("")
    out = out.replace(new RegExp(flex, "gi"), item.name)
  }
  return out
}

function cleanReply(text: string, menu: AiMenuItem[]): string {
  return canonicalizeMenuNames(stripMarkdown(text), menu)
}

/** Pregnancy / mẹ bầu → never suggest espresso or other caffeinated cups from this branch menu. */
function localPregnancyPicks(q: string, menu: AiMenuItem[]): Suggestion[] {
  if (!PREGNANT_ASK.test(q)) return []
  return menu
    .filter((m) => {
      const blob = `${m.name} ${m.description ?? ""} ${m.category ?? ""}`
      if (CAFFEINE_NAME.test(m.name) && !/không caffeine|khong caffeine|hoa cúc|gừng/i.test(blob)) return false
      return CAFFEINE_FREE.test(blob) || FOOD_SIDE.test(blob)
    })
    .slice(0, 3)
    .map((m) => ({
      productId: m.id,
      name: m.name,
      price: m.price,
      reason: "Không caffeine — phù hợp mẹ bầu / trẻ nhỏ",
    }))
}

/** "Giới thiệu Matcha latte" → pin that menu row if it exists at this branch. */
function localNamedProduct(q: string, menu: AiMenuItem[]): Suggestion[] {
  if (!/giới thiệu|gioi thieu|cho biết|là gì|thông tin|mô tả|về món|giá|bao nhiêu/i.test(q)) return []
  const low = q.toLowerCase()
  const hits = [...menu]
    .filter((m) => low.includes(m.name.toLowerCase()))
    .sort((a, b) => b.name.length - a.name.length)
  const kept: AiMenuItem[] = []
  for (const m of hits) {
    const n = m.name.toLowerCase()
    if (hits.some((o) => o.name.toLowerCase() !== n && o.name.toLowerCase().includes(n))) continue
    kept.push(m)
  }
  return kept.slice(0, 3).map((m) => ({
    productId: m.id,
    name: m.name,
    price: m.price,
    reason: "Đúng món bạn hỏi — có trên menu chi nhánh này",
  }))
}

function groundReply(q: string, reply: string, suggestions: Suggestion[], menu: AiMenuItem[]): { reply: string; suggestions: Suggestion[] } {
  const named = localNamedProduct(q, menu)
  if (named.length) {
    const ids = new Set(named.map((s) => s.productId))
    const kept = suggestions.filter((s) => ids.has(s.productId))
    const final = kept.length ? kept : named
    const missed = !suggestions.some((s) => ids.has(s.productId))
    if (missed || DENIAL.test(reply)) {
      const top = final[0]
      const desc = menu.find((m) => m.id === top.productId)?.description?.trim().replace(/\.$/, "") ?? ""
      return {
        reply: desc
          ? `${top.name} (${formatVND(top.price)}): ${desc}.`
          : `${top.name} đang bán với giá ${formatVND(top.price)} tại chi nhánh này.`,
        suggestions: final,
      }
    }
    return { reply: cleanReply(reply, menu), suggestions: final }
  }

  const pregnancy = localPregnancyPicks(q, menu)
  if (pregnancy.length) {
    const okIds = new Set(pregnancy.map((s) => s.productId))
    const kept = suggestions.filter((s) => okIds.has(s.productId) || (!CAFFEINE_NAME.test(s.name) && (CAFFEINE_FREE.test(s.name) || FOOD_SIDE.test(s.name))))
    const leakedCaf = suggestions.some((s) => CAFFEINE_NAME.test(s.name) && !/hoa cúc|gừng/i.test(s.name))
    const final = kept.length ? kept.slice(0, 3) : pregnancy
    if (leakedCaf || DENIAL.test(reply) || !suggestions.length || kept.length < suggestions.length) {
      const names = final.map((s) => `${s.name} (${formatVND(s.price)})`).join(", ")
      return {
        reply: `Theo menu chi nhánh này, lựa chọn nhẹ / không caffeine phù hợp mẹ bầu: ${names}.`,
        suggestions: final,
      }
    }
    return { reply: cleanReply(reply, menu), suggestions: final }
  }

  const sides = localSidePicks(q, menu)
  if (sides.length) {
    const sideIds = new Set(sides.map((s) => s.productId))
    const kept = suggestions.filter((s) => sideIds.has(s.productId) || FOOD_SIDE.test(s.name))
    const leakedDrink = suggestions.some((s) => DRINK_NAME.test(s.name) && !FOOD_SIDE.test(s.name))
    const final = kept.length ? kept.slice(0, 3) : sides
    if (leakedDrink || DENIAL.test(reply) || !suggestions.length || kept.length < suggestions.length) {
      const names = final.map((s) => `${s.name} (${formatVND(s.price)})`).join(", ")
      return {
        reply: `Theo menu chi nhánh này, món ăn kèm đang có: ${names}.`,
        suggestions: final,
      }
    }
    return { reply: cleanReply(reply, menu), suggestions: final }
  }

  const local = localSoftCoffeePicks(q, menu)
  if (!local.length) return { reply: cleanReply(reply, menu), suggestions }

  const softIds = new Set(local.map((s) => s.productId))
  const kept = suggestions.filter((s) => softIds.has(s.productId))
  const final = kept.length ? kept : local

  if (DENIAL.test(reply) || !suggestions.length || kept.length < Math.min(2, suggestions.length)) {
    const names = final.map((s) => `${s.name} (${formatVND(s.price)})`).join(", ")
    return {
      reply: `Theo menu chi nhánh này, những ly cà phê êm / ít đắng hơn là: ${names}.`,
      suggestions: final,
    }
  }
  return { reply: cleanReply(reply, menu), suggestions: final }
}

/** Menu-only assistant (UC-52). Scoped to the active brand + branch menu so suggestions never leak across shops. */
export function AiChat({ tenantCode, branchId, branchName, menuItems, history = [] }: {
  /** Brand code from the page URL / menu payload — preferred over session storage. */
  tenantCode?: string | null
  branchId?: string | null
  branchName?: string | null
  menuItems?: AiMenuItem[]
  history?: string[]
} = {}) {
  const { user } = useAuth()
  const brand = (tenantCode ?? currentBrandSlug() ?? "").trim().toLowerCase() || undefined
  const storageKey = useMemo(
    () => aiChatKey(user?.id, brand, branchId),
    [user?.id, brand, branchId],
  )
  const [open, setOpen] = useState(false)
  const [text, setText] = useState("")
  const [msgs, setMsgs] = useState<Msg[]>(() => {
    const saved = loadAiChat(storageKey)
    return saved?.length ? saved : [{ role: "ai", text: GREETING }]
  })
  const [cooldown, setCooldown] = useState(0)
  const end = useRef<HTMLDivElement>(null)
  const menuReady = (menuItems?.length ?? 0) > 0
  const allowIds = useMemo(() => new Set((menuItems ?? []).map((m) => m.id)), [menuItems])

  const ask = useMutation({
    mutationFn: ({ message, ctx }: { message: string; ctx: AiContext }) => aiApi.chat(message, ctx),
    onSuccess: (r, vars) => {
      const scoped = (r.suggestions ?? []).filter((s) => !allowIds.size || allowIds.has(s.productId))
      const grounded = groundReply(vars.message, r.reply, scoped, menuItems ?? [])
      setMsgs((m) => [...m, { role: "ai", text: grounded.reply, suggestions: grounded.suggestions }])
    },
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

  // Login / brand / branch changed: restore that session's transcript (or a fresh greeting).
  useEffect(() => {
    const saved = loadAiChat(storageKey)
    setMsgs(saved?.length ? saved : [{ role: "ai", text: GREETING }])
  }, [storageKey])

  // Persist while this login session is active (cleared on logout).
  useEffect(() => {
    saveAiChat(storageKey, msgs)
  }, [storageKey, msgs])

  function send(q: string) {
    if (!q.trim() || ask.isPending || cooldown > 0) return
    if (!menuReady) {
      setMsgs((m) => [...m, { role: "user", text: q.trim() }, { role: "ai", text: "Menu chi nhánh chưa sẵn sàng. Đợi món hiện ra rồi hỏi lại nhé — mình chỉ gợi ý đúng món đang bán tại đây.", failed: true }])
      setText("")
      return
    }
    setMsgs((m) => [...m, { role: "user", text: q.trim() }])
    setText("")
    ask.mutate({
      message: q.trim(),
      ctx: {
        tenantCode: brand,
        branchId: branchId ?? undefined,
        branchName: branchName ?? undefined,
        menuItems,
        history,
      },
    })
  }

  if (!open) return <button onClick={() => setOpen(true)} aria-label="Mở trợ lý AI" className="fixed bottom-20 right-4 z-40 rounded-full lg:bottom-5 lg:right-5 bg-espresso px-5 py-3 text-sm font-medium text-white shadow-lg">Hỏi AI</button>
  return (
    <section data-uc="UC-52" aria-label="Trợ lý AI" className="fixed bottom-20 right-4 z-40 flex h-[480px] w-[min(92vw,360px)] flex-col overflow-hidden rounded-[20px] border border-border bg-surface shadow-xl">
      <header className="flex items-center justify-between bg-espresso px-4 py-3 text-white">
        <span className="font-serif">Trợ lý AICOS{branchName ? ` · ${branchName}` : ""}</span>
        <button aria-label="Đóng" onClick={() => setOpen(false)}>✕</button>
      </header>
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
        {!menuReady && <p className="mb-2 text-xs text-state-danger">Đang tải menu chi nhánh — trợ lý chỉ trả lời khi đã có món tại đây.</p>}
        <div className="mb-2 flex flex-wrap gap-1.5">{QUICK.map((q) => <button key={q} disabled={!menuReady || ask.isPending || cooldown > 0} onClick={() => send(q)} className="rounded-full bg-sand px-3 py-1 text-xs text-text-secondary disabled:opacity-50">{q}</button>)}</div>
        <form onSubmit={(e) => { e.preventDefault(); send(text) }} className="flex gap-2">
          <input aria-label="Câu hỏi" value={text} maxLength={200} onChange={(e) => setText(e.target.value)} className="min-w-0 flex-1 rounded-[10px] border border-border px-3 py-2 text-sm" placeholder="Hỏi về món..." />
          <Button type="submit" disabled={!menuReady || ask.isPending || cooldown > 0 || !text.trim()} disabledReason={!menuReady ? "Đợi menu chi nhánh" : cooldown > 0 ? `Thử lại sau ${cooldown}s` : undefined}>{cooldown > 0 ? `${cooldown}s` : "Gửi"}</Button>
        </form>
        <p className="mt-2 text-[11px] text-text-secondary">Chỉ gợi ý món của chi nhánh đang xem. Giá cuối do hệ thống tính.</p>
      </div>
    </section>
  )
}
