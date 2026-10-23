import { Link } from "react-router"
import { Reveal } from "../../components/Reveal"
import { Button } from "../../components/ui"

const ROLES = [
  { who: "Chủ thương hiệu", body: "Quản lý chi nhánh, thực đơn, khuyến mãi, tích điểm và theo dõi doanh thu cả chuỗi." },
  { who: "Quản lý chi nhánh", body: "Xếp ca, duyệt đổi ca, theo dõi đơn, bàn và bảng lương của chi nhánh mình." },
  { who: "Thu ngân", body: "Tính tiền theo bàn, tra cứu giao dịch, hoàn tiền và chốt tiền mặt cuối ca." },
  { who: "Pha chế", body: "Nhận đơn theo thời gian thực, đổi trạng thái từng món và báo khi sẵn sàng." },
  { who: "Khách hàng", body: "Quét QR gọi món, đặt mang đi hẹn giờ, tích điểm, đổi voucher và xem lịch sử." },
]

export function RolesSection() {
  return (
    <section id="doi-tuong" className="mx-auto max-w-6xl px-4 py-14 sm:px-8">
      <h2 className="font-serif text-3xl">Mỗi vai trò một màn hình riêng</h2>
      <p className="mt-2 max-w-2xl text-text-secondary">Mỗi người chỉ thấy đúng những gì cần cho công việc của mình, nên đào tạo nhân viên mới rất nhanh.</p>
      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {ROLES.map((r, i) => (
          <Reveal as="li" key={r.who} delay={i * 70} className="hover-lift rounded-[16px] border border-border bg-surface p-5">
            <h3 className="font-serif text-lg">{r.who}</h3>
            <p className="mt-2 text-sm leading-relaxed text-text-secondary">{r.body}</p>
          </Reveal>
        ))}
      </ul>
    </section>
  )
}

const FAQ = [
  { q: "Tôi cần chuẩn bị gì để đăng ký?", a: "Tên thương hiệu, email và số điện thoại của chủ quán. Logo và màu thương hiệu là tuỳ chọn và có thể đổi sau." },
  { q: "Đăng ký xong bao lâu thì dùng được?", a: "Sau khi xác nhận email, đội ngũ AICOS xem xét đăng ký, thường trong 1 ngày làm việc. Khi được duyệt, bạn nhận email mời đặt mật khẩu và bắt đầu dùng thử 14 ngày." },
  { q: "Khách có phải tải ứng dụng không?", a: "Không. Khách quét mã QR trên bàn và gọi món ngay trên trình duyệt điện thoại. Chỉ khi muốn tích điểm mới cần đăng nhập." },
  { q: "Mỗi quán có địa chỉ đăng nhập riêng không?", a: "Có. Mỗi thương hiệu có địa chỉ riêng dạng ten-quan.aicos.app, hiển thị logo và màu của quán. Tài khoản chỉ đăng nhập được ở quán của mình." },
  { q: "Tôi có thể đổi gói hoặc huỷ không?", a: "Có thể đổi gói hoặc gia hạn trong mục Gói dịch vụ của chủ thương hiệu. Khi huỷ, dữ liệu của bạn được giữ theo chính sách bảo mật." },
  { q: "Dữ liệu của quán có an toàn không?", a: "Dữ liệu mỗi thương hiệu được tách riêng, phân quyền theo vai trò và mọi thao tác quan trọng đều được ghi nhật ký. Xem thêm tại Chính sách bảo mật." },
]

export function FaqSection() {
  return (
    <section id="hoi-dap" className="border-t border-border bg-surface py-14">
      <div className="mx-auto max-w-3xl px-4 sm:px-8">
        <h2 className="font-serif text-3xl">Câu hỏi thường gặp</h2>
        <div className="mt-8 divide-y divide-border rounded-[16px] border border-border bg-bg-base">
          {FAQ.map((f) => (
            <details key={f.q} className="group p-5">
              <summary className="flex min-h-8 cursor-pointer list-none items-center justify-between gap-4 font-medium">
                {f.q}
                <span aria-hidden className="text-text-secondary transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-text-secondary">{f.a}</p>
            </details>
          ))}
        </div>
        <p className="mt-5 text-sm text-text-secondary">Chưa thấy câu trả lời? <Link to="/contact" className="text-clay underline">Liên hệ chúng tôi</Link>.</p>
      </div>
    </section>
  )
}

export function FinalCta({ onRegister, onContact }: { onRegister: () => void; onContact: () => void }) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-14 sm:px-8">
      <Reveal className="relative isolate overflow-hidden rounded-[20px] bg-espresso p-8 text-center text-white sm:p-12">
        <img src="https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=1400&q=60&auto=format&fit=crop" alt="" aria-hidden loading="lazy" className="absolute inset-0 -z-20 h-full w-full object-cover" />
        <div aria-hidden className="absolute inset-0 -z-10 bg-espresso/85" />
        <h2 className="font-serif text-3xl">Sẵn sàng đưa quán lên AICOS?</h2>
        <p className="mx-auto mt-3 max-w-xl text-white/75">Đăng ký trong chưa đến 3 phút, dùng thử 14 ngày sau khi được duyệt, không cần thẻ thanh toán.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button className="min-h-12 bg-white px-6 text-espresso hover:bg-sand" onClick={onRegister}>Đăng ký quán của bạn</Button>
          <Button variant="secondary" className="min-h-12 px-6" onClick={onContact}>Nói chuyện với chúng tôi</Button>
        </div>
      </Reveal>
    </section>
  )
}
