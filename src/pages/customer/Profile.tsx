import type { Page } from "../../App"
import { useAuth } from "../../context/AuthContext"

interface Props {
  navigate: (p: Page) => void
}

const HISTORY = [
  { items: "Cà phê sữa đá, Bánh croissant", date: "Hôm nay, 09:15", points: +45 },
  { items: "Cappuccino, Trà đào cam sả", date: "Hôm qua, 14:30", points: +52 },
  { items: "Latte nghệ", date: "12/11, 11:00", points: +30 },
  { items: "Đá xay matcha x2", date: "10/11, 16:20", points: +60 },
]

const VOUCHERS = [
  { title: "Giảm 20% đơn tiếp theo", code: "AICOS20", expire: "31/12/2025", desc: "Áp dụng cho tất cả đồ uống" },
  { title: "1 bánh croissant miễn phí", code: "FREECRS", expire: "15/12/2025", desc: "Khi mua bất kỳ đồ uống" },
]

export default function CustomerProfile({ navigate }: Props) {
  const { logout } = useAuth()
  const points = 840
  const maxPoints = 1000
  const pct = (points / maxPoints) * 100

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FAF6F0" }}>
      {/* Header */}
      <header
        className="sticky top-0 z-30 flex items-center justify-between px-6 py-4"
        style={{ backgroundColor: "rgba(250,246,240,0.92)", backdropFilter: "blur(8px)", borderBottom: "1px solid #E6DCCB" }}
      >
        <button
          onClick={() => navigate("customer-menu")}
          className="flex items-center gap-2 text-sm"
          style={{ background: "none", border: "none", cursor: "pointer", color: "#8A7A6C" }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M10 3L5 8l5 5"/></svg>
          Menu
        </button>
        <span className="font-serif text-base font-medium" style={{ color: "#3A2E22", fontFamily: "'Fraunces', Georgia, serif" }}>Hồ sơ</span>
        <button
          onClick={() => void logout()}
          className="text-sm"
          style={{ background: "none", border: "none", cursor: "pointer", color: "#8B5E3C", minWidth: "60px", textAlign: "right" }}
        >
          Đăng xuất
        </button>
      </header>

      <div className="max-w-lg mx-auto px-6 py-10">
        {/* Avatar + name */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-20 h-20 rounded-full overflow-hidden mb-4 flex-shrink-0"
            style={{ border: "3px solid #E6DCCB" }}
          >
            <img
              src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=160&h=160&fit=crop&auto=format"
              alt="Avatar"
              className="w-full h-full object-cover"
              style={{ backgroundColor: "#F5EFE6" }}
            />
          </div>
          <h1
            className="font-serif text-2xl font-medium mb-2"
            style={{ color: "#3A2E22", fontFamily: "'Fraunces', Georgia, serif" }}
          >
            Linh Nguyễn
          </h1>
          <span
            className="text-xs font-medium px-3 py-1 rounded-full"
            style={{ backgroundColor: "#EAEDE0", color: "#7A8450" }}
          >
            Thành viên Bạc
          </span>
        </div>

        {/* Points card */}
        <div
          className="p-6 rounded-2xl mb-6"
          style={{ backgroundColor: "#FFFFFF", border: "1px solid #E6DCCB", boxShadow: "0 4px 16px rgba(111,78,55,0.06)" }}
        >
          <div className="flex items-end justify-between mb-4">
            <div>
              <p className="text-xs mb-1" style={{ color: "#8A7A6C" }}>Điểm tích lũy</p>
              <span
                className="font-serif text-5xl font-medium"
                style={{ color: "#3A2E22", fontFamily: "'Fraunces', Georgia, serif" }}
              >
                {points}
              </span>
              <span className="text-lg ml-1" style={{ color: "#8A7A6C" }}>điểm</span>
            </div>
            <div className="text-right">
              <p className="text-xs" style={{ color: "#8A7A6C" }}>Đến hạng Vàng</p>
              <p className="text-sm font-medium" style={{ color: "#C97B4A" }}>{maxPoints - points} điểm nữa</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="relative">
            <div
              className="w-full rounded-full overflow-hidden"
              style={{ height: "8px", backgroundColor: "#F5EFE6" }}
            >
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, backgroundColor: "#C97B4A" }}
              />
            </div>
            <div className="flex justify-between mt-1.5">
              <span className="text-xs" style={{ color: "#8A7A6C" }}>Bạc</span>
              <span className="text-xs" style={{ color: "#8A7A6C" }}>Vàng</span>
            </div>
          </div>
        </div>

        {/* Vouchers */}
        <div className="mb-8">
          <h2
            className="font-serif text-xl font-medium mb-4"
            style={{ color: "#3A2E22", fontFamily: "'Fraunces', Georgia, serif" }}
          >
            Ưu đãi dành cho bạn
          </h2>
          <div className="space-y-3">
            {VOUCHERS.map((v) => (
              <div
                key={v.code}
                className="flex items-center gap-4 p-4 rounded-2xl"
                style={{
                  backgroundColor: "#FAF6F0",
                  border: "1.5px dashed #E6DCCB",
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: "#EAEDE0" }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7A8450" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 12v10H4V12"/>
                    <path d="M22 7H2v5h20V7z"/>
                    <path d="M12 22V7"/>
                    <path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z"/>
                    <path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/>
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium" style={{ color: "#3A2E22" }}>{v.title}</p>
                  <p className="text-xs mt-0.5" style={{ color: "#8A7A6C" }}>{v.desc} · HSD: {v.expire}</p>
                </div>
                <div
                  className="text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0"
                  style={{ backgroundColor: "#C97B4A", color: "#FAF6F0" }}
                >
                  {v.code}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Order history */}
        <div>
          <h2
            className="font-serif text-xl font-medium mb-4"
            style={{ color: "#3A2E22", fontFamily: "'Fraunces', Georgia, serif" }}
          >
            Lịch sử đơn hàng
          </h2>
          <div className="space-y-0">
            {HISTORY.map((h, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-3"
                style={{ borderBottom: i < HISTORY.length - 1 ? "1px solid #E6DCCB" : "none" }}
              >
                <div>
                  <p className="text-sm font-medium" style={{ color: "#3A2E22" }}>{h.items}</p>
                  <p className="text-xs mt-0.5" style={{ color: "#8A7A6C" }}>{h.date}</p>
                </div>
                <span
                  className="text-sm font-medium flex-shrink-0"
                  style={{ color: "#5C7A52" }}
                >
                  +{h.points} điểm
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
