import { describe, expect, it } from "vitest"
import { filterBrands } from "./brandSearch"

const brands = [
  { name: "Demo Coffee", description: "Cà phê phin" },
  { name: "Trà Xanh House" },
  { name: "Đồng Xanh", description: "Trà sữa" },
]

describe("filterBrands", () => {
  it("keeps everything for an empty search", () => {
    expect(filterBrands(brands, "  ")).toHaveLength(3)
  })
  it("ignores case and accents, and matches the description too", () => {
    expect(filterBrands(brands, "tra xanh house").map((b) => b.name)).toEqual(["Trà Xanh House"])
    expect(filterBrands(brands, "tra xanh").map((b) => b.name)).toEqual(["Trà Xanh House", "Đồng Xanh"])
    expect(filterBrands(brands, "PHIN").map((b) => b.name)).toEqual(["Demo Coffee"])
    expect(filterBrands(brands, "dong").map((b) => b.name)).toEqual(["Đồng Xanh"])
  })
  it("needs every word", () => {
    expect(filterBrands(brands, "xanh sua").map((b) => b.name)).toEqual(["Đồng Xanh"])
    expect(filterBrands(brands, "xanh pizza")).toEqual([])
  })
})
