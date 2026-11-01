import { describe, expect, it } from "vitest"
import { byCode, CSV_TEMPLATE, generateCodes, parseTablesCsv } from "./tableBatch"

describe("generateCodes", () => {
  it("numbers from the start with the same width", () => {
    expect(generateCodes("a", 1, 3)).toEqual(["A01", "A02", "A03"])
    expect(generateCodes("VIP-", 98, 3)).toEqual(["VIP-098", "VIP-099", "VIP-100"])
    expect(generateCodes("A", 1, 0)).toEqual([])
  })
})

describe("parseTablesCsv", () => {
  it("reads the template, a BOM and Vietnamese headers", () => {
    const { rows, errors } = parseTablesCsv(`\uFEFF${CSV_TEMPLATE}`)
    expect(errors).toEqual([])
    expect(rows).toHaveLength(4)
    expect(rows[3]).toEqual({ line: 5, areaName: "Sân vườn", tableCode: "G01", capacity: 6 })
    expect(parseTablesCsv("Khu vực;Mã bàn;Số chỗ\r\nTầng 1;a1;4\r\n").rows[0]).toEqual({ line: 2, areaName: "Tầng 1", tableCode: "A1", capacity: 4 })
  })

  it("keeps a comma inside quotes and defaults the seats", () => {
    const { rows, errors } = parseTablesCsv('khu_vuc,ma_ban\n"Tầng 1, trong nhà",A1\n')
    expect(errors).toEqual([])
    expect(rows[0]).toEqual({ line: 2, areaName: "Tầng 1, trong nhà", tableCode: "A1", capacity: 2 })
  })

  it("names every bad line", () => {
    const { errors } = parseTablesCsv("khu_vuc,ma_ban,so_cho\n,A1,2\nTầng 1,A 2,2\nTầng 1,A3,99\nTầng 1,A4,2\nTầng 1,a4,2\n")
    expect(errors).toEqual([
      "Dòng 2: thiếu khu vực.",
      'Dòng 3: mã bàn "A 2" chỉ gồm chữ, số, "-", "_" và tối đa 20 ký tự.',
      "Dòng 4: số chỗ phải từ 1 đến 50.",
      "Dòng 6: mã bàn A4 bị trùng trong file.",
    ])
  })

  it("refuses a file without the columns, or too long", () => {
    expect(parseTablesCsv("a,b\n1,2\n").errors[0]).toContain("khu_vuc")
    expect(parseTablesCsv("").errors).toEqual(["File không có dữ liệu."])
    expect(parseTablesCsv("khu_vuc,ma_ban\n").errors).toEqual(["File chưa có dòng bàn nào."])
    const many = `khu_vuc,ma_ban\n${Array.from({ length: 301 }, (_, i) => `T,A${i}`).join("\n")}`
    expect(parseTablesCsv(many).errors[0]).toContain("301")
  })
})

describe("byCode", () => {
  it("sorts numbers as numbers", () => {
    expect(["A10", "A2", "A1"].sort(byCode)).toEqual(["A1", "A2", "A10"])
  })
})
