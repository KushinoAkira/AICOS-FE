import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Bar, BarChart, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import type { Page } from "../../App"
import { Card, EmptyState, Field, KpiCard, QueryBoundary } from "../../components/ui"
import { formatVND, formatVNDShort } from "../../lib/format"
import { platformApi, type RevenueReport } from "../../lib/api/platform"
import { PlatformPage } from "./PlatformPage"

/** YYYY-MM of today plus `add` months. */
const monthOf = (add = 0) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + add); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}` }
const label = (ym: string) => { const [y, m] = ym.split("-"); return `${m}/${y}` }
const range = (from: string, to: string) => (from === to ? `tháng ${label(from)}` : `${label(from)} – ${label(to)}`)
const change = (a: number, b: number) => (b === 0 ? (a === 0 ? "0%" : "mới") : `${a >= b ? "+" : ""}${Math.round(((a - b) / b) * 100)}%`)

/** UC-10: SaaS revenue of a chosen period; another period can be compared with it (total, plans bought most, month by month). */
export default function PlatformRevenue({ navigate }: { navigate: (p: Page) => void }) {
  const [from, setFrom] = useState(monthOf(-5))
  const [to, setTo] = useState(monthOf(0))
  const [compare, setCompare] = useState(false)
  const [cFrom, setCFrom] = useState(monthOf(-11))
  const [cTo, setCTo] = useState(monthOf(-6))
  const valid = (a: string, b: string) => !!a && !!b && a <= b
  const main = useQuery({ queryKey: ["platform", "revenue", from, to], queryFn: () => platformApi.revenueReport(from, to), enabled: valid(from, to) })
  const other = useQuery({ queryKey: ["platform", "revenue", cFrom, cTo], queryFn: () => platformApi.revenueReport(cFrom, cTo), enabled: compare && valid(cFrom, cTo) })

  const monthInputs = (a: string, setA: (v: string) => void, b: string, setB: (v: string) => void, prefix: string) => (
    <div className="flex flex-wrap items-end gap-3">
      <div className="w-40"><Field label={`${prefix} từ tháng`} type="month" value={a} max={b} onChange={(e) => setA(e.target.value)} /></div>
      <div className="w-40"><Field label="đến tháng" type="month" value={b} min={a} onChange={(e) => setB(e.target.value)} /></div>
    </div>
  )

  return (
    <PlatformPage page="platform-revenue" navigate={navigate} uc="UC-10" title="Doanh thu nền tảng" subtitle="Chỉ gồm phí đăng ký SaaS. Doanh thu bán hàng của từng thương hiệu không hiển thị ở đây.">
      <div className="mb-6 flex flex-wrap items-end gap-6">
        {monthInputs(from, setFrom, to, setTo, "Kỳ xem:")}
        <label className="flex items-center gap-2 pb-3 text-sm text-text-primary"><input type="checkbox" checked={compare} onChange={(e) => setCompare(e.target.checked)} /> So sánh với kỳ khác</label>
        {compare && monthInputs(cFrom, setCFrom, cTo, setCTo, "Kỳ so sánh:")}
      </div>
      {!valid(from, to) && <p className="mb-4 text-sm text-state-danger">Tháng bắt đầu phải trước tháng kết thúc.</p>}
      <QueryBoundary query={main}>
        {(a) => <Report a={a} aLabel={range(from, to)} b={compare ? other.data : undefined} bLabel={range(cFrom, cTo)} comparing={compare} />}
      </QueryBoundary>
    </PlatformPage>
  )
}

function Report({ a, aLabel, b, bLabel, comparing }: { a: RevenueReport; aLabel: string; b?: RevenueReport; bLabel: string; comparing: boolean }) {
  if (a.total === 0 && (!b || b.total === 0)) return <EmptyState title="Chưa có doanh thu trong kỳ này" description="Khi ghi nhận thanh toán của tenant, doanh thu sẽ hiện ở đây." />
  const months = a.byMonth.length || 1
  const payments = a.byPlan.reduce((s, p) => s + p.payments, 0)
  const top = [...a.byPlan].sort((x, y) => y.payments - x.payments || y.amount - x.amount)[0]
  // Plans of both periods side by side: how many times each was paid and how much it brought.
  const planNames = [...new Set([...a.byPlan, ...(b?.byPlan ?? [])].map((p) => p.planName))]
  const plans = planNames.map((name) => {
    const pa = a.byPlan.find((p) => p.planName === name), pb = b?.byPlan.find((p) => p.planName === name)
    return { name, aPayments: pa?.payments ?? 0, aAmount: pa?.amount ?? 0, bPayments: pb?.payments ?? 0, bAmount: pb?.amount ?? 0 }
  }).sort((x, y) => y.aPayments - x.aPayments || y.aAmount - x.aAmount)
  const byIndex = a.byMonth.map((m, i) => ({ name: label(m.month), [aLabel]: m.revenue, ...(b ? { [bLabel]: b.byMonth[i]?.revenue ?? 0, [`${bLabel} (tháng)`]: b.byMonth[i] ? label(b.byMonth[i]!.month) : "" } : {}) }))

  return (
    <>
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label={`Doanh thu ${aLabel}`} value={formatVND(a.total)} hint={b ? `${change(a.total, b.total)} so với ${bLabel} (${formatVND(b.total)})` : undefined} />
        <KpiCard label="Trung bình mỗi tháng" value={formatVND(a.total / months)} hint={b ? `${bLabel}: ${formatVND(b.total / (b.byMonth.length || 1))}` : undefined} />
        <KpiCard label="Số lần thanh toán gói" value={String(payments)} hint={b ? `${bLabel}: ${b.byPlan.reduce((s, p) => s + p.payments, 0)}` : undefined} />
        <KpiCard label="Gói được mua nhiều nhất" value={top ? top.planName : "-"} hint={top ? `${top.payments} lần · ${formatVND(top.amount)}` : undefined} />
      </div>

      <Card className="mb-6">
        <h2 className="mb-3 font-serif text-lg text-text-primary">Doanh thu theo tháng{comparing && b ? ` · ${aLabel} so với ${bLabel}` : ""}</h2>
        {comparing && b && <p className="mb-2 text-xs text-text-secondary">Cột thứ n của hai kỳ được đặt cạnh nhau (tháng 1 của kỳ này cạnh tháng 1 của kỳ so sánh).</p>}
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={byIndex} barSize={comparing && b ? 22 : 36} margin={{ left: -5 }}>
            <XAxis dataKey="name" axisLine={false} tickLine={false} />
            <YAxis axisLine={false} tickLine={false} tickFormatter={formatVNDShort} />
            <Tooltip formatter={(v) => formatVND(Number(v))} cursor={{ fill: "rgba(230,220,203,0.3)" }} />
            {comparing && b && <Legend />}
            <Bar dataKey={aLabel} fill="var(--color-terracotta)" radius={[6, 6, 0, 0]} />
            {comparing && b && <Bar dataKey={bLabel} fill="var(--color-espresso)" radius={[6, 6, 0, 0]} />}
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card>
        <h2 className="mb-3 font-serif text-lg text-text-primary">Gói dịch vụ được mua</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-secondary">
                <th className="py-2 pr-3">Gói</th>
                <th className="py-2 pr-3 text-right">Lần mua · {aLabel}</th>
                <th className="py-2 pr-3 text-right">Doanh thu · {aLabel}</th>
                {b && <><th className="py-2 pr-3 text-right">Lần mua · {bLabel}</th><th className="py-2 pr-3 text-right">Doanh thu · {bLabel}</th><th className="py-2 text-right">Chênh lệch</th></>}
              </tr>
            </thead>
            <tbody>
              {plans.map((p) => (
                <tr key={p.name} className="border-b border-border last:border-0">
                  <td className="py-2 pr-3 text-text-primary">{p.name}</td>
                  <td className="py-2 pr-3 text-right">{p.aPayments}</td>
                  <td className="py-2 pr-3 text-right">{formatVND(p.aAmount)}</td>
                  {b && <><td className="py-2 pr-3 text-right">{p.bPayments}</td><td className="py-2 pr-3 text-right">{formatVND(p.bAmount)}</td><td className={`py-2 text-right ${p.aAmount >= p.bAmount ? "text-state-success" : "text-state-danger"}`}>{change(p.aAmount, p.bAmount)}</td></>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  )
}
