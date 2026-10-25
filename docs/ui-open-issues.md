# UI open issues

- Trang công khai (Liên hệ, Điều khoản, Bảo mật): email `support@aicos.app`, `sales@aicos.app`, giờ làm việc và ngày cập nhật là giá trị mẫu trong `src/lib/siteInfo.ts`. Nội dung pháp lý cần được rà soát trước khi vận hành thật.
- Footer chưa có số hotline, địa chỉ công ty, mạng xã hội vì chưa có thông tin thật.
- Quán được duyệt trong mock chưa có tài khoản thật (chưa có luồng mời đặt mật khẩu).
- Đã bỏ luồng chủ quán tự đăng ký (/register-brand) vì proposal v2 chỉ có Super Admin tạo thương hiệu (UC-05). Nếu muốn mô hình kiểu Firebase (đăng nhập tài khoản cá nhân rồi tạo quán) thì cần BE hỗ trợ tài khoản chủ quán tồn tại trước tenant, và cần giảng viên hoặc nhóm xác nhận vì ngoài phạm vi proposal.
- Ô "Hỏi nhanh" ở mục Hỏi đáp của trang chủ (QuickAsk) là phần mở rộng ngoài danh sách 3 tính năng AI của proposal: chỉ tìm từ khoá trong FAQ, tính năng, vai trò và bảng giá của chính trang (không dùng mô hình AI). Cần nhóm và giảng viên xác nhận giữ hay bỏ.
