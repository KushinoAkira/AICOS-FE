import { describe, expect, it } from "vitest"
import { canRedo, canUndo, createHistory, pushHistory, redoHistory, undoHistory } from "./history"

describe("history", () => {
  it("pushes, undoes, and redoes", () => {
    let h = createHistory(1)
    h = pushHistory(h, 2)
    h = pushHistory(h, 3)
    expect(h.present).toBe(3)
    expect(canUndo(h)).toBe(true)
    h = undoHistory(h)
    expect(h.present).toBe(2)
    h = undoHistory(h)
    expect(h.present).toBe(1)
    expect(canUndo(h)).toBe(false)
    h = redoHistory(h)
    expect(h.present).toBe(2)
    expect(canRedo(h)).toBe(true)
  })

  it("clears future on new push after undo", () => {
    let h = createHistory("a")
    h = pushHistory(h, "b")
    h = undoHistory(h)
    h = pushHistory(h, "c")
    expect(h.present).toBe("c")
    expect(canRedo(h)).toBe(false)
  })
})
