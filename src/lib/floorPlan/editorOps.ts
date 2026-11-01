import { clampRectToBounds, newElementId, normalizeRotation, snap } from "./geometry"
import type { FloorLayoutJson, LayoutElement, TableLayoutElement } from "./schema"

export type PlacedTool =
  | "door"
  | "window"
  | "restroom"
  | "stairs"
  | "counter"
  | "zone"
  | "table-round"
  | "table-square"
  | "table-rect"

const DEFAULT_SIZE: Record<PlacedTool, { w: number; h: number }> = {
  door: { w: 40, h: 8 },
  window: { w: 40, h: 8 },
  restroom: { w: 40, h: 40 },
  stairs: { w: 50, h: 40 },
  counter: { w: 80, h: 30 },
  zone: { w: 80, h: 60 },
  "table-round": { w: 40, h: 40 },
  "table-square": { w: 40, h: 40 },
  "table-rect": { w: 50, h: 40 },
}

function replaceElement(layout: FloorLayoutJson, id: string, next: LayoutElement): FloorLayoutJson {
  return {
    ...layout,
    elements: layout.elements.map((e) => (e.id === id ? next : e)),
  }
}

export function moveElement(
  layout: FloorLayoutJson,
  id: string,
  dx: number,
  dy: number,
  bounds: { widthUnits: number; heightUnits: number },
  gridSize: number,
): FloorLayoutJson {
  const el = layout.elements.find((e) => e.id === id)
  if (!el) return layout
  if (el.type === "wall") {
    const points = el.points.map(([x, y]) => [snap(x + dx, gridSize), snap(y + dy, gridSize)] as [number, number])
    return replaceElement(layout, id, { ...el, points })
  }
  const h = el.h ?? el.w
  const rect = clampRectToBounds(
    { x: snap(el.x + dx, gridSize), y: snap(el.y + dy, gridSize), w: el.w, h },
    bounds.widthUnits,
    bounds.heightUnits,
  )
  return replaceElement(layout, id, { ...el, x: rect.x, y: rect.y, h: rect.h })
}

export function resizeElement(
  layout: FloorLayoutJson,
  id: string,
  w: number,
  h: number,
  bounds: { widthUnits: number; heightUnits: number },
  gridSize: number,
): FloorLayoutJson {
  const el = layout.elements.find((e) => e.id === id)
  if (!el || el.type === "wall") return layout
  const rect = clampRectToBounds(
    { x: el.x, y: el.y, w: Math.max(gridSize, snap(w, gridSize)), h: Math.max(gridSize, snap(h, gridSize)) },
    bounds.widthUnits,
    bounds.heightUnits,
  )
  return replaceElement(layout, id, { ...el, x: rect.x, y: rect.y, w: rect.w, h: rect.h })
}

export function rotateElement(layout: FloorLayoutJson, id: string, deg: number): FloorLayoutJson {
  const el = layout.elements.find((e) => e.id === id)
  if (!el || el.type === "wall") return layout
  return replaceElement(layout, id, { ...el, rotation: normalizeRotation(deg) })
}

export function updateElementLabel(layout: FloorLayoutJson, id: string, label: string): FloorLayoutJson {
  const el = layout.elements.find((e) => e.id === id)
  if (!el || el.type === "wall" || el.type === "table") return layout
  return replaceElement(layout, id, { ...el, label: label.slice(0, 80) })
}

export function removeElement(layout: FloorLayoutJson, id: string): FloorLayoutJson {
  return { ...layout, elements: layout.elements.filter((e) => e.id !== id) }
}

export function duplicateElement(
  layout: FloorLayoutJson,
  id: string,
  bounds: { widthUnits: number; heightUnits: number },
  gridSize: number,
): { layout: FloorLayoutJson; newId: string } | null {
  const el = layout.elements.find((e) => e.id === id)
  if (!el || el.type === "table") return null
  const newId = newElementId(el.type)
  let copy: LayoutElement
  if (el.type === "wall") {
    copy = {
      ...el,
      id: newId,
      points: el.points.map(([x, y]) => [x + gridSize, y + gridSize] as [number, number]),
    }
  } else {
    const h = el.h ?? el.w
    const rect = clampRectToBounds(
      { x: el.x + gridSize, y: el.y + gridSize, w: el.w, h },
      bounds.widthUnits,
      bounds.heightUnits,
    )
    copy = { ...el, id: newId, x: rect.x, y: rect.y }
  }
  return { layout: { ...layout, elements: [...layout.elements, copy] }, newId }
}

export function addWall(layout: FloorLayoutJson, points: [number, number][]): FloorLayoutJson {
  if (points.length < 2) return layout
  return {
    ...layout,
    elements: [...layout.elements, { id: newElementId("wall"), type: "wall", points, thickness: 6 }],
  }
}

export function addPlaced(
  layout: FloorLayoutJson,
  tool: Exclude<PlacedTool, "table-round" | "table-square" | "table-rect">,
  x: number,
  y: number,
  bounds: { widthUnits: number; heightUnits: number },
  gridSize: number,
): FloorLayoutJson {
  const size = DEFAULT_SIZE[tool]
  const rect = clampRectToBounds(
    { x: snap(x, gridSize), y: snap(y, gridSize), w: size.w, h: size.h },
    bounds.widthUnits,
    bounds.heightUnits,
  )
  const labels: Partial<Record<typeof tool, string>> = {
    door: "Cửa",
    window: "Cửa sổ",
    restroom: "WC",
    stairs: "Cầu thang",
    counter: "Quầy",
    zone: "Khu vực",
  }
  const el: LayoutElement = {
    id: newElementId(tool),
    type: tool,
    x: rect.x,
    y: rect.y,
    w: rect.w,
    h: rect.h,
    rotation: 0,
    label: labels[tool],
  }
  return { ...layout, elements: [...layout.elements, el] }
}

export function addTableElement(
  layout: FloorLayoutJson,
  table: { tableId: string; seats: number; shape: TableLayoutElement["shape"] },
  x: number,
  y: number,
  bounds: { widthUnits: number; heightUnits: number },
  gridSize: number,
): FloorLayoutJson {
  const tool =
    table.shape === "round" ? "table-round" : table.shape === "square" ? "table-square" : "table-rect"
  const size = DEFAULT_SIZE[tool]
  const rect = clampRectToBounds(
    { x: snap(x, gridSize), y: snap(y, gridSize), w: size.w, h: size.h },
    bounds.widthUnits,
    bounds.heightUnits,
  )
  const el: TableLayoutElement = {
    id: newElementId("tbl"),
    type: "table",
    tableId: table.tableId,
    x: rect.x,
    y: rect.y,
    w: rect.w,
    h: rect.h,
    shape: table.shape,
    seats: table.seats,
    rotation: 0,
  }
  return { ...layout, elements: [...layout.elements, el] }
}

export function tableShapeFromTool(tool: PlacedTool): TableLayoutElement["shape"] | null {
  if (tool === "table-round") return "round"
  if (tool === "table-square") return "square"
  if (tool === "table-rect") return "rect"
  return null
}

export function nextTableCode(existing: string[]): string {
  const used = new Set(existing.map((c) => c.toUpperCase()))
  for (let i = 1; i < 1000; i++) {
    const code = `T${i}`
    if (!used.has(code)) return code
  }
  return `T${Date.now() % 10000}`
}
