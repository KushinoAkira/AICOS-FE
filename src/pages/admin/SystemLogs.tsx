import { useState } from "react"
import InternalLayout from "../../components/InternalLayout"
import type { Page } from "../../App"

interface Props {
  navigate: (p: Page) => void
}

type LogType = "all" | "login" | "price" | "delete" | "permission"

interface LogEntry {
  id: string
  type: Exclude<LogType, "all">
  description: string
  actor: string
  time: string
  timeLabel: string
}

const LOGS: LogEntry[] = [
  { id: "1", type: "price", description: "Nguyễn Anh Minh đã cập nhật giá món Cappuccino từ 50.000đ → 55.000đ", actor: "Nguyễn Anh Minh", time: "2026-09-12T10:32:00", timeLabel: "2 giờ trước" },
  { id: "2", type: "login", description: "Trần Thị Lan đã đăng nhập vào hệ thống từ thiết bị mới", actor: "Trần Thị Lan", time: "2026-09-12T09:15:00", timeLabel: "3 giờ trước" },
  { id: "3", type: "permission", description: "Nguyễn Anh Minh đã thay đổi vai trò của Võ Quốc Bảo từ Kho → Đã khóa", actor: "Nguyễn Anh Minh", time: "2026-09-12T08:50:00", timeLabel: "4 giờ trước" },
  { id: "4", type: "price", description: "Đặng Thu Hà đã cập nhật giá món Latte nghệ từ 48.000đ → 50.000đ", actor: "Đặng Thu Hà", time: "2026-09-11T17:20:00", timeLabel: "Hôm qua, 17:20" },
  { id: "5", type: "login", description: "Lê Văn Hùng đã đăng nhập vào hệ thống", actor: "Lê Văn Hùng", time: "2026-09-11T08:02:00", timeLabel: "Hôm qua, 08:02" },
  { id: "6", type: "delete", description: "Nguyễn Anh Minh đã xóa món Trà bạc hà khỏi thực đơn", actor: "Nguyễn Anh Minh", time: "2026-09-10T14:45:00", timeLabel: "10/09/2026, 14:45" },
  { id: "7", type: "permission", description: "Nguyễn Anh Minh đã thêm tài khoản mới: Phạm Văn Đức (Thu ngân)", actor: "Nguyễn Anh Minh", time: "2026-09-09T11:00:00", timeLabel: "09/09/2026, 11:00" },
  { id: "8", type: "price", description: "Đặng Thu Hà đã cập nhật giá toàn bộ nhóm Đá xay tăng 5.000đ", actor: "Đặng Thu Hà", time: "2026-09-08T09:30:00", timeLabel: "08/09/2026, 09:30" },
  { id: "9", type: "delete", description: "Trần Thị Lan đã xóa phiếu nhập kho số PN-20260907 (nhập nhầm)", actor: "Trần Thị Lan", time: "2026-09-07T16:15:00", timeLabel: "07/09/2026, 16:15" },
  { id: "10", type: "login", description: "Ngô Minh Tuấn đã cố đăng nhập vào hệ thống — tài khoản đang bị khóa", actor: "Ngô Minh Tuấn", time: "2026-09-06T20:10:00", timeLabel: "06/09/2026, 20:10" },
]

const TYPE_LABELS: Record<Exclude<LogType, "all">, string> = {
  login: "Đăng nhập",
  price: "Thay đổi giá",
  delete: "Xóa dữ liệu",
  permission: "Phân quyền",
}

const DATE_OPTIONS = ["7 ngày qua", "30 ngày qua", "Tháng này", "Quý này"]

function LogIcon({ type }: { type: LogEntry["type"] }) {
  const base = { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", strokeWidth: 1.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const }
  if (type === "login") return <svg {...base} stroke="#7A8450"><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3"/></svg>
  if (type === "price") return <svg {...base} stroke="#C97B4A"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
  if (type === "delete") return <svg {...base} stroke="#A6534B"><path d="M3 6h18M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
  return <svg {...base} stroke="#8B5E3C"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
}

function logIconBg(type: LogEntry["type"]) {
  if (type === "login") return "#EAEDE0"
  if (type === "price") return "#FDF0E6"
  if (type === "delete") return "#FAE8E6"
  return "#F5EFE6"
}

export default function AdminSystemLogs({ navigate }: Props) {
  const [typeFilter, setTypeFilter] = useState<LogType>("all")
  const [dateFilter, setDateFilter] = useState("7 ngày qua")

  const filtered = typeFilter === "all" ? LOGS : LOGS.filter((l) => l.type === typeFilter)

  return (
    <InternalLayout role="admin" activePage="admin-logs" navigate={(id) => navigate(id as Page)}>
      {/* Header */}
      <div className="mb-6 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-serif text-2xl font-medium" style={{ color: "#3A2E22", fontFamily: "'Literata', 'Inter', system-ui, sans-serif" }}>
            Nhật ký hệ thống
          </h1>
          <p className="text-sm mt-1" style={{ color: "#8A7A6C" }}>
            Theo dõi mọi thay đổi quan trọng trong hệ thống
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Type filter */}
          <div className="relative">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as LogType)}
              className="appearance-none pr-8 pl-3 py-2 text-sm font-medium rounded-xl cursor-pointer"
              style={{
                backgroundColor: "#FFFFFF",
                border: "1.5px solid #E6DCCB",
                color: "#3A2E22",
                outline: "none",
              }}
            >
              <option value="all">Tất cả hành động</option>
              <option value="login">Đăng nhập</option>
              <option value="price">Thay đổi giá</option>
              <option value="delete">Xóa dữ liệu</option>
              <option value="permission">Phân quyền</option>
            </select>
            <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#8A7A6C" strokeWidth="1.5" strokeLinecap="round"><path d="M2 4l4 4 4-4"/></svg>
          </div>
          {/* Date filter */}
          <div className="relative">
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="appearance-none pr-8 pl-3 py-2 text-sm font-medium rounded-xl cursor-pointer"
              style={{
                backgroundColor: "#FFFFFF",
                border: "1.5px solid #E6DCCB",
                color: "#3A2E22",
                outline: "none",
              }}
            >
              {DATE_OPTIONS.map((o) => <option key={o}>{o}</option>)}
            </select>
            <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#8A7A6C" strokeWidth="1.5" strokeLinecap="round"><path d="M2 4l4 4 4-4"/></svg>
          </div>
        </div>
      </div>

      {/* Log count */}
      <div className="mb-4">
        <span className="text-xs font-medium" style={{ color: "#8A7A6C" }}>
          {filtered.length} hoạt động · {dateFilter}
        </span>
      </div>

      {/* Log list */}
      <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "#FFFFFF", border: "1px solid #E6DCCB" }}>
        {filtered.map((log, idx) => (
          <div
            key={log.id}
            className="flex items-start gap-4 px-6 py-4 transition-colors"
            style={{ borderBottom: idx < filtered.length - 1 ? "1px solid #E6DCCB" : "none" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.backgroundColor = "#FAF6F0" }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.backgroundColor = "transparent" }}
          >
            {/* Icon */}
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{ backgroundColor: logIconBg(log.type) }}
            >
              <LogIcon type={log.type} />
            </div>

            {/* Description */}
            <div className="flex-1 min-w-0">
              <p className="text-sm leading-relaxed" style={{ color: "#3A2E22" }}>{log.description}</p>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: logIconBg(log.type),
                    color: log.type === "delete" ? "#A6534B" : log.type === "price" ? "#C97B4A" : log.type === "login" ? "#7A8450" : "#8B5E3C",
                  }}
                >
                  {TYPE_LABELS[log.type]}
                </span>
              </div>
            </div>

            {/* Actor + Time */}
            <div className="flex-shrink-0 text-right" style={{ minWidth: "160px" }}>
              <p className="text-xs font-medium" style={{ color: "#3A2E22" }}>{log.actor}</p>
              <p className="text-xs mt-0.5" style={{ color: "#8A7A6C" }}>{log.timeLabel}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Load more */}
      <div className="mt-4 text-center">
        <button
          className="text-sm font-medium px-6 py-2 rounded-xl transition-colors"
          style={{ backgroundColor: "transparent", color: "#8B5E3C", border: "1.5px solid #E6DCCB", cursor: "pointer" }}
        >
          Xem thêm nhật ký cũ hơn
        </button>
      </div>
    </InternalLayout>
  )
}
