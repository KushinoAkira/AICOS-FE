import { env } from "../../config/env"
import { http } from "./http"
import { itemsOf, num, rec, recs, str, type Raw } from "./be/util"
import { beAiService, type AiRecommendation, type FeedbackAnalysis } from "./be/ai"
import { ordersApi, type Order } from "./orders"

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

/** Chat goes to the self-hosted AI service; feedback is the ordering service's `/orders/.../feedback` and `/orders/feedbacks*`. */
const beAiApi: typeof mockAiApi = { chat: (message) => beAiService.chat(message) }
const toFeedback = (f: Raw): Feedback => ({ id: str(f.id), orderId: str(f.orderId), orderCode: str(f.orderCode), rating: num(f.rating), comment: str(f.comment), createdAtUtc: str(f.createdAtUtc) })
const feedbackList = async (path: string) => recs(itemsOf(await http.get<Raw[]>(path, { query: { limit: 100 } }))).map(toFeedback)
const beFeedbackApi: typeof mockFeedbackApi = {
  /** Orders the customer has received and not rated yet. */
  async pending() {
    const [orders, given] = await Promise.all([ordersApi.mine(), feedbackList("/orders/feedbacks/mine")])
    const rated = new Set(given.map((f) => f.orderId))
    return orders.filter((o) => (o.status === "Served" || o.status === "PickedUp") && !rated.has(o.id))
  },
  mine: () => feedbackList("/orders/feedbacks/mine"),
  branch: () => feedbackList("/orders/feedbacks"),
  async submit(b) {
    return toFeedback(rec(await http.post<Raw>(`/orders/${b.orderId}/feedback`, { rating: b.rating, comment: b.comment.trim() || null })))
  },
}
export const aiApi: typeof mockAiApi = env.useMock ? mockAiApi : beAiApi
export const feedbackApi: typeof mockFeedbackApi = env.useMock ? mockFeedbackApi : beFeedbackApi

/** Personal recommendations (UC-54) and feedback analysis (UC-37/64) from the self-hosted models. */
const mockAiModelsApi = {
  recommend: (history: string[], k = 5) => http.post<{ items: AiRecommendation[] }>("/api/v1/ai/recommendations", { history, k }).then((r) => r.items),
  analyzeFeedback: (texts: string[]) => http.post<FeedbackAnalysis>("/api/v1/ai/feedback/analyze", { texts }),
}
export const aiModelsApi: typeof mockAiModelsApi = env.useMock ? mockAiModelsApi : { recommend: beAiService.recommend, analyzeFeedback: beAiService.analyzeFeedback }

