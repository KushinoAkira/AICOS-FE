import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { QRCodeSVG } from "qrcode.react"
import type { Page } from "../../App"
import { PageFrame } from "../../components/PageFrame"
import { Banner, Button, EmptyState, Field, Modal, QueryBoundary, StatusPill } from "../../components/ui"
import { useToast } from "../../context/ToastContext"
import { ordersApi, type TableRow } from "../../lib/api/orders"

const qrUrl = (t: TableRow) => `${window.location.origin}/q/${t.qrToken}`
const PRINT_QR_ID = "qr-print"

function downloadPng(id: string, filename: string) {
  const svg = document.getElementById(id)
  if (!(svg instanceof SVGSVGElement)) return
  const src = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)], { type: "image/svg+xml;charset=utf-8" }))
  const img = new Image()
  img.onload = () => {
    const canvas = document.createElement("canvas")
    canvas.width = 640
    canvas.height = 640
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.fillStyle = "white"
    ctx.fillRect(0, 0, 640, 640)
    ctx.drawImage(img, 0, 0, 640, 640)
    URL.revokeObjectURL(src)
    canvas.toBlob((blob) => {
      if (!blob) return
      const a = document.createElement("a")
      a.href = URL.createObjectURL(blob)
      a.download = filename
      a.click()
      URL.revokeObjectURL(a.href)
    })
  }
  img.src = src
}

function printSticker(t: TableRow) {
  const svg = document.getElementById(PRINT_QR_ID)
  if (!(svg instanceof SVGSVGElement)) return
  const w = window.open("", "_blank", "width=480,height=640")
  if (!w) return
  w.document.write(`<!doctype html><html><head><title>QR bàn ${t.code}</title>
    <style>body{font-family:Inter,system-ui,sans-serif;text-align:center;padding:32px;color:black;background:white}h1{font-size:28px;margin:0 0 8px}p{margin:0 0 16px;font-size:14px}svg{width:240px;height:240px}</style>
    </head><body><h1>Bàn ${t.code}</h1><p>Quét mã để gọi món</p>${svg.outerHTML}</body></html>`)
  w.document.close()
  w.focus()
  w.print()
}

function TableCard({ t, onOpen }: { t: TableRow; onOpen: () => void }) {
  const busy = t.orders.length > 0
  return (
    <li className="rounded-[16px] border border-border bg-surface p-5">
      <div className="flex items-start gap-4">
        <QRCodeSVG value={qrUrl(t)} size={88} className="shrink-0 rounded-[8px] bg-surface p-1" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="font-serif text-xl text-text-primary">Bàn {t.code}</p>
            <StatusPill tone={busy ? "pending" : "neutral"}>{busy ? (t.billRequested ? "Chờ thanh toán" : "Đang phục vụ") : "Trống"}</StatusPill>
          </div>
          <p className="mt-1 text-sm text-text-secondary">{t.seats} chỗ · 1 mã QR riêng</p>
        </div>
      </div>
      <Button variant="secondary" className="mt-4 w-full" onClick={onOpen}>Xem / in QR</Button>
    </li>
  )
}

export default function BranchTables({ navigate }: { navigate: (p: Page) => void }) {
  const qc = useQueryClient()
  const { showToast } = useToast()
  const tables = useQuery({ queryKey: ["tables"], queryFn: ordersApi.tables })
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState("")
  const [seats, setSeats] = useState("2")
  const [error, setError] = useState<string | null>(null)
  const [qr, setQr] = useState<TableRow | null>(null)
  const add = useMutation({
    mutationFn: () => ordersApi.addTable({ code: code.trim(), seats: Number(seats) || 2 }),
    onSuccess: (row) => {
      void qc.invalidateQueries({ queryKey: ["tables"] })
      setOpen(false)
      setCode("")
      setQr(row)
      showToast(`Đã tạo bàn ${row.code} và mã QR.`, "success")
    },
    onError: (e) => setError(e.message),
  })

  return (
    <PageFrame page="branch-tables" navigate={navigate} uc="UC-23" title="Bàn và mã QR" subtitle="Mỗi bàn có một mã QR cố định. Thêm bàn là tạo QR; in rồi dán tại bàn." action={<Button onClick={() => { setError(null); setOpen(true) }}>Thêm bàn</Button>}>
      <QueryBoundary query={tables}>
        {(rows) => rows.length === 0 ? (
          <EmptyState title="Chưa có bàn" description="Thêm bàn đầu tiên để hệ thống tạo mã QR gọi món." action={<Button onClick={() => { setError(null); setOpen(true) }}>Thêm bàn</Button>} />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {rows.map((t) => <TableCard key={t.id} t={t} onOpen={() => setQr(t)} />)}
          </ul>
        )}
      </QueryBoundary>
      <Modal open={open} title="Thêm bàn" onClose={() => setOpen(false)} footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Hủy</Button><Button loading={add.isPending} disabled={!code.trim()} disabledReason="Nhập mã bàn" onClick={() => add.mutate()}>Tạo bàn và QR</Button></>}>
        <div className="space-y-4">
          {error && <Banner>{error}</Banner>}
          <Field label="Mã bàn" value={code} onChange={(e) => setCode(e.target.value)} hint="Ví dụ A1. Mã QR gắn với bàn này, không dùng chung." />
          <Field label="Số chỗ" inputMode="numeric" value={seats} onChange={(e) => setSeats(e.target.value.replace(/\D/g, ""))} />
        </div>
      </Modal>
      <Modal
        open={!!qr}
        title={`QR bàn ${qr?.code ?? ""}`}
        onClose={() => setQr(null)}
        footer={qr && (
          <>
            <Button variant="secondary" onClick={() => setQr(null)}>Đóng</Button>
            <Button variant="secondary" onClick={() => downloadPng(PRINT_QR_ID, `qr-ban-${qr.code}.png`)}>Tải PNG</Button>
            <Button onClick={() => printSticker(qr)}>In</Button>
          </>
        )}
      >
        {qr && (
          <div className="flex flex-col items-center gap-3">
            <QRCodeSVG id={PRINT_QR_ID} value={qrUrl(qr)} size={200} />
            <p className="text-sm text-text-secondary">Khách quét mã này để gọi món tại bàn {qr.code}.</p>
            <a href={qrUrl(qr)} target="_blank" rel="noreferrer" className="break-all text-sm text-clay underline">{qrUrl(qr)}</a>
            <Button variant="ghost" onClick={() => void navigator.clipboard.writeText(qrUrl(qr)).then(() => showToast("Đã sao chép liên kết QR", "success"))}>Sao chép liên kết</Button>
          </div>
        )}
      </Modal>
    </PageFrame>
  )
}
