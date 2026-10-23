import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { QRCodeSVG } from "qrcode.react"
import type { Page } from "../../App"
import { PageFrame } from "../../components/PageFrame"
import { Banner, Button, Field, Modal, QueryBoundary, StatusPill } from "../../components/ui"
import { ordersApi, type TableRow } from "../../lib/api/orders"

const qrUrl = (t: TableRow) => `${window.location.origin}/q/${t.qrToken}`

export default function BranchTables({ navigate }: { navigate: (p: Page) => void }) {
  const qc = useQueryClient()
  const tables = useQuery({ queryKey: ["tables"], queryFn: ordersApi.tables })
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState("")
  const [seats, setSeats] = useState("2")
  const [error, setError] = useState<string | null>(null)
  const [qr, setQr] = useState<TableRow | null>(null)
  const add = useMutation({
    mutationFn: () => ordersApi.addTable({ code: code.trim(), seats: Number(seats) }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["tables"] }); setOpen(false); setCode("") },
    onError: (e) => setError(e.message),
  })
  return (
    <PageFrame page="branch-tables" navigate={navigate} uc="UC-23" title="Bàn và mã QR" subtitle="Mỗi bàn có một mã QR cố định. In và dán tại bàn." action={<Button onClick={() => { setError(null); setOpen(true) }}>Thêm bàn</Button>}>
      <QueryBoundary query={tables}>
        {(rows) => (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {rows.map((t) => (
              <li key={t.id} className="rounded-[16px] border border-border bg-surface p-5">
                <div className="flex items-center justify-between"><p className="font-serif text-xl text-text-primary">Bàn {t.code}</p><StatusPill tone={t.orders.length ? "pending" : "neutral"}>{t.orders.length ? (t.billRequested ? "Chờ thanh toán" : "Đang phục vụ") : "Trống"}</StatusPill></div>
                <p className="mt-1 text-sm text-text-secondary">{t.seats} chỗ</p>
                <Button variant="secondary" className="mt-4 w-full" onClick={() => setQr(t)}>Xem / in QR</Button>
              </li>
            ))}
          </ul>
        )}
      </QueryBoundary>
      <Modal open={open} title="Thêm bàn" onClose={() => setOpen(false)} footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Hủy</Button><Button loading={add.isPending} onClick={() => add.mutate()}>Thêm</Button></>}>
        <div className="space-y-4">{error && <Banner>{error}</Banner>}<Field label="Mã bàn" value={code} onChange={(e) => setCode(e.target.value)} /><Field label="Số chỗ" inputMode="numeric" value={seats} onChange={(e) => setSeats(e.target.value.replace(/\D/g, ""))} /></div>
      </Modal>
      <Modal open={!!qr} title={`QR bàn ${qr?.code ?? ""}`} onClose={() => setQr(null)} footer={<><Button variant="secondary" onClick={() => setQr(null)}>Đóng</Button><Button onClick={() => window.print()}>In</Button></>}>
        {qr && <div className="flex flex-col items-center gap-3"><QRCodeSVG value={qrUrl(qr)} size={200} /><a href={qrUrl(qr)} target="_blank" rel="noreferrer" className="break-all text-sm text-clay underline">{qrUrl(qr)}</a></div>}
      </Modal>
    </PageFrame>
  )
}