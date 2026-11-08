/** Marketing copy of the public home, shared by the page sections and the quick-ask search. */

export const ROLES = [
  { who: "Chủ thương hiệu", body: "Quản lý chi nhánh, thực đơn, khuyến mãi, tích điểm và theo dõi doanh thu cả chuỗi." },
  { who: "Quản lý chi nhánh", body: "Xếp ca, duyệt đổi ca, theo dõi đơn, bàn và bảng lương của chi nhánh mình." },
  { who: "Thu ngân", body: "Tính tiền theo bàn, tra cứu giao dịch, hoàn tiền và chốt tiền mặt cuối ca." },
  { who: "Pha chế", body: "Nhận đơn theo thời gian thực, đổi trạng thái từng món và báo khi sẵn sàng." },
  { who: "Khách hàng", body: "Quét QR gọi món, đặt mang đi hẹn giờ, tích điểm, đổi voucher và xem lịch sử." },
]

export const FAQ = [
  { q: "Tôi cần chuẩn bị gì để bắt đầu?", a: "Tên thương hiệu, email và số điện thoại của chủ quán để AICOS tạo tài khoản. Logo và màu thương hiệu là tuỳ chọn và có thể đổi sau." },
  { q: "Liên hệ xong bao lâu thì dùng được?", a: "Sau khi tư vấn, đội ngũ AICOS tạo thương hiệu cho bạn, thường trong 1 ngày làm việc. Bạn nhận email mời đặt mật khẩu và bắt đầu dùng thử 14 ngày." },
  { q: "Khách có phải tải ứng dụng không?", a: "Không. Khách quét mã QR trên bàn và gọi món ngay trên trình duyệt điện thoại. Chỉ khi muốn tích điểm mới cần đăng nhập." },
  { q: "Mỗi quán có địa chỉ đăng nhập riêng không?", a: "Có. Mỗi thương hiệu có địa chỉ riêng dạng ten-quan.aicos.app, hiển thị logo và màu của quán. Tài khoản chỉ đăng nhập được ở quán của mình." },
  { q: "Tôi có thể đổi gói hoặc huỷ không?", a: "Có thể đổi gói hoặc gia hạn trong mục Gói dịch vụ của chủ thương hiệu. Khi huỷ, dữ liệu của bạn được giữ theo chính sách bảo mật." },
  { q: "Dữ liệu của quán có an toàn không?", a: "Dữ liệu mỗi thương hiệu được tách riêng, phân quyền theo vai trò và mọi thao tác quan trọng đều được ghi nhật ký. Xem thêm tại Chính sách bảo mật." },
]

export const FEATURES = [
  { title: "Gọi món bằng QR tại bàn", body: "Khách quét mã trên bàn, chọn món và gửi thẳng tới quầy pha chế. Không cần tải ứng dụng hay tạo tài khoản." },
  { title: "Đặt mang đi hẹn giờ", body: "Khách chọn giờ nhận trong giờ mở cửa, thanh toán online và nhận món đúng hẹn." },
  { title: "Quầy pha chế theo thời gian thực", body: "Đơn mới hiện ngay cho barista, cập nhật trạng thái từng bước tới khi món sẵn sàng." },
  { title: "Thu ngân và đối soát", body: "Tính tiền theo bàn, tra cứu giao dịch, hoàn tiền và chốt tiền mặt cuối ca có lý do khi lệch." },
  { title: "Nhiều chi nhánh, nhiều nhân sự", body: "Phân quyền theo vai trò, xếp ca, chấm công và tìm người thay ca giữa các chi nhánh." },
  { title: "Tích điểm và khuyến mãi", body: "Khách thân thiết tích điểm, đổi voucher. Chủ quán tự cấu hình mức tích và chương trình ưu đãi." },
]

/** One order going through the shop: the home page tells the product as this sequence, one stop per role. */
export const JOURNEY = [
  { who: "Khách hàng", title: "Gọi món theo cách mình muốn", body: "Quét QR trên bàn, gọi ở kiosk tại quầy, hoặc đặt mang đi và hẹn giờ nhận. Khách ngồi tại quán không cần tài khoản." },
  { who: "Pha chế", title: "Đơn hiện ngay ở quầy pha", body: "Barista thấy từng món với size, đường, đá; bấm đổi trạng thái và khách biết khi món sẵn sàng." },
  { who: "Thu ngân", title: "Thu tiền và chốt ca gọn gàng", body: "Tính tiền theo bàn hoặc mã đơn, áp voucher, nhận tiền mặt hay chuyển khoản, chốt tiền cuối ca." },
  { who: "Chủ quán", title: "Thấy số liệu của mọi chi nhánh", body: "Doanh thu, món bán chạy, hoàn tiền chờ duyệt và ca làm của từng chi nhánh trên một màn hình." },
]

/** What runs behind the counter, listed under the journey. */
export const BEHIND = [
  { title: "Nhiều chi nhánh, một thực đơn", body: "Giá và món hết theo từng chi nhánh, đăng thực đơn một lần cho cả chuỗi." },
  { title: "Tích điểm và voucher", body: "Khách tích điểm theo hạng, đổi voucher; chủ quán tự đặt mức tích và ưu đãi." },
  { title: "Ca làm và bảng lương", body: "Xếp ca, chấm công, đổi ca có duyệt và tính lương theo giờ làm." },
  { title: "Hoàn tiền có người duyệt", body: "Thu ngân tạo yêu cầu, quản lý duyệt theo chính sách của thương hiệu, mọi bước đều được ghi lại." },
]
