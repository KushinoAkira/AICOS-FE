import { distToSegment, pointInRect } from "./geometry"
import type { FloorLayoutJson, LayoutElement } from "./schema"

/** Top-most element under a point in grid units, or null. */
export function hitTestElement(layout: FloorLayoutJson, px: number, py: number, wallThreshold = 8): LayoutElement | null {
  for (let i = layout.elements.length - 1; i >= 0; i--) {
    const el = layout.elements[i]
    if (el.type === "wall") {
      const th = (el.thickness ?? 6) / 2 + wallThreshold / 2
      for (let s = 0; s < el.points.length - 1; s++) {
        const [x1, y1] = el.points[s]
        const [x2, y2] = el.points[s + 1]
        if (distToSegment(px, py, x1, y1, x2, y2) <= th) return el
      }
      continue
    }
    const h = el.h ?? el.w
    if (pointInRect(px, py, { x: el.x, y: el.y, w: el.w, h })) return el
  }
  return null
}
