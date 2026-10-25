export const env = {
  /** Self-hosted AI service (Backend/ai-models): chat, recommendations, feedback analysis. */
  aiBaseUrl: ((import.meta.env.VITE_AI_BASE_URL as string | undefined) ?? "http://localhost:8090/api/v1/ai").replace(/\/+$/, ""),
  useMock: import.meta.env.VITE_USE_MOCK === "true",
  /** Quick-login buttons on the login page: dev builds or VITE_DEMO=true only. */
  demo: import.meta.env.DEV || import.meta.env.VITE_DEMO === "true",
  /** Show the UC-xx tags on screens (traceability, never for end users). */
  showUcTags: import.meta.env.VITE_SHOW_UC_TAGS === "true",
  /** Timezone used to display times (branch timezone until the API provides one). */
  timeZone: (import.meta.env.VITE_TIMEZONE as string | undefined) ?? "Asia/Ho_Chi_Minh",
}

