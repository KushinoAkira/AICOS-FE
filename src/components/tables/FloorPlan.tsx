import { useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react"
import { useMutation } from "@tanstack/react-query"
import { Banner, Button, EmptyState } from "../ui"
import { useToast } from "../../context/ToastContext"
import { tableApi, type Area, type DiningTable } from "../../lib/api/manage"
import { byCode } from "../../lib/tableBatch"

const COLS = 10
const CELL = 88
const MIN_ROWS = 6

export interface Pos { x: number; y: number }

const inGrid = (x: number | null | undefined, y: number | null | undefined) => x != null && y != null && x >= 0 && x < COLS && y >= 0

/**
 * Where each table of one area stands. Saved positions win; a table without one, off the grid or on a taken cell takes the next free cell,
 * so a floor that was never arranged still reads as a tidy grid.
 */
export function placeTables<T extends { id: string; tableCode: string; positionX?: number | null; positionY?: number | null }>(rows: T[]): Record<string, Pos> {
  const out: Record<string, Pos> = {}
  const taken = new Set<string>()
  const waiting: T[] = []
  for (const t of [...rows].sort((a, b) => byCode(a.tableCode, b.tableCode))) {
    const key = `${t.positionX},${t.positionY}`
    if (inGrid(t.positionX, t.positionY) && !taken.has(key)) {
      out[t.id] = { x: t.positionX!, y: t.positionY! }
      taken.add(key)
    } else waiting.push(t)
  }
  let cursor = 0
  for (const t of waiting) {
    while (taken.has(`${cursor % COLS},${Math.floor(cursor / COLS)}`)) cursor++
    const pos = { x: cursor % COLS, y: Math.floor(cursor / COLS) }
    out[t.id] = pos
    taken.add(`${pos.x},${pos.y}`)
  }
  return out
}

const rowsFor = (positions: Pos[]) => Math.max(MIN_ROWS, Math.max(0, ...positions.map((p) => p.y)) + 2)

const GRID_LINES = {
  backgroundImage: "linear-gradient(to right, var(--color-border) 1px, transparent 1px), linear-gradient(to bottom, var(--color-border) 1px, transparent 1px)",
  backgroundSize: `${CELL}px ${CELL}px`,
}

const TILE_TONE = { neutral: "border-border bg-surface", pending: "border-[#C9A25E] bg-pending-bg", danger: "border-state-danger bg-danger-bg", success: "border-state-success bg-success-bg" } as const
export type TileTone = keyof typeof TILE_TONE

/** UC-25: the manager or the Brand Admin arranges the tables of each area on a grid. Drag, or arrow keys on a focused table; a taken cell swaps. */
export function FloorPlanEditor({ tables, areas, branchId, onSaved }: { tables: DiningTable[]; areas: Area[]; branchId?: string; onSaved: () => void }) {
  const { showToast } = useToast()
  const [areaId, setAreaId] = useState(areas[0]?.id ?? "")
  const [moved, setMoved] = useState<Record<string, Pos>>({})
  const [drag, setDrag] = useState<{ id: string; left: number; top: number; offsetX: number; offsetY: number } | null>(null)
  const grid = useRef<HTMLDivElement>(null)
  const saved = useMemo(() => {
    const out: Record<string, Pos> = {}
    for (const a of areas) Object.assign(out, placeTables(tables.filter((t) => t.areaId === a.id)))
    return out
  }, [tables, areas])
  const pos = (id: string) => moved[id] ?? saved[id] ?? { x: 0, y: 0 }
  const current = areas.some((a) => a.id === areaId) ? areaId : areas[0]?.id ?? ""
  const here = tables.filter((t) => t.areaId === current)
  const changes = tables.filter((t) => { const p = pos(t.id); return t.positionX !== p.x || t.positionY !== p.y })
  const rows = rowsFor(here.map((t) => pos(t.id)))
  const save = useMutation({
    mutationFn: () => tableApi.saveLayout(changes.map((t) => ({ tableId: t.id, positionX: pos(t.id).x, positionY: pos(t.id).y })), branchId),
    onSuccess: () => { setMoved({}); onSaved(); showToast("Đã lưu sơ đồ bàn.", "success") },
    onError: (e) => showToast(e.message, "error"),
  })

  /** Moves a table; whoever stood on that cell takes its old place. */
  function moveTo(id: string, target: Pos) {
    const from = pos(id)
    if (from.x === target.x && from.y === target.y) return
    const other = here.find((t) => t.id !== id && pos(t.id).x === target.x && pos(t.id).y === target.y)
    setMoved((m) => ({ ...m, [id]: target, ...(other ? { [other.id]: from } : {}) }))
  }
  function arrange() {
    const next: Record<string, Pos> = { ...moved }
    Object.assign(next, placeTables(here.map((t) => ({ id: t.id, tableCode: t.tableCode }))))
    setMoved(next)
  }
  /** The page may be scaled, so positions are measured against the drawn size of the grid. */
  function pointerAt(e: PointerEvent) {
    const box = grid.current?.getBoundingClientRect()
    const scale = box && box.width ? box.width / (COLS * CELL) : 1
    return { x: (e.clientX - (box?.left ?? 0)) / scale, y: (e.clientY - (box?.top ?? 0)) / scale }
  }
  function start(e: PointerEvent<HTMLButtonElement>, id: string) {
    const at = pointerAt(e)
    const p = pos(id)
    e.currentTarget.setPointerCapture?.(e.pointerId)
    setDrag({ id, left: p.x * CELL, top: p.y * CELL, offsetX: at.x - p.x * CELL, offsetY: at.y - p.y * CELL })
  }
  function follow(e: PointerEvent) {
    if (!drag) return
    const at = pointerAt(e)
    setDrag({ ...drag, left: at.x - drag.offsetX, top: at.y - drag.offsetY })
  }
  function drop() {
    if (!drag) return
    const x = Math.min(COLS - 1, Math.max(0, Math.round(drag.left / CELL)))
    const y = Math.min(rows - 1, Math.max(0, Math.round(drag.top / CELL)))
    moveTo(drag.id, { x, y })
    setDrag(null)
  }
  function onKey(e: KeyboardEvent, id: string) {
    const step = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key]
    if (!step) return
    e.preventDefault()
    const p = pos(id)
    moveTo(id, { x: Math.min(COLS - 1, Math.max(0, p.x + step[0])), y: Math.min(rows - 1, Math.max(0, p.y + step[1])) })
  }

  if (areas.length === 0) return <EmptyState title="Chưa có khu vực" description="Tạo khu vực ở trên để bắt đầu vẽ sơ đồ." />
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div role="tablist" aria-label="Khu vực trên sơ đồ" className="mr-auto flex flex-wrap gap-2">
          {areas.map((a) => (
            <button key={a.id} role="tab" aria-selected={a.id === current} onClick={() => setAreaId(a.id)} className={`min-h-10 rounded-full border px-4 text-sm ${a.id === current ? "border-espresso bg-espresso text-white" : "border-border bg-surface text-text-primary"}`}>{a.name}</button>
          ))}
        </div>
        <Button variant="secondary" disabled={here.length === 0} onClick={arrange}>Xếp tự động</Button>
        <Button variant="secondary" disabled={Object.keys(moved).length === 0} onClick={() => setMoved({})}>Hoàn tác</Button>
        <Button loading={save.isPending} disabled={changes.length === 0} disabledReason="Chưa có thay đổi" onClick={() => save.mutate()}>Lưu sơ đồ{changes.length > 0 ? ` (${changes.length})` : ""}</Button>
      </div>
      {changes.length > 0 && <div className="mb-3"><Banner tone="warn">{changes.length} bàn chưa lưu vị trí. Bấm Lưu sơ đồ để giữ lại.</Banner></div>}
      <p className="mb-3 text-sm text-text-secondary">Kéo bàn tới vị trí thật trong quán. Thả lên ô đã có bàn thì hai bàn đổi chỗ. Có thể chọn bàn rồi dùng phím mũi tên.</p>
      <div className="overflow-x-auto rounded-[16px] border border-border bg-surface p-3">
        {here.length === 0 ? <EmptyState title="Khu vực này chưa có bàn" /> : (
          <div ref={grid} onPointerMove={follow} onPointerUp={drop} onPointerCancel={() => setDrag(null)} className="relative" style={{ ...GRID_LINES, width: COLS * CELL, height: rows * CELL }}>
            {here.map((t) => {
              const p = pos(t.id)
              const dragging = drag?.id === t.id
              return (
                <button
                  key={t.id}
                  type="button"
                  aria-label={`Bàn ${t.tableCode}, cột ${p.x + 1}, hàng ${p.y + 1}`}
                  onPointerDown={(e) => start(e, t.id)}
                  onKeyDown={(e) => onKey(e, t.id)}
                  className={`absolute flex touch-none select-none flex-col items-center justify-center rounded-[12px] border-2 ${t.status === "OutOfService" ? TILE_TONE.danger : TILE_TONE.neutral} ${dragging ? "z-10 cursor-grabbing shadow-lg" : "cursor-grab"}`}
                  style={{ left: (dragging ? drag.left : p.x * CELL) + 4, top: (dragging ? drag.top : p.y * CELL) + 4, width: CELL - 8, height: CELL - 8 }}
                >
                  <span className="font-serif text-lg leading-none text-text-primary">{t.tableCode}</span>
                  <span className="mt-1 text-xs text-text-secondary">{t.capacity} chỗ</span>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export interface FloorTile { id: string; code: string; areaId: string; areaName: string; positionX?: number | null; positionY?: number | null; sub: string; tone: TileTone; disabled?: boolean }

/** The floor as staff see it during service: every area, every table in its place, coloured by what is happening at it. */
export function FloorMap({ tiles, onPick }: { tiles: FloorTile[]; onPick: (id: string) => void }) {
  const areas = useMemo(() => {
    const seen = new Map<string, string>()
    for (const t of tiles) seen.set(t.areaId, t.areaName)
    return [...seen.entries()].map(([id, name]) => ({ id, name }))
  }, [tiles])
  return (
    <div className="space-y-6">
      {areas.map((a) => {
        const here = tiles.filter((t) => t.areaId === a.id)
        const places = placeTables(here.map((t) => ({ id: t.id, tableCode: t.code, positionX: t.positionX, positionY: t.positionY })))
        const usedRows = Math.max(...Object.values(places).map((p) => p.y)) + 1
        return (
          <section key={a.id} aria-label={a.name}>
            <h2 className="mb-2 font-serif text-lg text-text-primary">{a.name}</h2>
            <div className="overflow-x-auto rounded-[16px] border border-border bg-surface p-3">
              <div className="relative" style={{ width: COLS * CELL, height: usedRows * CELL }}>
                {here.map((t) => {
                  const p = places[t.id]
                  return (
                    <button key={t.id} type="button" disabled={t.disabled} aria-label={`Bàn ${t.code}: ${t.sub}`} onClick={() => onPick(t.id)} className={`absolute flex flex-col items-center justify-center rounded-[12px] border-2 p-1 text-center enabled:hover:shadow disabled:cursor-default ${TILE_TONE[t.tone]}`} style={{ left: p.x * CELL + 4, top: p.y * CELL + 4, width: CELL - 8, height: CELL - 8 }}>
                      <span className="font-serif text-lg leading-none text-text-primary">{t.code}</span>
                      <span className="mt-1 text-[11px] leading-tight text-text-secondary">{t.sub}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </section>
        )
      })}
    </div>
  )
}

export function FloorLegend({ items }: { items: { tone: TileTone; label: string }[] }) {
  return (
    <ul aria-label="Chú thích màu" className="flex flex-wrap gap-4 text-sm text-text-secondary">
      {items.map((i) => <li key={i.label} className="flex items-center gap-2"><span aria-hidden className={`inline-block h-4 w-4 rounded border-2 ${TILE_TONE[i.tone]}`} />{i.label}</li>)}
    </ul>
  )
}
