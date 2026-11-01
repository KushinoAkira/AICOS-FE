import { useMemo, useState } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { Banner, Button, Field, Modal } from "../ui"
import { ApiError } from "../../lib/api/http"
import { tableApi, type Area, type TableBatchRow } from "../../lib/api/manage"
import { downloadCsvTemplate, generateCodes, MAX_BATCH, parseTablesCsv, validCode, type CsvResult } from "../../lib/tableBatch"

/** Every bad row the server named, not only the first one. */
const problemsOf = (e: Error) => (e instanceof ApiError && e.fieldErrors ? Object.values(e.fieldErrors).flat() : [e.message])

function Problems({ items }: { items: string[] }) {
  if (items.length === 0) return null
  return <Banner><ul className="max-h-40 space-y-1 overflow-y-auto">{items.slice(0, 20).map((p) => <li key={p}>{p}</li>)}{items.length > 20 && <li>và {items.length - 20} lỗi khác</li>}</ul></Banner>
}

interface Shared {
  branchId?: string
  /** How many more tables the plan allows here; null means no limit. */
  remaining: number | null
  onClose: () => void
  onDone: (created: number) => void
}

const NEW_AREA = "__new"

/** One shop set up, the others copied: areas, codes, seats and positions go over, each table with a new QR code. */
export function CloneFloorPlanDialog({ fromBranchId, tableCount, maxTables, branches, onClose, onDone }: {
  fromBranchId: string
  tableCount: number
  maxTables: number | null
  branches: { id: string; name: string }[]
  onClose: () => void
  onDone: (branches: number, tables: number) => void
}) {
  const everyTable = useQuery({ queryKey: ["dining-tables", "all"], queryFn: () => tableApi.list() })
  const [picked, setPicked] = useState<string[]>([])
  const [problems, setProblems] = useState<string[]>([])
  const countOf = (id: string) => (everyTable.data ?? []).filter((t) => t.branchId === id).length
  const clone = useMutation({
    mutationFn: () => tableApi.cloneFloorPlan(fromBranchId, picked),
    onSuccess: (r) => onDone(r.branches.length, r.branches.reduce((n, b) => n + b.tables, 0)),
    onError: (e) => setProblems(problemsOf(e)),
  })
  const source = branches.find((b) => b.id === fromBranchId)?.name ?? ""
  return (
    <Modal open title="Nhân bản sơ đồ bàn" onClose={onClose}
      footer={<><Button variant="secondary" onClick={onClose}>Hủy</Button><Button loading={clone.isPending} disabled={picked.length === 0} disabledReason="Chọn ít nhất một chi nhánh" onClick={() => { setProblems([]); clone.mutate() }}>Nhân bản sang {picked.length} chi nhánh</Button></>}>
      <div className="space-y-4">
        <p className="text-sm text-text-secondary">Chép <b className="text-text-primary">{tableCount} bàn</b> của <b className="text-text-primary">{source}</b> gồm khu vực, số chỗ và vị trí trên sơ đồ. Mỗi bàn ở chi nhánh mới có mã QR riêng, nên cần in mã cho từng chi nhánh.</p>
        <Problems items={problems} />
        {maxTables !== null && tableCount > maxTables && <Banner tone="warn">Sơ đồ này vượt giới hạn {maxTables} bàn mỗi chi nhánh của gói.</Banner>}
        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-medium text-text-primary">Chép sang</legend>
          {branches.filter((b) => b.id !== fromBranchId).map((b) => {
            const has = countOf(b.id)
            return (
              <label key={b.id} className={`flex items-center justify-between gap-3 rounded-[10px] border border-border p-3 text-sm ${has ? "opacity-60" : "cursor-pointer"}`}>
                <span className="flex items-center gap-2"><input type="checkbox" disabled={has > 0} checked={picked.includes(b.id)} onChange={(e) => setPicked(e.target.checked ? [...picked, b.id] : picked.filter((id) => id !== b.id))} /><span className="text-text-primary">{b.name}</span></span>
                <span className="text-xs text-text-secondary">{has ? `Đã có ${has} bàn` : "Chưa có bàn"}</span>
              </label>
            )
          })}
        </fieldset>
      </div>
    </Modal>
  )
}

/** One click for a whole zone: area, prefix and quantity give A01...A20, each with its own QR code. */
export function GenerateTablesDialog({ areas, existing, branchId, remaining, onClose, onDone }: Shared & { areas: Area[]; existing: string[] }) {
  const [areaId, setAreaId] = useState(areas[0]?.id ?? NEW_AREA)
  const [areaName, setAreaName] = useState("")
  const [prefix, setPrefix] = useState("A")
  const [start, setStart] = useState("1")
  const [count, setCount] = useState("20")
  const [capacity, setCapacity] = useState("4")
  const [problems, setProblems] = useState<string[]>([])
  const codes = useMemo(() => generateCodes(prefix, Number(start) || 1, Math.min(Number(count) || 0, MAX_BATCH)), [prefix, start, count])
  const taken = useMemo(() => {
    const known = new Set(existing.map((c) => c.toUpperCase()))
    return codes.filter((c) => known.has(c))
  }, [codes, existing])
  const seats = Number(capacity)
  const wrong =
    areaId === NEW_AREA && !areaName.trim() ? "Nhập tên khu vực mới."
    : !(Number(count) >= 1) ? "Nhập số lượng bàn."
    : Number(count) > MAX_BATCH ? `Mỗi lần tạo tối đa ${MAX_BATCH} bàn.`
    : codes.length > 0 && !validCode(codes[codes.length - 1]) ? "Tiền tố chỉ gồm chữ, số, dấu gạch ngang và tối đa 20 ký tự cả mã."
    : !(seats >= 1 && seats <= 50) ? "Số chỗ từ 1 đến 50."
    : taken.length > 0 ? `Các bàn này đã có: ${taken.slice(0, 5).join(", ")}${taken.length > 5 ? "..." : ""}. Đổi tiền tố hoặc số bắt đầu.`
    : remaining !== null && codes.length > remaining ? `Gói hiện tại chỉ cho thêm ${remaining} bàn ở chi nhánh này.`
    : null
  const create = useMutation({
    mutationFn: () => {
      const rows: TableBatchRow[] = codes.map((tableCode) => ({ ...(areaId === NEW_AREA ? { areaName: areaName.trim() } : { areaId }), tableCode, capacity: seats }))
      return tableApi.batch(rows, branchId)
    },
    onSuccess: (r) => onDone(r.created),
    onError: (e) => setProblems(problemsOf(e)),
  })
  return (
    <Modal open title="Tạo bàn và mã QR hàng loạt" onClose={onClose}
      footer={<><Button variant="secondary" onClick={onClose}>Hủy</Button><Button loading={create.isPending} disabled={!!wrong} disabledReason={wrong ?? undefined} onClick={() => { setProblems([]); create.mutate() }}>Tạo {codes.length} bàn</Button></>}>
      <div className="space-y-4">
        <Problems items={problems} />
        <div>
          <label htmlFor="gen-area" className="mb-1.5 block text-sm font-medium text-text-primary">Khu vực</label>
          <select id="gen-area" value={areaId} onChange={(e) => setAreaId(e.target.value)} className="w-full rounded-[10px] border border-border bg-surface px-3 py-3 text-sm">
            {areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            <option value={NEW_AREA}>+ Khu vực mới</option>
          </select>
        </div>
        {areaId === NEW_AREA && <Field label="Tên khu vực mới" value={areaName} onChange={(e) => setAreaName(e.target.value)} placeholder="Tầng 1" />}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tiền tố" value={prefix} onChange={(e) => setPrefix(e.target.value.toUpperCase())} />
          <Field label="Số bắt đầu" inputMode="numeric" value={start} onChange={(e) => setStart(e.target.value.replace(/\D/g, ""))} />
          <Field label="Số lượng bàn" inputMode="numeric" value={count} onChange={(e) => setCount(e.target.value.replace(/\D/g, ""))} />
          <Field label="Số chỗ mỗi bàn" inputMode="numeric" value={capacity} onChange={(e) => setCapacity(e.target.value.replace(/\D/g, ""))} />
        </div>
        <p className="rounded-[10px] bg-bg-warm p-3 text-sm text-text-primary">
          {codes.length > 0 ? <>Sẽ tạo <b>{codes[0]}</b> đến <b>{codes[codes.length - 1]}</b>: {codes.length} bàn, mỗi bàn một mã QR riêng.</> : "Nhập số lượng để xem trước."}
        </p>
        {wrong && <p role="alert" className="text-sm text-state-danger">{wrong}</p>}
      </div>
    </Modal>
  )
}

/** A file of tables, checked line by line before anything is created. */
export function ImportTablesDialog({ branchId, remaining, onClose, onDone }: Shared) {
  const [fileName, setFileName] = useState("")
  const [parsed, setParsed] = useState<CsvResult | null>(null)
  const [problems, setProblems] = useState<string[]>([])
  const rows = parsed?.rows ?? []
  const overPlan = remaining !== null && rows.length > remaining
  const areaCount = new Set(rows.map((r) => r.areaName.toLowerCase())).size
  async function read(file: File | undefined) {
    if (!file) return
    setFileName(file.name)
    setProblems([])
    setParsed(parseTablesCsv(await file.text()))
  }
  const create = useMutation({
    mutationFn: () => tableApi.batch(rows.map((r) => ({ areaName: r.areaName, tableCode: r.tableCode, capacity: r.capacity })), branchId),
    onSuccess: (r) => onDone(r.created),
    onError: (e) => setProblems(problemsOf(e)),
  })
  const ready = !!parsed && parsed.errors.length === 0 && rows.length > 0 && !overPlan
  return (
    <Modal open title="Nhập danh sách bàn từ CSV" onClose={onClose}
      footer={<><Button variant="secondary" onClick={onClose}>Hủy</Button><Button loading={create.isPending} disabled={!ready} disabledReason="Chọn file hợp lệ trước" onClick={() => { setProblems([]); create.mutate() }}>Tạo {rows.length} bàn</Button></>}>
      <div className="space-y-4">
        <p className="text-sm text-text-secondary">File có các cột <b>khu_vuc, ma_ban, so_cho</b>. Khu vực chưa có sẽ được tạo mới. Có một dòng sai thì chưa bàn nào được tạo.</p>
        <Button variant="secondary" onClick={downloadCsvTemplate}>Tải file mẫu</Button>
        <div>
          <label htmlFor="import-file" className="mb-1.5 block text-sm font-medium text-text-primary">Chọn file CSV</label>
          <input id="import-file" type="file" accept=".csv,text/csv" onChange={(e) => void read(e.target.files?.[0])} className="block w-full text-sm text-text-primary" />
        </div>
        <Problems items={[...(parsed?.errors ?? []), ...problems]} />
        {overPlan && <Banner tone="warn">Gói hiện tại chỉ cho thêm {remaining} bàn ở chi nhánh này, file có {rows.length} bàn.</Banner>}
        {parsed && parsed.errors.length === 0 && rows.length > 0 && (
          <div>
            <p className="mb-2 text-sm text-text-primary"><b>{fileName}</b>: {rows.length} bàn trong {areaCount} khu vực.</p>
            <div className="max-h-48 overflow-y-auto rounded-[10px] border border-border">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-bg-warm"><tr><th className="px-3 py-2 font-medium">Khu vực</th><th className="px-3 py-2 font-medium">Mã bàn</th><th className="px-3 py-2 font-medium">Số chỗ</th></tr></thead>
                <tbody>{rows.slice(0, 50).map((r) => <tr key={r.line} className="border-t border-border"><td className="px-3 py-1.5">{r.areaName}</td><td className="px-3 py-1.5">{r.tableCode}</td><td className="px-3 py-1.5">{r.capacity}</td></tr>)}</tbody>
              </table>
            </div>
            {rows.length > 50 && <p className="mt-1 text-xs text-text-secondary">Đang xem 50 dòng đầu.</p>}
          </div>
        )}
      </div>
    </Modal>
  )
}
