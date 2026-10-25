/**
 * Helpers for the real-backend adapters (`lib/api/be/*`). The backend contract is FE-INTEGRATION-API-REFERENCE.md;
 * anything it does not offer is reported by `unsupported()` and listed in docs/be-integration-gaps.md.
 */
import { ApiError, type PagedResponse } from "../http"

/** The backend has no endpoint for this screen action. The message is shown to the user as-is. */
export function unsupported(what: string): never {
  throw new ApiError(501, `Backend chưa có API cho: ${what}.`, "not_implemented")
}

/** Lists come back either as a bare array or as `{ items }` (paged). */
export function itemsOf<T>(r: T[] | PagedResponse<T> | { items: T[] } | null | undefined): T[] {
  if (!r) return []
  return Array.isArray(r) ? r : r.items ?? []
}

export const str = (v: unknown, fallback = ""): string => (typeof v === "string" ? v : v == null ? fallback : String(v))
export const num = (v: unknown, fallback = 0): number => (typeof v === "number" && Number.isFinite(v) ? v : Number(v) || fallback)
export const bool = (v: unknown, fallback = false): boolean => (typeof v === "boolean" ? v : fallback)

/** Loose view of an API object whose exact fields the reference only partly lists. */
export type Raw = Record<string, unknown>
export const rec = (v: unknown): Raw => (v && typeof v === "object" ? (v as Raw) : {})
export const recs = (v: unknown): Raw[] => (Array.isArray(v) ? v.map(rec) : [])

/** `2026-11-02` in the browser's local day. */
export const ymd = (d: Date): string => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`

export function randomPassword(): string {
  const bytes = crypto.getRandomValues(new Uint32Array(2))
  return `Aicos@${bytes[0]!.toString(36)}${bytes[1]!.toString(36)}`.slice(0, 16)
}
