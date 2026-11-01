import { useState } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import type { Page } from "../../App"
import { PageFrame } from "../../components/PageFrame"
import { Button, Card, DataTable, EmptyState, Field, KpiCard, QueryBoundary, type Column } from "../../components/ui"
import { useAuth } from "../../context/AuthContext"
import { useToast } from "../../context/ToastContext"
import { branchesApi } from "../../lib/api/identity"
import { addDays, reportApi, today, type BranchRevenue, type HourCount, type MethodRevenue } from "../../lib/api/manage"
import { ordersApi } from "../../lib/api/orders"
import { formatVND } from "../../lib/format"

const METHOD_LABEL: Record<string, string> = { Cash: "Tiền mặt", Online: "Trực tuyến", Mock: "Mock", VietQR: "VietQR", Momo: "Momo", ZaloPay: "ZaloPay" }
const PRESETS = [{ label: "7 ngày", days: 7 }, { label: "30 ngày", days: 30 }, { label: "90 ngày", days: 90 }]

function Methods({ rows }: { rows: MethodRevenue[] }) {
  const columns: Column<MethodRevenue>[] = [
    { key: "m", header: "Hình thức", render: (m) => METHOD_LABEL[m.method] ?? m.method },
    { key: "o", header: "Đơn", sort: (m) => m.orders, render: (m) => m.orders },
    { key: "g", header: "Doanh thu", sort: (m) => m.grossRevenue, render: (m) => formatVND(m.grossRevenue) },
    { key: "r", header: "Đã hoàn", render: (m) => formatVND(m.refunded) },
    { key: "n", header: "Thuần", render: (m) => formatVND(m.netRevenue) },
  ]
  return <DataTable rows={rows} rowKey={(m) => m.method} columns={columns} emptyTitle="Chưa có thanh toán" />
}

function PeakHours({ rows }: { rows: HourCount[] }) {
  const active = rows.filter((h) => h.orders > 0)
  if (active.length === 0) return <EmptyState title="Chưa có đơn" />
  const max = Math.max(...active.map((h) => h.orders))
  return (
    <ul className="space-y-2 text-sm">
      {active.map((h) => (
        <li key={h.hour} className="flex items-center gap-3">
          <span className="w-12 text-text-secondary">{String(h.hour).padStart(2, "0")}:00</span>
          <span className="h-2 flex-1 rounded-full bg-bg-warm"><span className="block h-2 rounded-full bg-terracotta" style={{ width: `${(h.orders / max) * 100}%` }} /></span>
          <span className="w-8 text-right text-text-primary">{h.orders}</span>
        </li>
      ))}
    </ul>
  )
}

/** Best sellers of the period, added up from the orders themselves. */
function TopProducts({ from, to }: { from: string; to: string }) {
  const orders = useQuery({ queryKey: ["reports", "top", from, to], queryFn: () => ordersApi.ordersBetween(from, to) })
  return (
    <QueryBoundary query={orders}>
      {(rows) => {
        const totals = new Map<string, { qty: number; revenue: number }>()
        for (const o of rows.filter((x) => x.status !== "Cancelled" && x.status !== "Unfulfillable")) {
          for (const l of o.lines) {
            const t = totals.get(l.name) ?? { qty: 0, revenue: 0 }
            totals.set(l.name, { qty: t.qty + l.qty, revenue: t.revenue + l.qty * l.unitPrice })
          }
        }
        const top = [...totals.entries()].sort((a, b) => b[1].qty - a[1].qty).slice(0, 8)
        if (top.length === 0) return <EmptyState title="Chưa có món nào được bán" />
        return (
          <ol className="space-y-2 text-sm">
            {top.map(([name, t], i) => (
              <li key={name} className="flex justify-between gap-3"><span className="text-text-primary">{i + 1}. {name}</span><span className="text-text-secondary">{t.qty} ly · {formatVND(t.revenue)}</span></li>
            ))}
          </ol>
        )
      }}
    </QueryBoundary>
  )
}

/** UC-23/UC-36: the Brand Admin sees the whole chain and can open one branch; a Branch Manager sees their own branch. */
export default function ManagerReports({ navigate }: { navigate: (p: Page) => void }) {
  const { role } = useAuth()
  const brand = role === "brandAdmin"
  const { showToast } = useToast()
  const [to, setTo] = useState(today())
  const [from, setFrom] = useState(addDays(today(), -6))
  const [branchId, setBranchId] = useState("")
  const branches = useQuery({ queryKey: ["branches", "active"], queryFn: branchesApi.listActive, enabled: brand })
  const showChain = brand && !branchId
  const chain = useQuery({ queryKey: ["reports", "chain", from, to], queryFn: () => reportApi.chain({ from, to }), enabled: showChain })
  const branch = useQuery({ queryKey: ["reports", "branch", from, to, branchId], queryFn: () => reportApi.branch({ from, to, branchId: branchId || undefined }), enabled: !showChain })
  const exportFile = useMutation({
    mutationFn: () => (showChain ? reportApi.exportChain({ from, to }) : reportApi.exportBranch({ from, to, branchId: branchId || undefined })),
    onError: (e) => showToast(e.message, "error"),
  })
  const chainColumns: Column<BranchRevenue>[] = [
    { key: "b", header: "Chi nhánh", sort: (b) => b.branchName, render: (b) => <button onClick={() => setBranchId(b.branchId)} className="font-medium text-clay hover:underline">{b.branchName}</button> },
    { key: "o", header: "Đơn", sort: (b) => b.orders, render: (b) => b.orders },
    { key: "g", header: "Doanh thu", sort: (b) => b.grossRevenue, render: (b) => formatVND(b.grossRevenue) },
    { key: "r", header: "Đã hoàn", sort: (b) => b.refunded, render: (b) => formatVND(b.refunded) },
    { key: "n", header: "Thuần", sort: (b) => b.netRevenue, render: (b) => formatVND(b.netRevenue) },
    { key: "a", header: "TB/đơn", sort: (b) => b.averageOrderValue, render: (b) => formatVND(b.averageOrderValue) },
  ]
  const totals = showChain ? chain.data?.totals : branch.data?.totals

  return (
    <PageFrame
      page="manager-reports"
      navigate={navigate}
      uc={brand ? "UC-23" : "UC-36"}
      title="Báo cáo"
      subtitle={brand ? "Doanh thu toàn chuỗi và từng chi nhánh." : "Doanh thu, hình thức thanh toán và giờ cao điểm của chi nhánh."}
      action={<Button variant="secondary" loading={exportFile.isPending} onClick={() => exportFile.mutate()}>Xuất CSV</Button>}
    >
      <div className="mb-6 flex flex-wrap items-end gap-3">
        <div className="w-40"><Field label="Từ ngày" type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} /></div>
        <div className="w-40"><Field label="Đến ngày" type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} /></div>
        {PRESETS.map((p) => <Button key={p.days} variant="secondary" className="min-h-11" onClick={() => { const end = today(); setTo(end); setFrom(addDays(end, -(p.days - 1))) }}>{p.label}</Button>)}
        {brand && (
          <label className="block text-sm font-medium text-text-primary">Chi nhánh
            <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className="mt-1 block min-h-11 rounded-[10px] border border-border bg-surface px-3 text-sm">
              <option value="">Toàn chuỗi</option>
              {(branches.data ?? []).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </label>
        )}
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <KpiCard label="Doanh thu" value={formatVND(totals?.grossRevenue ?? 0)} hint={`${totals?.paidOrders ?? 0} đơn đã trả / ${totals?.orders ?? 0} đơn`} />
        <KpiCard label="Đã hoàn" value={formatVND(totals?.refunded ?? 0)} />
        <KpiCard label="Doanh thu thuần" value={formatVND(totals?.netRevenue ?? 0)} />
        <KpiCard label="Giá trị đơn TB" value={formatVND(totals?.averageOrderValue ?? 0)} />
      </div>

      {showChain ? (
        <QueryBoundary query={chain}>{(r) => <DataTable rows={r.branches} rowKey={(b) => b.branchId} columns={chainColumns} emptyTitle="Chưa có dữ liệu trong khoảng này" />}</QueryBoundary>
      ) : (
        <QueryBoundary query={branch}>
          {(r) => (
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="lg:col-span-2"><h2 className="mb-3 font-serif text-lg text-text-primary">Hình thức thanh toán</h2><Methods rows={r.paymentMethods} /></div>
              <Card><h2 className="mb-4 font-serif text-lg text-text-primary">Giờ có nhiều đơn</h2><PeakHours rows={r.hours} /></Card>
              <Card><h2 className="mb-4 font-serif text-lg text-text-primary">Món bán chạy</h2><TopProducts from={from} to={to} /></Card>
            </div>
          )}
        </QueryBoundary>
      )}
    </PageFrame>
  )
}
