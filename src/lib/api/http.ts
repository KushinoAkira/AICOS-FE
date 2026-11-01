/**
 * Thin fetch client for the AICOS API gateway.
 * - Base URL from VITE_API_BASE_URL (default: local gateway).
 * - Sends the Bearer token, refreshes once on 401, normalises ProblemDetails errors.
 */
import { env } from "../../config/env"
import { currentBrandSlug } from "../brand"
import { tokenStore, type StoredSession } from "./tokenStore"

export const API_BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/, "") ?? "http://localhost:5000/api/v1"

export class ApiError extends Error {
  readonly status: number
  readonly code?: string
  readonly fieldErrors?: Record<string, string[]>
  /** Set on 423 (account locked) / 429 (rate limited). */
  readonly retryAfterSeconds?: number

  constructor(status: number, message: string, code?: string, fieldErrors?: Record<string, string[]>, retryAfterSeconds?: number) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.code = code
    this.fieldErrors = fieldErrors
    this.retryAfterSeconds = retryAfterSeconds
  }

  get isNetwork() {
    return this.status === 0
  }
}

type Query = Record<string, string | number | boolean | undefined | null>

export interface RequestOptions {
  query?: Query
  body?: unknown
  /** Skip the Authorization header and the refresh-on-401 logic (login, register, ...). */
  anonymous?: boolean
  /** Extra request headers (for example the table-session header of the QR ordering endpoints). */
  headers?: Record<string, string>
  signal?: AbortSignal
}

function buildUrl(path: string, query?: Query): string {
  const url = new URL(`${API_BASE_URL}${path}`)
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value))
  }
  return url.toString()
}

async function toApiError(res: Response): Promise<ApiError> {
  let data: Record<string, unknown> | null = null
  try {
    data = (await res.json()) as Record<string, unknown>
  } catch {
    /* non-JSON body */
  }
  const message =
    (data?.detail as string | undefined) ?? (data?.title as string | undefined) ?? `Yêu cầu thất bại (${res.status})`
  return new ApiError(
    res.status,
    message,
    (data?.code as string | undefined) ?? (data?.errorCode as string | undefined),
    data?.errors as Record<string, string[]> | undefined,
    data?.retryAfterSeconds as number | undefined,
  )
}

let refreshing: Promise<StoredSession | null> | null = null

/** Single-flight refresh so parallel 401s share one rotation of the refresh token. */
function refreshSession(): Promise<StoredSession | null> {
  refreshing ??= (async () => {
    const current = tokenStore.get()
    if (!current) return null
    try {
      const res = await fetch(buildUrl("/identity/auth/refresh"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: current.refreshToken }),
      })
      if (!res.ok) throw await toApiError(res)
      const next = (await res.json()) as StoredSession
      tokenStore.set(next)
      return next
    } catch {
      tokenStore.clear()
      return null
    } finally {
      refreshing = null
    }
  })()
  return refreshing
}

/** The access token for a long-lived connection (SignalR): renewed first when it is about to expire. Empty when signed out. */
export async function freshAccessToken(): Promise<string> {
  const current = tokenStore.get()
  if (!current) return ""
  const expires = Date.parse(current.accessTokenExpiresAtUtc)
  if (Number.isFinite(expires) && expires - Date.now() < 60_000) return (await refreshSession())?.accessToken ?? ""
  return current.accessToken
}

/**
 * Mock mode only: the API calls are answered by a service worker. If this tab lost it (hard reload, restored tab,
 * cleared site data) the request falls through to a gateway that is not running. One reload brings the worker back.
 */
function recoverMockWorker() {
  if (!("serviceWorker" in navigator) || navigator.serviceWorker.controller) return
  const last = Number(sessionStorage.getItem("aicos.mswRecover") ?? 0)
  if (Date.now() - last < 10_000) return
  sessionStorage.setItem("aicos.mswRecover", String(Date.now()))
  window.location.reload()
}

/** Mock mode: re-attach this tab to the service worker (it may have been stopped while idle) so a retry can succeed. */
async function restartMockWorker(): Promise<void> {
  const { worker } = await import("../../services/mock/browser")
  worker.stop()
  await worker.start({ quiet: true })
}

async function send(method: string, path: string, opts: RequestOptions, token: string | null, retried = false): Promise<Response> {
  const headers: Record<string, string> = { Accept: "application/json", ...opts.headers }
  if (opts.body !== undefined) headers["Content-Type"] = "application/json"
  if (token && !opts.anonymous) headers.Authorization = `Bearer ${token}`
  const brand = currentBrandSlug()
  // Mock only: the real gateway resolves the tenant from the host name, and an extra header would need CORS changes.
  if (brand && env.useMock) headers["X-Tenant"] = brand
  try {
    return await fetch(buildUrl(path, opts.query), {
      method,
      headers,
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
      signal: opts.signal,
    })
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err
    if (env.useMock) {
      if (!retried) {
        try { await restartMockWorker(); return await send(method, path, opts, token, true) } catch { /* fall through to the error below */ }
      }
      recoverMockWorker()
    }
    throw new ApiError(0, env.useMock ? "Không thể kết nối dữ liệu giả lập. Hãy tải lại trang (F5)." : "Không thể kết nối máy chủ", "network")
  }
}

export async function request<T>(method: string, path: string, opts: RequestOptions = {}): Promise<T> {
  let res = await send(method, path, opts, tokenStore.get()?.accessToken ?? null)

  if (res.status === 401 && !opts.anonymous && tokenStore.get()) {
    const next = await refreshSession()
    if (next) res = await send(method, path, opts, next.accessToken)
    else window.dispatchEvent(new Event("aicos:session-expired"))
  }

  if (!res.ok) throw await toApiError(res)
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export const http = {
  get: <T>(path: string, opts?: RequestOptions) => request<T>("GET", path, opts),
  post: <T>(path: string, body?: unknown, opts?: RequestOptions) => request<T>("POST", path, { ...opts, body }),
  put: <T>(path: string, body?: unknown, opts?: RequestOptions) => request<T>("PUT", path, { ...opts, body }),
  patch: <T>(path: string, body?: unknown, opts?: RequestOptions) => request<T>("PATCH", path, { ...opts, body }),
  delete: <T>(path: string, opts?: RequestOptions) => request<T>("DELETE", path, opts),
}

export interface PagedResponse<T> {
  items: T[]
  page: number
  pageSize: number
  totalCount: number
}
