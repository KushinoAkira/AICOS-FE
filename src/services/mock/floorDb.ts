import type { DiningTableDto, FloorDto, FloorLayoutDto } from "../../lib/api/floors"
import type { FloorLayoutJson } from "../../lib/floorPlan/schema"
import { BRANCH_1, BRANCH_2 } from "./brandDb"

export interface FloorAuditEntry {
  id: string
  at: string
  actor: string
  action: "publish" | "qr_regenerate"
  branchId: string
  floorId?: string
  target: string
}

function emptyLayout(): FloorLayoutJson {
  return { unit: "grid", gridSize: 10, elements: [] }
}

function sampleLayout(tableIds: { id: string; x: number; y: number; w: number; h: number; shape: "rect" | "square" | "round"; seats: number }[]): FloorLayoutJson {
  return {
    unit: "grid",
    gridSize: 10,
    elements: [
      { id: "e-wall-1", type: "wall", points: [[0, 0], [400, 0], [400, 280], [0, 280], [0, 0]], thickness: 6 },
      { id: "e-door-1", type: "door", x: 180, y: 0, w: 40, rotation: 0, label: "Cửa vào" },
      { id: "e-wc", type: "restroom", x: 340, y: 220, w: 50, h: 50, label: "WC" },
      { id: "e-counter", type: "counter", x: 20, y: 20, w: 120, h: 40, label: "Quầy" },
      ...tableIds.map((t, i) => ({
        id: `e-tbl-${i + 1}`,
        type: "table" as const,
        tableId: t.id,
        x: t.x,
        y: t.y,
        w: t.w,
        h: t.h,
        shape: t.shape,
        seats: t.seats,
        rotation: 0,
      })),
    ],
  }
}

export const floors: FloorDto[] = [
  { id: "fl-q1-1", branchId: BRANCH_1, name: "Tầng trệt", level: 1, widthUnits: 400, heightUnits: 280, sortOrder: 0 },
  { id: "fl-q1-2", branchId: BRANCH_1, name: "Tầng 2", level: 2, widthUnits: 400, heightUnits: 280, sortOrder: 1 },
  { id: "fl-td-1", branchId: BRANCH_2, name: "Tầng trệt", level: 1, widthUnits: 360, heightUnits: 240, sortOrder: 0 },
]

/** Dining tables for floor-plan APIs (synced with orderDb table ids). */
export const diningTables: DiningTableDto[] = [
  { id: "t1", branchId: BRANCH_1, floorId: "fl-q1-1", code: "A1", seats: 2, qrToken: "tbl-a1", isActive: true },
  { id: "t2", branchId: BRANCH_1, floorId: "fl-q1-1", code: "A2", seats: 2, qrToken: "tbl-a2", isActive: true },
  { id: "t3", branchId: BRANCH_1, floorId: "fl-q1-1", code: "A3", seats: 4, qrToken: "tbl-a3", isActive: true },
  { id: "t4", branchId: BRANCH_1, floorId: "fl-q1-2", code: "B1", seats: 4, qrToken: "tbl-b1", isActive: true },
  { id: "t5", branchId: BRANCH_1, floorId: "fl-q1-2", code: "B2", seats: 4, qrToken: "tbl-b2", isActive: true },
  { id: "t6", branchId: BRANCH_1, floorId: "fl-q1-2", code: "B3", seats: 6, qrToken: "tbl-b3", isActive: true },
  { id: "t7", branchId: BRANCH_2, floorId: "fl-td-1", code: "T1", seats: 2, qrToken: "tbl-t1", isActive: true },
  { id: "t8", branchId: BRANCH_2, floorId: "fl-td-1", code: "T2", seats: 4, qrToken: "tbl-t2", isActive: true },
  { id: "t9", branchId: BRANCH_2, floorId: "fl-td-1", code: "T3", seats: 4, qrToken: "tbl-t3", isActive: true },
]

function layoutRow(
  id: string,
  floorId: string,
  status: FloorLayoutDto["status"],
  version: number,
  layout: FloorLayoutJson,
): FloorLayoutDto {
  return {
    id,
    floorId,
    version,
    status,
    layout,
    updatedBy: "seed",
    updatedAtUtc: new Date().toISOString(),
  }
}

const q1f1Published = sampleLayout([
  { id: "t1", x: 60, y: 80, w: 40, h: 40, shape: "round", seats: 2 },
  { id: "t2", x: 120, y: 80, w: 40, h: 40, shape: "round", seats: 2 },
  { id: "t3", x: 200, y: 100, w: 50, h: 50, shape: "square", seats: 4 },
])

const q1f2Published = sampleLayout([
  { id: "t4", x: 80, y: 90, w: 50, h: 50, shape: "rect", seats: 4 },
  { id: "t5", x: 160, y: 90, w: 50, h: 50, shape: "rect", seats: 4 },
  { id: "t6", x: 240, y: 100, w: 60, h: 40, shape: "rect", seats: 6 },
])

const tdPublished = sampleLayout([
  { id: "t7", x: 70, y: 80, w: 40, h: 40, shape: "round", seats: 2 },
  { id: "t8", x: 140, y: 80, w: 50, h: 50, shape: "square", seats: 4 },
  { id: "t9", x: 220, y: 80, w: 50, h: 50, shape: "square", seats: 4 },
])

/** At most one Draft and one Published per floor. */
export const layouts: FloorLayoutDto[] = [
  layoutRow("ly-q1-1-pub", "fl-q1-1", "Published", 1, q1f1Published),
  layoutRow("ly-q1-1-dft", "fl-q1-1", "Draft", 1, structuredClone(q1f1Published)),
  layoutRow("ly-q1-2-pub", "fl-q1-2", "Published", 1, q1f2Published),
  layoutRow("ly-q1-2-dft", "fl-q1-2", "Draft", 1, structuredClone(q1f2Published)),
  layoutRow("ly-td-1-pub", "fl-td-1", "Published", 1, tdPublished),
  layoutRow("ly-td-1-dft", "fl-td-1", "Draft", 1, structuredClone(tdPublished)),
]

export const floorAudit: FloorAuditEntry[] = []

export function randomQrToken(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return `qr_${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}`
}

export function ensureDraft(floorId: string): FloorLayoutDto {
  let draft = layouts.find((l) => l.floorId === floorId && l.status === "Draft")
  if (!draft) {
    const pub = layouts.find((l) => l.floorId === floorId && l.status === "Published")
    draft = layoutRow(`ly-${floorId}-dft`, floorId, "Draft", pub?.version ?? 0, pub ? structuredClone(pub.layout) : emptyLayout())
    layouts.push(draft)
  }
  return draft
}

export function ensurePublished(floorId: string): FloorLayoutDto | null {
  return layouts.find((l) => l.floorId === floorId && l.status === "Published") ?? null
}

/** Dispatched on window so FE viewers can refresh without a real SignalR hub in mock mode. */
export function emitFloorPublished(branchId: string, floorId: string) {
  window.dispatchEvent(new CustomEvent("aicos:floor-published", { detail: { branchId, floorId } }))
}

export function emitTableStatus(branchId: string, tableId: string, status: "Free" | "Occupied" | "WaitingPayment") {
  window.dispatchEvent(new CustomEvent("aicos:table-status", { detail: { branchId, tableId, status } }))
}
