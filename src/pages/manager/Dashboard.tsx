import { useQuery } from "@tanstack/react-query"
import type { Page } from "../../App"
import InternalLayout from "../../components/InternalLayout"
import { OrderStatusPill } from "../../components/OrderStatusPill"
import { Card, EmptyState, KpiCard, QueryBoundary } from "../../components/ui"
import { useAuth } from "../../context/AuthContext"
import { attendanceApi, addDays, reportApi, today, type DayRevenue } from "../../lib/api/manage"
import { ordersApi } from "../../lib/api/orders"
import { formatLongDate, formatTime, formatVND, formatVNDShort, greetingFor } from "../../lib/format"
import { pollWhile, useBranchRealtime } from "../../lib/realtime"

interface Props {
  navigate: (p: Page) => void
  /** "brand" = chain-wide view for the Brand Admin, "branch" = one branch for the Branch Manager. */
  scope?: "branch" | "brand"
}

/** Seven days ending today, with the days that sold nothing filled in. */
function lastWeek(days: DayRevenue[], to: string) {
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(to, i - 6)
    return days.find((d) => d.date === date) ?? { date, orders: 0, grossRevenue: 0 }
  })
}

function WeekBars({ days }: { days: { date: string; grossRevenue: number }[] }) {
  const max = Math.max(1, ...days.map((d) => d.grossRevenue))
  return (
    <ul className="flex h-44 items-end gap-3" aria-label="Doanh thu 7 ngày">
      {days.map((d) => (
        <li key={d.date} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
          <span className="text-[11px] text-text-secondary">{d.grossRevenue ? formatVNDShort(d.grossRevenue) : ""}</span>
          <span className="w-full rounded-t-[6px] bg-terracotta" style={{ height: `${Math.max(2, (d.grossRevenue / max) * 100)}%` }} />
          <span className="text-[11px] text-text-secondary">{d.date.slice(8)}/{d.date.slice(5, 7)}</span>
        </li>
      ))}
    </ul>
  )
}

export default function ManagerDashboard({ navigate, scope = "branch" }: Props) {
  return (
    <InternalLayout activePage={scope === "brand" ? "brand-dashboard" : "manager-dashboard"} navigate={navigate}>
      {scope === "brand" ? <BrandView navigate={navigate} /> : <BranchView navigate={navigate} />}
    </InternalLayout>
  )
}

function Greeting({ note }: { note: string }) {
  const { user } = useAuth()
  const now = new Date()
  return (
    <div className="mb-8">
      <h1 className="font-serif text-3xl font-medium text-text-primary">{greetingFor(now)}, {user?.fullName ?? ""}</h1>
      <p className="mt-1 text-sm text-text-secondary">{formatLongDate(now)} · {note}</p>
    </div>
  )
}

function BranchView({ navigate }: { navigate: (p: Page) => void }) {
  const day = today()
  const live = useBranchRealtime()
  const week = useQuery({ queryKey: ["reports", "branch", "week", day], queryFn: () => reportApi.branch({ from: addDays(day, -6), to: day }) })
  const orders = useQuery({ queryKey: ["orders"], queryFn: ordersApi.orders, refetchInterval: pollWhile(live, 10000) })
  const shifts = useQuery({ queryKey: ["attendance", day], queryFn: () => attendanceApi.report({ from: day, to: day }) })
  const days = lastWeek(week.data?.days ?? [], day)
  const todayRow = days[6]!
  const yesterday = days[5]!
  const delta = yesterday.grossRevenue ? Math.round(((todayRow.grossRevenue - yesterday.grossRevenue) / yesterday.grossRevenue) * 100) : null
  const waiting = (orders.data ?? []).filter((o) => o.status === "Pending" || o.status === "Preparing")
  const ready = (orders.data ?? []).filter((o) => o.status === "Ready")
  const pendingReview = (shifts.data?.summary ?? []).reduce((s, x) => s + x.pendingReview, 0)
  return (
    <>
      <Greeting note="Hoạt động chi nhánh hôm nay" />
      <div className="mb-8 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <KpiCard label="Doanh thu hôm nay" value={formatVND(todayRow.grossRevenue)} hint={delta === null ? "Chưa có số hôm qua để so" : `${delta >= 0 ? "↑" : "↓"} ${Math.abs(delta)}% so với hôm qua`} />
        <KpiCard label="Đơn hôm nay" value={todayRow.orders} hint="đơn trong ngày" />
        <KpiCard label="Đơn đang chờ" value={waiting.length} hint={`${ready.length} đơn sẵn sàng giao`} tone={waiting.length ? "warn" : "neutral"} />
        <KpiCard label="Ca chờ duyệt" value={pendingReview} hint="chấm công hôm nay" tone={pendingReview ? "warn" : "neutral"} />
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <h2 className="mb-6 font-serif text-lg font-medium text-text-primary">Doanh thu 7 ngày</h2>
          <QueryBoundary query={week}>{() => <WeekBars days={days} />}</QueryBoundary>
        </Card>
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-serif text-lg font-medium text-text-primary">Ca hôm nay</h2>
            <button onClick={() => navigate("branch-attendance")} className="text-sm text-clay hover:underline">Chấm công</button>
          </div>
          <QueryBoundary query={shifts}>
            {(r) => r.rows.length === 0 ? <EmptyState title="Hôm nay chưa xếp ca" /> : (
              <ul className="space-y-3 text-sm">
                {r.rows.map((row) => (
                  <li key={row.shift.id} className="flex justify-between gap-2">
                    <span className="text-text-primary">{row.shift.employeeName}<span className="block text-xs text-text-secondary">{row.shift.startTime.slice(0, 5)} - {row.shift.endTime.slice(0, 5)}</span></span>
                    <span className="text-xs text-text-secondary">{row.shift.checkInAtUtc ? `Vào ${formatTime(row.shift.checkInAtUtc)}` : "Chưa vào ca"}</span>
                  </li>
                ))}
              </ul>
            )}
          </QueryBoundary>
        </Card>
        <Card className="xl:col-span-3">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-serif text-lg font-medium text-text-primary">Đơn cần xử lý</h2>
            <button onClick={() => navigate("branch-orders")} className="text-sm text-clay hover:underline">Tất cả đơn</button>
          </div>
          <QueryBoundary query={orders}>
            {() => waiting.length === 0 ? <EmptyState title="Không có đơn đang chờ" /> : (
              <ul className="divide-y divide-border text-sm">
                {waiting.slice(0, 8).map((o) => (
                  <li key={o.id} className="flex items-center justify-between gap-3 py-2">
                    <span className="min-w-0 truncate text-text-primary"><b>{o.code}</b> · {o.channel === "takeaway" ? "Mang đi" : `Bàn ${o.tableCode}`}</span>
                    <OrderStatusPill status={o.status} />
                  </li>
                ))}
              </ul>
            )}
          </QueryBoundary>
        </Card>
      </div>
    </>
  )
}

function BrandView({ navigate }: { navigate: (p: Page) => void }) {
  const day = today()
  const week = useQuery({ queryKey: ["reports", "chain", "week", day], queryFn: () => reportApi.chain({ from: addDays(day, -6), to: day }) })
  const todayOnly = useQuery({ queryKey: ["reports", "chain", "day", day], queryFn: () => reportApi.chain({ from: day, to: day }) })
  return (
    <>
      <Greeting note="Tổng quan toàn chuỗi" />
      <div className="mb-8 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <KpiCard label="Doanh thu hôm nay" value={formatVND(todayOnly.data?.totals.grossRevenue ?? 0)} hint={`${todayOnly.data?.totals.orders ?? 0} đơn`} />
        <KpiCard label="Doanh thu 7 ngày" value={formatVND(week.data?.totals.grossRevenue ?? 0)} hint={`${week.data?.totals.orders ?? 0} đơn`} />
        <KpiCard label="Doanh thu thuần 7 ngày" value={formatVND(week.data?.totals.netRevenue ?? 0)} hint={`Đã hoàn ${formatVND(week.data?.totals.refunded ?? 0)}`} />
        <KpiCard label="Giá trị đơn trung bình" value={formatVND(week.data?.totals.averageOrderValue ?? 0)} hint="7 ngày qua" />
      </div>
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-lg font-medium text-text-primary">Chi nhánh trong 7 ngày</h2>
          <button onClick={() => navigate("manager-reports")} className="text-sm text-clay hover:underline">Xem báo cáo</button>
        </div>
        <QueryBoundary query={week}>
          {(r) => r.branches.length === 0 ? <EmptyState title="Chưa có dữ liệu" /> : (
            <ul className="space-y-4 text-sm">
              {r.branches.map((b) => (
                <li key={b.branchId}>
                  <p className="flex justify-between gap-3"><span className="font-medium text-text-primary">{b.branchName}</span><span className="text-text-secondary">{formatVND(b.grossRevenue)} · {b.orders} đơn</span></p>
                  <div className="mt-1 h-2 rounded-full bg-bg-warm"><div className="h-2 rounded-full bg-terracotta" style={{ width: `${Math.round(b.revenueShare > 1 ? b.revenueShare : b.revenueShare * 100)}%` }} /></div>
                </li>
              ))}
            </ul>
          )}
        </QueryBoundary>
      </Card>
    </>
  )
}
