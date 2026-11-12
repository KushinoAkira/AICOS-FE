import { describe, expect, it } from "vitest"
import { placeTables } from "./FloorPlan"

describe("placeTables", () => {
  it("keeps saved positions and lays the rest out on free cells", () => {
    const places = placeTables([
      { id: "a", tableCode: "A1", positionX: 1, positionY: 0 },
      { id: "b", tableCode: "A2" },
      { id: "c", tableCode: "A3" },
    ])
    expect(places).toEqual({ a: { x: 1, y: 0 }, b: { x: 0, y: 0 }, c: { x: 2, y: 0 } })
  })

  it("never puts two tables on one cell, even when both were saved there", () => {
    const places = placeTables([
      { id: "a", tableCode: "A1", positionX: 0, positionY: 0 },
      { id: "b", tableCode: "A2", positionX: 0, positionY: 0 },
    ])
    expect(places).toEqual({ a: { x: 0, y: 0 }, b: { x: 1, y: 0 } })
  })

  it("wraps to the next row and brings off-grid tables back", () => {
    const rows = Array.from({ length: 11 }, (_, i) => ({ id: `t${i}`, tableCode: `T${i}` }))
    expect(placeTables(rows).t10).toEqual({ x: 0, y: 1 })
    expect(placeTables([{ id: "a", tableCode: "A1", positionX: 500, positionY: 3 }]).a).toEqual({ x: 0, y: 0 })
  })
})
