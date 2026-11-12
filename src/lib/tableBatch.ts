/** Helpers for setting up many tables at once: numbered codes, the CSV file, and the address printed in a QR code. */
import { env } from "../config/env"

/** The address a printed code opens. Set VITE_PUBLIC_APP_URL when the page runs anywhere a guest's phone cannot reach. */
export const publicBase = () => env.publicAppUrl || window.location.origin
export const qrLink = (token: string) => `${publicBase()}/q/${token}`
export const baseIsLocal = () => /\/\/(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/.test(publicBase())

export const MAX_BATCH = 300

/** A01, A02... with the same width, so the list sorts by itself. */
export function generateCodes(prefix: string, start: number, count: number): string[] {
  const last = start + count - 1
  const width = Math.max(2, String(last).length)
  return Array.from({ length: Math.max(0, count) }, (_, i) => `${prefix.trim().toUpperCase()}${String(start + i).padStart(width, "0")}`)
}

export const validCode = (code: string) => /^[\p{L}\p{N}_-]{1,20}$/u.test(code)

export const byCode = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true })

export interface CsvRow { line: number; areaName: string; tableCode: string; capacity: number }
export interface CsvResult { rows: CsvRow[]; errors: string[] }

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase().replace(/[\s_-]+/g, "")
const AREA = ["khuvuc", "area", "tang", "zone"]
const CODE = ["maban", "ban", "table", "tablecode", "code"]
const SEATS = ["socho", "cho", "capacity", "seats"]

/** Splits one line, honouring double quotes. Excel in a Vietnamese locale may save ";" instead of ",". */
function cells(line: string, separator: string): string[] {
  const out: string[] = []
  let current = ""
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') { current += '"'; i++ }
      else if (c === '"') quoted = false
      else current += c
    } else if (c === '"') quoted = true
    else if (c === separator) { out.push(current); current = "" }
    else current += c
  }
  out.push(current)
  return out.map((v) => v.trim())
}

/** Reads a file with the columns khu_vuc, ma_ban, so_cho. Reports every problem with its line number, so the file can be fixed in one go. */
export function parseTablesCsv(text: string): CsvResult {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/)
  const headerAt = lines.findIndex((l) => l.trim() !== "")
  if (headerAt < 0) return { rows: [], errors: ["File không có dữ liệu."] }
  const separator = (lines[headerAt].match(/;/g)?.length ?? 0) > (lines[headerAt].match(/,/g)?.length ?? 0) ? ";" : ","
  const header = cells(lines[headerAt], separator).map(fold)
  const areaAt = header.findIndex((h) => AREA.includes(h))
  const codeAt = header.findIndex((h) => CODE.includes(h))
  const seatsAt = header.findIndex((h) => SEATS.includes(h))
  if (areaAt < 0 || codeAt < 0) return { rows: [], errors: ["Dòng đầu cần có cột khu_vuc và ma_ban (so_cho không bắt buộc)."] }

  const rows: CsvRow[] = []
  const errors: string[] = []
  const seen = new Set<string>()
  lines.forEach((raw, index) => {
    if (index <= headerAt || raw.trim() === "") return
    const line = index + 1
    const row = cells(raw, separator)
    const areaName = row[areaAt] ?? ""
    const tableCode = (row[codeAt] ?? "").toUpperCase()
    const seats = seatsAt >= 0 ? row[seatsAt] ?? "" : ""
    const capacity = seats === "" ? 2 : Number(seats)
    if (!areaName) errors.push(`Dòng ${line}: thiếu khu vực.`)
    if (!validCode(tableCode)) errors.push(`Dòng ${line}: mã bàn "${tableCode}" chỉ gồm chữ, số, "-", "_" và tối đa 20 ký tự.`)
    else if (seen.has(tableCode)) errors.push(`Dòng ${line}: mã bàn ${tableCode} bị trùng trong file.`)
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 50) errors.push(`Dòng ${line}: số chỗ phải từ 1 đến 50.`)
    seen.add(tableCode)
    rows.push({ line, areaName, tableCode, capacity })
  })
  if (rows.length === 0 && errors.length === 0) errors.push("File chưa có dòng bàn nào.")
  if (rows.length > MAX_BATCH) errors.push(`Mỗi lần nhập tối đa ${MAX_BATCH} bàn, file có ${rows.length} bàn.`)
  return { rows, errors }
}

export const CSV_TEMPLATE = "khu_vuc,ma_ban,so_cho\nTầng 1,A01,4\nTầng 1,A02,4\nTầng 2,B01,2\nSân vườn,G01,6\n"

export function downloadCsvTemplate() {
  const link = document.createElement("a")
  link.href = URL.createObjectURL(new Blob(["\uFEFF", CSV_TEMPLATE], { type: "text/csv;charset=utf-8" }))
  link.download = "mau-danh-sach-ban.csv"
  link.click()
  URL.revokeObjectURL(link.href)
}
