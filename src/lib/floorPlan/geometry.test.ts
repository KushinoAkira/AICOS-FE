import { describe, expect, it } from "vitest"
import { clampRectToBounds, distToSegment, normalizeRotation, pointInRect, rectsOverlap, snap, snapPoint } from "./geometry"

describe("geometry", () => {
  it("snaps to grid", () => {
    expect(snap(14, 10)).toBe(10)
    expect(snap(16, 10)).toBe(20)
    expect(snapPoint({ x: 14, y: 26 }, 10)).toEqual({ x: 10, y: 30 })
  })

  it("normalizes rotation", () => {
    expect(normalizeRotation(370)).toBe(10)
    expect(normalizeRotation(-190)).toBe(170)
  })

  it("hit-tests rects and overlap", () => {
    expect(pointInRect(5, 5, { x: 0, y: 0, w: 10, h: 10 })).toBe(true)
    expect(rectsOverlap({ x: 0, y: 0, w: 10, h: 10 }, { x: 5, y: 5, w: 10, h: 10 })).toBe(true)
    expect(rectsOverlap({ x: 0, y: 0, w: 10, h: 10 }, { x: 20, y: 20, w: 5, h: 5 })).toBe(false)
  })

  it("clamps rects into floor bounds", () => {
    expect(clampRectToBounds({ x: -10, y: 250, w: 80, h: 80 }, 400, 280)).toEqual({
      x: 0,
      y: 200,
      w: 80,
      h: 80,
    })
  })

  it("measures distance to a segment", () => {
    expect(distToSegment(0, 5, 0, 0, 10, 0)).toBe(5)
  })
})
