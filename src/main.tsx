import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import App from "./App"
import { env } from "./config/env"
import { AuthProvider } from "./context/AuthContext"
import { BrandProvider } from "./context/BrandContext"
import "./i18n"
import "./index.css"

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } })

function mount() {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <BrandProvider>
          <BrowserRouter>
            <AuthProvider>
              <App />
            </AuthProvider>
          </BrowserRouter>
        </BrandProvider>
      </QueryClientProvider>
    </StrictMode>,
  )
}

// Mock mode: MSW answers the API calls in the browser, so no backend is needed.
if (env.useMock) {
  void import("./services/mock/browser")
    .then(async ({ worker }) => {
      await worker.start({
        quiet: true,
        onUnhandledFrame: "bypass",
        serviceWorker: { url: "/mockServiceWorker.js", options: { scope: "/" } },
      })
      // Hard reload (Ctrl+F5) bypasses the SW; wait until this tab is controlled before mounting React.
      if ("serviceWorker" in navigator) {
        await navigator.serviceWorker.ready
        if (!navigator.serviceWorker.controller && !sessionStorage.getItem("aicos.mswReload")) {
          sessionStorage.setItem("aicos.mswReload", "1")
          window.location.reload()
          return
        }
      }
      sessionStorage.removeItem("aicos.mswReload")
      mount()
    })
} else {
  mount()
}
