import { http } from "./http"
import type { Order } from "./orders"

export interface AiSuggestion { productId: string; name: string; price: number; reason: string }
export interface AiReply { reply: string; suggestions: AiSuggestion[] }
export interface Feedback { id: string; orderId: string; orderCode: string; rating: number; comment: string; createdAtUtc: string }

export const aiApi = {
  chat: (message: string) => http.post<AiReply>("/api/v1/ai/chat", { message }),
}
export const feedbackApi = {
  pending: () => http.get<Order[]>("/api/v1/feedback/pending"),
  mine: () => http.get<Feedback[]>("/api/v1/feedback/mine"),
  submit: (b: { orderId: string; rating: number; comment: string }) => http.post<Feedback>("/api/v1/feedback", b),
}