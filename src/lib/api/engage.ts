import { env } from "../../config/env"
import { http } from "./http"
import { unsupported } from "./be/util"
import { beAiService, type AiContext, type AiMenuItem, type AiRecommendation, type FeedbackAnalysis } from "./be/ai"
import type { Order } from "./orders"

export interface AiSuggestion { productId: string; name: string; price: number; reason: string }
export interface AiReply { reply: string; suggestions: AiSuggestion[]; route?: Record<string, unknown> }
export interface Feedback { id: string; orderId: string; orderCode: string; rating: number; comment: string; createdAtUtc: string }
export type { AiContext, AiMenuItem, AiRecommendation, FeedbackAnalysis }

const mockAiApi = {
  chat: (message: string, ctx: AiContext = {}) =>
    http.post<AiReply>("/api/v1/ai/chat", { message, history: ctx.history ?? [], tenantCode: ctx.tenantCode, branchId: ctx.branchId, menuItems: ctx.menuItems }),
}
const mockFeedbackApi = {
  pending: () => http.get<Order[]>("/api/v1/feedback/pending"),
  mine: () => http.get<Feedback[]>("/api/v1/feedback/mine"),
  /** Manager view (UC-37): all feedback of the branch. */
  branch: () => http.get<Feedback[]>("/api/v1/feedback/branch"),
  submit: (b: { orderId: string; rating: number; comment: string }) => http.post<Feedback>("/api/v1/feedback", b),
}

/** Chat goes to the self-hosted AI service; the .NET backend has no feedback API yet (reference section 10): lists are empty, writes explain why. */
const beAiApi: typeof mockAiApi = { chat: (message, ctx) => beAiService.chat(message, ctx) }
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
  recommend: (history: string[], k = 5, ctx: AiContext = {}) =>
    http.post<{ items: AiRecommendation[] }>("/api/v1/ai/recommendations", { history, k, tenantCode: ctx.tenantCode, branchId: ctx.branchId, menuItems: ctx.menuItems }).then((r) => r.items),
  analyzeFeedback: (texts: string[]) => http.post<FeedbackAnalysis>("/api/v1/ai/feedback/analyze", { texts }),
}
export const aiModelsApi: typeof mockAiModelsApi = env.useMock
  ? mockAiModelsApi
  : { recommend: (history, k, ctx) => beAiService.recommend(history, k, ctx), analyzeFeedback: beAiService.analyzeFeedback }
