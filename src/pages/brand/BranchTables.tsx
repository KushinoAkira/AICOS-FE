import { useRef, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { QRCodeSVG } from "qrcode.react"
import type { Page } from "../../App"
import { PageFrame } from "../../components/PageFrame"
import { Banner, Button, ConfirmDialog, EmptyState, Field, Modal, QueryBoundary, StatusPill } from "../../components/ui"
import { useToast } from "../../context/ToastContext"
import { tableApi, type DiningTable } from "../../lib/api/manage"

const qrUrl = (t: DiningTable) => `${window.location.origin}/q/${t.qrToken}`
const STATUS: Record<DiningTable["status"], { label: string; tone: "neutral" | "pending" | "danger" }> = {
  Available: { label: "Trống", tone: "neutral" }, Occupied: { label: "Có khách", tone: "pending" }, OutOfService: { label: "Ngừng phục vụ", tone: "danger" },
}

/** The QR as a standalone SVG document, for saving or printing. */
function svgText(host: HTMLElement | null) {
  const svg = host?.querySelector("svg")
  return svg ? new XMLSerializer().serializeToString(svg) : null
}

const fileName = (t: DiningTable) => `qr-ban-${t.tableCode}`

function downloadPng(host: HTMLElement | null, t: DiningTable) {
  const text = svgText(host)
  if (!text) return
  const image = new Image()
  image.onload = () => {
    const canvas = document.createElement("canvas")
    canvas.width = canvas.height = 1024
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.fillStyle = "#FFFFFF"
    ctx.fillRect(0, 0, 1024, 1024)
    ctx.drawImage(image, 64, 64, 896, 896)
    const link = document.createElement("a")
    link.href = canvas.toDataURL("image/png")
    link.download = `${fileName(t)}.png`
    link.click()
  }
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(text)}`
}

function printQr(host: HTMLElement | null, t: DiningTable) {
  const text = svgText(host)
  const win = text && window.open("", "_blank", "noopener=no,width=480,height=640")
  if (!text || !win) return
  win.document.write(`<!doctype html><title>${fileName(t)}</title><body style="font-family:sans-serif;text-align:center;padding:32px"><h1 style="margin:0 0 16px">Bàn ${t.tableCode}</h1><div style="width:320px;margin:auto">${text.replace(/width="\d+"/, 'width="320"').replace(/height="\d+"/, 'height="320"')}</div><p>Quét mã để gọi món</p></body>`)
  win.document.close()
  win.focus()
  win.print()
}

interface Form { areaId: string; tableCode: string; capacity: string }

/** UC-25, UC-26: the manager adds, edits and removes tables and areas, and gets the QR to stick on each table. */
export default function BranchTables({ navigate }: { navigate: (p: Page) => void }) {
  const qc = useQueryClient()
  const { showToast } = useToast()
  const tables = useQuery({ queryKey: ["dining-tables"], queryFn: tableApi.list })
  const areas = useQuery({ queryKey: ["areas"], queryFn: tableApi.areas })
  const [editing, setEditing] = useState<DiningTable | "new" | null>(null)
  const [form, setForm] = useState<Form>({ areaId: "", tableCode: "", capacity: "2" })
  const [error, setError] = useState<string | null>(null)
  const [qr, setQr] = useState<DiningTable | null>(null)
  const [removing, setRemoving] = useState<DiningTable | null>(null)
  const [regenerating, setRegenerating] = useState<DiningTable | null>(null)
  const [areaName, setAreaName] = useState("")
  const qrHost = useRef<HTMLDivElement>(null)
  const refresh = () => { void qc.invalidateQueries({ queryKey: ["dining-tables"] }); void qc.invalidateQueries({ queryKey: ["areas"] }); void qc.invalidateQueries({ queryKey: ["tables"] }) }
  const fail = (e: Error) => showToast(e.message, "error")

  const open = (t: DiningTable | "new") => {
    setError(null)
    setEditing(t)
    setForm(t === "new" ? { areaId: areas.data?.[0]?.id ?? "", tableCode: "", capacity: "2" } : { areaId: t.areaId, tableCode: t.tableCode, capacity: String(t.capacity) })
  }
  const save = useMutation({
    mutationFn: () => {
      const body = { areaId: form.areaId, tableCode: form.tableCode.trim(), capacity: Number(form.capacity) }
      return editing && editing !== "new" ? tableApi.update(editing.id, body) : tableApi.create(body)
    },
    onSuccess: () => { refresh(); setEditing(null); showToast("Đã lưu bàn.", "success") },
    onError: (e) => setError(e.message),
  })
  const remove = useMutation({ mutationFn: (id: string) => tableApi.remove(id), onSuccess: () => { refresh(); setRemoving(null); showToast("Đã xóa bàn.", "success") }, onError: (e) => { setRemoving(null); fail(e) } })
  const setStatus = useMutation({ mutationFn: (v: { id: string; status: DiningTable["status"] }) => tableApi.setStatus(v.id, v.status), onSuccess: refresh, onError: fail })
  const regenerate = useMutation({
    mutationFn: (id: string) => tableApi.regenerateQr(id),
    onSuccess: (t) => { refresh(); setRegenerating(null); setQr(t); showToast("Đã đổi mã QR. Mã cũ không dùng được nữa, hãy in và dán lại.", "success") },
    onError: (e) => { setRegenerating(null); fail(e) },
  })
  const addArea = useMutation({ mutationFn: () => tableApi.addArea(areaName.trim()), onSuccess: () => { refresh(); setAreaName("") }, onError: fail })
  const removeArea = useMutation({ mutationFn: (id: string) => tableApi.removeArea(id), onSuccess: refresh, onError: fail })

  const submit = () => {
    if (!form.areaId) return setError("Tạo khu vực trước, rồi chọn khu vực cho bàn")
    if (!form.tableCode.trim()) return setError("Nhập mã bàn")
    if (!(Number(form.capacity) >= 1)) return setError("Số chỗ từ 1 trở lên")
    setError(null)
    save.mutate()
  }

  return (
    <PageFrame page="branch-tables" navigate={navigate} uc="UC-25" title="Bàn và mã QR" subtitle="Mỗi bàn có một mã QR riêng để in và dán tại bàn." action={<Button onClick={() => open("new")}>Thêm bàn</Button>}>
      <section aria-label="Khu vực" className="mb-8 rounded-[16px] border border-border bg-surface p-5">
        <h2 className="font-serif text-lg text-text-primary">Khu vực</h2>
        <QueryBoundary query={areas}>
          {(rows) => (
            <ul className="mt-3 flex flex-wrap gap-2">
              {rows.length === 0 && <li className="text-sm text-text-secondary">Chưa có khu vực nào. Tạo một khu vực để thêm bàn.</li>}
              {rows.map((a) => (
                <li key={a.id} className="flex items-center gap-2 rounded-full bg-bg-warm px-3 py-1.5 text-sm text-text-primary">
                  {a.name} <span className="text-xs text-text-secondary">{a.tableCount} bàn</span>
                  <button aria-label={`Xóa khu vực ${a.name}`} onClick={() => removeArea.mutate(a.id)} className="text-text-secondary hover:text-state-danger">×</button>
                </li>
              ))}
            </ul>
          )}
        </QueryBoundary>
        <form className="mt-3 flex max-w-md items-end gap-2" onSubmit={(e) => { e.preventDefault(); if (areaName.trim()) addArea.mutate() }}>
          <div className="flex-1"><Field label="Thêm khu vực" value={areaName} onChange={(e) => setAreaName(e.target.value)} placeholder="Tầng trệt" /></div>
          <Button type="submit" variant="secondary" className="min-h-11" loading={addArea.isPending}>Thêm</Button>
        </form>
      </section>

      <QueryBoundary query={tables}>
        {(rows) => rows.length === 0 ? <EmptyState title="Chưa có bàn nào" description="Thêm bàn để có mã QR." /> : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {rows.map((t) => (
              <li key={t.id} className="flex flex-col rounded-[16px] border border-border bg-surface p-5">
                <div className="flex items-center justify-between gap-2"><p className="font-serif text-xl text-text-primary">Bàn {t.tableCode}</p><StatusPill tone={STATUS[t.status].tone}>{STATUS[t.status].label}</StatusPill></div>
                <p className="mt-1 flex-1 text-sm text-text-secondary">{t.capacity} chỗ · {t.areaName}</p>
                <Button variant="secondary" className="mt-4 w-full" onClick={() => setQr(t)}>Xem, tải và in QR</Button>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <Button variant="secondary" className="px-2 py-1.5 text-xs" onClick={() => open(t)}>Sửa</Button>
                  <Button variant="secondary" className="px-2 py-1.5 text-xs" disabled={t.status === "Occupied"} disabledReason="Bàn đang có khách" loading={setStatus.isPending && setStatus.variables?.id === t.id} onClick={() => setStatus.mutate({ id: t.id, status: t.status === "OutOfService" ? "Available" : "OutOfService" })}>{t.status === "OutOfService" ? "Mở lại" : "Ngừng"}</Button>
                  <Button variant="danger" className="px-2 py-1.5 text-xs" onClick={() => setRemoving(t)}>Xóa</Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </QueryBoundary>

      <Modal open={!!editing} title={editing === "new" ? "Thêm bàn" : "Sửa bàn"} onClose={() => setEditing(null)} footer={<><Button variant="secondary" onClick={() => setEditing(null)}>Hủy</Button><Button loading={save.isPending} onClick={submit}>Lưu</Button></>}>
        <div className="space-y-4">
          {error && <Banner>{error}</Banner>}
          <label className="block text-sm font-medium text-text-primary">Khu vực
            <select value={form.areaId} onChange={(e) => setForm({ ...form, areaId: e.target.value })} className="mt-1.5 w-full rounded-[10px] border border-border bg-surface px-3 py-3 text-sm">
              <option value="">Chọn khu vực</option>
              {(areas.data ?? []).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </label>
          <Field label="Mã bàn" value={form.tableCode} onChange={(e) => setForm({ ...form, tableCode: e.target.value })} />
          <Field label="Số chỗ" inputMode="numeric" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value.replace(/\D/g, "") })} />
        </div>
      </Modal>

      <Modal
        open={!!qr}
        title={`QR bàn ${qr?.tableCode ?? ""}`}
        onClose={() => setQr(null)}
        footer={qr && <>
          <Button variant="secondary" onClick={() => setQr(null)}>Đóng</Button>
          <Button variant="secondary" onClick={() => downloadPng(qrHost.current, qr)}>Tải ảnh PNG</Button>
          <Button onClick={() => printQr(qrHost.current, qr)}>In</Button>
        </>}
      >
        {qr && (
          <div className="flex flex-col items-center gap-3">
            <div ref={qrHost}><QRCodeSVG value={qrUrl(qr)} size={220} marginSize={2} /></div>
            <a href={qrUrl(qr)} target="_blank" rel="noreferrer" className="break-all text-center text-sm text-clay underline">{qrUrl(qr)}</a>
            <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => setRegenerating(qr)}>Đổi mã QR (mã cũ sẽ hết hiệu lực)</Button>
          </div>
        )}
      </Modal>
      <ConfirmDialog open={!!removing} danger title={`Xóa bàn ${removing?.tableCode ?? ""}?`} message="Mã QR đã in của bàn này sẽ không dùng được nữa." confirmLabel="Xóa" onCancel={() => setRemoving(null)} onConfirm={() => removing && remove.mutate(removing.id)} />
      <ConfirmDialog open={!!regenerating} danger title={`Đổi mã QR bàn ${regenerating?.tableCode ?? ""}?`} message="Mã đang dán tại bàn sẽ ngừng hoạt động. Bạn cần in và dán mã mới." confirmLabel="Đổi mã" onCancel={() => setRegenerating(null)} onConfirm={() => regenerating && regenerate.mutate(regenerating.id)} />
    </PageFrame>
  )
}
