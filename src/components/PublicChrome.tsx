import type { ReactNode } from "react"
import { Link } from "react-router"
import type { Page } from "../App"
import { homePageOf, useAuth } from "../context/AuthContext"
import { Logo } from "./AuthShell"
import { Button } from "./ui"
import { CONTACT } from "../lib/siteInfo"

const linkCls = "rounded-full px-3 py-2 text-text-secondary hover:bg-sand"

/** Top bar shared by the public site (landing, legal, contact). */
export function PublicHeader({ navigate }: { navigate: (p: Page) => void }) {
  const { user, role } = useAuth()
  function goStaffLogin() {
    if (role === "customer") return
    if (user) navigate(homePageOf(user))
    else navigate("login")
  }
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg-base/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-8">
        <Link to="/" aria-label="Về trang chủ AICOS"><Logo /></Link>
        <nav aria-label="Điều hướng chính" className="flex items-center gap-1 text-sm">
          <Link to="/#tinh-nang" className={`hidden md:block ${linkCls}`}>Tính năng</Link>
          <Link to="/#bang-gia" className={`hidden md:block ${linkCls}`}>Bảng giá</Link>
          <Link to="/#hoi-dap" className={`hidden lg:block ${linkCls}`}>Hỏi đáp</Link>
          {/* B2B marketing only — never link into a brand's customer app (/menu). Customers enter via table QR. */}
          {role !== "customer" && (
            <button type="button" onClick={goStaffLogin} className={`min-h-10 ${linkCls}`}>Đăng nhập quán</button>
          )}
          <Button className="min-h-10 px-4 py-2" onClick={() => navigate("contact")}>Liên hệ tư vấn</Button>
        </nav>
      </div>
    </header>
  )
}

function Col({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-medium text-white">{title}</h3>
      <ul className="mt-3 space-y-2 text-sm text-white/70">{children}</ul>
    </div>
  )
}

const fl = "hover:text-white hover:underline"

export function PublicFooter({ navigate }: { navigate: (p: Page) => void }) {
  const { user, role } = useAuth()
  const btn = (label: string, p: Page) => (
    <li><button type="button" onClick={() => navigate(p)} className={`text-left ${fl}`}>{label}</button></li>
  )
  function goStaffLogin() {
    if (role === "customer") return
    if (user) navigate(homePageOf(user))
    else navigate("login")
  }
  return (
    <footer className="bg-espresso text-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-8 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <p className="font-serif text-2xl">AICOS</p>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-white/70">
            Nền tảng bán hàng, pha chế và quản lý chuỗi quán cà phê. Gọi món bằng QR, đặt mang đi, tích điểm và báo cáo trên một nơi.
          </p>
          <p className="mt-4 text-sm text-white/70">
            <a href={`mailto:${CONTACT.email}`} className={fl}>{CONTACT.email}</a><br />
            {CONTACT.hours}
          </p>
        </div>
        <Col title="Sản phẩm">
          <li><Link to="/#tinh-nang" className={fl}>Tính năng</Link></li>
          <li><Link to="/#doi-tuong" className={fl}>Dành cho từng vai trò</Link></li>
          <li><Link to="/#bang-gia" className={fl}>Bảng giá</Link></li>
          <li><Link to="/#hoi-dap" className={fl}>Câu hỏi thường gặp</Link></li>
        </Col>
        <Col title="Bắt đầu">
          {btn("Liên hệ để được cấp quán", "contact")}
          {role !== "customer" && (
            <li><button type="button" onClick={goStaffLogin} className={`text-left ${fl}`}>Đăng nhập quản lý và nhân viên</button></li>
          )}
          <li className="text-white/50">Khách gọi món bằng QR tại quán (không dùng trang chủ này)</li>
        </Col>
        <Col title="Hỗ trợ và pháp lý">
          {btn("Liên hệ", "contact")}
          {btn("Điều khoản sử dụng", "terms")}
          {btn("Chính sách bảo mật", "privacy")}
        </Col>
      </div>
      <div className="border-t border-white/15">
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-4 text-xs text-white/60 sm:flex-row sm:justify-between sm:px-8">
          <span>© {new Date().getFullYear()} AICOS. Bảo lưu mọi quyền.</span>
          <span>Đồ án tốt nghiệp · AI-Integrated Smart Coffee Shop Platform</span>
        </div>
      </div>
    </footer>
  )
}

/** Full page frame: header + content + footer. */
export function PublicPage({ navigate, children, uc }: { navigate: (p: Page) => void; children: ReactNode; uc?: string }) {
  return (
    <div data-uc={uc} className="min-h-screen bg-bg-base text-text-primary">
      <PublicHeader navigate={navigate} />
      <main>{children}</main>
      <PublicFooter navigate={navigate} />
    </div>
  )
}
