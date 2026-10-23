A1. Đăng ký tài khoản khách hàng

Frame name: Auth / Customer Register

Thiết kế màn hình đăng ký tài khoản cho khách hàng, phong cách Warm Minimalism, bố cục
1 cột căn giữa tối đa 420px trên nền kem #FAF6F0, không cần ảnh nền lớn (khác staff login)
vì đây là luồng nhanh ngay trên trang đặt món. Trên cùng: logo AICOS nhỏ, tiêu đề serif
"Tạo tài khoản để tích điểm mỗi lần ghé quán" (ngôn ngữ lợi ích, không dùng "Đăng ký tài
khoản" khô khan). Form gồm: input Họ tên, input Số điện thoại (có prefix +84 cố định bên
trái ô input), input Mật khẩu (có icon con mắt ẩn/hiện), checkbox nhỏ "Tôi đồng ý với Điều
khoản sử dụng" (chữ Điều khoản là link màu clay). Nút "Tiếp tục" terracotta full-width.
Dưới cùng: dòng nhỏ "Đã có tài khoản? Đăng nhập" — chữ "Đăng nhập" là link. Có thể thêm
lựa chọn phụ "Hoặc tiếp tục với Google" dạng nút viền nhạt bên dưới nút chính, cách nhau
bằng đường kẻ mờ + chữ "hoặc" ở giữa.
Liên kết: nút "Tiếp tục" → A3 (Xác thực OTP); link "Đăng nhập" → A2.
A2. Đăng nhập khách hàng

Frame name: Auth / Customer Login

Màn hình đăng nhập khách hàng, cùng bố cục 1 cột căn giữa với A1 để nhất quán. Tiêu đề
serif "Chào bạn quay lại". Form: input Số điện thoại, input Mật khẩu, link nhỏ "Quên mật
khẩu?" căn phải ngay dưới ô mật khẩu. Nút "Đăng nhập" terracotta full-width. Dưới cùng:
"Chưa có tài khoản? Tạo tài khoản mới" dẫn sang A1. Giữ tối giản, không cần ảnh minh hoạ.
Liên kết: nút "Đăng nhập" → Customer/Menu (trang đặt món); "Quên mật khẩu?" → A4.
A3. Xác thực mã OTP (dùng chung)

Frame name: Auth / OTP Verification

Màn hình nhập mã xác thực, dùng chung cho đăng ký khách hàng lẫn quên mật khẩu nhân viên.
Bố cục căn giữa hẹp (360px). Icon minh hoạ nhỏ phía trên dạng đường nét mảnh (line art)
hình phong bì hoặc điện thoại có sóng nhẹ toả ra — không dùng icon khoá/bảo mật kiểu kỹ
thuật. Tiêu đề serif "Nhập mã xác thực", dòng phụ "Mã gồm 6 số vừa được gửi đến
0912***456" (che một phần số điện thoại). 6 ô nhập số riêng biệt, bo góc 10px, viền be,
tự động nhảy ô khi nhập. Dưới ô nhập: đếm ngược "Gửi lại mã sau 00:45" chuyển thành link
màu clay "Gửi lại mã" khi hết đếm ngược. Nút "Xác nhận" terracotta full-width, disabled
(màu xám be nhạt) cho đến khi đủ 6 số.
Liên kết: nhập đủ mã hợp lệ → nếu từ luồng đăng ký thì vào Customer/Menu; nếu từ luồng
quên mật khẩu thì vào A5 (Đặt lại mật khẩu).
A4. Quên mật khẩu

Frame name: Auth / Forgot Password

Màn hình nhập số điện thoại/email để nhận mã khôi phục, bố cục giống A2 nhưng đơn giản
hơn: tiêu đề "Khôi phục mật khẩu", 1 input số điện thoại/email, nút "Gửi mã xác thực"
terracotta full-width, link nhỏ "Quay lại đăng nhập" phía dưới.
Liên kết: nút "Gửi mã xác thực" → A3.
A5. Đặt lại mật khẩu

Frame name: Auth / Reset Password

Sau khi xác thực OTP thành công, hiện form đặt mật khẩu mới: input Mật khẩu mới, input
Xác nhận mật khẩu, chỉ báo độ mạnh mật khẩu dạng thanh nhỏ đổi màu (đỏ đất → vàng đất →
xanh olive) ngay dưới ô nhập đầu tiên. Nút "Đặt lại mật khẩu" terracotta full-width.
Liên kết: sau khi xác nhận → quay về màn hình đăng nhập tương ứng (A2 hoặc Auth/Login).
B. Cài đặt tài khoản (dùng chung cho các vai trò nội bộ)

Frame name: Shared / Account Settings

Thiết kế trang cài đặt tài khoản, truy cập từ avatar góc trên/dưới sidebar ở bất kỳ vai
trò nội bộ nào (Cashier/Warehouse/Manager/Admin). Bố cục 2 cột: cột trái hẹp (220px) là
menu điều hướng dọc trong cùng trang (không phải sidebar chính) gồm: "Thông tin cá nhân"
(đang chọn), "Đổi mật khẩu", "Thông báo", "Bảo mật". Cột phải là nội dung tương ứng:

- Thông tin cá nhân: ảnh đại diện tròn lớn có nút "Đổi ảnh" nhỏ đè góc dưới phải, input
  Họ tên, input Email (readonly nếu do Admin cấp), input Số điện thoại, dropdown Chi
  nhánh (readonly), nút "Lưu thay đổi" terracotta.
- Đổi mật khẩu: input Mật khẩu hiện tại, input Mật khẩu mới, input Xác nhận mật khẩu mới,
  nút "Cập nhật mật khẩu".
- Thông báo: danh sách toggle switch (dùng màu olive khi bật) cho từng loại thông báo:
  "Đơn hàng mới", "Cảnh báo tồn kho thấp", "Nhắc lịch làm việc", "Gợi ý cho quán" (chỉ
  hiện với vai trò Quản lý).
- Bảo mật: nút "Đăng xuất khỏi tất cả thiết bị" (viền đỏ đất, không phải nút đầy màu vì
  đây là hành động cảnh báo), hiển thị danh sách phiên đăng nhập gần đây (thiết bị + thời
  gian + vị trí gần đúng).

Toàn bộ dùng chung tông kem/nâu/terracotta, input bo góc 10px, không có phần nào trông
như bảng điều khiển kỹ thuật.
C. Tính lương nhân viên (Quản lý)
C1. Tổng quan lương tháng

Frame name: Manager / Payroll

Trang tính lương, cùng sidebar Quản lý (thêm mục "Lương" dưới "Nhân sự" hoặc submenu).
Header: tiêu đề "Bảng lương" + bộ chọn tháng (dạng "Tháng 11/2026" có mũi tên trái/phải)
+ nút "Xuất bảng lương" (dropdown Excel/PDF như đã nâng cấp ở trang Báo cáo). Hàng 3 thẻ
chỉ số: Tổng chi lương tháng này, Số nhân viên đã tính lương, Số nhân viên chưa chốt công.
Bảng chính: mỗi dòng 1 nhân viên gồm — ảnh đại diện + tên, vị trí, số giờ công trong
tháng, lương cơ bản, thưởng (nếu có, số dương màu olive), khấu trừ (nếu có, số âm màu đỏ
đất), thực lãnh (in đậm, serif), trạng thái (badge "Đã chi trả"/"Chưa chi trả"), nút
"Xem chi tiết" dạng text link.
Liên kết: nút "Xem chi tiết" → C2.
C2. Chi tiết lương nhân viên

Frame name: Manager / Payroll Detail

Trang chi tiết cách tính lương 1 nhân viên trong tháng, bố cục hẹp căn trái tối đa 640px,
có nút "← Quay lại" góc trên. Header: ảnh đại diện + tên + vị trí + chi nhánh. Panel 1
"Công thức tính lương" hiển thị rõ ràng từng dòng cộng/trừ dạng list (không phải công
thức toán học khô khan): "Lương cơ bản theo giờ: 168 giờ × 28.000đ = 4.704.000đ",
"Thưởng doanh số: +300.000đ", "Phạt đi trễ (2 lần): -100.000đ", đường kẻ ngang, dòng cuối
"Thực lãnh" in đậm serif cỡ lớn màu terracotta. Panel 2 "Chi tiết chấm công" là bảng nhỏ
theo ngày trong tháng: ngày, giờ vào, giờ ra, số giờ công, ghi chú (vd "Đi trễ 15 phút"
màu vàng đất). Cuối trang: nút "Xác nhận chi trả" (terracotta) và "Điều chỉnh thủ công"
(viền, mở modal cho phép Manager thêm thưởng/phạt tay kèm lý do bắt buộc nhập).
Liên kết: nút "Xác nhận chi trả" → quay lại C1 với trạng thái dòng tương ứng đổi thành
"Đã chi trả".
Sơ đồ luồng bổ sung
Auth/Customer Register ──▶ Auth/OTP Verification ──▶ Customer/Menu
Auth/Customer Login ──(Quên mật khẩu)──▶ Auth/Forgot Password ──▶ Auth/OTP Verification ──▶ Auth/Reset Password ──▶ Auth/Customer Login

[Bất kỳ vai trò nội bộ] ──(click avatar)──▶ Shared/Account Settings

Manager/Employees ──▶ Manager/Payroll ──(Xem chi tiết)──▶ Manager/Payroll Detail

Ghi chú kỹ thuật cho việc gửi OTP thật: đây chỉ là thiết kế giao diện — khi triển khai backend, nhớ tích hợp với dịch vụ SMS Brandname (Speedsms, eSMS, hoặc Zalo ZNS cho chi phí thấp hơn) thay vì tự dựng SMS gateway.