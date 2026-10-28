import { useState } from "react"
import InternalLayout from "../../components/InternalLayout"
import type { Page } from "../../App"

interface Props {
  navigate: (p: Page) => void
}

const STAFF = [
  { id: "1", name: "Nguyễn Anh Minh", role: "Quản lý", branch: "Cơ sở Quận 1", status: "active", shift: "Sáng", avatar: "M", avatarBg: "#C97B4A" },
  { id: "2", name: "Trần Thị Lan", role: "Thu ngân", branch: "Cơ sở Quận 1", status: "active", shift: "Sáng", avatar: "L", avatarBg: "#8B5E3C" },
  { id: "3", name: "Lê Văn Hùng", role: "Thu ngân", branch: "Cơ sở Quận 1", status: "active", shift: "Chiều", avatar: "H", avatarBg: "#6F4E37" },
  { id: "4", name: "Phạm Thị Mai", role: "Kho", branch: "Cơ sở Quận 1", status: "active", shift: "Sáng", avatar: "M", avatarBg: "#7A8450" },
  { id: "5", name: "Võ Quốc Bảo", role: "Kho", branch: "Cơ sở Quận 1", status: "off", shift: "—", avatar: "B", avatarBg: "#A6534B" },
  { id: "6", name: "Đặng Thu Hà", role: "Quản lý", branch: "Cơ sở Quận 1", status: "active", shift: "Chiều", avatar: "H", avatarBg: "#C97B4A" },
  { id: "7", name: "Ngô Minh Tuấn", role: "Thu ngân", branch: "Cơ sở Quận 1", status: "locked", shift: "—", avatar: "T", avatarBg: "#8A7A6C" },
]

const DAYS = ["T2\n09/09", "T3\n10/09", "T4\n11/09", "T5\n12/09", "T6\n13/09", "T7\n14/09", "CN\n15/09"]

const SCHEDULE: Record<string, (string | null)[][]> = {
  "Sáng": [
    ["Lan", "Lan", "Lan", "Lan", "Lan", null, null],
    ["Hùng", null, "Hùng", null, "Hùng", "Hùng", "Hùng"],
    ["Mai", "Mai", "Mai", "Mai", "Mai", null, null],
    [null, "Minh", null, "Minh", null, "Minh", "Minh"],
  ],
  "Chiều": [
    [null, "Tuấn*", null, "Tuấn*", null, null, null],
    ["Hùng", "Hùng", null, null, "Hùng", "Hùng", null],
    [null, null, "Hà", null, "Hà", "Hà", "Hà"],
    ["Bảo*", null, "Bảo*", null, null, null, null],
  ],
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  active: { label: "Đang làm việc", bg: "#EAEDE0", text: "#5C7A52" },
  off:    { label: "Nghỉ hôm nay",  bg: "#F5EFE6", text: "#8A7A6C" },
  locked: { label: "Đã khóa",       bg: "#FAE8E6", text: "#A6534B" },
}

const ROLE_CONFIG: Record<string, { bg: string; text: string }> = {
  "Quản lý": { bg: "#FDF0E6", text: "#C97B4A" },
  "Thu ngân": { bg: "#F5EFE6", text: "#8B5E3C" },
  "Kho":     { bg: "#EAEDE0", text: "#7A8450" },
}

export default function ManagerEmployees({ navigate }: Props) {
  const [tab, setTab] = useState<"list" | "schedule">("list")

  const activeCount = STAFF.filter((s) => s.status === "active").length
  const onShiftCount = STAFF.filter((s) => s.shift !== "—").length
  const emptyShifts = 2

  return (
    <InternalLayout
      role="manager"
      activePage="manager-staff"
      navigate={(id) => navigate(id as Page)}
      headerRight={
        <button
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium transition-colors"
          style={{ backgroundColor: "#C97B4A", color: "#FAF6F0", borderRadius: "10px", border: "none", cursor: "pointer" }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#8B5E3C" }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#C97B4A" }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M7 1v12M1 7h12"/></svg>
          Thêm nhân viên
        </button>
      }
    >
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-medium" style={{ color: "#3A2E22", fontFamily: "'Literata', 'Inter', system-ui, sans-serif" }}>
          Nhân sự
        </h1>
        <p className="text-sm mt-1" style={{ color: "#8A7A6C" }}>{STAFF.length} nhân viên · Cơ sở Quận 1</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: "Tổng nhân viên", value: String(STAFF.length), sub: `${activeCount} đang hoạt động`, subColor: "#8A7A6C" },
          { label: "Đang trong ca", value: String(onShiftCount), sub: "ca sáng + chiều hôm nay", subColor: "#8A7A6C" },
          { label: "Ca trống hôm nay", value: String(emptyShifts), sub: "cần xếp ca thêm", subColor: "#B98A3D" },
        ].map((card) => (
          <div key={card.label} className="p-5 rounded-2xl" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E6DCCB" }}>
            <p className="text-xs mb-2" style={{ color: "#8A7A6C" }}>{card.label}</p>
            <p className="font-serif text-3xl font-medium mb-1" style={{ color: "#3A2E22", fontFamily: "'Literata', 'Inter', system-ui, sans-serif" }}>{card.value}</p>
            <p className="text-xs" style={{ color: card.subColor }}>{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl self-start inline-flex" style={{ backgroundColor: "#F5EFE6" }}>
        {(["list", "schedule"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-5 py-2 text-sm font-medium rounded-lg transition-all duration-150"
            style={{
              backgroundColor: tab === t ? "#FFFFFF" : "transparent",
              color: tab === t ? "#3A2E22" : "#8A7A6C",
              border: "none",
              cursor: "pointer",
              boxShadow: tab === t ? "0 1px 4px rgba(111,78,55,0.1)" : "none",
            }}
          >
            {t === "list" ? "Danh sách nhân viên" : "Lịch làm việc tuần"}
          </button>
        ))}
      </div>

      {/* Staff list */}
      {tab === "list" && (
        <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E6DCCB" }}>
          {STAFF.map((s, idx) => (
            <div
              key={s.id}
              className="flex items-center gap-4 px-6 py-4 transition-colors"
              style={{ borderBottom: idx < STAFF.length - 1 ? "1px solid #E6DCCB" : "none" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.backgroundColor = "#FAF6F0" }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.backgroundColor = "transparent" }}
            >
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0"
                style={{ backgroundColor: s.avatarBg, color: "#FAF6F0", fontFamily: "'Literata', 'Inter', system-ui, sans-serif" }}
              >
                {s.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium" style={{ color: "#3A2E22" }}>{s.name}</p>
                <p className="text-xs" style={{ color: "#8A7A6C" }}>{s.branch}</p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0" style={{ backgroundColor: ROLE_CONFIG[s.role]?.bg ?? "#F5EFE6", color: ROLE_CONFIG[s.role]?.text ?? "#8B5E3C" }}>
                {s.role}
              </span>
              <span className="text-xs" style={{ color: "#8A7A6C", minWidth: "60px" }}>Ca {s.shift}</span>
              <span className="px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0" style={{ backgroundColor: STATUS_CONFIG[s.status].bg, color: STATUS_CONFIG[s.status].text }}>
                {STATUS_CONFIG[s.status].label}
              </span>
              <button className="text-sm font-medium flex-shrink-0 transition-colors" style={{ color: "#8B5E3C", background: "none", border: "none", cursor: "pointer" }}>
                Xem
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Weekly schedule */}
      {tab === "schedule" && (
        <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E6DCCB" }}>
          {/* Day headers */}
          <div className="grid grid-cols-8 border-b" style={{ borderColor: "#E6DCCB" }}>
            <div className="px-4 py-3 text-xs font-medium" style={{ color: "#8A7A6C" }}>Ca / Ngày</div>
            {DAYS.map((d) => (
              <div key={d} className="px-2 py-3 text-center">
                {d.split("\n").map((line, i) => (
                  <div key={i} className={`text-xs ${i === 0 ? "font-medium" : ""}`} style={{ color: i === 0 ? "#3A2E22" : "#8A7A6C" }}>{line}</div>
                ))}
              </div>
            ))}
          </div>
          {/* Shift rows */}
          {(["Sáng", "Chiều"] as const).map((shift) => (
            <div key={shift}>
              <div className="px-4 py-2 text-xs font-medium uppercase tracking-widest" style={{ color: "#8A7A6C", fontSize: "10px", letterSpacing: "0.08em", backgroundColor: "#FAF6F0", borderBottom: "1px solid #E6DCCB" }}>
                Ca {shift}
              </div>
              {SCHEDULE[shift].map((row, rowIdx) => (
                <div key={rowIdx} className="grid grid-cols-8" style={{ borderBottom: "1px solid #E6DCCB" }}>
                  <div className="px-4 py-3" />
                  {row.map((cell, dayIdx) => (
                    <div key={dayIdx} className="px-2 py-3 text-center">
                      {cell ? (
                        <span
                          className="inline-block px-2 py-1 rounded-full text-xs font-medium"
                          style={{
                            backgroundColor: cell.includes("*") ? "#FAE8E6" : "#F5EFE6",
                            color: cell.includes("*") ? "#A6534B" : "#8B5E3C",
                          }}
                        >
                          {cell.replace("*", "")}
                        </span>
                      ) : (
                        <span
                          className="inline-block px-2 py-1 rounded-full text-xs border"
                          style={{ borderStyle: "dashed", borderColor: "#E6DCCB", color: "rgba(138,122,108,0.5)" }}
                        >
                          Trống
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </InternalLayout>
  )
}
