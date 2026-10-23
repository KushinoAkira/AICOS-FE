import type { Order, TableRow } from "../../lib/api/orders"

export const BRANCH_ID = "00000000-0000-0000-0000-000000000b01"
export const tables: Omit<TableRow, "orders">[] = ["A1", "A2", "A3", "B1", "B2", "B3"].map((code, i) => ({ id: `t${i + 1}`, code, seats: i < 3 ? 2 : 4, qrToken: `tbl-${code.toLowerCase()}`, billRequested: false }))
export const orders: Order[] = []
let seq = 100
export const nextOrderCode = () => `#${++seq}`