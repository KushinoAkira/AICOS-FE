import { defineConfig, devices } from "@playwright/test"

/**
 * End-to-end checks against the running demo (TESTING-GUIDE-FOR-ME.md section 2): BE via `docker compose up -d`, FE via `npm run dev`.
 * Run: E2E_PASSWORD=<mật khẩu demo> npx playwright test -c e2e/playwright.config.ts
 */
export default defineConfig({
  testDir: ".",
  timeout: 60_000,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:8443",
    viewport: { width: 1440, height: 900 },
    trace: "retain-on-failure",
    ...devices["Desktop Chrome"],
  },
})
