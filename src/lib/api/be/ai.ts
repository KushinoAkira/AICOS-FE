import { env } from "../../../config/env"
import { ApiError } from "../http"
import { tokenStore } from "../tokenStore"
import type { AiReply, AiSuggestion } from "../engage"
import { currentBrandSlug } from "../../brand"

export interface AiRecommendation extends AiSuggestion { score?: number }
export interface FeedbackAnalysis {
  available: boolean
  items: { sentiment: "POSITIVE" | "NEUTRAL" | "NEGATIVE"; confidence: number; aspects: string[]; aspectLabels: string[] }[]
  model?: string
}

/** Compact menu row so the AI only suggests items the customer can actually order at this branch. */
export interface AiMenuItem {
  id: string
  name: string
  price: number
  category?: string
  description?: string
  tags?: string[]
}

export interface AiContext {
  tenantCode?: string | null
  branchId?: string | null
  branchName?: string | null
  history?: string[]
  menuItems?: AiMenuItem[]
  k?: number
}

/** Calls the AI service (ai-models directly, or via gateway when VITE_AI_BASE_URL points there). */
async function post<T>(path: string, body: unknown): Promise<T> {
  let res: Response
  try {
    const token = tokenStore.get()?.accessToken
    const tenant = currentBrandSlug()
    res = await fetch(`${env.aiBaseUrl}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(tenant ? { "X-Tenant": tenant } : {}),
      },
      body: JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, "Không kết nối được dịch vụ AI", "network")
  }
  if (!res.ok) throw new ApiError(res.status, res.status === 429 ? "Bạn hỏi quá nhanh. Vui lòng thử lại sau ít phút." : "Trợ lý AI tạm thời không khả dụng", "ai_error")
  return (await res.json()) as T
}

function scope(ctx: AiContext = {}) {
  return {
    tenantCode: ctx.tenantCode ?? currentBrandSlug() ?? undefined,
    branchId: ctx.branchId ?? undefined,
    branchName: ctx.branchName ?? undefined,
    menuItems: ctx.menuItems?.map((m) => ({
      id: m.id,
      name: m.name,
      price: m.price,
      category: m.category,
      description: m.description,
      tags: m.tags,
    })),
  }
}

export const beAiService = {
  chat: (message: string, ctx: AiContext = {}) =>
    post<AiReply>("/chat", { message, history: ctx.history ?? [], ...scope(ctx) }),
  recommend: async (history: string[], k = 5, ctx: AiContext = {}) =>
    (await post<{ items: AiRecommendation[] }>("/recommendations", { history, k: ctx.k ?? k, ...scope(ctx) })).items,
  analyzeFeedback: (texts: string[]) => post<FeedbackAnalysis>("/feedback/analyze", { texts }),
}
