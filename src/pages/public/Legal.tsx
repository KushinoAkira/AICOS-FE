import { useEffect, type ReactNode } from "react"
import type { Page } from "../../App"
import { PublicPage } from "../../components/PublicChrome"
import { CONTACT, LEGAL_UPDATED } from "../../lib/siteInfo"

interface Section { id: string; title: string; body: ReactNode }

function LegalDoc({ navigate, title, intro, sections }: { navigate: (p: Page) => void; title: string; intro: string; sections: Section[] }) {
  useEffect(() => { document.title = `${title} · AICOS` }, [title])
  return (
    <PublicPage navigate={navigate}>
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-8 lg:grid-cols-[240px_1fr]">
        <aside className="hidden lg:block">
          <nav aria-label="Mục lục" className="sticky top-24 text-sm">
            <p className="mb-3 font-medium">Nội dung</p>
            <ol className="space-y-2 border-l border-border">
              {sections.map((s, i) => (
                <li key={s.id}><a href={`#${s.id}`} className="-ml-px block border-l border-transparent pl-4 text-text-secondary hover:border-clay hover:text-text-primary">{i + 1}. {s.title}</a></li>
              ))}
            </ol>
          </nav>
        </aside>
        <article className="max-w-3xl">
          <h1 className="font-serif text-4xl">{title}</h1>
          <p className="mt-2 text-sm text-text-secondary">Cập nhật lần cuối: {LEGAL_UPDATED}</p>
          <p className="mt-6 rounded-[12px] bg-sand px-4 py-3 text-sm text-text-secondary">{intro}</p>
          {sections.map((s, i) => (
            <section key={s.id} id={s.id} className="mt-10 scroll-mt-24">
              <h2 className="font-serif text-2xl">{i + 1}. {s.title}</h2>
              <div className="mt-3 space-y-3 leading-relaxed text-text-secondary">{s.body}</div>
            </section>
          ))}
          <p className="mt-12 border-t border-border pt-6 text-sm text-text-secondary">
            Cần làm rõ thêm? Gửi email tới <a className="text-clay underline" href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a> hoặc dùng trang <button className="text-clay underline" onClick={() => navigate("contact")}>Liên hệ</button>.
          </p>
        </article>
      </div>
    </PublicPage>
  )
}

const ul = (items: string[]) => <ul className="list-disc space-y-1.5 pl-5">{items.map((i) => <li key={i}>{i}</li>)}</ul>

export function Terms({ navigate }: { navigate: (p: Page) => void }) {
  return (
    <LegalDoc
      navigate={navigate}
      title="Điều khoản sử dụng"
      intro="Bản điều khoản dùng cho phiên bản demo của đồ án. Trước khi vận hành thương mại cần được tư vấn pháp lý rà soát."
      sections={[
        { id: "pham-vi", title: "Phạm vi dịch vụ", body: <p>AICOS là nền tảng phần mềm giúp quán cà phê nhận đơn bằng QR và đặt mang đi, điều phối pha chế, thanh toán, quản lý nhân sự, tích điểm và báo cáo. Khi đăng ký, bạn đồng ý sử dụng dịch vụ theo các điều khoản này.</p> },
        { id: "tai-khoan", title: "Tài khoản và đăng ký thương hiệu", body: ul(["Thông tin đăng ký phải chính xác và thuộc quyền sử dụng hợp pháp của bạn.", "Đăng ký thương hiệu cần được AICOS xét duyệt. Chúng tôi có thể từ chối và nêu lý do.", "Bạn chịu trách nhiệm bảo mật mật khẩu và mọi hoạt động của tài khoản do bạn tạo cho nhân viên.", "Mỗi tài khoản chỉ thuộc một thương hiệu."]) },
        { id: "goi-phi", title: "Gói dịch vụ và thanh toán", body: ul(["Sau khi được duyệt, thương hiệu được dùng thử miễn phí 14 ngày.", "Phí theo gói được công bố tại trang Bảng giá, tính theo tháng. Giới hạn số chi nhánh và tài khoản theo từng gói.", "Hết hạn mà chưa gia hạn, thương hiệu có thể bị tạm ngưng. Dữ liệu vẫn được giữ trong thời gian quy định tại Chính sách bảo mật."]) },
        { id: "su-dung", title: "Quy tắc sử dụng", body: ul(["Không dùng dịch vụ cho mục đích trái pháp luật hoặc gây hại cho người khác.", "Không cố ý truy cập dữ liệu của thương hiệu khác, dò quét hay làm gián đoạn hệ thống.", "Nội dung bạn đăng như tên quán, logo, thực đơn phải không vi phạm quyền sở hữu trí tuệ của bên thứ ba."]) },
        { id: "du-lieu", title: "Dữ liệu của bạn", body: <p>Dữ liệu kinh doanh của quán thuộc về quán. AICOS chỉ xử lý để cung cấp dịch vụ theo Chính sách bảo mật. Bạn có thể yêu cầu xuất hoặc xoá dữ liệu khi chấm dứt sử dụng.</p> },
        { id: "thanh-toan-khach", title: "Thanh toán của khách hàng", body: <p>Giao dịch của khách tại quán được xử lý qua tiền mặt hoặc cổng thanh toán do quán cấu hình. AICOS không phải bên thu hộ tiền hàng. Hoàn tiền và khiếu nại giữa khách và quán tuân theo chính sách huỷ và hoàn tiền của từng quán.</p> },
        { id: "trach-nhiem", title: "Giới hạn trách nhiệm", body: <p>Chúng tôi nỗ lực duy trì dịch vụ ổn định nhưng không bảo đảm không gián đoạn. AICOS không chịu trách nhiệm cho thiệt hại gián tiếp phát sinh từ việc gián đoạn ngoài tầm kiểm soát hợp lý, ví dụ mất mạng hoặc sự cố nhà cung cấp hạ tầng.</p> },
        { id: "cham-dut", title: "Tạm ngưng và chấm dứt", body: <p>Bạn có thể ngừng sử dụng bất cứ lúc nào. AICOS có thể tạm ngưng hoặc chấm dứt thương hiệu vi phạm điều khoản, sau khi thông báo trừ trường hợp khẩn cấp về an toàn hệ thống.</p> },
        { id: "thay-doi", title: "Thay đổi điều khoản", body: <p>Khi điều khoản thay đổi đáng kể, chúng tôi thông báo qua email chủ thương hiệu hoặc trên hệ thống trước khi áp dụng. Tiếp tục sử dụng đồng nghĩa với việc chấp nhận bản cập nhật.</p> },
      ]}
    />
  )
}

export function Privacy({ navigate }: { navigate: (p: Page) => void }) {
  return (
    <LegalDoc
      navigate={navigate}
      title="Chính sách bảo mật"
      intro="Giải thích AICOS thu thập, dùng và bảo vệ dữ liệu cá nhân như thế nào. Bản demo cần được rà soát pháp lý (ví dụ Nghị định 13/2023/NĐ-CP) trước khi vận hành thật."
      sections={[
        { id: "thu-thap", title: "Dữ liệu chúng tôi thu thập", body: ul(["Chủ thương hiệu: tên, email, số điện thoại, thông tin quán, logo.", "Nhân viên: họ tên, email, vai trò, ca làm việc và dữ liệu chấm công, lương do quản lý nhập.", "Khách hàng có tài khoản: tên, email hoặc số điện thoại, lịch sử đơn, điểm tích luỹ.", "Khách quét QR không đăng nhập: chỉ mã bàn và nội dung đơn, không cần thông tin cá nhân.", "Dữ liệu kỹ thuật: nhật ký thao tác quan trọng, địa chỉ IP và loại trình duyệt để bảo mật."]) },
        { id: "muc-dich", title: "Mục đích sử dụng", body: ul(["Cung cấp, vận hành và hỗ trợ dịch vụ.", "Xác thực, phân quyền và phòng chống gian lận.", "Gửi thông báo về đơn, tài khoản, gói dịch vụ.", "Cải thiện sản phẩm bằng số liệu tổng hợp, không định danh."]) },
        { id: "chia-se", title: "Chia sẻ dữ liệu", body: <p>Chúng tôi không bán dữ liệu cá nhân. Dữ liệu chỉ được chia sẻ với nhà cung cấp hạ tầng, email và thanh toán khi cần để vận hành, hoặc theo yêu cầu hợp pháp của cơ quan có thẩm quyền. Dữ liệu của khách thuộc thương hiệu nào thì chỉ thương hiệu đó xem được.</p> },
        { id: "luu-tru", title: "Lưu trữ và bảo mật", body: ul(["Dữ liệu mỗi thương hiệu được tách riêng và phân quyền theo vai trò.", "Mật khẩu được băm, kết nối được mã hoá khi truyền.", "Thao tác quan trọng được ghi nhật ký kiểm toán.", "Khi thương hiệu chấm dứt, dữ liệu được giữ tối đa 90 ngày để khôi phục rồi xoá hoặc ẩn danh, trừ phần luật yêu cầu lưu giữ."]) },
        { id: "quyen", title: "Quyền của bạn", body: <p>Bạn có quyền truy cập, chỉnh sửa, yêu cầu xuất hoặc xoá dữ liệu cá nhân, và rút lại sự đồng ý. Khách hàng gửi yêu cầu tới quán nơi mình đăng ký hoặc trực tiếp tới AICOS; chúng tôi phản hồi trong 7 ngày làm việc.</p> },
        { id: "cookie", title: "Cookie và lưu trữ cục bộ", body: <p>Chúng tôi dùng bộ nhớ trình duyệt để giữ phiên đăng nhập và ghi nhớ thương hiệu bạn đang truy cập. Không dùng cookie quảng cáo của bên thứ ba.</p> },
        { id: "tre-em", title: "Trẻ em", body: <p>Dịch vụ không dành cho người dưới 16 tuổi tự đăng ký tài khoản.</p> },
        { id: "lien-he", title: "Liên hệ về dữ liệu", body: <p>Mọi yêu cầu về dữ liệu cá nhân xin gửi tới {CONTACT.email}.</p> },
      ]}
    />
  )
}
