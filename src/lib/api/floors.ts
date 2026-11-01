import { env } from "../../config/env"
import { http } from "./http"
import type { FloorLayoutJson } from "../floorPlan/schema"

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
}

export interface TableUpdate {
  code?: string
  seats?: number
  isActive?: boolean
}

const BASE = "/api/v1/floors"

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
    http.patch<DiningTableDto>(`/api/v1/tables/${tableId}`, body),
  removeTable: (tableId: string) => http.delete<void>(`/api/v1/tables/${tableId}`),
  regenerateQr: (tableId: string) =>
    http.post<{ tableId: string; qrToken: string }>(`/api/v1/tables/${tableId}/qr/regenerate`),
}

/** Real gateway not wired yet — mock only in demo. */
export const floorsApi: typeof mockFloorsApi = env.useMock
  ? mockFloorsApi
  : mockFloorsApi
