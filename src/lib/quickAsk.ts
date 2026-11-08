import type { Plan } from "./api/platform"
import { formatVND } from "./format"
import { BEHIND, FAQ, FEATURES, JOURNEY, ROLES } from "../pages/public/landingContent"

export interface Answer { title: string; body: string }

/** lower-case, no diacritics, so "Gia bao nhieu" and "Giá bao nhiêu" match the same text. */
export function fold(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d")
}

const STOP = new Set(["la", "co", "khong", "the", "nao", "va", "cua", "cho", "toi", "ban", "minh", "duoc", "gi", "nay", "o", "de", "mot", "nhung", "thi", "hay", "bi", "voi", "can", "muon", "xin", "hoi"])
const words = (s: string) => fold(s).split(/[^a-z0-9]+/).filter((w) => w.length > 1 && !STOP.has(w))

/** Words that mean the same thing for a shop owner asking about AICOS. */
const SYNONYMS: Record<string, string[]> = {
  gia: ["phi", "tien", "goi", "bang"], phi: ["gia"], tien: ["gia", "phi"], re: ["gia"], dat: ["gia"],
  app: ["ung", "dung", "tai"], tai: ["app", "ung", "dung"], mobile: ["dien", "thoai", "app"],
  huy: ["doi", "goi"], thanh: ["toan"], bao: ["gia"], lau: ["ngay", "thoi"],
  an: ["toan", "bao", "mat"], bao_mat: ["an", "toan"], mat: ["an", "toan"],
  nhan: ["vien", "tai", "khoan"], staff: ["nhan", "vien"], chi: ["nhanh"], branch: ["chi", "nhanh"],
  mien: ["phi", "thu", "dung"], thu: ["dung", "14"], free: ["mien", "phi", "thu"],
}

function planDocs(plans: Plan[]): Answer[] {
  return plans.map((p) => ({
    title: `Gói ${p.name}: giá và giới hạn`,
    body: `Gói ${p.name} giá ${formatVND(p.monthlyFee)} mỗi tháng, tối đa ${p.maxBranches} chi nhánh và ${p.maxUsers} tài khoản nhân viên. Có QR gọi món, đặt mang đi và tích điểm.`,
  }))
}

export function corpus(plans: Plan[] = []): Answer[] {
  return [
    ...FAQ.map((f) => ({ title: f.q, body: f.a })),
    ...planDocs(plans),
    ...FEATURES.map((f) => ({ title: f.title, body: f.body })),
    ...JOURNEY.map((j) => ({ title: `${j.who}: ${j.title}`, body: j.body })),
    ...BEHIND.map((b) => ({ title: b.title, body: b.body })),
    ...ROLES.map((r) => ({ title: `Dành cho ${r.who.toLowerCase()}`, body: r.body })),
  ]
}

/** Keyword search over the page's own content (no LLM): the top answers, or [] when nothing matches. */
export function quickAsk(query: string, plans: Plan[] = [], limit = 2): Answer[] {
  const q = [...new Set(words(query))]
  if (q.length === 0) return []
  const expanded = new Set(q.flatMap((w) => [w, ...(SYNONYMS[w] ?? [])]))
  const ranked = corpus(plans).map((doc) => {
    const title = new Set(words(doc.title)), body = new Set(words(doc.body))
    let score = 0, matched = 0
    for (const w of expanded) {
      const weight = q.includes(w) ? 1 : 0.4
      const hit = (set: Set<string>) => set.has(w) || [...set].some((x) => x.length > 3 && w.length > 3 && (x.startsWith(w) || w.startsWith(x)))
      const h = hit(title) ? 2 : hit(body) ? 1 : 0
      score += h * weight
      if (h && weight === 1) matched++
    }
    return { doc, score, coverage: matched / q.length }
  })
  return ranked.filter((r) => r.score >= 2 && r.coverage >= 0.5).sort((a, b) => b.score - a.score).slice(0, limit).map((r) => r.doc)
}
