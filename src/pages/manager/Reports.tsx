import { useState, useRef, useEffect } from "react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LineChart, Line } from "recharts"
import InternalLayout from "../../components/InternalLayout"
import type { Page } from "../../App"

interface Props {
  navigate: (p: Page) => void
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const MENU_DATA: Record<string, { name: string; qty: number; revenue: number; img: string }[]> = {
  "7 ngày": [
    { name: "Cà phê sữa đá", qty: 312, revenue: 14040000, img: "https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=60&h=60&fit=crop&auto=format" },
    { name: "Cappuccino",     qty: 218, revenue: 11990000, img: "https://images.unsplash.com/photo-1570968915860-54d5c301fa9f?w=60&h=60&fit=crop&auto=format" },
    { name: "Đá xay matcha", qty: 185, revenue: 10175000, img: "https://images.unsplash.com/photo-1541167760496-1628856ab772?w=60&h=60&fit=crop&auto=format" },
    { name: "Trà đào cam sả",qty: 162, revenue: 7776000,  img: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=60&h=60&fit=crop&auto=format" },
    { name: "Bánh croissant", qty: 143, revenue: 5434000,  img: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=60&h=60&fit=crop&auto=format" },
    { name: "Espresso đơn",   qty: 128, revenue: 4480000,  img: "https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=60&h=60&fit=crop&auto=format" },
    { name: "Latte nghệ",     qty: 98,  revenue: 4900000,  img: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=60&h=60&fit=crop&auto=format" },
  ],
  "30 ngày": [
    { name: "Cà phê sữa đá", qty: 1240, revenue: 55800000, img: "https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=60&h=60&fit=crop&auto=format" },
    { name: "Cappuccino",     qty: 892,  revenue: 49060000, img: "https://images.unsplash.com/photo-1570968915860-54d5c301fa9f?w=60&h=60&fit=crop&auto=format" },
    { name: "Đá xay matcha", qty: 745,  revenue: 40975000, img: "https://images.unsplash.com/photo-1541167760496-1628856ab772?w=60&h=60&fit=crop&auto=format" },
    { name: "Trà đào cam sả",qty: 638,  revenue: 30624000, img: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=60&h=60&fit=crop&auto=format" },
    { name: "Bánh croissant", qty: 521,  revenue: 19798000, img: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=60&h=60&fit=crop&auto=format" },
    { name: "Espresso đơn",   qty: 489,  revenue: 17115000, img: "https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=60&h=60&fit=crop&auto=format" },
    { name: "Latte nghệ",     qty: 412,  revenue: 20600000, img: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=60&h=60&fit=crop&auto=format" },
  ],
}

const REVENUE_CHART: Record<string, { day: string; value: number }[]> = {
  "7 ngày": [
    { day: "T2", value: 3200000 }, { day: "T3", value: 2800000 }, { day: "T4", value: 4100000 },
    { day: "T5", value: 3600000 }, { day: "T6", value: 5200000 }, { day: "T7", value: 6800000 }, { day: "CN", value: 7400000 },
  ],
  "30 ngày": [
    { day: "T1", value: 28000000 }, { day: "T2", value: 31000000 }, { day: "T3", value: 35000000 }, { day: "T4", value: 39500000 },
  ],
}

const CUSTOMER_DATA = {
  newByDay: [
    { day: "T2", value: 12 }, { day: "T3", value: 8 }, { day: "T4", value: 15 },
    { day: "T5", value: 11 }, { day: "T6", value: 19 }, { day: "T7", value: 24 }, { day: "CN", value: 28 },
  ],
  tiers: [
    { label: "Khách mới", count: 62, pct: 44, color: "#E6DCCB" },
    { label: "Thành viên Đồng", count: 48, pct: 34, color: "#C97B4A" },
    { label: "Thành viên Bạc", count: 22, pct: 16, color: "#8B5E3C" },
    { label: "Thành viên Vàng", count: 9, pct: 6, color: "#B98A3D" },
  ],
}

// ─── Presets ───────────────────────────────────────────────────────────────────

interface Preset { id: string; label: string; range: string; dataKey: string }
const PRESETS: Preset[] = [
  { id: "today",     label: "Hôm nay",    range: "12/09 – 12/09/2026", dataKey: "7 ngày" },
  { id: "yesterday", label: "Hôm qua",    range: "11/09 – 11/09/2026", dataKey: "7 ngày" },
  { id: "7days",     label: "7 ngày",     range: "06/09 – 12/09/2026", dataKey: "7 ngày" },
  { id: "30days",    label: "30 ngày",    range: "13/08 – 12/09/2026", dataKey: "30 ngày" },
  { id: "month",     label: "Tháng này",  range: "01/09 – 12/09/2026", dataKey: "7 ngày" },
  { id: "quarter",   label: "Quý này",    range: "01/07 – 30/09/2026", dataKey: "30 ngày" },
  { id: "custom",    label: "Tùy chỉnh",  range: "",                   dataKey: "7 ngày" },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtMd(n: number) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}Mđ`
  return `${(n / 1000).toFixed(0)}k đ`
}

function DeltaBadge({ pct, positive }: { pct: string; positive: boolean }) {
  return (
    <span className="text-xs font-medium px-1.5 py-0.5 rounded-full" style={{ backgroundColor: positive ? "#EAEDE0" : "#FAE8E6", color: positive ? "#5C7A52" : "#A6534B" }}>
      {positive ? "↑" : "↓"} {pct}
    </span>
  )
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="px-3 py-2 rounded-xl text-xs" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E6DCCB", boxShadow: "0 4px 12px rgba(111,78,55,0.12)" }}>
      <p className="font-medium mb-0.5" style={{ color: "#3A2E22" }}>{label}</p>
      <p style={{ color: "#C97B4A" }}>{payload[0].value.toLocaleString("vi-VN")}đ</p>
    </div>
  )
}

const REPORT_TABS = ["Doanh thu", "Món bán chạy", "Khách hàng"]

// ─── Main component ───────────────────────────────────────────────────────────

export default function ManagerReports({ navigate }: Props) {
  const [activePreset, setActivePreset] = useState<Preset>(PRESETS[2])
  const [customStart, setCustomStart] = useState("2026-09-06")
  const [customEnd, setCustomEnd]     = useState("2026-09-12")
  const [pickerOpen, setPickerOpen]   = useState(false)
  const [compare, setCompare]         = useState(false)
  const [activeTab, setActiveTab]     = useState("Món bán chạy")
  const [exportOpen, setExportOpen]   = useState(false)
  const [branch, setBranch]           = useState("Tất cả chi nhánh")

  const pickerRef = useRef<HTMLDivElement>(null)
  const exportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setPickerOpen(false)
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setExportOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  const dataKey = activePreset.dataKey
  const menuItems = MENU_DATA[dataKey] ?? MENU_DATA["7 ngày"]
  const revenueData = REVENUE_CHART[dataKey] ?? REVENUE_CHART["7 ngày"]
  const maxRevenue = Math.max(...revenueData.map((d) => d.value))
  const totalRevenue = menuItems.reduce((s, i) => s + i.revenue, 0)
  const totalQty     = menuItems.reduce((s, i) => s + i.qty, 0)

  const displayRange = activePreset.id === "custom"
    ? `${customStart.split("-").reverse().join("/")} – ${customEnd.split("-").reverse().join("/")}`
    : activePreset.range

  function selectPreset(p: Preset) {
    setActivePreset(p)
    if (p.id !== "custom") setPickerOpen(false)
  }

  return (
    <InternalLayout role="manager" activePage="manager-reports" navigate={(id) => navigate(id as Page)}>
      {/* ── Page header ────────────────────────────────────────────── */}
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-medium mb-5" style={{ color: "#3A2E22", fontFamily: "'Fraunces', Georgia, serif" }}>
          Báo cáo
        </h1>

        {/* Filter bar */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Date range picker trigger */}
          <div ref={pickerRef} className="relative">
            <button
              onClick={() => setPickerOpen(!pickerOpen)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-colors"
              style={{
                backgroundColor: pickerOpen ? "#F5EFE6" : "#FFFFFF",
                border: `1.5px solid ${pickerOpen ? "#C97B4A" : "#E6DCCB"}`,
                color: "#3A2E22",
                cursor: "pointer",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8A7A6C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
              </svg>
              <span style={{ color: "#3A2E22" }}>{displayRange || "Chọn khoảng thời gian"}</span>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#8A7A6C" strokeWidth="1.5" strokeLinecap="round"><path d="M2 4l4 4 4-4"/></svg>
            </button>

            {/* Picker popover */}
            {pickerOpen && (
              <div
                className="absolute top-full mt-2 left-0 z-30 rounded-2xl overflow-hidden"
                style={{ backgroundColor: "#FFFFFF", border: "1px solid #E6DCCB", boxShadow: "0 12px 40px rgba(111,78,55,0.15)", minWidth: "320px" }}
              >
                <div className="p-2">
                  {PRESETS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => selectPreset(p)}
                      className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-left transition-colors"
                      style={{
                        backgroundColor: activePreset.id === p.id ? "#F5EFE6" : "transparent",
                        color: activePreset.id === p.id ? "#8B5E3C" : "#3A2E22",
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      <span className="text-sm font-medium">{p.label}</span>
                      {p.id !== "custom" && (
                        <span className="text-xs" style={{ color: "#8A7A6C" }}>{p.range}</span>
                      )}
                    </button>
                  ))}
                </div>
                {activePreset.id === "custom" && (
                  <div className="px-4 pb-4 pt-2" style={{ borderTop: "1px solid #E6DCCB" }}>
                    <p className="text-xs font-medium mb-3" style={{ color: "#8A7A6C" }}>Chọn khoảng ngày</p>
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        value={customStart}
                        onChange={(e) => setCustomStart(e.target.value)}
                        className="flex-1 px-3 py-2 text-xs rounded-xl"
                        style={{ border: "1.5px solid #E6DCCB", backgroundColor: "#FAF6F0", color: "#3A2E22", outline: "none" }}
                      />
                      <span className="text-xs" style={{ color: "#8A7A6C" }}>–</span>
                      <input
                        type="date"
                        value={customEnd}
                        onChange={(e) => setCustomEnd(e.target.value)}
                        className="flex-1 px-3 py-2 text-xs rounded-xl"
                        style={{ border: "1.5px solid #E6DCCB", backgroundColor: "#FAF6F0", color: "#3A2E22", outline: "none" }}
                      />
                    </div>
                    <button
                      onClick={() => setPickerOpen(false)}
                      className="mt-3 w-full py-2 text-sm font-medium rounded-xl"
                      style={{ backgroundColor: "#C97B4A", color: "#FAF6F0", border: "none", cursor: "pointer" }}
                    >
                      Áp dụng
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Branch dropdown */}
          <div className="relative">
            <select
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              className="appearance-none pr-8 pl-3 py-2 text-sm font-medium rounded-xl cursor-pointer"
              style={{ backgroundColor: "#FFFFFF", border: "1.5px solid #E6DCCB", color: "#3A2E22", outline: "none" }}
            >
              <option>Tất cả chi nhánh</option>
              <option>Cơ sở Quận 1</option>
            </select>
            <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#8A7A6C" strokeWidth="1.5" strokeLinecap="round"><path d="M2 4l4 4 4-4"/></svg>
          </div>

          {/* Compare toggle */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <div
              onClick={() => setCompare(!compare)}
              className="relative transition-colors"
              style={{
                width: "36px", height: "20px", borderRadius: "999px", cursor: "pointer",
                backgroundColor: compare ? "#7A8450" : "#E6DCCB",
              }}
            >
              <div
                className="absolute top-1 transition-all duration-150"
                style={{
                  width: "12px", height: "12px", borderRadius: "50%",
                  backgroundColor: "#FFFFFF",
                  left: compare ? "20px" : "4px",
                }}
              />
            </div>
            <span className="text-sm" style={{ color: "#3A2E22" }}>So sánh kỳ trước</span>
          </label>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Export dropdown */}
          <div ref={exportRef} className="relative">
            <button
              onClick={() => setExportOpen(!exportOpen)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-colors"
              style={{ backgroundColor: "transparent", color: "#8B5E3C", border: "1.5px solid #E6DCCB", cursor: "pointer" }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 1v8M4 6l3 3 3-3M1 11h12v2H1z"/>
              </svg>
              Xuất báo cáo
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M2 4l4 4 4-4"/></svg>
            </button>
            {exportOpen && (
              <div
                className="absolute top-full mt-2 right-0 z-30 rounded-xl overflow-hidden"
                style={{ backgroundColor: "#FFFFFF", border: "1px solid #E6DCCB", boxShadow: "0 8px 24px rgba(111,78,55,0.12)", minWidth: "160px" }}
              >
                {["Xuất Excel (.xlsx)", "Xuất PDF"].map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setExportOpen(false)}
                    className="w-full text-left px-4 py-2.5 text-sm transition-colors"
                    style={{ backgroundColor: "transparent", color: "#3A2E22", border: "none", cursor: "pointer" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#FAF6F0" }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent" }}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Report type tabs ────────────────────────────────────────── */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl inline-flex" style={{ backgroundColor: "#F5EFE6" }}>
        {REPORT_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-4 py-2 text-sm font-medium rounded-lg transition-all duration-150"
            style={{
              backgroundColor: activeTab === tab ? "#FFFFFF" : "transparent",
              color: activeTab === tab ? "#3A2E22" : "#8A7A6C",
              border: "none",
              cursor: "pointer",
              boxShadow: activeTab === tab ? "0 1px 4px rgba(111,78,55,0.1)" : "none",
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── Tab: Doanh thu ─────────────────────────────────────────── */}
      {activeTab === "Doanh thu" && (
        <div>
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {[
              { label: "Tổng doanh thu", value: fmtMd(totalRevenue), delta: "8.4%", pos: true },
              { label: "Trung bình mỗi ngày", value: fmtMd(Math.round(totalRevenue / (dataKey === "30 ngày" ? 30 : 7))), delta: "3.1%", pos: true },
              { label: "Ngày cao nhất", value: fmtMd(maxRevenue), delta: "2.5%", pos: false },
            ].map((card) => (
              <div key={card.label} className="p-5 rounded-2xl" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E6DCCB" }}>
                <p className="text-xs mb-2" style={{ color: "#8A7A6C" }}>{card.label}</p>
                <div className="flex items-end gap-2">
                  <p className="font-serif text-2xl font-medium" style={{ color: "#C97B4A", fontFamily: "'Fraunces', Georgia, serif" }}>{card.value}</p>
                  {compare && <DeltaBadge pct={card.delta} positive={card.pos} />}
                </div>
              </div>
            ))}
          </div>
          {/* Chart */}
          <div className="p-6 rounded-2xl" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E6DCCB" }}>
            <h2 className="font-serif text-lg font-medium mb-4" style={{ color: "#3A2E22", fontFamily: "'Fraunces', Georgia, serif" }}>
              Doanh thu theo ngày
            </h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={revenueData} barSize={36} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#8A7A6C" }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#8A7A6C" }} tickFormatter={(v) => v >= 1000000 ? `${(v/1000000).toFixed(0)}M` : `${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(230,220,203,0.3)" }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {revenueData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.value === maxRevenue ? "#C97B4A" : entry.value > maxRevenue * 0.7 ? "#D9955D" : "#E6DCCB"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Tab: Món bán chạy ──────────────────────────────────────── */}
      {activeTab === "Món bán chạy" && (
        <div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-5 rounded-2xl" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E6DCCB" }}>
              <p className="text-xs mb-2" style={{ color: "#8A7A6C" }}>Tổng doanh thu</p>
              <div className="flex items-end gap-2">
                <p className="font-serif text-3xl font-medium" style={{ color: "#C97B4A", fontFamily: "'Fraunces', Georgia, serif" }}>{fmtMd(totalRevenue)}</p>
                {compare && <DeltaBadge pct="8.4%" positive={true} />}
              </div>
            </div>
            <div className="p-5 rounded-2xl" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E6DCCB" }}>
              <p className="text-xs mb-2" style={{ color: "#8A7A6C" }}>Tổng lượt bán</p>
              <div className="flex items-end gap-2">
                <p className="font-serif text-3xl font-medium" style={{ color: "#3A2E22", fontFamily: "'Fraunces', Georgia, serif" }}>{totalQty.toLocaleString("vi-VN")}</p>
                {compare && <DeltaBadge pct="5.2%" positive={true} />}
              </div>
            </div>
          </div>

          <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E6DCCB" }}>
            <div className="px-6 py-4" style={{ borderBottom: "1px solid #E6DCCB" }}>
              <p className="text-xs font-medium uppercase tracking-widest" style={{ color: "#8A7A6C", fontSize: "10px", letterSpacing: "0.08em" }}>Top món bán chạy</p>
            </div>
            {menuItems.map((item, idx) => {
              const pct = (item.qty / menuItems[0].qty) * 100
              return (
                <div
                  key={item.name}
                  className="flex items-center gap-5 px-6 py-5 transition-colors"
                  style={{ borderBottom: idx < menuItems.length - 1 ? "1px solid #E6DCCB" : "none" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.backgroundColor = "#FAF6F0" }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.backgroundColor = "transparent" }}
                >
                  <div className="w-10 flex-shrink-0 text-center">
                    <span className="font-serif font-medium" style={{ color: idx === 0 ? "#C97B4A" : idx === 1 ? "#8B5E3C" : idx === 2 ? "#B98A3D" : "#E6DCCB", fontFamily: "'Fraunces', Georgia, serif", fontSize: idx < 3 ? "28px" : "22px" }}>
                      {idx + 1}
                    </span>
                  </div>
                  <img src={item.img} alt={item.name} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" style={{ backgroundColor: "#F5EFE6" }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium mb-2" style={{ color: "#3A2E22" }}>{item.name}</p>
                    <div className="relative h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "#F5EFE6" }}>
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: idx === 0 ? "#C97B4A" : "#D9B99A" }} />
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-serif text-lg font-medium" style={{ color: "#3A2E22", fontFamily: "'Fraunces', Georgia, serif" }}>{item.qty.toLocaleString("vi-VN")}</p>
                    <p className="text-xs" style={{ color: "#C97B4A" }}>{fmtMd(item.revenue)}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Tab: Khách hàng ────────────────────────────────────────── */}
      {activeTab === "Khách hàng" && (
        <div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {[
              { label: "Khách mới", value: "117", sub: "đăng ký tuần này", delta: "22%", pos: true },
              { label: "Khách quay lại", value: "248", sub: "đã đặt ≥ 2 lần", delta: "5%", pos: true },
              { label: "Điểm thưởng phát ra", value: "4.2k", sub: "điểm trong tuần", delta: "1.8%", pos: false },
            ].map((card) => (
              <div key={card.label} className="p-5 rounded-2xl" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E6DCCB" }}>
                <p className="text-xs mb-2" style={{ color: "#8A7A6C" }}>{card.label}</p>
                <div className="flex items-end gap-2">
                  <p className="font-serif text-3xl font-medium" style={{ color: "#3A2E22", fontFamily: "'Fraunces', Georgia, serif" }}>{card.value}</p>
                  {compare && <DeltaBadge pct={card.delta} positive={card.pos} />}
                </div>
                <p className="text-xs mt-1" style={{ color: "#8A7A6C" }}>{card.sub}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* New customers chart */}
            <div className="p-6 rounded-2xl" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E6DCCB" }}>
              <h2 className="font-serif text-base font-medium mb-4" style={{ color: "#3A2E22", fontFamily: "'Fraunces', Georgia, serif" }}>Khách mới theo ngày</h2>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={CUSTOMER_DATA.newByDay} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#8A7A6C" }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#8A7A6C" }} />
                  <Tooltip content={({ active, payload, label }) => active && payload?.length ? (
                    <div className="px-3 py-2 rounded-xl text-xs" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E6DCCB" }}>
                      <p style={{ color: "#3A2E22" }}>{label}: <strong>{payload[0].value} khách mới</strong></p>
                    </div>
                  ) : null} />
                  <Line type="monotone" dataKey="value" stroke="#C97B4A" strokeWidth={2} dot={{ fill: "#C97B4A", r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Loyalty tier */}
            <div className="p-6 rounded-2xl" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E6DCCB" }}>
              <h2 className="font-serif text-base font-medium mb-4" style={{ color: "#3A2E22", fontFamily: "'Fraunces', Georgia, serif" }}>Phân tầng thành viên</h2>
              <div className="space-y-3">
                {CUSTOMER_DATA.tiers.map((tier) => (
                  <div key={tier.label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm" style={{ color: "#3A2E22" }}>{tier.label}</span>
                      <span className="text-sm font-medium" style={{ color: "#3A2E22" }}>{tier.count} <span className="text-xs font-normal" style={{ color: "#8A7A6C" }}>({tier.pct}%)</span></span>
                    </div>
                    <div className="relative h-2 rounded-full overflow-hidden" style={{ backgroundColor: "#F5EFE6" }}>
                      <div className="h-full rounded-full" style={{ width: `${tier.pct}%`, backgroundColor: tier.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </InternalLayout>
  )
}
