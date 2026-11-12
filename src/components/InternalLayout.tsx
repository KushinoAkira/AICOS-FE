import { type ReactNode, useEffect, useRef, useState } from "react"
import { useAuth } from "../context/AuthContext"
import { useBrand } from "../context/BrandContext"
import { useActiveBranch } from "../hooks/useActiveBranch"
import UserMenu from "./CustomerUserMenu"
import NotificationBell from "./NotificationBell"
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
  map: "M1 6l7-3 8 3 7-3v15l-7 3-8-3-7 3zM8 3v15M16 6v15",
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

/** A labelled part of the menu. Short menus have one group without a label. */
interface NavGroup {
  label?: string
  items: NavItem[]
}

const navMap: Record<StaffRole, NavGroup[]> = {
  superAdmin: [
    { items: [
      item("platform-tenants", "Tenant", "building"),
      item("platform-plans", "Gói dịch vụ", "tag"),
      item("platform-subscriptions", "Đăng ký", "card"),
      item("platform-providers", "Cổng thanh toán", "plug"),
      item("platform-health", "Sức khỏe hệ thống", "pulse"),
      item("platform-revenue", "Doanh thu nền tảng", "chart"),
      item("platform-audit", "Nhật ký", "shield"),
    ] },
  ],
  brandAdmin: [
    { label: "Cửa hàng", items: [
      item("brand-dashboard", "Tổng quan", "grid"),
      item("brand-profile", "Thương hiệu", "cup"),
      item("admin-branches", "Chi nhánh", "building"),
      item("branch-tables", "Bàn & QR", "table"),
      item("floor-plan-view", "Sơ đồ tầng", "map"),
      item("kiosk", "Kiosk khách tự gọi", "cup"),
      item("admin-users", "Tài khoản", "users"),
    ] },
    { label: "Bán hàng", items: [
      item("manager-menu", "Thực đơn", "menu"),
      item("brand-pickup", "Khung giờ lấy hàng", "clock"),
      item("brand-promotions", "Khuyến mãi", "tag"),
      item("brand-loyalty", "Tích điểm", "heart"),
    ] },
    { label: "Theo dõi", items: [
      item("manager-reports", "Báo cáo", "chart"),
      item("manager-feedback", "Phản hồi", "heart"),
      item("admin-logs", "Nhật ký", "shield"),
    ] },
    { label: "Thanh toán và gói", items: [
      item("brand-cancel-policy", "Chính sách hủy", "clock"),
      item("brand-pay-rules", "Quy tắc thanh toán", "card"),
      item("brand-merchant", "Cổng thanh toán", "card"),
      item("brand-reconciliation", "Đối soát", "list"),
      item("brand-subscription", "Gói đăng ký", "card"),
    ] },
  ],
  branchManager: [
    { label: "Hằng ngày", items: [
      item("manager-dashboard", "Tổng quan", "grid"),
      item("branch-orders", "Đơn hàng", "list"),
      item("manager-menu", "Tình trạng món", "menu"),
      item("branch-tables", "Bàn & QR", "table"),
      item("branch-floor-plan", "Sơ đồ tầng", "map"),
      item("kiosk", "Kiosk khách tự gọi", "cup"),
      item("branch-pickup", "Khung giờ lấy hàng", "clock"),
    ] },
    { label: "Nhân sự", items: [
      item("manager-staff", "Nhân sự", "users"),
      item("branch-schedule", "Lịch làm việc", "calendar"),
      item("branch-shift-requests", "Ca thay", "swap"),
      item("branch-attendance", "Chấm công", "calendar"),
      item("manager-payroll", "Bảng lương", "cash"),
      item("branch-cash-closings", "Chốt két", "cash"),
    ] },
    { label: "Theo dõi", items: [
      item("manager-reports", "Báo cáo", "chart"),
      item("manager-feedback", "Phản hồi", "heart"),
    ] },
  ],
  barista: [{ items: [
    item("barista-queue", "Hàng đợi pha chế", "cup"),
    item("floor-plan-view", "Sơ đồ tầng", "map"),
    item("cashier-shift", "Ca làm việc", "clock2"),
    item("staff-orders", "Đơn hàng", "list"),
  ] }],
  cashier: [
    { items: [
      item("cashier-pos", "Tạo đơn", "cash"),
      item("kiosk", "Kiosk khách tự gọi", "cup"),
      item("cashier-payments", "Thanh toán cần xử lý", "card"),
      item("cashier-tables", "Bàn và bill", "table"),
      item("floor-plan-view", "Sơ đồ tầng", "map"),
      item("cashier-serve", "Phục vụ và giao món", "cup"),
      item("cashier-shift", "Ca làm việc", "clock2"),
      item("staff-orders", "Đơn hàng", "list"),
    ] },
  ],
}

const roleLabel: Record<StaffRole, string> = {
  superAdmin: "Quản trị nền tảng",
  brandAdmin: "Quản trị thương hiệu",
  branchManager: "Quản lý chi nhánh",
  barista: "Pha chế",
  cashier: "Thu ngân",
}

/** The menu entry (and its group) of the page on screen, to name it in the top bar. */
export function currentNavEntry(role: StaffRole, page: string): { group?: string; label: string } | null {
  for (const g of navMap[role]) {
    const hit = g.items.find((i) => i.id === page)
    if (hit) return { group: g.label, label: hit.label }
  }
  return null
}

interface Props {
  /** Ignored: the sidebar always follows the signed-in user's role. Kept so existing pages compile. */
  role?: string
  activePage: string
  navigate: (page: Page) => void
  children: ReactNode
  headerRight?: ReactNode
}

/**
 * The staff frame: a sidebar menu grouped by topic on wide screens, a drawer behind a menu button on tablets and phones,
 * and a top bar that always says where you are.
 * BR-05: locked roles show branch name/address; brand admins can switch branch.
 */
export default function InternalLayout({ activePage, navigate, children, headerRight }: Props) {
  const { role: userRole } = useAuth()
  const role: StaffRole = userRole && userRole !== "customer" ? userRole : "cashier"
  const [drawer, setDrawer] = useState(false)
  const here = currentNavEntry(role, activePage)

  useEffect(() => {
    if (!drawer) return
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setDrawer(false) }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [drawer])

  const go = (p: Page) => { setDrawer(false); navigate(p) }

  return (
    <div className="flex h-screen overflow-hidden bg-bg-base">
      <aside aria-label="Menu" className="hidden w-60 shrink-0 lg:flex">
        <Sidebar role={role} activePage={activePage} navigate={go} />
      </aside>

      {drawer && (
        <div className="fixed inset-0 z-40 flex lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" aria-label="Đóng menu" className="absolute inset-0 bg-text-primary/40" onClick={() => setDrawer(false)} />
          <div className="relative flex w-72 max-w-[85vw] shadow-xl">
            <Sidebar role={role} activePage={activePage} navigate={go} onClose={() => setDrawer(false)} />
          </div>
        </div>
      )}

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-bg-base px-4 py-3 sm:px-6 lg:px-8 lg:py-4">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button" aria-label="Mở menu" aria-expanded={drawer} onClick={() => setDrawer(true)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] border border-border bg-surface text-espresso lg:hidden"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden><path d="M4 7h16M4 12h16M4 17h16" /></svg>
            </button>
            <p className="min-w-0 truncate text-sm text-text-secondary" data-testid="where">
              {here?.group && <span className="hidden sm:inline">{here.group} <span aria-hidden>/</span> </span>}
              <span className="font-medium text-text-primary">{here?.label ?? roleLabel[role]}</span>
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-4">
            {headerRight}
            <NotificationBell navigate={navigate} />
            <UserMenu variant="staff" navigate={navigate} />
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  )
}

function Sidebar({ role, activePage, navigate, onClose }: { role: StaffRole; activePage: string; navigate: (p: Page) => void; onClose?: () => void }) {
  const { user, logout } = useAuth()
  const brand = useBrand()
  const { branches, branchId, canSwitch, select, branch, branchesLoading } = useActiveBranch()
  const closeRef = useRef<HTMLButtonElement>(null)
  const shop = role !== "superAdmin" && brand.kind === "ready" ? brand.brand : null
  const markColor = shop?.brandColor || "#C97B4A"
  useEffect(() => { closeRef.current?.focus() }, [])
  return (
    <div className="flex h-full w-full flex-col overflow-y-auto bg-espresso text-bg-base">
      <div className="flex items-start justify-between px-6 pb-6 pt-7">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5 min-w-0">
            {shop?.logoUrl ? (
              <img
                src={shop.logoUrl}
                alt=""
                className="h-8 w-8 shrink-0 rounded-[10px] object-contain bg-white/10"
              />
            ) : shop ? (
              <span
                aria-hidden
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] font-serif text-sm font-medium text-bg-base"
                style={{ backgroundColor: markColor }}
              >
                {shop.name.charAt(0)}
              </span>
            ) : (
              <CoffeeBean />
            )}
            <span className="truncate font-serif text-xl font-medium" title={shop?.name ?? "AICOS"}>
              {shop?.name ?? "AICOS"}
            </span>
          </div>
          <p className="mt-1 text-xs text-bg-base/60">{roleLabel[role]}</p>
          {canSwitch && (
            <label className="mt-4 block">
              <span className="mb-1 block text-[10px] uppercase tracking-wide text-bg-base/45">Chi nhánh đang xem</span>
              <select
                value={branchId ?? ""}
                onChange={(e) => select(e.target.value)}
                className="w-full rounded-[10px] border-0 bg-white/12 px-2 py-2 text-sm text-bg-base"
              >
                <option value="" disabled>Chọn chi nhánh</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id} className="text-espresso">{b.name}</option>
                ))}
              </select>
            </label>
          )}
          {!canSwitch && role !== "superAdmin" && (
            <div className="mt-3 space-y-0.5">
              <p className="truncate text-xs font-medium text-bg-base/85" title={branch?.name}>
                {branch?.name
                  ?? (branchesLoading ? "Đang tải chi nhánh…" : user?.branchId ? "Không tải được chi nhánh" : "Chưa gán chi nhánh")}
              </p>
              {branch?.address && (
                <p className="line-clamp-2 text-[11px] leading-snug text-bg-base/50" title={branch.address}>
                  {branch.address}
                </p>
              )}
            </div>
          )}
        </div>
        {onClose && (
          <button ref={closeRef} type="button" aria-label="Đóng menu" onClick={onClose} className="-mr-2 flex h-10 w-10 items-center justify-center rounded-[10px] text-bg-base/80 hover:bg-white/10">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        )}
      </div>

      <nav aria-label="Chức năng" className="flex-1 space-y-5 px-3">
        {navMap[role].map((g, gi) => (
          <div key={g.label ?? gi}>
            {g.label && <p className="mb-1 px-3 text-xs font-medium text-bg-base/50">{g.label}</p>}
            <ul className="space-y-0.5">
              {g.items.map((it) => {
                const active = activePage === it.id
                return (
                  <li key={it.id}>
                    <button
                      type="button"
                      aria-current={active ? "page" : undefined}
                      onClick={() => navigate(it.id as Page)}
                      className={`flex w-full items-center gap-3 rounded-[10px] px-3 py-2 text-left text-sm font-medium transition-colors ${active ? "bg-white/15 text-bg-base" : "text-bg-base/70 hover:bg-white/5 hover:text-bg-base"}`}
                    >
                      <span className={active ? "" : "opacity-75"}>{it.icon}</span>
                      {it.label}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="mt-6 p-4">
        <button type="button" onClick={() => navigate("account-settings")} className="flex w-full items-center gap-3 rounded-xl bg-white/5 p-3 text-left transition-colors hover:bg-white/15">
          <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-terracotta font-serif text-sm">{(user?.fullName ?? "?").charAt(0).toUpperCase()}</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-medium">{user?.fullName ?? "Tài khoản"}</span>
            <span className="block truncate text-xs text-bg-base/55">Cài đặt tài khoản</span>
          </span>
        </button>
        <button type="button" onClick={() => void logout()} className="mt-2 w-full rounded-xl p-2 text-left text-xs font-medium text-bg-base/65 hover:text-bg-base">
          Đăng xuất
        </button>
      </div>
    </div>
  )
}

function CoffeeBean() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
      <ellipse cx="14" cy="14" rx="10" ry="13" fill="var(--color-terracotta)" />
      <path d="M14 4 Q16 14 14 24" stroke="var(--color-espresso)" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    </svg>
  )
}
