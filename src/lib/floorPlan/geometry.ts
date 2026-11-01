/** Pure geometry helpers for the floor-plan editor (grid units). */

export function snap(value: number, gridSize: number): number {
  if (gridSize <= 0) return value
  return Math.round(value / gridSize) * gridSize
}

export function snapPoint(p: { x: number; y: number }, gridSize: number): { x: number; y: number } {
  return { x: snap(p.x, gridSize), y: snap(p.y, gridSize) }
}

/** Normalize rotation to [-180, 180). */
export function normalizeRotation(deg: number): number {
  let r = deg % 360
  if (r >= 180) r -= 360
  if (r < -180) r += 360
  return r
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

export type Rect = { x: number; y: number; w: number; h: number }

export function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}

export function pointInRect(px: number, py: number, r: Rect): boolean {
  return px >= r.x && py >= r.y && px <= r.x + r.w && py <= r.y + r.h
}

/** Distance from point to segment (x1,y1)-(x2,y2). */
export function distToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1
  const dy = y2 - y1
  if (dx === 0 && dy === 0) return Math.hypot(px - x1, py - y1)
  const t = clamp(((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy), 0, 1)
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy))
}

export function clampRectToBounds(r: Rect, width: number, height: number): Rect {
  const w = clamp(r.w, 1, width)
  const h = clamp(r.h, 1, height)
  const x = clamp(r.x, 0, Math.max(0, width - w))
  const y = clamp(r.y, 0, Math.max(0, height - h))
  return { x, y, w, h }
}

export function newElementId(prefix = "e"): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`
}
