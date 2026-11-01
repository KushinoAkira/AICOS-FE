import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { QRCodeSVG } from "qrcode.react"
import { useSearchParams } from "react-router"
import { Banner, Button, EmptyState, QueryBoundary } from "../../components/ui"
import { branchesApi } from "../../lib/api/identity"
import { tableApi } from "../../lib/api/manage"
import { baseIsLocal, byCode, publicBase, qrLink } from "../../lib/tableBatch"
import { useAuth } from "../../context/AuthContext"

/** The usable part of an A4 sheet with 10 mm margins. */
const SHEET = { width: 190, height: 277 }
const LAYOUTS = { 4: { cols: 2, rows: 2 }, 6: { cols: 2, rows: 3 }, 9: { cols: 3, rows: 3 } } as const
type PerPage = keyof typeof LAYOUTS

/** UC-26: every QR code of a branch on A4 sheets, ready to cut and stick. The browser's print dialog also saves it as a PDF. */
export default function TablesPrint() {
  const [params] = useSearchParams()
  const { user } = useAuth()
  const branchId = params.get("branch") ?? user?.branchId ?? undefined
  const [areaId, setAreaId] = useState(params.get("area") ?? "")
  const [perPage, setPerPage] = useState<PerPage>(6)
  const tables = useQuery({ queryKey: ["dining-tables", branchId], queryFn: () => tableApi.list(branchId) })
  const areas = useQuery({ queryKey: ["areas", branchId], queryFn: () => tableApi.areas(branchId) })
  const branches = useQuery({ queryKey: ["branches", "active"], queryFn: () => branchesApi.listActive() })
  const branchName = branches.data?.find((b) => b.id === branchId)?.name ?? ""
  const { cols, rows } = LAYOUTS[perPage]
  const cell = { width: SHEET.width / cols, height: SHEET.height / rows }
  const qrSize = Math.min(cell.width, cell.height) * (perPage === 9 ? 0.58 : 0.62)
  const sheets = useMemo(() => {
    const shown = (tables.data ?? []).filter((t) => !areaId || t.areaId === areaId).sort((a, b) => byCode(a.tableCode, b.tableCode))
    return Array.from({ length: Math.ceil(shown.length / perPage) }, (_, i) => shown.slice(i * perPage, (i + 1) * perPage))
  }, [tables.data, areaId, perPage])
  const total = sheets.reduce((n, s) => n + s.length, 0)

  return (
    <div className="min-h-screen bg-bg-warm print:bg-white">
      <style>{"@page { size: A4; margin: 10mm } @media print { html, body { background: #fff } }"}</style>
      <header className="sticky top-0 z-10 border-b border-border bg-surface px-6 py-4 print:hidden">
        <div className="mx-auto flex max-w-5xl flex-wrap items-end gap-4">
          <div className="mr-auto">
            <h1 className="font-serif text-2xl text-text-primary">In mã QR</h1>
            <p className="text-sm text-text-secondary">{branchName} · {total} mã, {sheets.length} trang A4</p>
          </div>
          <label className="text-sm font-medium text-text-primary">Khu vực
            <select value={areaId} onChange={(e) => setAreaId(e.target.value)} className="mt-1 block rounded-[10px] border border-border bg-surface px-3 py-2 text-sm">
              <option value="">Tất cả</option>
              {(areas.data ?? []).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium text-text-primary">Số mã mỗi trang
            <select value={perPage} onChange={(e) => setPerPage(Number(e.target.value) as PerPage)} className="mt-1 block rounded-[10px] border border-border bg-surface px-3 py-2 text-sm">
              {[4, 6, 9].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <Button disabled={total === 0} onClick={() => window.print()}>In hoặc lưu PDF</Button>
        </div>
        {baseIsLocal() && <div className="mx-auto mt-3 max-w-5xl"><Banner tone="warn">Mã đang trỏ về {publicBase()}, điện thoại của khách không mở được. Đặt VITE_PUBLIC_APP_URL là địa chỉ thật của ứng dụng rồi in lại.</Banner></div>}
      </header>
      <main className="py-6 print:p-0">
        <QueryBoundary query={tables}>
          {() => total === 0 ? <div className="mx-auto max-w-xl"><EmptyState title="Chưa có bàn để in" description="Tạo bàn ở trang Bàn và mã QR trước." /></div> : (
            <>
              {sheets.map((sheet, index) => (
                <section key={index} aria-label={`Trang ${index + 1}`} className="mx-auto mb-6 grid bg-white shadow print:mb-0 print:shadow-none" style={{ width: `${SHEET.width}mm`, height: `${SHEET.height - 1}mm`, gridTemplateColumns: `repeat(${cols}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)`, breakAfter: index < sheets.length - 1 ? "page" : "auto" }}>
                  {sheet.map((t) => (
                    <article key={t.id} className="flex flex-col items-center justify-center gap-[2mm] border border-dashed border-gray-300 p-[3mm] text-center text-black" style={{ breakInside: "avoid" }}>
                      <p className="text-[10pt]">{branchName}</p>
                      <p className="font-serif text-[20pt] font-medium leading-none">Bàn {t.tableCode}</p>
                      <QRCodeSVG value={qrLink(t.qrToken)} size={512} marginSize={1} style={{ width: `${qrSize}mm`, height: `${qrSize}mm` }} />
                      <p className="text-[11pt] font-medium">Quét mã để gọi món</p>
                      <p className="text-[8pt] text-gray-600">{t.areaName}</p>
                    </article>
                  ))}
                </section>
              ))}
            </>
          )}
        </QueryBoundary>
      </main>
    </div>
  )
}
