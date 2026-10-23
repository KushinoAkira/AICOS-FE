Đúng, đây là 2 khoảng trống quan trọng — RBAC vì SRS đã yêu cầu (AUTH-03) nhưng chưa có màn hình cấu hình quyền chi tiết; hình nền vì hiện tại nhiều màn hình đang dùng khối màu phẳng thay ảnh thật, nhìn chưa đủ "chuyên nghiệp" như tinh thần specialty-coffee đã đề ra ban đầu.

A. RBAC — Bổ sung màn hình & nguyên tắc thiết kế
A1. [ADMIN] Ma trận phân quyền chi tiết

Frame name: Admin / Role Permissions Matrix

Thiết kế màn hình cấu hình phân quyền chi tiết, truy cập từ nút "Cấu hình quyền" trên
trang Người dùng & phân quyền. Header: tiêu đề "Phân quyền theo vai trò" + dòng phụ "Chọn
những gì mỗi vai trò được phép làm trong hệ thống". Bố cục dạng ma trận: cột ngang trên
cùng là 5 vai trò (Admin/Quản lý/Thu ngân/Kho/Khách hàng) hiển thị dạng thẻ nhỏ có thể
chọn (tab); hàng dọc bên trái là nhóm quyền theo module (Đơn hàng, Menu, Kho, Nhân sự,
Báo cáo, Người dùng, Cấu hình AI), mỗi module có thể mở rộng (expand) để hiện quyền con
cụ thể (Xem/Tạo/Sửa/Xóa). Khi chọn 1 vai trò ở tab trên, ma trận bên dưới hiện checkbox
tương ứng — checkbox đã bật dùng màu terracotta, khoá cứng (không cho tắt) với các quyền
nền tảng của Admin, hiển thị icon khoá nhỏ màu nâu nhạt bên cạnh để phân biệt "quyền mặc
định không thể tắt" với "quyền có thể tuỳ chỉnh". Cuối trang: nút "Lưu thay đổi"
(terracotta) và dòng cảnh báo nhỏ màu vàng đất nếu đang bớt quyền so với mặc định: "Thay
đổi này sẽ ảnh hưởng đến 5 tài khoản đang có vai trò Thu ngân".
A2. Trạng thái "không đủ quyền" (dùng chung)

Frame name: Shared / Access Restricted State

Thiết kế 1 trạng thái tái sử dụng khi người dùng cố truy cập chức năng ngoài quyền hạn
(vd Thu ngân bấm nhầm link vào trang Báo cáo qua URL trực tiếp). Nội dung căn giữa trong
khung nội dung chính (giữ nguyên sidebar bình thường): minh hoạ line-art nhẹ nhàng hình
cửa quán khép hờ hoặc chiếc chìa khoá cách điệu mềm mại (không dùng icon ổ khoá kỹ thuật/
biển cảnh báo đỏ), tiêu đề serif "Khu vực này chưa dành cho bạn", dòng phụ "Liên hệ Quản
lý hoặc Admin nếu bạn cần quyền truy cập vào đây", nút viền "Quay lại trang chủ". Giữ tông
ấm áp, tránh cảm giác bị "cấm đoán" gay gắt.
Nguyên tắc RBAC xuyên suốt toàn bộ hệ thống (ghi vào Design System, không phải 1 màn hình riêng)
- Sidebar chỉ hiển thị mục nav mà vai trò đang đăng nhập có quyền — không hiện mục màu
  xám/disabled cho quyền không có, để tránh gây tò mò/nhầm lẫn (ẩn hẳn thay vì làm mờ).
- Với hành động ở cấp nút bấm trong cùng 1 trang (vd Thu ngân xem được đơn hàng nhưng
  không được xoá), nút hành động ngoài quyền hiển thị dạng disabled mờ 40% kèm tooltip
  nhỏ khi hover: "Cần quyền Quản lý để thực hiện" — không ẩn hẳn vì đây là hành động
  người dùng mong đợi thấy nhưng bị giới hạn có chủ đích.
- Dữ liệu nhạy cảm theo cấp quyền (vd giá vốn, lương nhân viên) hiển thị dạng "•••••" có
  icon con mắt nhỏ để "Xem" nếu vai trò hiện tại được phép, thay vì ẩn hoàn toàn field.
- Mọi hành động ghi vào Audit Log (Admin/System Logs) cần thống nhất 1 mẫu câu: "[Tên
  người dùng] đã [hành động] [đối tượng] lúc [thời gian]" — đã áp dụng ở A2 Nhật ký hệ
  thống, giữ nhất quán khi bổ sung log cho các hành động mới (đổi quyền, chi lương...).
B. Hình nền — Asset chuyên nghiệp cho từng nhóm giao diện

Nguyên tắc chung: chỉ dùng ảnh thật ở các điểm chạm cảm xúc (khách hàng, đăng nhập, trang trống) — các màn hình dữ liệu (bảng, dashboard) giữ nguyên nền phẳng để không gây rối mắt khi đọc số liệu.

Bảng chỉ định ảnh nền theo màn hình
Màn hình	Vị trí ảnh	Mood/Composition	Tỷ lệ đề xuất
Auth/Login (nhân viên)	Cột trái 45% chiều rộng	Quầy pha chế đang hoạt động, ánh sáng vàng ấm buổi sáng, có người thật đang thao tác (không tạo dáng)	4:5 dọc
Auth/Customer Register & Login	Không cần ảnh lớn — chỉ icon nhỏ	—	—
Customer/Menu	Dải hero mỏng phía trên (nếu bổ sung), hoặc giữ ảnh từng món trong card	Latte art cận cảnh, hạt cà phê rang, tay pha chế	3:2 hoặc vuông
Customer/Product Detail	Ảnh món full-width đầu modal	Cận cảnh món, có hơi nước/độ ẩm để trông "tươi"	4:3
Shared/Access Restricted	Không dùng ảnh thật — dùng line-art	—	—
Trang trống (empty state) — vd Admin/Branches, Manager/Employees khi chưa có dữ liệu	Minh hoạ line-art nhỏ, không phải ảnh chụp	Nét mảnh, 1 màu nâu/olive, phong cách như đã dùng ở A1 Chi nhánh	vuông nhỏ 120-160px
Yêu cầu kỹ thuật cho ảnh thật (đưa vào Figma prompt)
Khi chèn ảnh thật vào các khung trên:
- Độ phân giải tối thiểu 1600px cạnh dài, định dạng webp để tối ưu tải trang
- Luôn phủ overlay gradient nhẹ (từ trong suốt đến nâu đậm #6F4E37 ở mép dưới/mép chứa
  chữ, opacity 20-40%) để đảm bảo chữ trắng/chữ đậm đặt lên ảnh vẫn đọc rõ, không cần
  thêm khung nền cho text
- Không dùng ảnh có người mẫu tạo dáng nhìn thẳng vào máy kiểu stock văn phòng; ưu tiên
  góc chụp tự nhiên, đang thao tác, ánh sáng tự nhiên/vàng ấm
- Toàn bộ ảnh trong hệ thống dùng chung 1 "color grading" nhất quán (tăng nhẹ tông vàng/
  nâu, giảm bão hoà xanh dương) để nhìn như 1 bộ ảnh chụp riêng cho thương hiệu, dù lấy từ
  nhiều nguồn khác nhau
- Nguồn ảnh gợi ý nếu cần ảnh tạm khi thiết kế: Unsplash chủ đề "specialty coffee",
  "coffee shop interior", "barista hands" — tránh ảnh có logo thương hiệu cà phê khác lọt
  vào khung hình
Cập nhật sơ đồ luồng
Admin/Users ──(nút "Cấu hình quyền")──▶ Admin/Role Permissions Matrix

[Bất kỳ trang nào] ──(truy cập ngoài quyền)──▶ Shared/Access Restricted State ──▶ về trang chủ theo vai trò