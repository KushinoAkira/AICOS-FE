import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts"
import InternalLayout from "../../components/InternalLayout"
import { Card, KpiCard, StatusPill } from "../../components/ui"
import { useAuth } from "../../context/AuthContext"
import { formatLongDate, formatVND, formatVNDShort, greetingFor } from "../../lib/format"
import { ORDER_STATUS_LABEL } from "../../lib/orderStateMachine"
import { ISSUE_TRANSACTIONS, SOLD_OUT_ITEMS, TODAY_SHIFTS, TOP_ITEMS, WAITING_ORDERS, lastSevenDays } from "../../lib/mockData/dashboard"
import type { Page } from "../../App"

interface Props {
  navigate: (p: Page) => void
  /** "brand" = chain-wide view for the Brand Admin, "branch" = one branch for the Branch Manager. */
  scope?: "branch" | "brand"
}

export default function ManagerDashboard({ navigate, scope = "branch" }: Props) {
  const { user } = useAuth()
  const now = new Date()
  const days = lastSevenDays(now)
  const today = days[days.length - 1]
  const yesterday = days[days.length - 2]
  const delta = Math.round(((today.revenue - yesterday.revenue) / yesterday.revenue) * 100)
  const weekTotal = days.reduce((sum, d) => sum + d.revenue, 0)
  const max = Math.max(...days.map((d) => d.revenue))
  const brand = scope === "brand"
  const multiplier = brand ? 2 : 1

  return (
    <InternalLayout activePage={brand ? "brand-dashboard" : "manager-dashboard"} navigate={navigate}>
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-medium text-text-primary">
          {greetingFor(now)}, {user?.fullName ?? ""}
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          {formatLongDate(now)} · {brand ? "Tổng quan toàn chuỗi" : "Hoạt động chi nhánh hôm nay"}
        </p>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <KpiCard label="Doanh thu hôm nay" value={formatVND(today.revenue * multiplier)} hint={`${delta >= 0 ? "↑" : "↓"} ${Math.abs(delta)}% so hôm qua`} />
        <KpiCard label="Đơn hoàn tất" value={today.orders * multiplier} hint="đơn trong ngày" />
        <KpiCard label="Đơn đang chờ" value={WAITING_ORDERS.length} hint="cần xử lý ngay" tone="warn" />
        <KpiCard label="Món đang hết" value={SOLD_OUT_ITEMS.length} hint={SOLD_OUT_ITEMS.join(", ")} tone={SOLD_OUT_ITEMS.length ? "warn" : "neutral"} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="font-serif text-lg font-medium text-text-primary">Doanh thu 7 ngày</h2>
              <p className="mt-0.5 text-xs text-text-secondary">Đến hôm nay</p>
            </div>
            <p className="font-serif text-xl font-medium text-terracotta">{formatVND(weekTotal * multiplier)}</p>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={days} barSize={32} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "var(--color-text-secondary)" }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }} tickFormatter={formatVNDShort} />
              <Tooltip formatter={(v) => formatVND(Number(v))} cursor={{ fill: "rgba(230,220,203,0.3)" }} />
              <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                {days.map((d) => (
                  <Cell key={d.date} fill={d.revenue === max ? "var(--color-terracotta)" : "var(--color-border)"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h2 className="mb-4 font-serif text-lg font-medium text-text-primary">Giao dịch cần xử lý</h2>
          {ISSUE_TRANSACTIONS.length === 0 ? (
            <p className="text-sm text-text-secondary">Không có giao dịch nào cần xử lý.</p>
          ) : (
            <ul className="space-y-3">
              {ISSUE_TRANSACTIONS.map((t) => (
                <li key={t.code} className="flex items-start justify-between gap-3 text-sm">
                  <span className="font-medium text-text-primary">{t.code}</span>
                  <span className="text-right text-text-secondary">{t.reason}</span>
                </li>
              ))}
            </ul>
          )}
          {!brand && (
            <button onClick={() => navigate("branch-orders")} className="mt-4 text-sm font-medium text-clay hover:underline">
              Mở danh sách đơn →
            </button>
          )}
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <h2 className="mb-4 font-serif text-lg font-medium text-text-primary">Đơn đang chờ</h2>
          <ul className="divide-y divide-border">
            {WAITING_ORDERS.map((o) => (
              <li key={o.code} className="flex items-center justify-between py-3 text-sm">
                <span className="font-medium text-text-primary">{o.code}</span>
                <span className="text-text-secondary">{o.channel === "dine-in" ? "Tại bàn" : "Mang đi"} · {o.where}</span>
                <StatusPill tone={o.status === "Preparing" ? "success" : "pending"}>{ORDER_STATUS_LABEL[o.status]}</StatusPill>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <h2 className="mb-4 font-serif text-lg font-medium text-text-primary">Ca hôm nay</h2>
          <ul className="space-y-3">
            {TODAY_SHIFTS.map((s) => (
              <li key={s.name} className="flex items-center justify-between text-sm">
                <span><span className="font-medium text-text-primary">{s.name}</span> <span className="text-text-secondary">{s.time}</span></span>
                <span className="text-text-secondary">{s.staff} người</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card className="mt-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-lg font-medium text-text-primary">Món bán chạy hôm nay</h2>
          <button onClick={() => navigate("manager-reports")} className="text-sm font-medium text-clay hover:underline">
            Xem báo cáo →
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {TOP_ITEMS.map((item) => (
            <div key={item.name}>
              <p className="text-sm font-medium text-text-primary">{item.name}</p>
              <p className="text-xs text-text-secondary">{item.qty} ly</p>
            </div>
          ))}
        </div>
      </Card>
    </InternalLayout>
  )
}
