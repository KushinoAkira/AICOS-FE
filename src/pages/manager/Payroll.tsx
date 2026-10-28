import { useState } from "react"
import InternalLayout from "../../components/InternalLayout"
import type { Page } from "../../App"

interface Props {
  navigate: (p: Page) => void
}

const MONTHS = ["Tháng 7/2026", "Tháng 8/2026", "Tháng 9/2026", "Tháng 10/2026", "Tháng 11/2026", "Tháng 12/2026"]

const STAFF_PAYROLL = [
  { id: "1", name: "Nguyễn Anh Minh", role: "Quản lý", avatar: "M", avatarBg: "#C97B4A", hours: 176, base: 5_280_000, bonus: 500_000, deduct: 0, paid: true },
  { id: "2", name: "Trần Thị Lan", role: "Thu ngân", avatar: "L", avatarBg: "#8B5E3C", hours: 168, base: 4_704_000, bonus: 300_000, deduct: -100_000, paid: true },
  { id: "3", name: "Lê Văn Hùng", role: "Thu ngân", avatar: "H", avatarBg: "#6F4E37", hours: 152, base: 4_256_000, bonus: 0, deduct: -200_000, paid: false },
  { id: "4", name: "Phạm Thị Mai", role: "Kho", avatar: "M", avatarBg: "#7A8450", hours: 168, base: 4_200_000, bonus: 150_000, deduct: 0, paid: false },
  { id: "5", name: "Đặng Thu Hà", role: "Quản lý", avatar: "H", avatarBg: "#C97B4A", hours: 160, base: 4_800_000, bonus: 400_000, deduct: -50_000, paid: true },
  { id: "6", name: "Ngô Minh Tuấn", role: "Thu ngân", avatar: "T", avatarBg: "#8A7A6C", hours: 88, base: 2_464_000, bonus: 0, deduct: -300_000, paid: false },
]

function fmt(n: number) {
  return new Intl.NumberFormat("vi-VN").format(Math.abs(n)) + "đ"
}

export default function ManagerPayroll({ navigate }: Props) {
  const [monthIdx, setMonthIdx] = useState(4)

  const totalPay = STAFF_PAYROLL.reduce((s, e) => s + e.base + e.bonus + e.deduct, 0)
  const paidCount = STAFF_PAYROLL.filter((e) => e.paid).length
  const pendingCount = STAFF_PAYROLL.filter((e) => !e.paid).length

  return (
    <InternalLayout
      role="manager"
      activePage="manager-payroll"
      navigate={(id) => navigate(id as Page)}
      headerRight={
        <ExportButton />
      }
    >
      <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-serif text-2xl font-medium" style={{ color: "#3A2E22", fontFamily: "'Literata', 'Inter', system-ui, sans-serif" }}>
            Bảng lương
          </h1>
          <p className="text-sm mt-1" style={{ color: "#8A7A6C" }}>Quản lý chi trả lương nhân viên theo tháng</p>
        </div>
        <MonthPicker monthIdx={monthIdx} months={MONTHS} onChange={setMonthIdx} />
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <KpiCard label="Tổng chi lương" value={fmt(totalPay)} sub="tháng này" subColor="#8A7A6C" />
        <KpiCard label="Đã chi trả" value={String(paidCount)} sub="nhân viên" subColor="#5C7A52" />
        <KpiCard label="Chưa chốt công" value={String(pendingCount)} sub="cần xác nhận" subColor="#B98A3D" />
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E6DCCB" }}>
        <div
          className="grid text-xs font-medium uppercase tracking-wide px-6 py-3"
          style={{
            gridTemplateColumns: "2fr 1fr 80px 1fr 80px 80px 1fr 100px 80px",
            color: "#8A7A6C",
            backgroundColor: "#FAF6F0",
            borderBottom: "1px solid #E6DCCB",
            letterSpacing: "0.05em",
            fontSize: "10px",
          }}
        >
          <span>Nhân viên</span>
          <span>Vị trí</span>
          <span>Giờ công</span>
          <span>Lương cơ bản</span>
          <span>Thưởng</span>
          <span>Khấu trừ</span>
          <span>Thực lãnh</span>
          <span>Trạng thái</span>
          <span></span>
        </div>

        {STAFF_PAYROLL.map((emp, idx) => {
          const net = emp.base + emp.bonus + emp.deduct
          return (
            <div
              key={emp.id}
              className="grid items-center px-6 py-4 transition-colors"
              style={{
                gridTemplateColumns: "2fr 1fr 80px 1fr 80px 80px 1fr 100px 80px",
                borderBottom: idx < STAFF_PAYROLL.length - 1 ? "1px solid #E6DCCB" : "none",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.backgroundColor = "#FAF6F0" }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.backgroundColor = "transparent" }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0"
                  style={{ backgroundColor: emp.avatarBg, color: "#FAF6F0", fontFamily: "'Literata', 'Inter', system-ui, sans-serif" }}
                >
                  {emp.avatar}
                </div>
                <span className="text-sm font-medium truncate" style={{ color: "#3A2E22" }}>{emp.name}</span>
              </div>
              <span className="text-sm" style={{ color: "#8A7A6C" }}>{emp.role}</span>
              <span className="text-sm tabular-nums" style={{ color: "#3A2E22" }}>{emp.hours}h</span>
              <span className="text-sm tabular-nums" style={{ color: "#3A2E22" }}>{fmt(emp.base)}</span>
              <span className="text-sm tabular-nums font-medium" style={{ color: emp.bonus ? "#5C7A52" : "#D6C5B3" }}>
                {emp.bonus ? `+${fmt(emp.bonus)}` : "—"}
              </span>
              <span className="text-sm tabular-nums font-medium" style={{ color: emp.deduct ? "#A6534B" : "#D6C5B3" }}>
                {emp.deduct ? `-${fmt(emp.deduct)}` : "—"}
              </span>
              <span
                className="font-serif text-sm font-medium tabular-nums"
                style={{ color: "#3A2E22", fontFamily: "'Literata', 'Inter', system-ui, sans-serif" }}
              >
                {fmt(net)}
              </span>
              <span
                className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium w-fit"
                style={{
                  backgroundColor: emp.paid ? "#EAEDE0" : "#FDF0E6",
                  color: emp.paid ? "#5C7A52" : "#B98A3D",
                }}
              >
                {emp.paid ? "Đã chi trả" : "Chưa chi trả"}
              </span>
              <button
                className="text-sm font-medium transition-colors text-right"
                style={{ color: "#8B5E3C", background: "none", border: "none", cursor: "pointer" }}
                onClick={() => navigate("manager-payroll-detail")}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#6F4E37" }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#8B5E3C" }}
              >
                Xem chi tiết
              </button>
            </div>
          )
        })}
      </div>
    </InternalLayout>
  )
}

function KpiCard({ label, value, sub, subColor }: { label: string; value: string; sub: string; subColor: string }) {
  return (
    <div className="p-5 rounded-2xl" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E6DCCB" }}>
      <p className="text-xs mb-2" style={{ color: "#8A7A6C" }}>{label}</p>
      <p className="font-serif text-3xl font-medium mb-1" style={{ color: "#3A2E22", fontFamily: "'Literata', 'Inter', system-ui, sans-serif" }}>{value}</p>
      <p className="text-xs" style={{ color: subColor }}>{sub}</p>
    </div>
  )
}

function MonthPicker({ monthIdx, months, onChange }: { monthIdx: number; months: string[]; onChange: (i: number) => void }) {
  return (
    <div className="flex items-center gap-1" style={{ border: "1px solid #E6DCCB", borderRadius: "10px", backgroundColor: "#FFFFFF", overflow: "hidden" }}>
      <button
        type="button"
        onClick={() => onChange(Math.max(0, monthIdx - 1))}
        className="px-3 py-2.5 transition-colors"
        style={{ background: "none", border: "none", cursor: "pointer", color: "#8A7A6C" }}
        disabled={monthIdx === 0}
        aria-label="Tháng trước"
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#FAF6F0" }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent" }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 12L6 8l4-4" />
        </svg>
      </button>
      <span className="text-sm font-medium px-2" style={{ color: "#3A2E22", minWidth: "130px", textAlign: "center" }}>
        {months[monthIdx]}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(months.length - 1, monthIdx + 1))}
        className="px-3 py-2.5 transition-colors"
        style={{ background: "none", border: "none", cursor: "pointer", color: "#8A7A6C" }}
        disabled={monthIdx === months.length - 1}
        aria-label="Tháng sau"
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#FAF6F0" }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent" }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 12l4-4-4-4" />
        </svg>
      </button>
    </div>
  )
}

function ExportButton() {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium transition-colors"
        style={{ border: "1px solid #E6DCCB", backgroundColor: "#FFFFFF", color: "#3A2E22", borderRadius: "10px", cursor: "pointer" }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#F5EFE6" }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#FFFFFF" }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
        </svg>
        Xuất bảng lương
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
          <path d="M3 5l3 3 3-3" />
        </svg>
      </button>
      {open && (
        <div
          className="absolute right-0 mt-1 py-1 rounded-xl shadow-lg z-20"
          style={{ backgroundColor: "#FFFFFF", border: "1px solid #E6DCCB", minWidth: "140px" }}
        >
          {["Excel (.xlsx)", "PDF (.pdf)"].map((label) => (
            <button
              key={label}
              type="button"
              onClick={() => setOpen(false)}
              className="w-full text-left px-4 py-2.5 text-sm transition-colors"
              style={{ background: "none", border: "none", cursor: "pointer", color: "#3A2E22" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#FAF6F0" }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent" }}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
