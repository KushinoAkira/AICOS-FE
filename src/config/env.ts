export const env = {
  /** Self-hosted AI service (Backend/ai-models): chat, recommendations, feedback analysis. */
  aiBaseUrl: ((import.meta.env.VITE_AI_BASE_URL as string | undefined) ?? "http://localhost:8090/api/v1/ai").replace(/\/+$/, ""),
  useMock: import.meta.env.VITE_USE_MOCK === "true",
  /** Address printed in table QR codes. Empty: the address of the page, which a guest's phone cannot reach when it is localhost. */
  publicAppUrl: ((import.meta.env.VITE_PUBLIC_APP_URL as string | undefined) ?? "").trim().replace(/\/+$/, ""),
  /** OAuth client id of the web app for "Continue with Google" (public). Empty: the button explains that Google sign-in is not set up. */
  googleClientId: ((import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) ?? "").trim(),
  /** Quick-login buttons on the login page: dev builds or VITE_DEMO=true only. */
  demo: import.meta.env.DEV || import.meta.env.VITE_DEMO === "true",
  /** Passwords of the demo accounts, from the git-ignored .env.local. A production build drops them because this branch can never run there. */
  demoPassword: import.meta.env.DEV || import.meta.env.VITE_DEMO === "true" ? ((import.meta.env.VITE_DEMO_PASSWORD as string | undefined) ?? "") : "",
  demoAdminPassword: import.meta.env.DEV || import.meta.env.VITE_DEMO === "true" ? ((import.meta.env.VITE_DEMO_ADMIN_PASSWORD as string | undefined) ?? "") : "",
  /** Show the UC-xx tags on screens (traceability, never for end users). */
  showUcTags: import.meta.env.VITE_SHOW_UC_TAGS === "true",
  /** Timezone used to display times (branch timezone until the API provides one). */
  timeZone: (import.meta.env.VITE_TIMEZONE as string | undefined) ?? "Asia/Ho_Chi_Minh",
}

