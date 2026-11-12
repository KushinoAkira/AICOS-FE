import { useQuery } from "@tanstack/react-query"
import { staffNoticeApi } from "../lib/api/manage"
import type { Page } from "../router/pages"

/** The bell of the staff screens: how many notifications wait, and the way to them. */
export default function NotificationBell({ navigate }: { navigate: (p: Page) => void }) {
  const unread = useQuery({ queryKey: ["staff-notices", "unread"], queryFn: staffNoticeApi.unread, refetchInterval: 15_000 })
  const count = unread.data ?? 0
  return (
    <button
      type="button"
      onClick={() => navigate("staff-notifications")}
      aria-label={count > 0 ? `Thông báo, ${count} chưa đọc` : "Thông báo"}
      className="relative flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-text-primary"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0" />
      </svg>
      {count > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-state-danger px-1 text-xs font-medium text-white">{count > 99 ? "99+" : count}</span>}
    </button>
  )
}
