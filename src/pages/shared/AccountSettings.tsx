import { useState } from "react"
import { useToast } from "../../context/ToastContext"
import { useAuth } from "../../context/AuthContext"
import { ApiError } from "../../lib/api/http"
import { authApi } from "../../lib/api/identity"
import { ROLE_LABEL, type Role } from "../../router/roles"
import type { Page } from "../../App"

interface Props {
  navigate: (p: Page) => void
  returnPage?: Page
}

type Section = "profile" | "password" | "notifications" | "security"

const SESSIONS = [
  { device: "Chrome · macOS", location: "TP. Hồ Chí Minh", time: "Hôm nay, 09:14" },
  { device: "Safari · iPhone 15", location: "TP. Hồ Chí Minh", time: "Hôm qua, 21:30" },
  { device: "Chrome · Windows", location: "Hà Nội", time: "03/09/2026, 14:55" },
]

const NOTIF_ITEMS: { id: string; label: string; roles: Role[] }[] = [
  // Staff
  { id: "new-order", label: "Đơn hàng mới", roles: ["cashier", "barista", "branchManager"] },
  { id: "shift", label: "Nhắc lịch làm việc", roles: ["cashier", "barista", "branchManager"] },
  { id: "shift-request", label: "Yêu cầu đổi ca / nghỉ", roles: ["branchManager"] },
  { id: "subscription", label: "Gói đăng ký sắp hết hạn", roles: ["brandAdmin"] },
  { id: "tenant", label: "Cảnh báo hệ thống và tenant", roles: ["superAdmin"] },
  // Customer
  { id: "order-status", label: "Trạng thái đơn hàng", roles: ["customer"] },
  { id: "promo", label: "Ưu đãi và voucher mới", roles: ["customer"] },
  { id: "loyalty", label: "Điểm tích lũy và hạng thành viên", roles: ["customer"] },
]

export default function AccountSettings({ navigate, returnPage }: Props) {
  const { showToast } = useToast()
  const [section, setSection] = useState<Section>("profile")

  const { user, role } = useAuth()
  const isCustomer = role === "customer"
  const notifItems = NOTIF_ITEMS.filter((i) => role !== null && i.roles.includes(role))
  const [name, setName] = useState(user?.fullName ?? "")
  const [phone, setPhone] = useState(user?.phone ?? "")

  const [curPass, setCurPass] = useState("")
  const [newPass, setNewPass] = useState("")
  const [confirmPass, setConfirmPass] = useState("")

  const [notifs, setNotifs] = useState<Record<string, boolean>>({
    "new-order": true,
    "low-stock": true,
    "shift": false,
    "suggestion": true,
    "order-status": true,
    "promo": true,
    "loyalty": false,
  })

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    try {
      await authApi.changePassword({ currentPassword: curPass, newPassword: newPass, confirmNewPassword: confirmPass })
      showToast("Đã đổi mật khẩu", "success")
      setCurPass("")
      setNewPass("")
      setConfirmPass("")
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Không thể đổi mật khẩu", "error")
    }
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    showToast("Đã lưu thay đổi", "success")
  }

  const NAV_ITEMS: { id: Section; label: string }[] = [
    { id: "profile", label: "Thông tin cá nhân" },
    { id: "password", label: "Đổi mật khẩu" },
    { id: "notifications", label: "Thông báo" },
    { id: "security", label: "Bảo mật" },
  ]

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FAF6F0" }}>
      {/* Top bar */}
      <div
        className="sticky top-0 z-10 flex items-center gap-4 px-8 py-4"
        style={{ backgroundColor: "#FAF6F0", borderBottom: "1px solid #E6DCCB" }}
      >
        <button
          type="button"
          onClick={() => navigate(returnPage ?? "manager-dashboard")}
          className="flex items-center gap-1.5 text-sm transition-colors"
          style={{ color: "#8A7A6C", background: "none", border: "none", cursor: "pointer" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#3A2E22" }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#8A7A6C" }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 12L6 8l4-4" />
          </svg>
          Quay lại
        </button>
        <span className="text-sm font-medium" style={{ color: "#3A2E22", fontFamily: "'Literata', 'Times New Roman', serif" }}>
          Cài đặt tài khoản
        </span>
      </div>

      <div className="max-w-4xl mx-auto px-8 py-10 flex gap-8">
        {/* Left nav */}
        <div className="w-52 flex-shrink-0">
          <nav className="space-y-0.5">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => setSection(item.id)}
                className="w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-150"
                style={{
                  backgroundColor: section === item.id ? "#F5EFE6" : "transparent",
                  color: section === item.id ? "#6F4E37" : "#8A7A6C",
                  border: "none",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => { if (section !== item.id) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#F5EFE6" }}
                onMouseLeave={(e) => { if (section !== item.id) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent" }}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Right content */}
        <div className="flex-1 min-w-0">

          {/* Profile */}
          {section === "profile" && (
            <form onSubmit={handleSave}>
              <h2 className="font-serif text-xl font-medium mb-6" style={{ color: "#3A2E22", fontFamily: "'Literata', 'Times New Roman', serif" }}>
                Thông tin cá nhân
              </h2>

              {/* Avatar */}
              <div className="flex items-end gap-4 mb-8">
                <div className="relative">
                  <div
                    className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-medium"
                    style={{ backgroundColor: "#C97B4A", color: "#FAF6F0", fontFamily: "'Literata', 'Times New Roman', serif" }}
                  >
                    {(user?.fullName ?? "?").charAt(0).toUpperCase()}
                  </div>
                  <button
                    type="button"
                    className="absolute bottom-0 right-0 w-6 h-6 rounded-full flex items-center justify-center transition-colors"
                    style={{ backgroundColor: "#FFFFFF", border: "1.5px solid #E6DCCB", cursor: "pointer" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#C97B4A" }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#E6DCCB" }}
                    aria-label="Đổi ảnh"
                  >
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="#6F4E37" strokeWidth="1.75" strokeLinecap="round">
                      <path d="M1 12L5 8l2 2 4-5 4 5" />
                      <circle cx="4" cy="4" r="2" />
                    </svg>
                  </button>
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: "#3A2E22" }}>{user?.fullName}</p>
                  <p className="text-xs mt-0.5" style={{ color: "#8A7A6C" }}>{role ? ROLE_LABEL[role] : ""}</p>
                </div>
              </div>

              <div className="space-y-4 max-w-md">
                <FormField label="Họ tên">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 text-sm outline-none transition-all duration-150"
                    style={iStyle}
                    onFocus={iFocus}
                    onBlur={iBlur}
                  />
                </FormField>

                <FormField label="Email">
                  <input
                    type="email"
                    value={user?.email ?? ""}
                    readOnly
                    className="w-full px-4 py-3 text-sm outline-none"
                    style={{ ...iStyle, backgroundColor: "#F5EFE6", color: "#8A7A6C", cursor: "not-allowed" }}
                  />
                  <p className="text-xs mt-1" style={{ color: "#8A7A6C" }}>{isCustomer ? "Email đăng nhập — không thể thay đổi" : "Do Admin cấp — không thể thay đổi"}</p>
                </FormField>

                <FormField label="Số điện thoại">
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-4 py-3 text-sm outline-none transition-all duration-150"
                    style={iStyle}
                    onFocus={iFocus}
                    onBlur={iBlur}
                  />
                </FormField>



                <div className="pt-2">
                  <button
                    type="submit"
                    className="px-6 py-2.5 text-sm font-medium transition-all duration-150"
                    style={{
                      backgroundColor: "#C97B4A",
                      color: "#FAF6F0",
                      borderRadius: "10px",
                      border: "none",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#8B5E3C" }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#C97B4A" }}
                  >
                    Lưu thay đổi
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Password */}
          {section === "password" && (
            <form onSubmit={handleChangePassword}>
              <h2 className="font-serif text-xl font-medium mb-6" style={{ color: "#3A2E22", fontFamily: "'Literata', 'Times New Roman', serif" }}>
                Đổi mật khẩu
              </h2>
              <div className="space-y-4 max-w-md">
                <FormField label="Mật khẩu hiện tại">
                  <PasswordInput value={curPass} onChange={setCurPass} placeholder="••••••••" />
                </FormField>
                <FormField label="Mật khẩu mới">
                  <PasswordInput value={newPass} onChange={setNewPass} placeholder="••••••••" />
                </FormField>
                <FormField label="Xác nhận mật khẩu mới">
                  <PasswordInput value={confirmPass} onChange={setConfirmPass} placeholder="••••••••" />
                  {confirmPass && newPass !== confirmPass && (
                    <p className="text-xs mt-1" style={{ color: "#A6534B" }}>Mật khẩu xác nhận không khớp</p>
                  )}
                </FormField>
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={!curPass || !newPass || newPass !== confirmPass}
                    className="px-6 py-2.5 text-sm font-medium transition-all duration-150"
                    style={{
                      backgroundColor: (curPass && newPass && newPass === confirmPass) ? "#C97B4A" : "#D6C5B3",
                      color: "#FAF6F0",
                      borderRadius: "10px",
                      border: "none",
                      cursor: (curPass && newPass && newPass === confirmPass) ? "pointer" : "not-allowed",
                    }}
                  >
                    Cập nhật mật khẩu
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Notifications */}
          {section === "notifications" && (
            <div>
              <h2 className="font-serif text-xl font-medium mb-6" style={{ color: "#3A2E22", fontFamily: "'Literata', 'Times New Roman', serif" }}>
                Thông báo
              </h2>
              <div className="max-w-md space-y-0 rounded-2xl overflow-hidden" style={{ border: "1px solid #E6DCCB" }}>
                {notifItems.map((item, idx) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between px-5 py-4"
                    style={{ borderBottom: idx < notifItems.length - 1 ? "1px solid #E6DCCB" : "none", backgroundColor: "#FFFFFF" }}
                  >
                    <span className="text-sm font-medium" style={{ color: "#3A2E22" }}>{item.label}</span>
                    <Toggle
                      checked={notifs[item.id]}
                      onChange={(v) => setNotifs((n) => ({ ...n, [item.id]: v }))}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Security */}
          {section === "security" && (
            <div>
              <h2 className="font-serif text-xl font-medium mb-6" style={{ color: "#3A2E22", fontFamily: "'Literata', 'Times New Roman', serif" }}>
                Bảo mật
              </h2>

              <button
                type="button"
                className="px-5 py-2.5 text-sm font-medium transition-all duration-150 mb-8"
                style={{
                  backgroundColor: "transparent",
                  color: "#A6534B",
                  borderRadius: "10px",
                  border: "1.5px solid #A6534B",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#FAE8E6" }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent" }}
              >
                Đăng xuất khỏi tất cả thiết bị
              </button>

              <h3 className="text-sm font-medium mb-3" style={{ color: "#3A2E22" }}>Phiên đăng nhập gần đây</h3>
              <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #E6DCCB", backgroundColor: "#FFFFFF" }}>
                {SESSIONS.map((s, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-4 px-5 py-4"
                    style={{ borderBottom: idx < SESSIONS.length - 1 ? "1px solid #E6DCCB" : "none" }}
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: "#F5EFE6" }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8B5E3C" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="5" y="2" width="14" height="20" rx="2" />
                        <line x1="12" y1="18" x2="12" y2="18" strokeWidth="2" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: "#3A2E22" }}>{s.device}</p>
                      <p className="text-xs" style={{ color: "#8A7A6C" }}>{s.location} · {s.time}</p>
                    </div>
                    {idx === 0 && (
                      <span className="text-xs px-2.5 py-1 rounded-full" style={{ backgroundColor: "#EAEDE0", color: "#5C7A52" }}>
                        Hiện tại
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5" style={{ color: "#3A2E22" }}>{label}</label>
      {children}
    </div>
  )
}

const iStyle: React.CSSProperties = {
  border: "1px solid #E6DCCB",
  borderRadius: "10px",
  backgroundColor: "#FFFFFF",
  color: "#3A2E22",
  fontFamily: "'Inter', system-ui, sans-serif",
}

function iFocus(e: React.FocusEvent<HTMLInputElement>) { e.currentTarget.style.borderColor = "#C97B4A" }
function iBlur(e: React.FocusEvent<HTMLInputElement>) { e.currentTarget.style.borderColor = "#E6DCCB" }

function PasswordInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-3 pr-11 text-sm outline-none transition-all duration-150"
        style={iStyle}
        onFocus={iFocus}
        onBlur={iBlur}
      />
      <button
        type="button"
        onClick={() => setShow(!show)}
        className="absolute right-3 top-1/2 -translate-y-1/2"
        style={{ background: "none", border: "none", cursor: "pointer", opacity: 0.45, color: "#3A2E22" }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "1" }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.45" }}
      >
        {show ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.94 17.94A10.07 10.07 0 0112 20c-5 0-8-2-10-6a18 18 0 015.06-5.94" />
            <path d="M9.9 4.24A9.12 9.12 0 0112 4c5 0 8 2 10 6a18 18 0 01-1.72 2.28" />
            <line x1="1" y1="1" x2="23" y2="23" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 12c2-4 5-6 10-6s8 2 10 6c-2 4-5 6-10 6S4 16 2 12z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  )
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="relative flex-shrink-0 transition-colors duration-200"
      style={{
        width: "42px",
        height: "24px",
        borderRadius: "999px",
        backgroundColor: checked ? "#7A8450" : "#D6C5B3",
        border: "none",
        cursor: "pointer",
        padding: 0,
      }}
    >
      <span
        className="absolute top-1 transition-transform duration-200"
        style={{
          left: "4px",
          width: "16px",
          height: "16px",
          borderRadius: "50%",
          backgroundColor: "#FFFFFF",
          transform: checked ? "translateX(18px)" : "translateX(0)",
          display: "block",
        }}
      />
    </button>
  )
}
