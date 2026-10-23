A. Hệ thống chuyển động (Motion System) — bổ sung vào Design System
A1. Nguyên tắc chuyển động tổng thể
Bổ sung "Motion System" vào Design System của AICOS, áp dụng nhất quán toàn bộ sản phẩm.
Triết lý: chuyển động phải "êm" như thao tác rót/khuấy cà phê — mềm, có trọng lượng nhẹ,
không giật/nảy kiểu game hay hiệu ứng công nghệ phô trương.

Easing & thời lượng chuẩn (dùng đúng 3 mức, không tự chế thêm):
- Vi tương tác (hover, toggle, nút bấm): 150–200ms, easing "ease-out" (cubic-bezier(0.16,
  1, 0.3, 1)) — phản hồi tức thì, không có độ trễ cảm nhận được
- Chuyển đổi trong cùng ngữ cảnh (mở modal, chuyển tab, expand/collapse): 250–300ms,
  easing "ease-in-out" (cubic-bezier(0.65, 0, 0.35, 1))
- Chuyển trang / chuyển vai trò: 350–400ms, easing "ease-out" nhẹ, kèm fade nhẹ (opacity
  0→1) đi cùng dịch chuyển (không dùng slide mạnh kiểu điện thoại)

Trong Figma, dùng Smart Animate cho mọi transition giữa các frame, đặt easing tương ứng ở
trên trong Prototype panel — không dùng "Instant" (cắt cứng) cho bất kỳ chuyển frame nào
trừ trạng thái lỗi/cảnh báo cần gây chú ý ngay.
A2. Chuyển động theo từng loại thao tác cụ thể
1. Điều hướng sidebar (mọi vai trò nội bộ): khi chọn mục nav khác, thanh nền active
   (background pill) trượt mượt từ vị trí cũ sang vị trí mới trong 200ms thay vì việc
   tắt/bật đột ngột — dùng Smart Animate giữa các state của cùng 1 component Sidebar.

2. Mở/đóng modal (Product Detail D2, Access Restricted, các form thêm mới): nền overlay
   fade in 200ms; card modal đồng thời scale từ 96%→100% + fade in 250ms, easing ease-out
   — tạo cảm giác "nổi nhẹ lên" chứ không bật ra đột ngột. Đóng modal làm ngược lại nhanh
   hơn (180ms) vì thoát ra nên cảm giác nhanh gọn hơn mở vào.

3. Thêm món vào giỏ hàng (Customer/Menu, Customer/Product Detail): khi bấm nút "+", icon
   giỏ hàng góc trên nảy nhẹ 1 lần (scale 100%→112%→100%, 300ms, easing "ease-out" có chút
   bounce rất nhẹ — không bounce nhiều lần); số badge trên giỏ hàng đổi số kèm hiệu ứng
   đếm tăng nhanh (count-up) thay vì đổi số tức thì.

4. Thẻ đơn hàng trong Bảng trạng thái (Cashier/Order Board): khi đơn chuyển cột (vd từ
   "Chờ xác nhận" sang "Đang pha chế"), thẻ trượt mượt sang cột mới trong 300ms thay vì
   biến mất/xuất hiện đột ngột ở cột khác — dùng Smart Animate theo vị trí X/Y của thẻ.

5. Số liệu trên Dashboard (Manager/Dashboard, Manager/Payroll, Admin/Users...): các con
   số lớn (doanh thu, số đơn...) chạy hiệu ứng đếm tăng dần từ 0 lên giá trị thật trong
   600-800ms khi trang vừa load, easing "ease-out" — tạo cảm giác dữ liệu "sống", không
   phải text tĩnh.

6. Biểu đồ cột (Doanh thu 7 ngày, Báo cáo bán hàng): các cột mọc lên từ chiều cao 0 theo
   easing ease-out trong 500ms, có độ trễ so le (stagger) 40ms giữa các cột liền kề để tạo
   chuyển động lan tự nhiên từ trái sang phải, không mọc đồng loạt cùng lúc.

7. Danh sách dạng bảng/card khi trang vừa tải (Warehouse/Stock, Manager/Menu Management,
   Admin/Users, D2 AI Suggestions...): mỗi hàng/card fade in + dịch nhẹ từ dưới lên
   (8px→0), so le 30-50ms giữa các hàng, tổng thời gian toàn danh sách không vượt quá 400ms
   để tránh cảm giác chậm chạp khi danh sách dài.

8. Toggle switch (Shared/Account Settings, RBAC checkbox): nút gạt trượt mượt 150ms kèm
   đổi màu nền track đồng thời (be nhạt → olive), không đổi màu tức thì rồi mới trượt.

9. Trạng thái loading dữ liệu (mọi bảng/danh sách khi đang tải): dùng skeleton loader
   dạng khối bo góc màu be nhạt hơn nền (không dùng spinner tròn xoay) có hiệu ứng
   "shimmer" - 1 dải sáng nhẹ lướt qua từ trái sang phải liên tục 1.5s/lần — nhất quán với
   "loading = đang chuẩn bị, nhẹ nhàng" xuyên suốt sản phẩm.

10. Nút bấm (mọi CTA terracotta): hover đổi sang tông đậm hơn 8% trong 150ms; khi bấm
    (active) scale nhẹ 98% tức thời rồi trở lại 100% khi thả — tạo cảm giác "phản hồi vật
    lý" giống bấm nút thật.

11. Toast/thông báo nổi (vd "Đã lưu thay đổi", "Đã xác nhận nhập kho"): trượt vào từ cạnh
    trên bên phải màn hình trong 250ms, tự động trượt ra sau 3s, có thanh tiến trình mảnh
    phía dưới đếm ngược thời gian hiển thị còn lại.

Không áp dụng: hiệu ứng xoay 3D, particle effect, confetti, hoặc bất kỳ chuyển động nào
kéo dài quá 800ms — mọi thứ phải "nhanh gọn nhưng mềm mại", đúng tinh thần pha một ly cà
phê ngon: có sự chăm chút nhưng không rườm rà.
B. Bổ sung Quản lý tài khoản khách hàng (Admin)

Đúng là hiện tại Admin/Users chỉ đang cover FR ADM-01/AUTH-04 cho nhân viên, còn phần quản lý khách hàng (liên quan CUS-01) đang nằm rải rác chưa có nơi quản trị tập trung. Cần tách bạch 2 khái niệm rõ ràng trong sidebar Admin.

B0. Điều chỉnh Sidebar Admin
Đổi tên mục "Người dùng" hiện tại thành "Tài khoản nhân viên" để tránh nhầm lẫn, và thêm
mục mới "Tài khoản khách hàng" ngay bên dưới. Thứ tự sidebar Admin sau khi cập nhật: Tài
khoản nhân viên, Tài khoản khách hàng, Chi nhánh, Kiến thức trợ lý, Nhật ký hệ thống.
B1. Danh sách tài khoản khách hàng

Frame name: Admin / Customer Accounts

Trang quản lý tài khoản khách hàng, sidebar Admin đã cập nhật ở B0, mục "Tài khoản khách
hàng" đang chọn. Header: tiêu đề "Tài khoản khách hàng" + tổng số khách hàng đã đăng ký.
Hàng 3 thẻ chỉ số: Tổng khách hàng, Khách hàng mới tháng này, Khách hàng thân thiết (có
>10 đơn). Có ô tìm kiếm theo tên/SĐT + bộ lọc dạng dropdown (Tất cả/Thành viên Đồng/Bạc/
Vàng theo hạng loyalty). Bảng danh sách: ảnh đại diện tròn nhỏ (hoặc chữ cái đầu nếu chưa
có ảnh), họ tên, số điện thoại, hạng thành viên (badge màu theo hạng), tổng chi tiêu, số
đơn đã đặt, ngày tham gia, trạng thái (Hoạt động/Đã khoá), nút "Xem chi tiết" dạng text
link. Áp dụng hiệu ứng fade-in so le cho các dòng khi tải trang theo Motion System A2.7.
Liên kết: nút "Xem chi tiết" → B2.
B2. Chi tiết tài khoản khách hàng

Frame name: Admin / Customer Account Detail

Trang chi tiết 1 khách hàng, có nút "← Quay lại" góc trên. Header: ảnh đại diện lớn, tên,
số điện thoại, hạng thành viên, nút "Khoá tài khoản" (viền đỏ đất, đặt ở góc phải vì là
hành động nhạy cảm — theo đúng nguyên tắc RBAC đã định: hành động cảnh báo không dùng nút
đầy màu). 3 tab ngang: "Tổng quan", "Lịch sử đơn hàng", "Điểm thưởng".
- Tổng quan: các chỉ số tổng chi tiêu, số đơn, món yêu thích nhất, chi nhánh hay ghé nhất.
- Lịch sử đơn hàng: bảng các đơn đã đặt (mã đơn, ngày, chi nhánh, tổng tiền, trạng thái).
- Điểm thưởng: số điểm hiện tại (serif lớn), lịch sử tích/đổi điểm dạng list kèm mốc thời
  gian, và nút "Điều chỉnh điểm thủ công" (mở modal yêu cầu nhập lý do bắt buộc — đồng bộ
  nguyên tắc audit log đã thiết lập, mọi điều chỉnh tay đều ghi vào Nhật ký hệ thống).
Liên kết: nút "Khoá tài khoản" → modal xác nhận (2 bước, vì là hành động nhạy cảm) trước
khi đổi trạng thái; đổi trạng thái thành công → hiện toast theo Motion System A2.11.
Cập nhật sơ đồ luồng
Admin/Customer Accounts ──▶ Admin/Customer Account Detail ──(Khoá tài khoản)──▶ modal xác nhận ──▶ toast báo thành công