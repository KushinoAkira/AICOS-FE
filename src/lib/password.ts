export type Strength = "empty" | "weak" | "fair" | "good" | "strong"

export interface PasswordHint {
  id: string
  label: string
  optional?: boolean
  test: (password: string) => boolean
}

/** Same floor as reset-password / tạo tài khoản nhân sự: 8 ký tự, chữ hoa, chữ số. */
export const HINTS: PasswordHint[] = [
  { id: "len", label: "Ít nhất 8 ký tự", test: (p) => p.length >= 8 },
  { id: "lower", label: "Có chữ thường (a–z)", test: (p) => /[a-z]/.test(p) },
  { id: "upper", label: "Có chữ hoa (A–Z)", test: (p) => /[A-Z]/.test(p) },
  { id: "digit", label: "Có chữ số (0–9)", test: (p) => /\d/.test(p) },
  { id: "special", label: "Nên có ký tự đặc biệt (!@#$…)", optional: true, test: (p) => /[^A-Za-z0-9]/.test(p) },
]

export function isAcceptable(password: string): boolean {
  return password.length >= 8 && /[A-Z]/.test(password) && /\d/.test(password)
}

const LABELS: Record<Exclude<Strength, "empty">, string> = {
  weak: "Yếu",
  fair: "Trung bình",
  good: "Khá",
  strong: "Mạnh",
}

export function scorePassword(password: string): { level: Strength; met: number; label: string } {
  if (!password) return { level: "empty", met: 0, label: "" }
  const met = HINTS.filter((h) => h.test(password)).length
  const level: Strength = met <= 2 ? "weak" : met === 3 ? "fair" : met === 4 ? "good" : "strong"
  return { level, met, label: LABELS[level] }
}
