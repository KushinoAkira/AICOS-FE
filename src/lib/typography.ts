/** Non-breaking space — keeps compound words on one line. */
export const NBSP = "\u00A0"

/**
 * Product / Vietnamese compounds that must not wrap mid-phrase
 * (e.g. "cà" at EOL + "phê" on the next line).
 */
const COMPOUNDS = [
  "quầy pha chế",
  "câu hỏi thường gặp",
  "chủ thương hiệu",
  "đặt mang đi",
  "trạng thái",
  "khuyến mãi",
  "hoàn tiền",
  "doanh thu",
  "hóa đơn",
  "cà phê",
  "chi nhánh",
  "thương hiệu",
  "nhân viên",
  "thu ngân",
  "pha chế",
  "quầy pha",
  "gọi món",
  "đặt món",
  "mang đi",
  "tích điểm",
  "bảng giá",
  "đăng nhập",
  "đăng ký",
  "chủ quán",
  "số liệu",
  "hệ thống",
  "khách hàng",
  "mật khẩu",
  "thanh toán",
  "sẵn sàng",
  "gọn gàng",
  "màn hình",
  "mã đơn",
  "mã QR",
  "tiền mặt",
  "tài khoản",
  "báo cáo",
  "thực đơn",
  "liên hệ",
  "dùng thử",
  "14 ngày",
  "câu hỏi",
  "thường gặp",
  "Super Admin",
  "/ tháng",
] as const

/** Short words that should stick to the following word (avoid lonely EOL). */
const GLUE = [
  "và", "của", "cho", "với", "ở", "từ", "tới", "hay", "hoặc", "khi",
  "mỗi", "một", "các", "những", "trên", "trong", "tại", "rồi", "đến",
  "sau", "trước", "để", "bằng", "theo", "giữa",
] as const

/** Join words so they never wrap apart. */
export function keep(...words: string[]): string {
  return words.join(NBSP)
}

/**
 * Insert non-breaking spaces into known compounds and after short glue words
 * so meaningful phrases stay on one line.
 */
export function protectOrphans(text: string): string {
  let out = text
  for (const phrase of [...COMPOUNDS].sort((a, b) => b.length - a.length)) {
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/ /g, "\\s+")
    out = out.replace(new RegExp(escaped, "gi"), (m) => m.replace(/\s+/g, NBSP))
  }
  for (const w of GLUE) {
    out = out.replace(new RegExp(`(${w})(\\s+)(?=\\S)`, "gi"), (_, a: string) => `${a}${NBSP}`)
  }
  return out
}
