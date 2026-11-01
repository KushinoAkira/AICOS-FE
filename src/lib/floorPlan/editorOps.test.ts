import { describe, expect, it } from "vitest"
import {
  addPlaced,
  addTableElement,
  addWall,
  duplicateElement,
  moveElement,
  nextTableCode,
  removeElement,
  rotateElement,
} from "./editorOps"
import { canRedo, canUndo, createHistory, pushHistory, redoHistory, undoHistory } from "./history"
import type { FloorLayoutJson } from "./schema"

const empty = (): FloorLayoutJson => ({ unit: "grid", gridSize: 10, elements: [] })
const bounds = { widthUnits: 400, heightUnits: 280 }

describe("editorOps + history (Phase 2 component model)", () => {
  it("adds a table, moves it, undoes, and keeps a saveable draft", () => {
    let layout = empty()
    layout = addTableElement(layout, { tableId: "t-new", seats: 2, shape: "round" }, 55, 82, bounds, 10)
    expect(layout.elements).toHaveLength(1)
    const id = layout.elements[0].id
    expect(layout.elements[0]).toMatchObject({ type: "table", tableId: "t-new", x: 60, y: 80 })

    let hist = createHistory(layout)
    const moved = moveElement(layout, id, 30, 20, bounds, 10)
    hist = pushHistory(hist, moved)
    expect(hist.present.elements[0]).toMatchObject({ x: 90, y: 100 })

    hist = undoHistory(hist)
    expect(canUndo(hist)).toBe(false)
    expect(hist.present.elements[0]).toMatchObject({ x: 60, y: 80 })

    hist = redoHistory(hist)
    expect(canRedo(hist)).toBe(false)
    expect(hist.present.elements[0]).toMatchObject({ x: 90, y: 100 })

    const draftPayload = { expectedVersion: 1, layout: hist.present }
    expect(draftPayload.layout.elements[0].type).toBe("table")
  })

  it("adds walls/placed fixtures and supports duplicate/remove/rotate", () => {
    let layout = addWall(empty(), [
      [0, 0],
      [100, 0],
    ])
    layout = addPlaced(layout, "counter", 20, 20, bounds, 10)
    const counterId = layout.elements.find((e) => e.type === "counter")!.id
    layout = rotateElement(layout, counterId, 90)
    const dup = duplicateElement(layout, counterId, bounds, 10)
    expect(dup).not.toBeNull()
    layout = dup!.layout
    expect(layout.elements.filter((e) => e.type === "counter")).toHaveLength(2)
    layout = removeElement(layout, counterId)
    expect(layout.elements.some((e) => e.id === counterId)).toBe(false)
  })

  it("suggests the next free table code", () => {
    expect(nextTableCode(["T1", "T2"])).toBe("T3")
  })
})
