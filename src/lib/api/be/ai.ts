import { env } from "../../../config/env"
import { ApiError } from "../http"
import { tokenStore } from "../tokenStore"
import type { AiReply, AiSuggestion } from "../engage"

export interface AiRecommendation extends AiSuggestion { score?: number }
export interface FeedbackAnalysis {
  available: boolean
  items: { sentiment: "POSITIVE" | "NEUTRAL" | "NEGATIVE"; confidence: number; aspects: string[]; aspectLabels: string[] }[]
  model?: string
}

/** Calls the AI service directly (it is a separate service, not behind the .NET gateway). */
async function post<T>(path: string, body: unknown): Promise<T> {
  let res: Response
  try {
    const token = tokenStore.get()?.accessToken
    res = await fetch(`${env.aiBaseUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, "Không kết nối được dịch vụ AI", "network")
  }
  if (!res.ok) throw new ApiError(res.status, res.status === 429 ? "Bạn hỏi quá nhanh. Vui lòng thử lại sau ít phút." : "Trợ lý AI tạm thời không khả dụng", "ai_error")
  return (await res.json()) as T
}

export const beAiService = {
  chat: (message: string, history: string[] = []) => post<AiReply>("/chat", { message, history }),
  recommend: async (history: string[], k = 5) => (await post<{ items: AiRecommendation[] }>("/recommendations", { history, k })).items,
  analyzeFeedback: (texts: string[]) => post<FeedbackAnalysis>("/feedback/analyze", { texts }),
}
