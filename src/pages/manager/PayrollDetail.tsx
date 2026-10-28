import { useState } from "react"
import InternalLayout from "../../components/InternalLayout"
import type { Page } from "../../App"

interface Props {
  navigate: (p: Page) => void
}

const ATTENDANCE = [
  { date: "01/11", in: "07:58", out: "16:05", hours: 8, note: "" },
  { date: "02/11", in: "07:55", out: "16:00", hours: 8, note: "" },
  { date: "03/11", in: "08:17", out: "16:10", hours: 7.75, note: "Đi trễ 17 phút" },
  { date: "04/11", in: "07:50", out: "16:00", hours: 8, note: "" },
  { date: "05/11", in: "07:59", out: "16:05", hours: 8, note: "" },
  { date: "08/11", in: "07:45", out: "16:00", hours: 8, note: "" },
  { date: "09/11", in: "08:22", out: "16:15", hours: 7.75, note: "Đi trễ 22 phút" },
  { date: "10/11", in: "07:55", out: "16:00", hours: 8, note: "" },
  { date: "11/11", in: "07:50", out: "16:00", hours: 8, note: "" },
  { date: "12/11", in: "07:58", out: "16:05", hours: 8, note: "" },
  { date: "15/11", in: "07:45", out: "16:00", hours: 8, note: "" },
  { date: "16/11", in: "07:50", out: "16:00", hours: 8, note: "" },
  { date: "17/11", in: "07:48", out: "16:05", hours: 8, note: "" },
  { date: "18/11", in: "07:55", out: "16:00", hours: 8, note: "" },
  { date: "19/11", in: "07:58", out: "16:00", hours: 8, note: "" },
  { date: "22/11", in: "07:45", out: "16:00", hours: 8, note: "" },
  { date: "23/11", in: "07:50", out: "16:00", hours: 8, note: "" },
  { date: "24/11", in: "07:55", out: "16:05", hours: 8, note: "" },
  { date: "25/11", in: "07:40", out: "16:00", hours: 8, note: "" },
  { date: "26/11", in: "07:58", out: "16:00", hours: 8, note: "" },
  { date: "29/11", in: "07:50", out: "16:00", hours: 8, note: "" },
]

function fmt(n: number) {
  return new Intl.NumberFormat("vi-VN").format(n) + "đ"
}

export default function PayrollDetail({ navigate }: Props) {
  const [showModal, setShowModal] = useState(false)
  const [adjustReason, setAdjustReason] = useState("")
  const [adjustAmount, setAdjustAmount] = useState("")
  const [adjustType, setAdjustType] = useState<"bonus" | "deduct">("bonus")

  const BASE_RATE = 28_000
  const HOURS = 168
  const BONUS = 300_000
  const DEDUCT = -100_000
  const net = HOURS * BASE_RATE + BONUS + DEDUCT

  return (
    <InternalLayout
      role="manager"
      activePage="manager-payroll"
      navigate={(id) => navigate(id as Page)}
    >
      {/* Back button */}
      <button
        type="button"
        onClick={() => navigate("manager-payroll")}
        className="flex items-center gap-1.5 text-sm mb-6 transition-colors"
        style={{ color: "#8A7A6C", background: "none", border: "none", cursor: "pointer", padding: 0 }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#3A2E22" }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#8A7A6C" }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 12L6 8l4-4" />
        </svg>
        Quay lại
      </button>

      <div className="max-w-2xl">
        {/* Employee header */}
        <div className="flex items-center gap-4 mb-8">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-medium flex-shrink-0"
            style={{ backgroundColor: "#8B5E3C", color: "#FAF6F0", fontFamily: "'Literata', 'Times New Roman', serif" }}
          >
            L
          </div>
          <div>
            <h1 className="font-serif text-2xl font-medium" style={{ color: "#3A2E22", fontFamily: "'Literata', 'Times New Roman', serif" }}>
              Trần Thị Lan
            </h1>
            <p className="text-sm mt-0.5" style={{ color: "#8A7A6C" }}>Thu ngân · Cơ sở Quận 1</p>
          </div>
        </div>

        {/* Salary breakdown */}
        <div className="p-6 rounded-2xl mb-6" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E6DCCB" }}>
          <h2 className="text-sm font-medium mb-5 uppercase tracking-widest" style={{ color: "#8A7A6C", fontSize: "11px", letterSpacing: "0.08em" }}>
            Công thức tính lương
          </h2>

          <div className="space-y-3">
            <SalaryLine label={`Lương cơ bản theo giờ: ${HOURS} giờ × ${new Intl.NumberFormat("vi-VN").format(BASE_RATE)}đ`} value={fmt(HOURS * BASE_RATE)} />
            <SalaryLine label="Thưởng doanh số" value={`+${fmt(BONUS)}`} valueColor="#5C7A52" />
            <SalaryLine label="Phạt đi trễ (2 lần)" value={`-${fmt(Math.abs(DEDUCT))}`} valueColor="#A6534B" />
          </div>

          <div className="my-5" style={{ borderTop: "1px solid #E6DCCB" }} />

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium" style={{ color: "#3A2E22" }}>Thực lãnh</span>
            <span
              className="font-serif text-2xl font-medium"
              style={{ color: "#C97B4A", fontFamily: "'Literata', 'Times New Roman', serif" }}
            >
              {fmt(net)}
            </span>
          </div>
        </div>

        {/* Attendance table */}
        <div className="rounded-2xl overflow-hidden mb-8" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E6DCCB" }}>
          <div className="px-5 py-4" style={{ borderBottom: "1px solid #E6DCCB", backgroundColor: "#FAF6F0" }}>
            <h2 className="text-sm font-medium uppercase tracking-widest" style={{ color: "#8A7A6C", fontSize: "11px", letterSpacing: "0.08em" }}>
              Chi tiết chấm công — Tháng 11/2026
            </h2>
          </div>
          <div className="overflow-auto" style={{ maxHeight: "320px" }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid #E6DCCB" }}>
                  {["Ngày", "Giờ vào", "Giờ ra", "Số giờ", "Ghi chú"].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-medium" style={{ color: "#8A7A6C", fontSize: "10px", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ATTENDANCE.map((row, idx) => (
                  <tr
                    key={row.date}
                    style={{ borderBottom: idx < ATTENDANCE.length - 1 ? "1px solid #F5EFE6" : "none" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = "#FAF6F0" }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = "transparent" }}
                  >
                    <td className="px-5 py-3 tabular-nums" style={{ color: "#3A2E22" }}>{row.date}</td>
                    <td className="px-5 py-3 tabular-nums" style={{ color: "#3A2E22" }}>{row.in}</td>
                    <td className="px-5 py-3 tabular-nums" style={{ color: "#3A2E22" }}>{row.out}</td>
                    <td className="px-5 py-3 tabular-nums" style={{ color: "#3A2E22" }}>{row.hours}h</td>
                    <td className="px-5 py-3">
                      {row.note ? (
                        <span className="text-xs" style={{ color: "#B98A3D" }}>{row.note}</span>
                      ) : (
                        <span style={{ color: "#D6C5B3" }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => navigate("manager-payroll")}
            className="flex-1 py-3 text-sm font-medium transition-all duration-150"
            style={{ backgroundColor: "#C97B4A", color: "#FAF6F0", borderRadius: "10px", border: "none", cursor: "pointer" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#8B5E3C" }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#C97B4A" }}
          >
            Xác nhận chi trả
          </button>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="flex-1 py-3 text-sm font-medium transition-all duration-150"
            style={{ backgroundColor: "#FFFFFF", color: "#3A2E22", borderRadius: "10px", border: "1px solid #E6DCCB", cursor: "pointer" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#F5EFE6" }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#FFFFFF" }}
          >
            Điều chỉnh thủ công
          </button>
        </div>
      </div>

      {/* Manual adjust modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ backgroundColor: "rgba(58,46,34,0.4)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false) }}
        >
          <div className="w-full max-w-md p-6 rounded-2xl" style={{ backgroundColor: "#FFFFFF", boxShadow: "0 20px 60px rgba(58,46,34,0.2)" }}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-serif text-lg font-medium" style={{ color: "#3A2E22", fontFamily: "'Literata', 'Times New Roman', serif" }}>
                Điều chỉnh thủ công
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#8A7A6C" }}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
                  <path d="M4 4l12 12M16 4L4 16" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "#3A2E22" }}>Loại điều chỉnh</label>
                <div className="flex gap-2">
                  {(["bonus", "deduct"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setAdjustType(t)}
                      className="flex-1 py-2.5 text-sm font-medium rounded-xl transition-all duration-150"
                      style={{
                        border: `1.5px solid ${adjustType === t ? (t === "bonus" ? "#5C7A52" : "#A6534B") : "#E6DCCB"}`,
                        backgroundColor: adjustType === t ? (t === "bonus" ? "#EAEDE0" : "#FAE8E6") : "#FFFFFF",
                        color: adjustType === t ? (t === "bonus" ? "#5C7A52" : "#A6534B") : "#8A7A6C",
                        cursor: "pointer",
                      }}
                    >
                      {t === "bonus" ? "+ Thưởng" : "− Phạt / Khấu trừ"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: "#3A2E22" }}>Số tiền (đ)</label>
                <input
                  type="number"
                  min="0"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  placeholder="100000"
                  className="w-full px-4 py-3 text-sm outline-none transition-all duration-150"
                  style={{ border: "1px solid #E6DCCB", borderRadius: "10px", backgroundColor: "#FFFFFF", color: "#3A2E22", fontFamily: "'Inter', system-ui, sans-serif" }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "#C97B4A" }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "#E6DCCB" }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: "#3A2E22" }}>
                  Lý do <span style={{ color: "#A6534B" }}>*</span>
                </label>
                <textarea
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="Nhập lý do điều chỉnh..."
                  rows={3}
                  className="w-full px-4 py-3 text-sm outline-none transition-all duration-150 resize-none"
                  style={{ border: "1px solid #E6DCCB", borderRadius: "10px", backgroundColor: "#FFFFFF", color: "#3A2E22", fontFamily: "'Inter', system-ui, sans-serif" }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "#C97B4A" }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "#E6DCCB" }}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 text-sm font-medium transition-all duration-150"
                style={{ backgroundColor: "#FFFFFF", color: "#3A2E22", borderRadius: "10px", border: "1px solid #E6DCCB", cursor: "pointer" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#F5EFE6" }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#FFFFFF" }}
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={!adjustReason.trim() || !adjustAmount}
                onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 text-sm font-medium transition-all duration-150"
                style={{
                  backgroundColor: (adjustReason.trim() && adjustAmount) ? "#C97B4A" : "#D6C5B3",
                  color: "#FAF6F0",
                  borderRadius: "10px",
                  border: "none",
                  cursor: (adjustReason.trim() && adjustAmount) ? "pointer" : "not-allowed",
                }}
                onMouseEnter={(e) => { if (adjustReason.trim() && adjustAmount) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#8B5E3C" }}
                onMouseLeave={(e) => { if (adjustReason.trim() && adjustAmount) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#C97B4A" }}
              >
                Áp dụng
              </button>
            </div>
          </div>
        </div>
      )}
    </InternalLayout>
  )
}

function SalaryLine({ label, value, valueColor = "#3A2E22" }: { label: string; value: string; valueColor?: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm" style={{ color: "#8A7A6C" }}>{label}</span>
      <span className="text-sm font-medium tabular-nums flex-shrink-0" style={{ color: valueColor }}>{value}</span>
    </div>
  )
}
