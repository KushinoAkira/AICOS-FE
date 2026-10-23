D1. [KHÁCH HÀNG] Trợ lý AI — Chat đặt món & tư vấn

Frame name: Customer / AI Assistant Chat

Thiết kế màn hình chat trợ lý cho khách hàng, mở dạng overlay trượt lên từ dưới (bottom
sheet) trên nền mờ be nhạt, không che hết màn hình để khách vẫn thấy menu phía sau mờ mờ.
Header của sheet: icon tròn nhỏ hình hạt cà phê cách điệu với 2-3 nét sóng nhẹ toả ra
(không phải icon robot/chip), tên "Trợ lý AICOS", dòng phụ nhỏ "Hỏi mình về món, khẩu vị,
hoặc để mình gợi ý nhé" — icon đóng (X) góc phải.
Khung chat: tin nhắn trợ lý căn trái trong bubble nền trắng bo góc 16px (góc dưới trái bo
ít hơn để tạo "đuôi" bubble tự nhiên), tin nhắn khách hàng căn phải bubble nền terracotta
nhạt. Ví dụ nội dung mẫu: khách hỏi "Tôi muốn uống gì đó ít ngọt", trợ lý trả lời bằng câu
tự nhiên kèm 2 thẻ gợi ý món nhỏ ngay trong bubble (ảnh mini + tên + giá + nút "+"), không
liệt kê dạng bảng khô khan. Trạng thái đang xử lý: thay vì 3 chấm nhảy thông thường, dùng
animation 3 giọt cà phê nhỏ nhấp nháy tuần tự kèm chữ nhỏ "Đang pha câu trả lời...".
Thanh nhập tin cố định dưới cùng: input bo tròn full, nút gửi hình mũi tên nhỏ màu
terracotta, có thêm 2-3 gợi ý câu hỏi nhanh dạng pill phía trên input (vd "Món ít đường?",
"Đồ uống mùa này?") để khách không cần tự gõ.
Liên kết: bấm nút "+" trên thẻ gợi ý trong chat → thêm vào giỏ hàng (Customer/Menu), sheet
vẫn mở để tiếp tục hỏi.
D2. [QUẢN LÝ] Gợi ý cho quán — Trang đầy đủ

Frame name: Manager / AI Suggestions

Mở rộng mục "Gợi ý cho quán" (hiện chỉ là widget nhỏ trên Dashboard) thành 1 trang riêng,
cùng sidebar Quản lý. Header: tiêu đề "Gợi ý cho quán hôm nay" + dòng phụ "Tổng hợp từ dữ
liệu bán hàng, tồn kho và hành vi khách hàng gần đây". Nội dung chia thành các thẻ gợi ý
xếp dọc, mỗi thẻ nền trắng bo góc 16px, viền trái dày 3px màu theo loại gợi ý (olive =
kinh doanh, vàng đất = tồn kho, clay = khách hàng), gồm: icon nhỏ dạng sóng nhẹ, tiêu đề
ngắn (vd "Món bán chạy cuối tuần"), nội dung phân tích 2-3 câu bằng ngôn ngữ tự nhiên, và
1 nút hành động rõ ràng tương ứng (vd "Xem chi tiết", "Tạo khuyến mãi ngay", "Nhập thêm
nguyên liệu") thay vì chỉ đọc rồi thôi. Mỗi thẻ có nút nhỏ "Ẩn gợi ý này" (icon mắt gạch)
ở góc để Manager tự lọc bớt nếu không liên quan. Trên cùng có bộ lọc dạng pill để xem
theo nhóm: Tất cả/Doanh thu/Tồn kho/Khách hàng.
Liên kết: nút "Tạo khuyến mãi ngay" → D4; nút "Nhập thêm nguyên liệu" → Warehouse/Stock
Receipt.
D3. [QUẢN LÝ] Dự báo nhu cầu tồn kho

Frame name: Manager / Inventory Forecast

Trang dự báo tồn kho, truy cập từ mục "Kho hàng" (thêm tab phụ "Dự báo" cạnh tab "Tồn
kho hiện tại") hoặc từ nav riêng. Header: tiêu đề "Dự báo nhu cầu nguyên vật liệu" + dòng
phụ "Ước tính dựa trên 30 ngày bán hàng gần nhất". Nội dung chính: danh sách nguyên vật
liệu dạng card, mỗi card gồm: tên nguyên liệu, biểu đồ mini dạng đường (sparkline) thể
hiện xu hướng tiêu thụ 30 ngày qua màu terracotta nhạt, dòng dự báo bằng chữ tự nhiên
"Dự kiến cần thêm ~18kg trong 7 ngày tới" (không hiện thuật ngữ "model", "confidence
interval"), badge mức độ chắc chắn dạng chữ thường thay vì số liệu kỹ thuật (vd "Khá chắc
chắn" màu olive, "Cần theo dõi thêm" màu vàng đất khi dữ liệu ít), nút "Tạo phiếu nhập
trước" (terracotta) để chủ động đặt hàng sớm.
Liên kết: nút "Tạo phiếu nhập trước" → Warehouse/Stock Receipt (điền sẵn nguyên liệu +
số lượng đề xuất).
D4. [QUẢN LÝ] Đề xuất giá & khuyến mãi

Frame name: Manager / Promotion Suggestions

Trang đề xuất chương trình giá/khuyến mãi. Header: tiêu đề "Đề xuất khuyến mãi". Nội dung
là danh sách các đề xuất dạng card lớn hơn D2 (vì cần nhiều thông tin ra quyết định): tên
đề xuất (vd "Giảm 10% Trà đào cam sả khung 14h-17h"), lý do đề xuất viết tự nhiên ("Khung
giờ này thường vắng khách nhưng món này vẫn được ưa chuộng — giảm giá nhẹ có thể kéo thêm
khách ghé quán"), ước tính tác động ("Có thể tăng ~15% lượt bán khung giờ này" — ghi rõ
đây là ước tính, không khẳng định chắc chắn), 2 nút hành động rõ ràng nằm ngang: "Áp dụng
đề xuất" (terracotta, nổi bật) và "Bỏ qua" (viền, phụ). Khi Manager bấm "Áp dụng", hiện
1 form nhỏ xổ ra ngay trong card để xác nhận/chỉnh thời gian áp dụng trước khi lưu thật.
D5. [QUẢN LÝ] Trợ lý nội dung marketing

Frame name: Manager / Marketing Content Assistant

Trang hỗ trợ soạn nội dung đăng mạng xã hội. Header: tiêu đề "Soạn nội dung cho quán".
Bố cục 2 cột: cột trái là form ngắn để Manager chọn nhanh — dropdown chọn món/chương
trình muốn quảng bá, chọn giọng văn dạng pill (Ấm áp/Vui nhộn/Trang trọng), nút lớn
"Soạn nội dung" (terracotta). Cột phải hiển thị 3 phiên bản nội dung được tạo ra dạng
card ngang cuộn được, mỗi card là 1 caption hoàn chỉnh kèm gợi ý hashtag nhỏ bên dưới,
mỗi card có 2 nút nhỏ góc trên: "Sao chép" (icon) và "Chỉnh sửa" (mở textarea inline để
Manager sửa tay trực tiếp trên card đó trước khi dùng). Trạng thái đang soạn: dùng cùng
animation "giọt cà phê" như D1 kèm chữ "Đang soạn nội dung cho bạn...".
Cập nhật sơ đồ luồng
Customer/Menu ──(icon trợ lý nổi góc dưới phải, dạng nút tròn terracotta có icon sóng nhẹ)──▶ Customer/AI Assistant Chat

Manager/Dashboard ──(Xem tất cả gợi ý)──▶ Manager/AI Suggestions ──▶ Manager/Promotion Suggestions
Manager/Dashboard hoặc Warehouse/Stock ──▶ Manager/Inventory Forecast ──▶ Warehouse/Stock Receipt
Manager/Menu Management ──(nút "Soạn nội dung quảng bá" trên mỗi món)──▶ Manager/Marketing Content Assistant