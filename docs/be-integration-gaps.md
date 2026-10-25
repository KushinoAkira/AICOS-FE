# Nối API thật: đối chiếu `FE-INTEGRATION-API-REFERENCE.md` với giao diện

Cách bật: đặt `VITE_USE_MOCK=false` (hoặc bỏ biến) và `VITE_API_BASE_URL=http://localhost:8080/api/v1`.
Mọi lời gọi đi qua `src/lib/api/*.ts`; ở chế độ thật mỗi module dùng bộ chuyển đổi trong `src/lib/api/be/*` (đổi dữ liệu BE sang dạng màn hình đang dùng). Chế độ mock (MSW) giữ nguyên.
**Không sửa gì trong `Backend/`.** Mọi chỗ BE thiếu hoặc khác đều ghi dưới đây để team BE quyết định.

## 1. Đã nối (chạy theo tài liệu)

| Màn hình | API BE | File |
|---|---|---|
| Đăng nhập, đăng xuất, refresh, đổi mật khẩu, hồ sơ | `/identity/auth/*` | `be/identity.ts` |
| Đăng ký khách | `/identity/auth/register` (gửi `tenantCode` = brand trong địa chỉ) | `be/identity.ts` |
| Quên / đặt lại mật khẩu | `forgot-password`, `reset-password` bằng **mã 6 số** (xem 3.1) | `be/identity.ts`, `ResetPassword.tsx` |
| Chi nhánh, tài khoản nhân viên | `/identity/branches`, `/identity/users` | `be/identity.ts` |
| Gói thuê bao của brand, gia hạn | `/identity/subscription`, `/renew` | `be/brand.ts` |
| Tenant, gói, thuê bao, nhật ký nền tảng | `/identity/tenants`, `subscription-plans`, `subscriptions`, `audit-logs` | `be/platform.ts` |
| Cổng thanh toán (bật/tắt) | `/payments/providers` | `be/platform.ts` |
| Thực đơn (món, đăng lên chi nhánh, hết hàng) | `/menu/products`, `categories`, `publications`, `branches/.../availability` | `be/brand.ts` |
| Khung giờ lấy hàng | `/orders/pickup-slots*` | `be/brand.ts` |
| Quy tắc điểm, voucher | `/customers/loyalty/rules`, `/customers/vouchers*` | `be/brand.ts` |
| Chính sách hoàn tiền, pay rules, tài khoản nhận tiền | `/payments/policies/cancellation`, `/workforce/pay-rules`, `/payments/merchant-settings` | `be/brand.ts` |
| Bàn, đơn tại quầy, thu tiền mặt, giao món, hủy, hoàn tiền | `/tables/*`, `/orders*`, `/payments/*`, `/kitchen/*` | `be/orders.ts` |
| Hàng chờ pha chế (đổi trạng thái) | `/kitchen/tickets/{id}/status` | `be/orders.ts` |
| Ca làm, check-in/out, ca thay, chốt két | `/workforce/*` | `be/staff.ts` |
| Điểm thưởng và đổi voucher của khách | `/customers/me/loyalty`, `/redemptions` | `be/staff.ts` |

## 2. Chưa có ở BE (FE đang cần)

| # | Màn hình | Cần gì | Hiện trạng FE ở chế độ thật |
|---|---|---|---|
| 2.1 | Khách quét QR gọi món (UC-23/24/26/27) | API ghi đơn dùng chung bảng đơn, gắn vào hàng chờ pha chế và thanh toán (BE ghi nhận chạy trong RAM) | Xem menu theo QR được; đặt món, xem đơn, gọi thanh toán báo "Backend chưa có API" |
| 2.2 | Khách đặt món mang đi, chọn giờ (SCRUM-80) | API tạo đơn Takeaway cho Customer, kiểm tra khung giờ, tính công suất | Báo "chưa có API" |
| 2.3 | Khách tự hủy đơn | `POST /orders/{id}/cancel` đang chỉ cho Cashier/Manager/Admin | Báo "chưa có API" |
| 2.5 | Trang đăng nhập theo thương hiệu (logo, màu, tên) | `GET public/brands/{code}` (và lưu logo/màu ở `brand/profile`) | FE tin địa chỉ `?brand=` / subdomain, hiện tên = mã quán; `login/register` báo lỗi nếu mã sai |
| 2.6 | Bảng giá công khai ở landing | `GET /identity/subscription-plans` đang yêu cầu đăng nhập | Landing có thể trống |
| 2.7 | Form liên hệ `/contact` | `POST public/contact` | Báo "chưa có API" |
| 2.8 | Thông báo của khách | Hộp thư/thông báo | Hiện hộp thư rỗng |
| 2.9 | Đánh giá đơn, gợi ý AI | `feedback*`, `ai/chat` (SCRUM-52) | Danh sách rỗng; gửi báo "chưa có API" |
| 2.10 | Lịch ca của quản lý | `GET /workforce/shift-assignments?from&to&branchId` (chỉ có `/mine`) | FE dùng `attendance/report` làm nguồn tạm (đoán `rows` có `employeeId, workDate, startTime`) |
| 2.11 | Danh sách ca thay đang mở | `GET /workforce/replacement-shifts` | Báo "chưa có API" |
| 2.12 | Gỡ nhân viên khỏi ca | `DELETE /workforce/shift-assignments/{id}` | Báo "chưa có API" |
| 2.13 | Số tiền mặt dự kiến trước khi chốt két | `GET /workforce/cash-closings/expected` | Báo "chưa có API" (chỉ biết sau khi chốt) |
| 2.14 | Realtime hàng chờ / màn hình thu ngân | SignalR `/hubs/kitchen` đã có ở BE | **FE chưa nối** (đang polling mỗi 5 giây); cần thêm gói `@microsoft/signalr` |
| 2.15 | Mời Brand Admin đầu tiên qua email | email mời đặt mật khẩu | Form tạo tenant (chế độ thật) hỏi thêm SĐT và mật khẩu ban đầu |

## 3. Chỗ BE khác với giao diện (FE đã nắn, cần team thống nhất)

1. **Đặt lại mật khẩu**: BE dùng mã 6 số + email (`reset-password {email, code, ...}`), giao diện cũ dùng link có token. Chế độ thật: sau "Quên mật khẩu" hiện nút "Nhập mã xác nhận" và trang đặt lại có thêm ô mã. BE chưa gửi email thật (mục 10 tài liệu).
2. **Khóa tài khoản**: BE trả `403 account.temporarily_locked`, FE chờ `423`; đã nhận cả hai. BE chưa trả thời gian còn bị khóa (`Retry-After`), FE hiển thị 15 phút mặc định.
3. **Mã lỗi**: BE dùng `errorCode` dạng `auth.invalid_credentials`; FE đọc `code` hoặc `errorCode`.
4. **Trạng thái đơn**: BE `Pending > Confirmed > Preparing > Ready > Completed`. FE có thêm `PendingPayment, Scheduled, Served/PickedUp, NoShow, Unfulfillable`. Đã nắn: `Pending` + Takeaway + chưa trả = `PendingPayment`; `Completed` = `Served` (tại bàn) hoặc `PickedUp`. `NoShow`, `Unfulfillable`, "pha lại" (Ready về Preparing) không có ở BE nên báo "chưa có API".
5. **Tùy chọn món (size, đường, đá, topping)**: BE không nhận tùy chọn khi đặt đơn và tính giá bằng giá món gốc. FE đưa tùy chọn vào ghi chú dòng; **phụ thu size/topping không được tính**. Cần BE nhận `optionIds`.
6. **Mã bàn**: BE đơn chỉ có `tableNumber`; FE dùng mã bàn (`T1`) làm id bàn ở chế độ thật.
7. **Giỏ gộp theo bàn**: FE "thanh toán cả bàn" = gọi thu tiền mặt từng đơn chưa trả của bàn đó.
8. **Quy tắc điểm**: FE hiển thị "điểm / 10.000đ", "giá trị voucher", "hạn (tháng)". BE là `amountPerPoint`, `redeemValuePerPoint`, `minPointsToRedeem`, hạn cố định 90 ngày. Đã quy đổi; hạn cố định 3 tháng.
9. **Chính sách hủy**: FE có `freeCancelBeforeMinutes`, `refundPercentAfterLock`; BE có `noShowAfterMinutes`, `noShowRefundPercent`, `cancelRefundPercent`. Đã ánh xạ gần đúng (miễn phí hủy trước X phút = `noShowAfterMinutes`); cần chốt ngữ nghĩa.
10. **Pay rules**: FE có `lateDeductPerHour` (không có ở BE, bỏ qua), hệ số ca thay = `replacementHourRate / partTimeHourRate`.
11. **Tài khoản nhận tiền**: BE VietQR cần `bankCode`, `accountNumber`; form hiện chỉ có tên, mã đơn vị. Cần thêm hai ô.
12. **Voucher**: BE không có "số lần dùng tối đa"; không kích hoạt lại voucher đã thu hồi.
13. **Món**: BE trả giá theo chi nhánh qua `PUT /menu/products/{id}/branches/{branchId}`, không có danh sách giá/đăng theo chi nhánh trong `GET /menu/products`; FE hiển thị "đã đăng" và giá riêng rỗng cho đến khi có API đọc.
14. **Topping phụ thuộc lựa chọn (BR-14)**: BE không có `requiresChoiceId`.
15. **Gói thuê bao**: FE có `graceDays` (không có ở BE); chu kỳ thêm `Quarterly`. FE chỉ có tháng/năm trước đây, đã thêm Quarterly.
16. **Cổng thanh toán**: đổi chế độ Mock/Sandbox cần ghi đè khóa; BE không trả khóa nên FE chỉ bật/tắt.
17. **Trạng thái tenant**: BE chỉ `Active|Suspended`; FE có `Pending, Closed, Rejected`.
18. **Hình dạng phản hồi chưa rõ** (FE đọc linh hoạt, cần xác nhận): danh sách chi nhánh/tài khoản (mảng hay phân trang), `GET /subscriptions`, `GET /platform/health`, `GET /platform/revenue`, `GET /tables/floor-plan`, `GET /tables/public/qr/{token}`, `attendance/report.rows`, `cash-closings`.

## 4. Màn hình cũ chưa dùng API (không phải do BE)

Các trang legacy vẫn là giao diện tĩnh, chưa gọi API: `CustomerRegister` (đăng ký khách), `OTPVerification`, một số trang quản lý cũ (xem Phase 8 trong kế hoạch). Cần migrate trước khi nối.

## 5. Kiểm thử

Chưa chạy với BE thật trong phiên này (BE chưa dựng). Đã kiểm `tsc --noEmit`, `eslint`, `vitest`. Khi BE chạy: đặt `VITE_USE_MOCK=false`, mở `/login`, đăng nhập `cashier@demo.com` / `Brand@12345` (ví dụ trong tài liệu) và thử từng màn.
