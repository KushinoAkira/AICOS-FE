import { useQuery } from "@tanstack/react-query"
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import type { Page } from "../../App"
import { Card, EmptyState, KpiCard, QueryBoundary } from "../../components/ui"
import { formatVND, formatVNDShort } from "../../lib/format"
import { platformApi } from "../../lib/api/platform"
import { PlatformPage } from "./PlatformPage"

export default function PlatformRevenue({ navigate }: { navigate: (p: Page) => void }) {
  const revenue = useQuery({ queryKey: ["platform", "revenue"], queryFn: platformApi.revenue })
  return (
    <PlatformPage page="platform-revenue" navigate={navigate} uc="UC-10" title="Doanh thu nền tảng" subtitle="Chỉ gồm phí đăng ký SaaS. Doanh thu bán hàng của từng thương hiệu không hiển thị ở đây.">
      <QueryBoundary query={revenue}>
        {(rows) => {
          if (rows.length === 0) return <EmptyState title="Chưa có doanh thu" description="Khi ghi nhận thanh toán của tenant, doanh thu sẽ hiện ở đây." />
          const total = rows.reduce((s, r) => s + r.revenue, 0)
          const last = rows[rows.length - 1]
          const prev = rows[rows.length - 2]
          return (
            <>
              <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <KpiCard label={`Tổng ${rows.length} tháng`} value={formatVND(total)} />
                <KpiCard label={`Tháng ${last.month}`} value={formatVND(last.revenue)} hint={prev ? `${last.revenue >= prev.revenue ? "↑" : "↓"} so với tháng ${prev.month}` : undefined} />
                <KpiCard label="Trung bình tháng" value={formatVND(total / rows.length)} />
              </div>
              <Card>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={rows} barSize={36} margin={{ left: -5 }}>
                    <XAxis dataKey="month" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} tickFormatter={formatVNDShort} />
                    <Tooltip formatter={(v) => formatVND(Number(v))} cursor={{ fill: "rgba(230,220,203,0.3)" }} />
                    <Bar dataKey="revenue" fill="var(--color-terracotta)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </>
          )
        }}
      </QueryBoundary>
    </PlatformPage>
  )
}
