import { HttpResponse, http } from "msw"
import type { FloorDto, FloorInput, FloorLayoutDto, FloorUpdate, SaveLayoutBody } from "../../lib/api/floors"
import { findOverlappingTables, validateLayoutJson, type FloorLayoutJson } from "../../lib/floorPlan/schema"
import {
  denyUnless,
  effectiveBranchId,
  isBranchLockedRole,
  tenantSlugOf,
  userFromRequest,
} from "./auth"
import * as db from "./db"
import * as fdb from "./floorDb"
import * as odb from "./orderDb"

const problem = (status: number, title: string, extra: Record<string, unknown> = {}) =>
  HttpResponse.json({ title, detail: title, ...extra }, { status })
const ok = <T,>(body: T) => HttpResponse.json(body as never)

const BRANCH_WRITERS = ["BranchManager", "Manager"] as const
const LAYOUT_READERS = ["BranchManager", "Manager", "BrandAdmin", "Cashier", "Barista", "WarehouseStaff"] as const

function actorBranchOrQuery(request: Request): { branchId: string | null; error: Response | null } {
  const user = userFromRequest(request)
  if (!user) return { branchId: null, error: problem(401, "Bạn cần đăng nhập", { code: "unauthorized" }) }
  const url = new URL(request.url)
  const queryBranch = url.searchParams.get("branchId")?.trim() || null

  if (isBranchLockedRole(user.role)) {
    if (queryBranch && queryBranch !== user.branchId) {
      return { branchId: null, error: problem(403, "Không được truy cập chi nhánh khác", { code: "branch_forbidden" }) }
    }
    return { branchId: user.branchId, error: null }
  }

  if (user.role === "BrandAdmin" || (user.role === "Manager" && !user.branchId)) {
    const branchId = queryBranch || effectiveBranchId(request)
    if (!branchId) return { branchId: null, error: problem(422, "Chọn chi nhánh", { code: "branch_required" }) }
    const slug = tenantSlugOf(user)
    if (slug && !(db.branchesOfTenant[slug] ?? []).includes(branchId)) {
      return { branchId: null, error: problem(403, "Chi nhánh không thuộc thương hiệu của bạn", { code: "branch_forbidden" }) }
    }
    return { branchId, error: null }
  }

  return { branchId: null, error: problem(403, "Bạn không có quyền thực hiện thao tác này", { code: "forbidden" }) }
}

function floorOfBranch(floorId: string, branchId: string): FloorDto | undefined {
  return fdb.floors.find((f) => f.id === floorId && f.branchId === branchId)
}

function tableHasOpenSession(tableId: string): boolean {
  return odb.orders.some((o) => o.tableId === tableId && !o.completedAtUtc && o.status !== "Cancelled")
}

function syncOrderTableQr(tableId: string, qrToken: string) {
  const t = odb.tables.find((x) => x.id === tableId)
  if (t) t.qrToken = qrToken
}

function validateTableRefs(
  layout: FloorLayoutJson,
  branchId: string,
  floorId: string,
): { ok: true } | { ok: false; message: string } {
  const tableEls = layout.elements.filter((e) => e.type === "table")
  const ids = tableEls.map((e) => (e.type === "table" ? e.tableId : ""))
  if (new Set(ids).size !== ids.length) return { ok: false, message: "Mỗi bàn chỉ được xuất hiện một lần trên sơ đồ" }

  const active = fdb.diningTables.filter((t) => t.branchId === branchId && t.floorId === floorId && t.isActive)
  for (const id of ids) {
    const t = fdb.diningTables.find((x) => x.id === id)
    if (!t || t.branchId !== branchId || t.floorId !== floorId) {
      return { ok: false, message: `tableId ${id} không thuộc tầng/chi nhánh này` }
    }
  }
  for (const t of active) {
    if (!ids.includes(t.id)) return { ok: false, message: `Bàn đang hoạt động ${t.code} phải có trên sơ đồ` }
  }
  return { ok: true }
}

function publishWouldBreakOpenSessions(floorId: string, nextLayout: FloorLayoutJson): string | null {
  const draftIds = new Set(
    nextLayout.elements.filter((e) => e.type === "table").map((e) => (e.type === "table" ? e.tableId : "")),
  )
  const current = fdb.diningTables.filter((t) => t.floorId === floorId)
  for (const t of current) {
    if (!tableHasOpenSession(t.id)) continue
    if (!draftIds.has(t.id)) return `Không thể gỡ bàn ${t.code} đang có phiên mở`
    // re-code check happens when code changes on dining table entity; layout does not store code
  }
  return null
}

export const floorHandlers = [
  http.get("*/api/v1/floors", ({ request }) => {
    const denied = denyUnless(request, [...LAYOUT_READERS])
    if (denied) return denied
    const { branchId, error } = actorBranchOrQuery(request)
    if (error) return error
    const list = fdb.floors
      .filter((f) => f.branchId === branchId)
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder || a.level - b.level)
    return ok(list)
  }),

  http.post("*/api/v1/floors", async ({ request }) => {
    const denied = denyUnless(request, [...BRANCH_WRITERS])
    if (denied) return denied
    const user = userFromRequest(request)!
    if (!user.branchId) return problem(403, "Chỉ quản lý chi nhánh được tạo tầng", { code: "forbidden" })
    const body = (await request.json()) as FloorInput
    if (!body.name?.trim()) return problem(422, "Nhập tên tầng")
    const level = Math.max(1, Number(body.level) || 1)
    const created: FloorDto = {
      id: `fl-${crypto.randomUUID().slice(0, 8)}`,
      branchId: user.branchId,
      name: body.name.trim(),
      level,
      widthUnits: body.widthUnits && body.widthUnits > 0 ? body.widthUnits : 400,
      heightUnits: body.heightUnits && body.heightUnits > 0 ? body.heightUnits : 280,
      sortOrder: fdb.floors.filter((f) => f.branchId === user.branchId).length,
    }
    fdb.floors.push(created)
    fdb.ensureDraft(created.id)
    return ok(created)
  }),

  http.put("*/api/v1/floors/:floorId", async ({ params, request }) => {
    const denied = denyUnless(request, [...BRANCH_WRITERS])
    if (denied) return denied
    const user = userFromRequest(request)!
    if (!user.branchId) return problem(403, "Không có quyền", { code: "forbidden" })
    const floor = floorOfBranch(String(params.floorId), user.branchId)
    if (!floor) return problem(404, "Không tìm thấy tầng")
    const body = (await request.json()) as FloorUpdate
    if (body.name != null) floor.name = body.name.trim() || floor.name
    if (body.sortOrder != null) floor.sortOrder = Number(body.sortOrder)
    if (body.level != null) floor.level = Math.max(1, Number(body.level) || floor.level)
    return ok(floor)
  }),

  http.delete("*/api/v1/floors/:floorId", ({ params, request }) => {
    const denied = denyUnless(request, [...BRANCH_WRITERS])
    if (denied) return denied
    const user = userFromRequest(request)!
    if (!user.branchId) return problem(403, "Không có quyền", { code: "forbidden" })
    const floorId = String(params.floorId)
    const floor = floorOfBranch(floorId, user.branchId)
    if (!floor) return problem(404, "Không tìm thấy tầng")
    const open = fdb.diningTables.some((t) => t.floorId === floorId && tableHasOpenSession(t.id))
    if (open) return problem(409, "Không thể xóa tầng còn bàn đang có phiên mở", { code: "open_session" })
    const ix = fdb.floors.findIndex((f) => f.id === floorId)
    if (ix >= 0) fdb.floors.splice(ix, 1)
    for (let i = fdb.layouts.length - 1; i >= 0; i--) {
      if (fdb.layouts[i].floorId === floorId) fdb.layouts.splice(i, 1)
    }
    return new HttpResponse(null, { status: 204 })
  }),

  http.get("*/api/v1/floors/:floorId/layout", ({ params, request }) => {
    const denied = denyUnless(request, [...LAYOUT_READERS])
    if (denied) return denied
    const user = userFromRequest(request)!
    const floorId = String(params.floorId)
    const floor = fdb.floors.find((f) => f.id === floorId)
    if (!floor) return problem(404, "Không tìm thấy tầng")

    if (isBranchLockedRole(user.role) && floor.branchId !== user.branchId) {
      return problem(403, "Không được truy cập chi nhánh khác", { code: "branch_forbidden" })
    }
    if (user.role === "BrandAdmin" || (user.role === "Manager" && !user.branchId)) {
      const slug = tenantSlugOf(user)
      if (slug && !(db.branchesOfTenant[slug] ?? []).includes(floor.branchId)) {
        return problem(403, "Chi nhánh không thuộc thương hiệu của bạn", { code: "branch_forbidden" })
      }
    }

    const statusParam = (new URL(request.url).searchParams.get("status") ?? "published").toLowerCase()
    const wantDraft = statusParam === "draft"
    if (wantDraft && (user.role === "Cashier" || user.role === "Barista" || user.role === "WarehouseStaff")) {
      return problem(403, "Chỉ xem sơ đồ đã công bố", { code: "forbidden" })
    }
    const row = wantDraft ? fdb.ensureDraft(floorId) : fdb.ensurePublished(floorId)
    if (!row) return problem(404, "Chưa có sơ đồ đã công bố")
    return ok(row)
  }),

  http.put("*/api/v1/floors/:floorId/layout", async ({ params, request }) => {
    const denied = denyUnless(request, [...BRANCH_WRITERS])
    if (denied) return denied
    const user = userFromRequest(request)!
    if (!user.branchId) return problem(403, "Chỉ quản lý chi nhánh được sửa sơ đồ", { code: "forbidden" })
    const floorId = String(params.floorId)
    const floor = floorOfBranch(floorId, user.branchId)
    if (!floor) return problem(404, "Không tìm thấy tầng")

    const body = (await request.json()) as SaveLayoutBody
    const draft = fdb.ensureDraft(floorId)
    if (body.expectedVersion !== draft.version) {
      return problem(409, "Sơ đồ đã được người khác cập nhật. Tải lại rồi thử lại.", {
        code: "version_conflict",
        currentVersion: draft.version,
      })
    }

    const validated = validateLayoutJson(body.layout, { widthUnits: floor.widthUnits, heightUnits: floor.heightUnits })
    if (!validated.ok) {
      return problem(422, "Sơ đồ không hợp lệ", { code: "layout_invalid", errors: validated.issues })
    }
    const refs = validateTableRefs(validated.layout, user.branchId, floorId)
    if (!refs.ok) return problem(422, refs.message, { code: "layout_invalid" })

    draft.layout = validated.layout
    draft.version += 1
    draft.updatedAtUtc = new Date().toISOString()
    draft.updatedBy = user.email
    const warnings = findOverlappingTables(validated.layout)
    return ok({ ...draft, warnings })
  }),

  http.post("*/api/v1/floors/:floorId/publish", ({ params, request }) => {
    const denied = denyUnless(request, [...BRANCH_WRITERS])
    if (denied) return denied
    const user = userFromRequest(request)!
    if (!user.branchId) return problem(403, "Chỉ quản lý chi nhánh được công bố", { code: "forbidden" })
    const floorId = String(params.floorId)
    const floor = floorOfBranch(floorId, user.branchId)
    if (!floor) return problem(404, "Không tìm thấy tầng")

    const draft = fdb.ensureDraft(floorId)
    const block = publishWouldBreakOpenSessions(floorId, draft.layout)
    if (block) return problem(409, block, { code: "open_session" })

    const refs = validateTableRefs(draft.layout, user.branchId, floorId)
    if (!refs.ok) return problem(422, refs.message, { code: "layout_invalid" })

    let published = fdb.ensurePublished(floorId)
    if (!published) {
      published = {
        id: `ly-${floorId}-pub`,
        floorId,
        version: draft.version,
        status: "Published",
        layout: structuredClone(draft.layout),
        updatedBy: user.email,
        updatedAtUtc: new Date().toISOString(),
      }
      fdb.layouts.push(published)
    } else {
      published.layout = structuredClone(draft.layout)
      published.version = draft.version
      published.updatedBy = user.email
      published.updatedAtUtc = new Date().toISOString()
    }

    fdb.floorAudit.unshift({
      id: `fa-${Date.now()}`,
      at: published.updatedAtUtc,
      actor: user.email,
      action: "publish",
      branchId: user.branchId,
      floorId,
      target: floor.name,
    })
    fdb.emitFloorPublished(user.branchId, floorId)
    const warnings = findOverlappingTables(published.layout)
    return ok({ ...published, warnings })
  }),

  http.get("*/api/v1/floors/:floorId/tables", ({ params, request }) => {
    const denied = denyUnless(request, [...LAYOUT_READERS])
    if (denied) return denied
    const user = userFromRequest(request)!
    const floorId = String(params.floorId)
    const floor = fdb.floors.find((f) => f.id === floorId)
    if (!floor) return problem(404, "Không tìm thấy tầng")
    if (isBranchLockedRole(user.role) && floor.branchId !== user.branchId) {
      return problem(403, "Không được truy cập chi nhánh khác", { code: "branch_forbidden" })
    }
    return ok(fdb.diningTables.filter((t) => t.floorId === floorId))
  }),

  http.post("*/api/v1/floors/:floorId/tables", async ({ params, request }) => {
    const denied = denyUnless(request, [...BRANCH_WRITERS])
    if (denied) return denied
    const user = userFromRequest(request)!
    if (!user.branchId) return problem(403, "Không có quyền", { code: "forbidden" })
    const floorId = String(params.floorId)
    const floor = floorOfBranch(floorId, user.branchId)
    if (!floor) return problem(404, "Không tìm thấy tầng")
    const body = (await request.json()) as { code?: string; seats?: number }
    const code = (body.code ?? "").trim()
    if (!code) return problem(422, "Nhập mã bàn")
    const seats = Math.max(1, Math.min(20, Number(body.seats) || 2))
    if (fdb.diningTables.some((t) => t.floorId === floorId && t.code.toLowerCase() === code.toLowerCase())) {
      return problem(422, "Mã bàn đã tồn tại trên tầng này", { code: "duplicate_code" })
    }
    const created = {
      id: `t-${crypto.randomUUID().slice(0, 8)}`,
      branchId: user.branchId,
      floorId,
      code,
      seats,
      qrToken: fdb.randomQrToken(),
      isActive: true,
    }
    fdb.diningTables.push(created)
    if (!odb.tables.some((x) => x.id === created.id)) {
      odb.tables.push({
        id: created.id,
        branchId: created.branchId,
        code: created.code,
        seats: created.seats,
        floor: floor.level,
        floorId: floor.id,
        qrToken: created.qrToken,
        isActive: true,
        billRequested: false,
      })
    }
    return ok(created)
  }),

  http.patch("*/api/v1/tables/:tableId", async ({ params, request }) => {
    const denied = denyUnless(request, [...BRANCH_WRITERS])
    if (denied) return denied
    const user = userFromRequest(request)!
    if (!user.branchId) return problem(403, "Không có quyền", { code: "forbidden" })
    const tableId = String(params.tableId)
    const table = fdb.diningTables.find((t) => t.id === tableId && t.branchId === user.branchId)
    if (!table) return problem(404, "Không tìm thấy bàn")
    const body = (await request.json()) as { code?: string; seats?: number; isActive?: boolean }
    if (body.code != null) {
      const code = body.code.trim()
      if (!code) return problem(422, "Nhập mã bàn")
      if (
        fdb.diningTables.some(
          (t) => t.floorId === table.floorId && t.id !== table.id && t.code.toLowerCase() === code.toLowerCase(),
        )
      ) {
        return problem(422, "Mã bàn đã tồn tại trên tầng này", { code: "duplicate_code" })
      }
      if (code !== table.code && tableHasOpenSession(tableId)) {
        return problem(409, "Không thể đổi mã bàn khi đang có phiên mở", { code: "open_session" })
      }
      table.code = code
    }
    if (body.seats != null) table.seats = Math.max(1, Math.min(20, Number(body.seats) || table.seats))
    if (body.isActive != null) {
      if (!body.isActive && tableHasOpenSession(tableId)) {
        return problem(409, "Không thể tắt bàn đang có phiên mở", { code: "open_session" })
      }
      table.isActive = Boolean(body.isActive)
    }
    const ot = odb.tables.find((x) => x.id === tableId)
    if (ot) {
      ot.code = table.code
      ot.seats = table.seats
      ot.qrToken = table.qrToken
    }
    return ok(table)
  }),

  http.delete("*/api/v1/tables/:tableId", ({ params, request }) => {
    const denied = denyUnless(request, [...BRANCH_WRITERS])
    if (denied) return denied
    const user = userFromRequest(request)!
    if (!user.branchId) return problem(403, "Không có quyền", { code: "forbidden" })
    const tableId = String(params.tableId)
    const ix = fdb.diningTables.findIndex((t) => t.id === tableId && t.branchId === user.branchId)
    if (ix < 0) return problem(404, "Không tìm thấy bàn")
    if (tableHasOpenSession(tableId)) {
      return problem(409, "Không thể xóa bàn đang có phiên mở", { code: "open_session" })
    }
    fdb.diningTables.splice(ix, 1)
    const oix = odb.tables.findIndex((t) => t.id === tableId)
    if (oix >= 0) odb.tables.splice(oix, 1)
    return new HttpResponse(null, { status: 204 })
  }),

  http.post("*/api/v1/tables/:tableId/qr/regenerate", ({ params, request }) => {
    const denied = denyUnless(request, [...BRANCH_WRITERS])
    if (denied) return denied
    const user = userFromRequest(request)!
    if (!user.branchId) return problem(403, "Không có quyền", { code: "forbidden" })
    const tableId = String(params.tableId)
    const table = fdb.diningTables.find((t) => t.id === tableId && t.branchId === user.branchId)
    if (!table) return problem(404, "Không tìm thấy bàn")
    if (tableHasOpenSession(tableId)) {
      return problem(409, "Không thể đổi mã QR khi bàn đang có phiên mở", { code: "open_session" })
    }
    table.qrToken = fdb.randomQrToken()
    syncOrderTableQr(tableId, table.qrToken)
    fdb.floorAudit.unshift({
      id: `fa-${Date.now()}`,
      at: new Date().toISOString(),
      actor: user.email,
      action: "qr_regenerate",
      branchId: user.branchId,
      floorId: table.floorId,
      target: table.code,
    })
    return ok({ tableId: table.id, qrToken: table.qrToken })
  }),
]
