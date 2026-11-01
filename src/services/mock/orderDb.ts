import type { Order, TableRow } from "../../lib/api/orders"
import { BRANCH_1, BRANCH_2 } from "./brandDb"

export const BRANCH_ID = BRANCH_1

type TableSeed = Omit<TableRow, "orders">

function tbl(id: string, code: string, seats: number, branchId: string, floor: number, floorId: string): TableSeed {
  return { id, code, seats, branchId, floor, floorId, qrToken: `tbl-${code.toLowerCase()}`, isActive: true, billRequested: false }
}

/** Quận 1: 2 floors; Thủ Đức: 1 floor — ids align with floorDb.diningTables. */
export const tables: TableSeed[] = [
  tbl("t1", "A1", 2, BRANCH_1, 1, "fl-q1-1"),
  tbl("t2", "A2", 2, BRANCH_1, 1, "fl-q1-1"),
  tbl("t3", "A3", 4, BRANCH_1, 1, "fl-q1-1"),
  tbl("t4", "B1", 4, BRANCH_1, 2, "fl-q1-2"),
  tbl("t5", "B2", 4, BRANCH_1, 2, "fl-q1-2"),
  tbl("t6", "B3", 6, BRANCH_1, 2, "fl-q1-2"),
  tbl("t7", "T1", 2, BRANCH_2, 1, "fl-td-1"),
  tbl("t8", "T2", 4, BRANCH_2, 1, "fl-td-1"),
  tbl("t9", "T3", 4, BRANCH_2, 1, "fl-td-1"),
]

export const orders: Order[] = []
let seq = 100
export const nextOrderCode = () => `#${++seq}`
