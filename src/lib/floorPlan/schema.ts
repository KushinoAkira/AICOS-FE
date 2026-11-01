import { z } from "zod"

export const LAYOUT_ELEMENT_TYPES = [
  "wall",
  "door",
  "window",
  "restroom",
  "stairs",
  "counter",
  "zone",
  "table",
] as const

export type LayoutElementType = (typeof LAYOUT_ELEMENT_TYPES)[number]

export const MAX_LAYOUT_ELEMENTS = 500
export const MAX_LAYOUT_BYTES = 256 * 1024

const pointSchema = z.tuple([z.number(), z.number()])

const wallSchema = z
  .object({
    id: z.string().min(1),
    type: z.literal("wall"),
    points: z.array(pointSchema).min(2).max(100),
    thickness: z.number().positive().max(40).optional(),
  })
  .strict()

function placed(type: "door" | "window" | "restroom" | "stairs" | "counter" | "zone") {
  return z
    .object({
      id: z.string().min(1),
      type: z.literal(type),
      x: z.number(),
      y: z.number(),
      w: z.number().positive(),
      h: z.number().positive().optional(),
      rotation: z.number().optional(),
      label: z.string().max(80).optional(),
    })
    .strict()
}

const tableElementSchema = z
  .object({
    id: z.string().min(1),
    type: z.literal("table"),
    tableId: z.string().min(1),
    x: z.number(),
    y: z.number(),
    w: z.number().positive(),
    h: z.number().positive(),
    shape: z.enum(["rect", "square", "round"]),
    seats: z.number().int().min(1).max(20).optional(),
    rotation: z.number().optional(),
  })
  .strict()

export const layoutElementSchema = z.discriminatedUnion("type", [
  wallSchema,
  placed("door"),
  placed("window"),
  placed("restroom"),
  placed("stairs"),
  placed("counter"),
  placed("zone"),
  tableElementSchema,
])

export const floorLayoutJsonSchema = z
  .object({
    unit: z.literal("grid"),
    gridSize: z.number().int().min(1).max(50),
    elements: z.array(layoutElementSchema).max(MAX_LAYOUT_ELEMENTS),
  })
  .strict()

export type FloorLayoutJson = z.infer<typeof floorLayoutJsonSchema>
export type LayoutElement = z.infer<typeof layoutElementSchema>
export type TableLayoutElement = Extract<LayoutElement, { type: "table" }>

export type LayoutValidationIssue = { path: string; message: string }

/**
 * Validates layout JSON structure and that elements sit inside floor bounds.
 * Does not check tableId existence (caller supplies that).
 */
export function validateLayoutJson(
  raw: unknown,
  bounds: { widthUnits: number; heightUnits: number },
): { ok: true; layout: FloorLayoutJson } | { ok: false; issues: LayoutValidationIssue[] } {
  const size = JSON.stringify(raw ?? null).length
  if (size > MAX_LAYOUT_BYTES) {
    return { ok: false, issues: [{ path: "", message: `Layout vượt quá ${MAX_LAYOUT_BYTES} bytes` }] }
  }
  const parsed = floorLayoutJsonSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      ok: false,
      issues: parsed.error.issues.map((i) => ({
        path: i.path.join(".") || "layout",
        message: i.message,
      })),
    }
  }
  const issues: LayoutValidationIssue[] = []
  const { widthUnits: W, heightUnits: H } = bounds
  for (const el of parsed.data.elements) {
    if (el.type === "wall") {
      for (const [i, [x, y]] of el.points.entries()) {
        if (x < 0 || y < 0 || x > W || y > H) {
          issues.push({ path: `elements.${el.id}.points.${i}`, message: "Điểm tường ngoài biên tầng" })
        }
      }
      continue
    }
    const h = el.h ?? el.w
    if (el.x < 0 || el.y < 0 || el.x + el.w > W || el.y + h > H) {
      issues.push({ path: `elements.${el.id}`, message: "Phần tử nằm ngoài biên tầng" })
    }
  }
  if (issues.length) return { ok: false, issues }
  return { ok: true, layout: parsed.data }
}

/** Soft warning when two table rectangles overlap (AABB). */
export function findOverlappingTables(layout: FloorLayoutJson): string[] {
  const tables = layout.elements.filter((e): e is TableLayoutElement => e.type === "table")
  const warnings: string[] = []
  for (let i = 0; i < tables.length; i++) {
    for (let j = i + 1; j < tables.length; j++) {
      const a = tables[i]
      const b = tables[j]
      const overlap =
        a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
      if (overlap) warnings.push(`Bàn ${a.tableId} chồng lên ${b.tableId}`)
    }
  }
  return warnings
}
