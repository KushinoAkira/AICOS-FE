import { useEffect } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { staffNoticeApi } from "./api/manage"
import { ordersApi } from "./api/orders"
import { addDays, todayKey } from "./dates"
import { noticeTarget, orderNameMap } from "./staffNotices"

/** Order code to drinks for the last few days of the branch, to name orders in notifications. Empty for accounts without branch orders. */
export function useOrderNames(enabled = true) {
  const q = useQuery({
    queryKey: ["notice-order-names"],
    queryFn: () => ordersApi.ordersInRange(addDays(todayKey(), -6), todayKey()).then(orderNameMap).catch(() => new Map<string, string>()),
    enabled, staleTime: 60_000, refetchInterval: 60_000,
  })
  return q.data ?? new Map<string, string>()
}

/**
 * Unread notifications counted per menu item (the screen that handles them). Opening that screen marks its notifications read,
 * so the badge clears; the bell keeps the full list.
 */
export function useNoticeBadges(role: string | null, activePage: string, enabled: boolean) {
  const qc = useQueryClient()
  const unread = useQuery({ queryKey: ["staff-notices", "list", true], queryFn: () => staffNoticeApi.list(true), enabled, refetchInterval: 15_000 })
  const rows = unread.data ?? []
  const counts = new Map<string, number>()
  for (const n of rows) {
    const target = noticeTarget(n.kind, role)
    if (target) counts.set(target, (counts.get(target) ?? 0) + 1)
  }
  const onThisPage = rows.filter((n) => noticeTarget(n.kind, role) === activePage).map((n) => n.id)
  const key = onThisPage.join(",")
  useEffect(() => {
    if (!key) return
    void Promise.all(key.split(",").map((id) => staffNoticeApi.read(id).catch(() => undefined)))
      .then(() => qc.invalidateQueries({ queryKey: ["staff-notices"] }))
  }, [key, qc])
  return counts
}
