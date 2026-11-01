import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from "react"
import { moveElement } from "../../lib/floorPlan/editorOps"
import { hitTestElement } from "../../lib/floorPlan/hitTest"
import { snap } from "../../lib/floorPlan/geometry"
import type { TableLiveStatus } from "../../lib/floorPlan/liveStatus"
import type { FloorLayoutJson, LayoutElement } from "../../lib/floorPlan/schema"

export type { TableLiveStatus }

export type EditorTool =
  | "select"
  | "pan"
  | "wall"
  | "door"
  | "window"
  | "restroom"
  | "stairs"
  | "counter"
  | "zone"
  | "table-round"
  | "table-square"
  | "table-rect"

export interface FloorPlanCanvasProps {
  layout: FloorLayoutJson
  widthUnits: number
  heightUnits: number
  /** When false, view-only (Phase 3 Cashier/Barista). */
  editable?: boolean
  selectedId?: string | null
  onSelect?: (id: string | null) => void
  onLayoutChange?: (next: FloorLayoutJson) => void
  tool?: EditorTool
  draftWall?: [number, number][]
  onDraftWallChange?: (pts: [number, number][]) => void
  /** Double-click / Enter finishes the wall polyline. */
  onFinishWall?: () => void
  onPlace?: (gridX: number, gridY: number) => void
  tableMeta?: Record<string, { code: string; status?: TableLiveStatus }>
  className?: string
}

const FILL: Record<string, string> = {
  door: "#C4A35A",
  window: "#7BA3B8",
  restroom: "#7A8F6E",
  stairs: "#8A7A6A",
  counter: "#C97B4A",
  zone: "rgba(201, 123, 74, 0.18)",
}

const STATUS_FILL: Record<TableLiveStatus, string> = {
  Free: "#E8DCC8",
  Occupied: "#E8B4A0",
  WaitingPayment: "#E8D48A",
}

function clientToGrid(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number,
  pan: { x: number; y: number },
  zoom: number,
): { x: number; y: number } {
  const pt = svg.createSVGPoint()
  pt.x = clientX
  pt.y = clientY
  const ctm = svg.getScreenCTM()
  if (!ctm) return { x: 0, y: 0 }
  const local = pt.matrixTransform(ctm.inverse())
  return { x: (local.x - pan.x) / zoom, y: (local.y - pan.y) / zoom }
}

function ElementNode({
  el,
  selected,
  tableMeta,
}: {
  el: LayoutElement
  selected: boolean
  tableMeta?: FloorPlanCanvasProps["tableMeta"]
}) {
  const stroke = selected ? "#C97B4A" : "#3A2E22"
  const sw = selected ? 2.5 : 1.25

  if (el.type === "wall") {
    const d = el.points.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]},${p[1]}`).join(" ")
    return (
      <path
        d={d}
        fill="none"
        stroke={stroke}
        strokeWidth={el.thickness ?? 6}
        strokeLinejoin="round"
        strokeLinecap="round"
        data-el={el.id}
      />
    )
  }

  if (el.type === "table") {
    const meta = tableMeta?.[el.tableId]
    const status = meta?.status ?? "Free"
    const fill = STATUS_FILL[status]
    const label = meta?.code ?? el.tableId
    const cx = el.x + el.w / 2
    const cy = el.y + el.h / 2
    const common = {
      fill,
      stroke,
      strokeWidth: sw,
      transform: el.rotation ? `rotate(${el.rotation} ${cx} ${cy})` : undefined,
      "data-el": el.id,
    }
    return (
      <g>
        {el.shape === "round" ? (
          <ellipse cx={cx} cy={cy} rx={el.w / 2} ry={el.h / 2} {...common} />
        ) : (
          <rect x={el.x} y={el.y} width={el.w} height={el.h} rx={el.shape === "square" ? 4 : 6} {...common} />
        )}
        <text
          x={cx}
          y={cy}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={Math.min(14, el.w / 2.5)}
          fill="#3A2E22"
          style={{ pointerEvents: "none", userSelect: "none" }}
        >
          {label}
        </text>
      </g>
    )
  }

  const h = el.h ?? el.w
  const cx = el.x + el.w / 2
  const cy = el.y + h / 2
  return (
    <g transform={el.rotation ? `rotate(${el.rotation} ${cx} ${cy})` : undefined} data-el={el.id}>
      <rect
        x={el.x}
        y={el.y}
        width={el.w}
        height={h}
        rx={4}
        fill={FILL[el.type] ?? "#ccc"}
        stroke={stroke}
        strokeWidth={sw}
      />
      {el.label && (
        <text
          x={cx}
          y={cy}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={11}
          fill="#3A2E22"
          style={{ pointerEvents: "none", userSelect: "none" }}
        >
          {el.label}
        </text>
      )}
    </g>
  )
}

/**
 * Shared floor-plan renderer. Prefer plain SVG over react-konva: npm could not install
 * konva (cache error + React 19 peer mismatch); SVG covers MVP walls/tables/zoom/pan
 * without native canvas deps and matches Phase 3 react-native-svg more closely.
 */
export function FloorPlanCanvas({
  layout,
  widthUnits,
  heightUnits,
  editable = false,
  selectedId = null,
  onSelect,
  onLayoutChange,
  tool = "select",
  draftWall = [],
  onDraftWallChange,
  onFinishWall,
  onPlace,
  tableMeta,
  className = "",
}: FloorPlanCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const drag = useRef<{
    mode: "move" | "pan"
    id?: string
    lastX: number
    lastY: number
    layout: FloorLayoutJson
  } | null>(null)

  const grid = layout.gridSize

  const onWheel = useCallback((e: ReactWheelEvent) => {
    e.preventDefault()
    setZoom((z) => Math.min(3, Math.max(0.4, z * (e.deltaY > 0 ? 0.9 : 1.1))))
  }, [])

  const onPointerDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current
    if (!svg) return
    const g = clientToGrid(svg, e.clientX, e.clientY, pan, zoom)
    const gx = snap(g.x, grid)
    const gy = snap(g.y, grid)

    if (tool === "pan" || e.button === 1 || (e.button === 0 && e.altKey)) {
      drag.current = { mode: "pan", lastX: e.clientX, lastY: e.clientY, layout }
      svg.setPointerCapture(e.pointerId)
      return
    }

    if (!editable) {
      const hit = hitTestElement(layout, g.x, g.y)
      onSelect?.(hit?.id ?? null)
      return
    }

    if (tool === "wall") {
      if (e.detail === 2) {
        onFinishWall?.()
        return
      }
      onDraftWallChange?.([...draftWall, [gx, gy]])
      return
    }

    if (tool !== "select") {
      onPlace?.(gx, gy)
      return
    }

    const hit = hitTestElement(layout, g.x, g.y)
    onSelect?.(hit?.id ?? null)
    if (hit) {
      drag.current = { mode: "move", id: hit.id, lastX: g.x, lastY: g.y, layout }
      svg.setPointerCapture(e.pointerId)
    }
  }

  const onPointerMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    const d = drag.current
    if (!d) return
    if (d.mode === "pan") {
      setPan((p) => ({ x: p.x + (e.clientX - d.lastX), y: p.y + (e.clientY - d.lastY) }))
      d.lastX = e.clientX
      d.lastY = e.clientY
      return
    }
    const svg = svgRef.current
    if (!svg || !d.id || !onLayoutChange) return
    const g = clientToGrid(svg, e.clientX, e.clientY, pan, zoom)
    const dx = g.x - d.lastX
    const dy = g.y - d.lastY
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return
    const next = moveElement(d.layout, d.id, dx, dy, { widthUnits, heightUnits }, grid)
    d.layout = next
    d.lastX = g.x
    d.lastY = g.y
    onLayoutChange(next)
  }

  const onPointerUp = () => {
    drag.current = null
  }

  const draftD =
    draftWall.length > 0
      ? draftWall.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]},${p[1]}`).join(" ")
      : ""

  return (
    <div className={`relative overflow-hidden rounded-[16px] border border-border bg-[#F7F1E8] ${className}`}>
      <svg
        ref={svgRef}
        role="img"
        aria-label="Sơ đồ tầng"
        className="h-full w-full touch-none"
        viewBox={`0 0 ${widthUnits} ${heightUnits}`}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onContextMenu={(e) => e.preventDefault()}
      >
        <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}>
          <rect x={0} y={0} width={widthUnits} height={heightUnits} fill="#F7F1E8" />
          <g stroke="rgba(58,46,34,0.08)" strokeWidth={1}>
            {Array.from({ length: Math.floor(widthUnits / grid) + 1 }, (_, i) => (
              <line key={`vx${i}`} x1={i * grid} y1={0} x2={i * grid} y2={heightUnits} />
            ))}
            {Array.from({ length: Math.floor(heightUnits / grid) + 1 }, (_, i) => (
              <line key={`hy${i}`} x1={0} y1={i * grid} x2={widthUnits} y2={i * grid} />
            ))}
          </g>
          {layout.elements.map((el) => (
            <ElementNode key={el.id} el={el} selected={el.id === selectedId} tableMeta={tableMeta} />
          ))}
          {draftD && (
            <path d={draftD} fill="none" stroke="#C97B4A" strokeWidth={4} strokeDasharray="8 6" strokeLinecap="round" />
          )}
        </g>
      </svg>
      <div className="pointer-events-none absolute bottom-2 right-2 rounded-md bg-surface/90 px-2 py-1 text-xs text-text-secondary">
        {Math.round(zoom * 100)}% · lăn chuột phóng to · Alt+kéo để xoay khung
      </div>
    </div>
  )
}
