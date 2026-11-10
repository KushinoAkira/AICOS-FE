import { useState, type ReactNode } from "react"
import { EmptyState } from "./States"

export interface Column<T> {
  key: string
  header: string
  render: (row: T) => ReactNode
  /** Sort value; omit to make the column non-sortable. */
  sort?: (row: T) => string | number
  className?: string
}

export function DataTable<T>({ rows, columns, rowKey, emptyTitle = "Chưa có dữ liệu", pageSize = 10 }: { rows: T[]; columns: Column<T>[]; rowKey: (row: T) => string; emptyTitle?: string; pageSize?: number }) {
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [asc, setAsc] = useState(true)
  const [page, setPage] = useState(0)
  if (rows.length === 0) return <EmptyState title={emptyTitle} />

  const col = columns.find((c) => c.key === sortKey)
  const sorted = col?.sort ? [...rows].sort((a, b) => (col.sort!(a) > col.sort!(b) ? 1 : -1) * (asc ? 1 : -1)) : rows
  const pages = Math.ceil(sorted.length / pageSize)
  const visible = sorted.slice(page * pageSize, page * pageSize + pageSize)

  return (
    <div className="overflow-hidden rounded-[16px] border border-border bg-surface">
      <div className="overflow-x-auto">
        <table className="w-full min-w-max text-sm">
          <thead>
            <tr className="border-b border-border bg-bg-base/60 text-left text-xs text-text-secondary">
              {columns.map((c) => (
                <th key={c.key} scope="col" className={`whitespace-nowrap px-5 py-3 font-medium ${c.className ?? ""}`} aria-sort={sortKey === c.key ? (asc ? "ascending" : "descending") : undefined}>
                  {c.sort ? (
                    <button onClick={() => { setAsc(sortKey === c.key ? !asc : true); setSortKey(c.key) }} className="hover:text-text-primary">
                      {c.header}{sortKey === c.key ? (asc ? " ↑" : " ↓") : ""}
                    </button>
                  ) : c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr key={rowKey(row)} className="border-b border-border last:border-0 hover:bg-bg-base">
                {columns.map((c) => <td key={c.key} className={`px-5 py-4 ${c.className ?? ""}`}>{c.render(row)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div className="flex items-center justify-between border-t border-border px-5 py-3 text-xs text-text-secondary">
          <span>Trang {page + 1}/{pages}</span>
          <span className="flex gap-3">
            <button disabled={page === 0} onClick={() => setPage(page - 1)} className="min-h-9 rounded-[10px] border border-border px-3 hover:bg-bg-base disabled:opacity-40">Trước</button>
            <button disabled={page >= pages - 1} onClick={() => setPage(page + 1)} className="min-h-9 rounded-[10px] border border-border px-3 hover:bg-bg-base disabled:opacity-40">Sau</button>
          </span>
        </div>
      )}
    </div>
  )
}
