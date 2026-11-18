import { env } from "../../config/env"
import { getActiveBranchId } from "../branch"
import type { FloorLayoutJson } from "../floorPlan/schema"
import { unsupported } from "./be/util"
import { http } from "./http"
import { tableApi, type DiningTable } from "./manage"

export type FloorLayoutStatus = "Draft" | "Published"

export interface FloorDto {
  id: string
  branchId: string
  name: string
  level: number
  widthUnits: number
  heightUnits: number
  sortOrder: number
}

export interface FloorLayoutDto {
  id: string
  floorId: string
  version: number
  status: FloorLayoutStatus
  layout: FloorLayoutJson
  updatedBy: string | null
  updatedAtUtc: string
  /** Soft warnings from last save/publish (e.g. overlapping tables). */
  warnings?: string[]
}

export interface DiningTableDto {
  id: string
  branchId: string
  floorId: string
  code: string
  seats: number
  qrToken: string
  isActive: boolean
}

export interface FloorInput {
  name: string
  level: number
  widthUnits?: number
  heightUnits?: number
}

export interface FloorUpdate {
  name?: string
  sortOrder?: number
  level?: number
}

export interface SaveLayoutBody {
  expectedVersion: number
  layout: FloorLayoutJson
}

export interface TableInput {
  code: string
  seats: number
  /** Canvas layout units (same space as FloorPlanCanvas). */
  x?: number
  y?: number
}

export interface TableUpdate {
  code?: string
  seats?: number
  isActive?: boolean
}

/** Mock MSW routes; `http` mockHref prefixes `/api/v1` when missing. */
const BASE = "/floors"

const mockFloorsApi = {
  list: (branchId?: string) =>
    http.get<FloorDto[]>(BASE, { query: branchId ? { branchId } : undefined }),
  create: (body: FloorInput) => http.post<FloorDto>(BASE, body),
  update: (floorId: string, body: FloorUpdate) => http.put<FloorDto>(`${BASE}/${floorId}`, body),
  remove: (floorId: string) => http.delete<void>(`${BASE}/${floorId}`),
  getLayout: (floorId: string, status: FloorLayoutStatus = "Published") =>
    http.get<FloorLayoutDto>(`${BASE}/${floorId}/layout`, { query: { status: status.toLowerCase() } }),
  saveDraft: (floorId: string, body: SaveLayoutBody) =>
    http.put<FloorLayoutDto>(`${BASE}/${floorId}/layout`, body),
  publish: (floorId: string) => http.post<FloorLayoutDto>(`${BASE}/${floorId}/publish`),
  listTables: (floorId: string) => http.get<DiningTableDto[]>(`${BASE}/${floorId}/tables`),
  createTable: (floorId: string, body: TableInput) =>
    http.post<DiningTableDto>(`${BASE}/${floorId}/tables`, body),
  updateTable: (tableId: string, body: TableUpdate) =>
    http.patch<DiningTableDto>(`/tables/${tableId}`, body),
  removeTable: (tableId: string) => http.delete<void>(`/tables/${tableId}`),
  regenerateQr: (tableId: string) =>
    http.post<{ tableId: string; qrToken: string }>(`/tables/${tableId}/qr/regenerate`, {}),
}

/** Cell size used when projecting dining-table grid coords onto the canvas layout. */
const GRID = 40

function activeBranch(): string {
  return getActiveBranchId() || ""
}

function areaToFloor(a: { id: string; branchId: string; name: string; sortOrder: number }): FloorDto {
  return {
    id: a.id,
    branchId: a.branchId,
    name: a.name,
    level: a.sortOrder + 1,
    widthUnits: 440,
    heightUnits: 360,
    sortOrder: a.sortOrder,
  }
}

function toDto(t: DiningTable, floorId: string): DiningTableDto {
  return {
    id: t.id,
    branchId: t.branchId,
    floorId,
    code: t.tableCode,
    seats: t.capacity,
    qrToken: t.qrToken,
    isActive: t.status !== "OutOfService",
  }
}

/**
 * BE stores free-form layout units (0–10000). Older FE code treated them as grid *cells*
 * and multiplied by GRID on load — tables vanished off-canvas. Detect tiny cell indices
 * only when every set coordinate is below GRID; otherwise use values as layout units.
 */
function toLayoutXY(tables: DiningTable[]): { id: string; x: number; y: number }[] {
  const placed = tables.filter((t) => t.positionX != null && t.positionY != null)
  const asCells = placed.length > 0 && placed.every((t) => (t.positionX ?? 0) < GRID && (t.positionY ?? 0) < GRID)
  const used = new Set<string>()
  return tables.map((t, i) => {
    let x: number
    let y: number
    if (t.positionX == null || t.positionY == null) {
      x = (i % 6) * GRID
      y = Math.floor(i / 6) * GRID
    } else if (asCells) {
      x = t.positionX * GRID
      y = t.positionY * GRID
    } else {
      x = t.positionX
      y = t.positionY
    }
    let key = `${x},${y}`
    while (used.has(key)) {
      x += GRID
      key = `${x},${y}`
    }
    used.add(key)
    return { id: t.id, x, y }
  })
}

function layoutFromTables(floorId: string, tables: DiningTable[], status: FloorLayoutStatus): FloorLayoutDto {
  const coords = toLayoutXY(tables)
  const byId = new Map(coords.map((c) => [c.id, c]))
  const elements: FloorLayoutJson["elements"] = tables.map((t) => {
    const c = byId.get(t.id)!
    return {
      id: `el-${t.id}`,
      type: "table" as const,
      tableId: t.id,
      x: c.x,
      y: c.y,
      w: GRID - 4,
      h: GRID - 4,
      shape: "round" as const,
      seats: t.capacity,
    }
  })
  const maxX = Math.max(400, ...elements.map((e) => ("x" in e ? e.x + (e.w ?? GRID) : 0)), 0) + GRID
  const maxY = Math.max(280, ...elements.map((e) => ("y" in e ? e.y + (e.h ?? GRID) : 0)), 0) + GRID
  return {
    id: `layout-${floorId}`,
    floorId,
    version: 1,
    status,
    layout: { unit: "grid", gridSize: 10, elements },
    updatedBy: null,
    updatedAtUtc: new Date().toISOString(),
    warnings: maxX > 1200 || maxY > 900 ? ["Sơ đồ rộng — thu phóng để xem hết bàn."] : undefined,
  }
}

async function tablesInArea(areaId: string, branchId?: string): Promise<DiningTable[]> {
  const id = branchId || activeBranch()
  if (!id) return []
  return (await tableApi.list(id)).filter((t) => t.areaId === areaId)
}

/**
 * Real gateway has areas + dining-tables (`/tables/...`), not the mock canvas `/floors` API.
 * Map each table area ↔ one editor “tầng” so add / rename / delete work against `/tables/areas`.
 */
const beFloorsApi: typeof mockFloorsApi = {
  async list(branchId) {
    const id = branchId || activeBranch()
    if (!id) return []
    const areas = await tableApi.areas(id)
    return areas.map(areaToFloor)
  },
  async create(body) {
    const branchId = activeBranch()
    if (!branchId) return unsupported("chưa chọn chi nhánh")
    const area = await tableApi.addArea(body.name, branchId, Math.max(0, body.level - 1))
    return areaToFloor(area)
  },
  async update(floorId, body) {
    const branchId = activeBranch()
    const areas = await tableApi.areas(branchId || undefined)
    const current = areas.find((a) => a.id === floorId)
    if (!current) return unsupported("không tìm thấy tầng/khu vực")
    const updated = await tableApi.updateArea(floorId, {
      name: body.name ?? current.name,
      sortOrder: body.sortOrder ?? current.sortOrder,
    })
    return areaToFloor(updated)
  },
  remove: (floorId) => tableApi.removeArea(floorId),
  async getLayout(floorId, status = "Published") {
    return layoutFromTables(floorId, await tablesInArea(floorId), status)
  },
  async saveDraft(floorId, body) {
    const branchId = activeBranch()
    const tables = await tablesInArea(floorId, branchId)
    const byId = new Map(tables.map((t) => [t.id, t]))
    const byCode = new Map(tables.map((t) => [t.tableCode, t]))
    const positions = body.layout.elements
      .filter((e): e is Extract<FloorLayoutJson["elements"][number], { type: "table" }> => e.type === "table")
      .map((e) => {
        const t = byId.get(e.tableId) ?? byCode.get(e.tableId)
        if (!t) return null
        return {
          tableId: t.id,
          // Persist canvas layout units (not grid-cell indices).
          positionX: Math.max(0, Math.round(e.x)),
          positionY: Math.max(0, Math.round(e.y)),
        }
      })
      .filter((p): p is { tableId: string; positionX: number; positionY: number } => p != null)
    if (positions.length) await tableApi.saveLayout(positions, branchId)
    return layoutFromTables(floorId, await tablesInArea(floorId, branchId), "Draft")
  },
  async publish(floorId) {
    // Table positions are live as soon as they are saved — no separate publish step.
    return beFloorsApi.getLayout(floorId, "Published")
  },
  async listTables(floorId) {
    return (await tablesInArea(floorId)).map((t) => toDto(t, floorId))
  },
  async createTable(floorId, body) {
    const branchId = activeBranch()
    if (!branchId) return unsupported("chưa chọn chi nhánh")
    const t = await tableApi.create({
      branchId,
      areaId: floorId,
      tableCode: body.code,
      capacity: body.seats,
      positionX: body.x != null ? Math.max(0, Math.round(body.x)) : undefined,
      positionY: body.y != null ? Math.max(0, Math.round(body.y)) : undefined,
    })
    return toDto(t, floorId)
  },
  async updateTable(tableId, body) {
    const branchId = activeBranch() || undefined
    const tables = await tableApi.list(branchId)
    const current = tables.find((t) => t.id === tableId)
    if (!current) return unsupported("không tìm thấy bàn để cập nhật")
    if (body.isActive === false) {
      const t = await tableApi.setStatus(tableId, "OutOfService")
      return toDto(t, current.areaId)
    }
    if (body.isActive === true && current.status === "OutOfService") {
      await tableApi.setStatus(tableId, "Available")
    }
    const t = await tableApi.update(tableId, {
      areaId: current.areaId,
      tableCode: body.code ?? current.tableCode,
      capacity: body.seats ?? current.capacity,
    })
    return toDto(t, t.areaId)
  },
  removeTable: (tableId) => tableApi.remove(tableId),
  async regenerateQr(tableId) {
    const t = await tableApi.regenerateQr(tableId)
    return { tableId: t.id, qrToken: t.qrToken }
  },
}

/** Mock canvas floors in demo; real mode projects `/tables` dining-tables onto one floor. */
export const floorsApi: typeof mockFloorsApi = env.useMock ? mockFloorsApi : beFloorsApi
