# UI audit (Phase 0) - không sửa code

Ngày: 22/10/2026. Phạm vi: `Frontend/src` sau Phase 1 nền tảng (role v2, rbac, routes, sidebar, mock identity).

## 1. Hiện trạng

- Stack: React 19, Vite 8, TS, Tailwind 4, react-router 8, recharts. **Chưa có**: React Query, zod, MSW, i18n, SignalR, vitest, Playwright, eslint, knip.
- 49 file nguồn, không file nào > 540 dòng (`Reports.tsx` 537, `AccountSettings.tsx` 445, `Menu.tsx` 439).
- Màu: **~1220 chỗ hard-code hex trong `.tsx`** (inline style). `index.css` có `@theme` nhưng component không dùng.
- Mock: `lib/api/mock.ts` chỉ phủ identity (login, users, branches). Đơn hàng nằm ở `OrdersContext` (localStorage, vi phạm mục 6.6 của prompt).
- Chưa có: `formatVND` dùng chung (mỗi trang tự format), i18n, state machine đơn, realtime, guard 403/404 (hiện redirect về trang chủ vai trò), trạng thái lỗi mạng trong form.

## 2. Giữ / Xóa / Viết lại

### Giữ (đổi style sang token, tách file)
Layout `InternalLayout` (sidebar nâu, header, UserMenu), `AuthHero`, `CartDrawer` (3 tab), `AIAssistantChat` (khung), `Toast`, `ErrorBoundary`, `Skeleton`, `rbac.ts`, `roles.ts`, `pages.ts`, `Users.tsx`, `Branches.tsx` (đã nối API), `Payroll*`, `Employees`, `SystemLogs` (bỏ dữ liệu cứng).

### Xóa (mục 4 của prompt)
| Vị trí | Gỡ |
|---|---|
| `manager/Dashboard.tsx` | thẻ "nguyên liệu/nhập thêm", "Khách hàng mới", lời chào "Anh Minh ☕", ngày 15/11/2025, số `7400.000đ`, % tăng cứng |
| `manager/Reports.tsx` | dòng còn nhắc tồn kho / dữ liệu 7 ngày cứng |
| `cashier/Reservations.tsx` | toàn bộ "Đặt bàn mới", trạng thái "Đã đặt", đổi trạng thái thủ công -> thay bằng sơ đồ bàn chỉ đọc theo table session |
| `App.tsx` | các màn `Planned` khi màn thật xong; mục "Món & tồn bán" -> "Tình trạng món"; "Đổi ca / nghỉ" -> "Ca thay" |
| `Login.tsx` | prefill email/mật khẩu (nếu còn), "© 2025" cứng |
| `Profile.tsx` | voucher cứng (hết hạn 2025) |
| `InternalLayout`/`CustomerUserMenu` | kiểm tra lại avatar đôi ở header Branch Manager |

### Viết lại / dựng mới
Barista kiosk, Guest QR (có Member/Guest), POS (modal tuỳ chỉnh dùng chung, chọn loại đơn/bàn), Bill bàn, Phục vụ & Giao nhận, Chốt ca tiền mặt, Takeaway, Điểm & Voucher, Feedback, Insight AI, Chính sách huỷ/hoàn, Cấu hình lương, Merchant payment, Đối soát, Chấm công, Ca thay, Tenant wizard, Plans, Subscriptions, Providers, Health, Revenue SaaS.

## 3. Đối chiếu lỗ hổng (mục 3 của prompt)

| Mục | Trạng thái hiện tại |
|---|---|
| 3.1 Auth | Lỗi mạng chỉ là toast; chưa khóa 5 lần, chưa reset đầy đủ theo token/OTP có hạn, Sign Up chưa chọn brand/consent |
| 3.2 Shell | Còn placeholder "Đang thiết kế"; nhãn vai trò lẫn EN/VI; chưa chuông thông báo; chưa trang 403/404; loading/empty/error chưa đồng nhất |
| 3.3 Super Admin | 7 màn đều placeholder |
| 3.4 Brand | Dashboard dùng lại màn BM; thiếu UC-14/15/18/19/20/35/37 |
| 3.5 BM | Dashboard dữ liệu cứng; thiếu UC-29/32/33/34/35/37 |
| 3.6 Cashier | POS thiếu modal tuỳ chỉnh/loại đơn/bàn; "Xác nhận thanh toán" là placeholder; Reservations sai phạm vi; Shifts lệch thứ/ngày, nhãn "Hùng" |
| 3.7 Barista | Đang dùng lại `OrderBoard` của cashier, chưa phải kiosk |
| 3.8 Customer | Chưa có đường/đá, chưa có Guest vs Member, chưa có thanh toán, takeaway, điểm/voucher thật, feedback |

## 4. Rủi ro
1. Thêm thư viện (MSW, React Query, zod, i18next, SignalR client, vitest, Playwright, eslint, knip) làm thay đổi kiến trúc; cần đồng ý.
2. Chuyển 1220 hex sang token là thay đổi lớn, dễ vỡ giao diện -> làm theo trang khi viết lại.
3. Cấu trúc `features/` theo prompt lệch cấu trúc `pages/` hiện tại; di chuyển toàn bộ tốn công và dễ lỗi import.
4. SignalR/real-time và idempotency chỉ mô phỏng được, backend chưa có (orders/payments/kitchen/reporting là shell).
5. Backend vẫn dùng role cũ; Brand Admin/Barista chỉ test được qua override dev.

## 5. Mâu thuẫn cần quyết định trước Phase 1
Xem tin nhắn kèm theo.
