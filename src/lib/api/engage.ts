import { env } from "../../config/env"
import { http } from "./http"
import { unsupported } from "./be/util"
import { beAiService, type AiRecommendation, type FeedbackAnalysis } from "./be/ai"
import type { Order } from "./orders"

export interface AiSuggestion { productId: string; name: string; price: number; reason: string }
export interface AiReply { reply: string; suggestions: AiSuggestion[] }
export interface Feedback { id: string; orderId: string; orderCode: string; rating: number; comment: string; createdAtUtc: string }

const mockAiApi = {
  chat: (message: string) => http.post<AiReply>("/api/v1/ai/chat", { message }),
}
const mockFeedbackApi = {
  pending: () => http.get<Order[]>("/api/v1/feedback/pending"),
  mine: () => http.get<Feedback[]>("/api/v1/feedback/mine"),
  /** Manager view (UC-37): all feedback of the branch. */
  branch: () => http.get<Feedback[]>("/api/v1/feedback/branch"),
  submit: (b: { orderId: string; rating: number; comment: string }) => http.post<Feedback>("/api/v1/feedback", b),
}

/** Chat goes to the self-hosted AI service; the .NET backend has no feedback API yet (reference section 10): lists are empty, writes explain why. */
const beAiApi: typeof mockAiApi = { chat: (message) => beAiService.chat(message) }
const beFeedbackApi: typeof mockFeedbackApi = {
  pending: async () => [],
  mine: async () => [],
  branch: async () => [],
  submit: () => unsupported("gửi đánh giá đơn hàng"),
}
export const aiApi: typeof mockAiApi = env.useMock ? mockAiApi : beAiApi
export const feedbackApi: typeof mockFeedbackApi = env.useMock ? mockFeedbackApi : beFeedbackApi

/** Personal recommendations (UC-54) and feedback analysis (UC-37/64) from the self-hosted models. */
const mockAiModelsApi = {
  recommend: (history: string[], k = 5) => http.post<{ items: AiRecommendation[] }>("/api/v1/ai/recommendations", { history, k }).then((r) => r.items),
  analyzeFeedback: (texts: string[]) => http.post<FeedbackAnalysis>("/api/v1/ai/feedback/analyze", { texts }),
}
export const aiModelsApi: typeof mockAiModelsApi = env.useMock ? mockAiModelsApi : { recommend: beAiService.recommend, analyzeFeedback: beAiService.analyzeFeedback }

