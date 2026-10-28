import { type ReactNode, useRef, useLayoutEffect, useState } from "react"
import { useAuth } from "../context/AuthContext"
import UserMenu from "./CustomerUserMenu"
import type { Page } from "../router/pages"
import type { Role } from "../router/roles"

type StaffRole = Exclude<Role, "customer">

interface NavItem {
  id: string
  label: string
  icon: ReactNode
}

const ICONS: Record<string, string> = {
  grid: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",
  building: "M3 21h18M5 21V5l7-3 7 3v16M9 9h2M13 9h2M9 13h2M13 13h2",
  users: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75",
  menu: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 3h6v4H9zM9 12h6M9 16h4",
  chart: "M3 3v18h18M7 15l4-4 3 3 5-6",
  tag: "M20.6 13.4l-7.2 7.2a2 2 0 01-2.8 0L3 13V3h10l7.6 7.6a2 2 0 010 2.8zM7.5 7.5h.01",
  heart: "M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 00-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 000-7.8z",
  card: "M2 5h20v14H2zM2 10h20",
  clock: "M12 3a9 9 0 100 18 9 9 0 000-18zM12 7v5l3 3",
  calendar: "M3 5h18v16H3zM3 10h18M8 3v4M16 3v4",
  swap: "M17 1l4 4-4 4M3 11V9a4 4 0 014-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 01-4 4H3",
  cash: "M2 6h20v12H2zM12 9a3 3 0 100 6 3 3 0 000-6z",
  table: "M3 7h18M3 12h18M9 7v10M15 7v10",
  list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  cup: "M5 8h12v6a5 5 0 01-5 5H10a5 5 0 01-5-5zM17 9h2a2 2 0 010 4h-2M8 2v3M12 2v3",
  shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  pulse: "M22 12h-4l-3 9L9 3l-3 9H2",
  plug: "M9 2v6M15 2v6M6 8h12v4a6 6 0 01-12 0zM12 18v4",
  doc: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M16 13H8M16 17H8",
  clock2: "M12 7v5l3 3M3 12a9 9 0 109-9",
}

const ic = (name: string): ReactNode => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d={ICONS[name]} />
  </svg>
)

const item = (id: string, label: string, icon: string): NavItem => ({ id, label, icon: ic(icon) })

const navMap: Record<StaffRole, NavItem[]> = {
  superAdmin: [
    item("platform-tenants", "Tenant", "building"),
    item("platform-plans", "Gói dịch vụ", "tag"),
    item("platform-subscriptions", "Đăng ký", "card"),
    item("platform-providers", "Cổng thanh toán", "plug"),
    item("platform-health", "Sức khỏe hệ thống", "pulse"),
    item("platform-revenue", "Doanh thu nền tảng", "chart"),
    item("platform-audit", "Nhật ký", "shield"),
  ],
  brandAdmin: [
    item("brand-dashboard", "Tổng quan", "grid"),
    item("brand-profile", "Thương hiệu", "cup"),
    item("admin-branches", "Chi nhánh", "building"),
    item("admin-users", "Tài khoản", "users"),
    item("manager-menu", "Thực đơn", "menu"),
    item("branch-tables", "Bàn & QR", "table"),
    item("brand-pickup", "Khung giờ lấy hàng", "clock"),
    item("brand-promotions", "Khuyến mãi", "tag"),
    item("brand-loyalty", "Tích điểm", "heart"),
    item("manager-reports", "Báo cáo", "chart"),
    item("manager-feedback", "Phản hồi", "heart"),
    item("brand-cancel-policy", "Chính sách hủy", "clock"),
    item("brand-pay-rules", "Quy tắc thanh toán", "card"),
    item("brand-merchant", "Cổng thanh toán", "card"),
    item("brand-subscription", "Gói đăng ký", "card"),
    item("admin-logs", "Nhật ký", "shield"),
  ],
  branchManager: [
    item("manager-dashboard", "Tổng quan", "grid"),
    item("branch-orders", "Đơn hàng", "list"),
    item("manager-menu", "Tình trạng món", "menu"),
    item("manager-staff", "Nhân sự", "users"),
    item("branch-schedule", "Lịch làm việc", "calendar"),
    item("branch-shift-requests", "Ca thay", "swap"),
    item("manager-payroll", "Bảng lương", "cash"),
    item("branch-tables", "Bàn & QR", "table"),
    item("branch-pickup", "Khung giờ lấy hàng", "clock"),
    item("manager-reports", "Báo cáo", "chart"),
    item("manager-feedback", "Phản hồi", "heart"),
  ],
  barista: [item("barista-queue", "Hàng đợi pha chế", "cup"), item("cashier-shift", "Ca làm việc", "clock2")],
  cashier: [
    item("cashier-pos", "Tạo đơn", "cash"),
    item("cashier-payments", "Thanh toán cần xử lý", "card"),
    item("cashier-tables", "Bàn và bill", "table"),
    item("cashier-shift", "Ca làm việc", "clock2"),
  ],
}

const roleLabel: Record<StaffRole, string> = {
  superAdmin: "Quản trị nền tảng",
  brandAdmin: "Quản trị thương hiệu",
  branchManager: "Quản lý chi nhánh",
  barista: "Pha chế",
  cashier: "Thu ngân",
}
interface Props {
  /** Ignored: the sidebar always follows the signed-in user's role. Kept so existing pages compile. */
  role?: string
  activePage: string
  navigate: (page: Page) => void
  children: ReactNode
  headerRight?: ReactNode
}

export default function InternalLayout({ activePage, navigate, children, headerRight }: Props) {
  const { user, role: userRole, logout } = useAuth()
  const role: StaffRole = userRole && userRole !== "customer" ? userRole : "cashier"
  const nav = navMap[role]
  const navContainerRef = useRef<HTMLDivElement>(null)
  const [pillStyle, setPillStyle] = useState<{ top: number; height: number }>({ top: 0, height: 40 })

  useLayoutEffect(() => {
    if (!navContainerRef.current) return
    const active = navContainerRef.current.querySelector("[data-active='true']") as HTMLElement | null
    if (active) {
      setPillStyle({ top: active.offsetTop, height: active.offsetHeight })
    }
  }, [activePage])

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: "#FAF6F0" }}>
      {/* Sidebar */}
      <aside
        className="flex flex-col flex-shrink-0 w-56 h-screen overflow-y-auto"
        style={{ backgroundColor: "#6F4E37" }}
      >
        {/* Logo */}
        <div className="px-6 pt-7 pb-8">
          <div className="flex items-center gap-2">
            <CoffeeBean />
            <span className="font-serif text-xl font-medium" style={{ color: "#FAF6F0", fontFamily: "'Literata', 'Inter', system-ui, sans-serif" }}>
              AICOS
            </span>
          </div>
          <div
            className="mt-1 text-xs font-medium tracking-widest uppercase"
            style={{ color: "rgba(250,246,240,0.45)", fontSize: "10px", letterSpacing: "0.08em" }}
          >
            {roleLabel[role]}
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 space-y-1 relative" ref={navContainerRef}>
          {/* Sliding active pill */}
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: pillStyle.top,
              height: pillStyle.height,
              backgroundColor: "rgba(250,246,240,0.15)",
              borderRadius: "10px",
              transition: "top 260ms cubic-bezier(0.16,1,0.3,1), height 160ms cubic-bezier(0.16,1,0.3,1)",
              pointerEvents: "none",
            }}
          />
          {nav.map((item) => {
            const active = activePage === item.id
            return (
              <button
                key={item.id}
                data-active={active ? "true" : "false"}
                onClick={() => navigate(item.id as Page)}
                className="flex items-center gap-3 w-full px-3 py-2.5 text-left relative"
                style={{
                  backgroundColor: "transparent",
                  color: active ? "#FAF6F0" : "rgba(250,246,240,0.6)",
                  borderRadius: "10px",
                  border: "none",
                  cursor: "pointer",
                  transition: "color 160ms",
                }}
                onMouseEnter={(e) => {
                  if (!active) (e.currentTarget as HTMLButtonElement).style.color = "rgba(250,246,240,0.85)"
                }}
                onMouseLeave={(e) => {
                  if (!active) (e.currentTarget as HTMLButtonElement).style.color = "rgba(250,246,240,0.6)"
                }}
              >
                <span style={{ opacity: active ? 1 : 0.75 }}>{item.icon}</span>
                <span className="text-sm font-medium">{item.label}</span>
                {item.id === "manager-suggestions" || item.id === "admin-ai-config" ? (
                  <span
                    className="ml-auto w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: "#7A8450" }}
                  />
                ) : null}
              </button>
            )
          })}
        </nav>

        {/* Bottom avatar */}
        <div className="p-4 mt-4">
          <button
            type="button"
            onClick={() => navigate("account-settings")}
            className="flex items-center gap-3 p-3 rounded-xl w-full text-left transition-all duration-150"
            style={{ backgroundColor: "rgba(250,246,240,0.08)", border: "none", cursor: "pointer" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(250,246,240,0.15)" }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(250,246,240,0.08)" }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0"
              style={{ backgroundColor: "#C97B4A", color: "#FAF6F0", fontFamily: "'Literata', 'Inter', system-ui, sans-serif" }}
            >
              {(user?.fullName ?? "?").charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium truncate" style={{ color: "#FAF6F0" }}>
                {user?.fullName ?? "Tài khoản"}
              </div>
              <div className="text-xs truncate" style={{ color: "rgba(250,246,240,0.5)" }}>
                {roleLabel[role]}
              </div>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(250,246,240,0.35)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
              <circle cx="12" cy="12" r="3"/>
              <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
            </svg>
          </button>
          <button
            type="button"
            onClick={() => void logout()}
            className="mt-2 w-full p-2 rounded-xl text-xs font-medium text-left transition-colors duration-150"
            style={{ backgroundColor: "transparent", border: "none", cursor: "pointer", color: "rgba(250,246,240,0.6)" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#FAF6F0" }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(250,246,240,0.6)" }}
          >
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {/* Top header */}
        <header
          className="flex items-center justify-between px-8 py-4 flex-shrink-0"
          style={{ borderBottom: "1px solid #E6DCCB", backgroundColor: "#FAF6F0" }}
        >
          <div />
          <div className="flex items-center gap-4">
            {headerRight}
            <UserMenu variant="staff" navigate={navigate} />
          </div>
        </header>
        <main className="flex-1 overflow-auto p-8">{children}</main>
      </div>
    </div>
  )
}

function CoffeeBean() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <ellipse cx="14" cy="14" rx="10" ry="13" fill="#C97B4A" />
      <path d="M14 4 Q16 14 14 24" stroke="#6F4E37" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    </svg>
  )
}
