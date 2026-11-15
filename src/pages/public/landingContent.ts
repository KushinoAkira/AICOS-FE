/** Marketing copy of the public home, shared by the page sections and the quick-ask search. */

import { protectOrphans } from "../../lib/typography"

function pair(who: string, body: string) {
  return { who: protectOrphans(who), body: protectOrphans(body) }
}
function qa(q: string, a: string) {
  return { q: protectOrphans(q), a: protectOrphans(a) }
}
function card(title: string, body: string) {
  return { title: protectOrphans(title), body: protectOrphans(body) }
}
function stop(who: string, title: string, body: string) {
  return { who: protectOrphans(who), title: protectOrphans(title), body: protectOrphans(body) }
}

export const ROLES = [
  pair("Chủ thương hiệu", "Quản lý chi nhánh, thực đơn, khuyến mãi, tích điểm và theo dõi doanh thu cả chuỗi."),
  pair("Quản lý chi nhánh", "Xếp ca, duyệt đổi ca, theo dõi đơn, bàn và bảng lương của chi nhánh mình."),
  pair("Thu ngân", "Tính tiền theo bàn, tra cứu giao dịch, hoàn tiền và chốt tiền mặt cuối ca."),
  pair("Pha chế", "Nhận đơn theo thời gian thực, đổi trạng thái từng món và báo khi sẵn sàng."),
  pair("Khách hàng", "Quét QR gọi món, đặt mang đi hẹn giờ, tích điểm, đổi voucher và xem lịch sử."),
]

export const FAQ = [
  qa("Tôi cần chuẩn bị gì để bắt đầu?", "Tên thương hiệu, email và số điện thoại của chủ quán để AICOS tạo tài khoản. Logo và màu thương hiệu là tuỳ chọn và có thể đổi sau."),
  qa("Liên hệ xong bao lâu thì dùng được?", "Sau khi tư vấn, đội ngũ AICOS tạo thương hiệu cho bạn, thường trong 1 ngày làm việc. Bạn nhận email mời đặt mật khẩu và bắt đầu dùng thử 14 ngày."),
  qa("Khách có phải tải ứng dụng không?", "Không. Khách quét mã QR trên bàn và gọi món ngay trên trình duyệt điện thoại. Chỉ khi muốn tích điểm mới cần đăng nhập."),
  qa("Khách và nhân viên đăng nhập thế nào?", "Khách vào /dat-mon rồi đăng nhập tại /customer-login (sau đó chọn quán). Nhân viên và quản lý dùng /staff-login. Super Admin dùng /admin/login. Không dùng subdomain."),
  qa("Tôi có thể đổi gói hoặc huỷ không?", "Có thể đổi gói hoặc gia hạn trong mục Gói dịch vụ của chủ thương hiệu. Khi huỷ, dữ liệu của bạn được giữ theo chính sách bảo mật."),
  qa("Dữ liệu của quán có an toàn không?", "Dữ liệu mỗi thương hiệu được tách riêng, phân quyền theo vai trò và mọi thao tác quan trọng đều được ghi nhật ký. Xem thêm tại Chính sách bảo mật."),
]

export const FEATURES = [
  card("Gọi món bằng QR tại bàn", "Khách quét mã trên bàn, chọn món và gửi thẳng tới quầy pha chế. Không cần tải ứng dụng hay tạo tài khoản."),
  card("Đặt mang đi hẹn giờ", "Khách chọn giờ nhận trong giờ mở cửa, thanh toán online và nhận món đúng hẹn."),
  card("Quầy pha chế theo thời gian thực", "Đơn mới hiện ngay cho barista, cập nhật trạng thái từng bước tới khi món sẵn sàng."),
  card("Thu ngân và đối soát", "Tính tiền theo bàn, tra cứu giao dịch, hoàn tiền và chốt tiền mặt cuối ca có lý do khi lệch."),
  card("Nhiều chi nhánh, nhiều nhân sự", "Phân quyền theo vai trò, xếp ca, chấm công và tìm người thay ca giữa các chi nhánh."),
  card("Tích điểm và khuyến mãi", "Khách thân thiết tích điểm, đổi voucher. Chủ quán tự cấu hình mức tích và chương trình ưu đãi."),
]

/** One order going through the shop: the home page tells the product as this sequence, one stop per role. */
export const JOURNEY = [
  stop("Khách hàng", "Gọi món theo cách mình muốn", "Quét QR trên bàn, gọi ở kiosk tại quầy, hoặc đặt mang đi và hẹn giờ nhận. Khách ngồi tại quán không cần tài khoản."),
  stop("Pha chế", "Đơn hiện ngay ở quầy pha", "Barista thấy từng món với size, đường, đá; bấm đổi trạng thái và khách biết khi món sẵn sàng."),
  stop("Thu ngân", "Thu tiền và chốt ca gọn gàng", "Tính tiền theo bàn hoặc mã đơn, áp voucher, nhận tiền mặt hay chuyển khoản, chốt tiền cuối ca."),
  stop("Chủ quán", "Thấy số liệu của mọi chi nhánh", "Doanh thu, món bán chạy, hoàn tiền chờ duyệt và ca làm của từng chi nhánh trên một màn hình."),
]

/** What runs behind the counter, listed under the journey. */
export const BEHIND = [
  card("Nhiều chi nhánh, một thực đơn", "Giá và món hết theo từng chi nhánh, đăng thực đơn một lần cho cả chuỗi."),
  card("Tích điểm và voucher", "Khách tích điểm theo hạng, đổi voucher; chủ quán tự đặt mức tích và ưu đãi."),
  card("Ca làm và bảng lương", "Xếp ca, chấm công, đổi ca có duyệt và tính lương theo giờ làm."),
  card("Hoàn tiền có người duyệt", "Thu ngân tạo yêu cầu, quản lý duyệt theo chính sách của thương hiệu, mọi bước đều được ghi lại."),
]
