import { useEffect, useRef, useState } from "react"
import { useAuth } from "../context/AuthContext"
import type { Page } from "../router/pages"

interface Props {
  navigate: (p: Page) => void
  /** Customers get a profile screen; staff only have account settings. */
  variant?: "customer" | "staff"
}

/** Avatar button in the header: (profile), settings, sign out. */
export default function UserMenu({ navigate, variant = "customer" }: Props) {
  const isCustomer = variant === "customer"
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false) }
    document.addEventListener("mousedown", onDown)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDown)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  const items: { label: string; onClick: () => void; danger?: boolean; icon: React.ReactNode }[] = [
    ...(isCustomer
      ? [
          {
            label: "Giới thiệu nền tảng AICOS",
            onClick: () => navigate("landing"),
            icon: <path d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1v-9.5z" />,
          },
          {
            label: "Thông tin khách hàng",
            onClick: () => navigate("customer-profile"),
            icon: <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" />,
          },
        ]
      : []),
    {
      label: "Cài đặt tài khoản",
      onClick: () => navigate("account-settings"),
      icon: (
        <>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" />
        </>
      ),
    },
    {
      label: "Đăng xuất",
      onClick: () => void logout(),
      danger: true,
      icon: <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />,
    },
  ]

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Tài khoản"
        className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium"
        style={{ backgroundColor: "#C97B4A", color: "#FAF6F0", border: "none", cursor: "pointer", fontFamily: "'Fraunces', Georgia, serif" }}
      >
        {(user?.fullName ?? "?").charAt(0).toUpperCase()}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-60 rounded-2xl overflow-hidden z-50 animate-fade-in"
          style={{ backgroundColor: "#FFFFFF", border: "1px solid #E6DCCB", boxShadow: "0 12px 32px rgba(111,78,55,0.15)" }}
        >
          <div className="px-4 py-3" style={{ borderBottom: "1px solid #E6DCCB" }}>
            <p className="text-sm font-medium truncate" style={{ color: "#3A2E22" }}>{user?.fullName}</p>
            <p className="text-xs truncate" style={{ color: "#8A7A6C" }}>{user?.email}</p>
          </div>
          {items.map((item) => (
            <button
              key={item.label}
              role="menuitem"
              type="button"
              onClick={() => { setOpen(false); item.onClick() }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-left transition-colors"
              style={{ background: "none", border: "none", cursor: "pointer", color: item.danger ? "#A6534B" : "#3A2E22" }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#FAF6F0" }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent" }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">{item.icon}</svg>
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
