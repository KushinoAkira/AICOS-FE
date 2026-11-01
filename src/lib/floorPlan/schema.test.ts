import { describe, expect, it } from "vitest"
import { findOverlappingTables, validateLayoutJson, type FloorLayoutJson } from "./schema"

const bounds = { widthUnits: 400, heightUnits: 280 }

describe("validateLayoutJson", () => {
  it("accepts a minimal valid layout", () => {
    const raw = {
      unit: "grid",
      gridSize: 10,
      elements: [{ id: "e1", type: "door", x: 10, y: 0, w: 24 }],
    }
    const r = validateLayoutJson(raw, bounds)
    expect(r.ok).toBe(true)
  })

  it("rejects unknown element types", () => {
    const r = validateLayoutJson(
      { unit: "grid", gridSize: 10, elements: [{ id: "e1", type: "fountain", x: 0, y: 0, w: 10 }] },
      bounds,
    )
    expect(r.ok).toBe(false)
  })

  it("rejects out-of-bounds placed elements", () => {
    const r = validateLayoutJson(
      { unit: "grid", gridSize: 10, elements: [{ id: "e1", type: "door", x: 390, y: 0, w: 40 }] },
      bounds,
    )
    expect(r.ok).toBe(false)
  })

  it("rejects oversized payloads", () => {
    const huge = {
      unit: "grid",
      gridSize: 10,
      elements: Array.from({ length: 20 }, (_, i) => ({
        id: `e${i}`,
        type: "zone",
        x: 0,
        y: 0,
        w: 10,
        label: "x".repeat(20_000),
      })),
    }
    const r = validateLayoutJson(huge, bounds)
    expect(r.ok).toBe(false)
  })
})

describe("findOverlappingTables", () => {
  it("warns when two tables overlap", () => {
    const layout: FloorLayoutJson = {
      unit: "grid",
      gridSize: 10,
      elements: [
        { id: "a", type: "table", tableId: "t1", x: 0, y: 0, w: 40, h: 40, shape: "rect" },
        { id: "b", type: "table", tableId: "t2", x: 20, y: 20, w: 40, h: 40, shape: "rect" },
      ],
    }
    expect(findOverlappingTables(layout).length).toBe(1)
  })
})
