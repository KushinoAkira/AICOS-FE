import { useRef } from "react"
import { useQuery } from "@tanstack/react-query"
import { QRCodeSVG } from "qrcode.react"
import { Banner, Button, LoadingState, Modal } from "./ui"
import { branchesApi } from "../lib/api/identity"
import { publicApi } from "../lib/api/platform"
import { tokenStore } from "../lib/api/tokenStore"
import { brandCodeOf, branchOrderLink, tenantIdOfToken } from "../lib/branchQr"
import { baseIsLocal } from "../lib/tableBatch"

const svgOf = (host: HTMLElement | null) => {
  const svg = host?.querySelector("svg")
  return svg ? new XMLSerializer().serializeToString(svg) : null
}

function downloadPng(host: HTMLElement | null, name: string) {
  const text = svgOf(host)
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
    link.download = `${name}.png`
    link.click()
  }
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(text)}`
}

function printQr(host: HTMLElement | null, title: string) {
  const text = svgOf(host)
  const win = text && window.open("", "_blank", "noopener=no,width=480,height=680")
  if (!text || !win) return
  const esc = title.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!)
  win.document.write(`<!doctype html><title>${esc}</title><body style="font-family:sans-serif;text-align:center;padding:32px"><h1 style="margin:0 0 4px">${esc}</h1><p style="margin:0 0 16px">Quét mã để xem thực đơn và đặt món</p><div style="width:320px;margin:auto">${text.replace(/width="\d+"/, 'width="320"').replace(/height="\d+"/, 'height="320"')}</div></body>`)
  win.document.close()
  win.focus()
  win.print()
}

/**
 * The QR of a whole branch, to post at the counter or the door: scanning it opens the brand's menu with this branch chosen.
 * Table QRs (one per table, dine-in) stay as they are.
 */
export function BranchQrDialog({ branchId, onClose }: { branchId: string | null; onClose: () => void }) {
  const host = useRef<HTMLDivElement>(null)
  const open = !!branchId
  const brands = useQuery({ queryKey: ["public", "brands"], queryFn: publicApi.brands, enabled: open, staleTime: 60_000 })
  const branch = useQuery({ queryKey: ["branch", branchId], queryFn: () => branchesApi.get(branchId ?? ""), enabled: open })
  const code = brandCodeOf(brands.data ?? [], tenantIdOfToken(tokenStore.get()?.accessToken))
  const link = code && branchId ? branchOrderLink(code, branchId) : null
  const name = branch.data?.name ?? "Chi nhánh"

  return (
    <Modal
      open={open}
      title={`QR gọi món · ${name}`}
      onClose={onClose}
      footer={<>
        <Button variant="secondary" onClick={onClose}>Đóng</Button>
        <Button variant="secondary" disabled={!link} onClick={() => downloadPng(host.current, `qr-chi-nhanh-${code ?? ""}`)}>Tải ảnh PNG</Button>
        <Button disabled={!link} onClick={() => printQr(host.current, name)}>In</Button>
      </>}
    >
      {brands.isPending ? <LoadingState /> : !link ? (
        <Banner>Chưa lấy được mã thương hiệu để tạo đường dẫn. Kiểm tra thương hiệu đang hoạt động rồi thử lại.</Banner>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <p className="text-center text-sm text-text-secondary">Dán ở cửa ra vào: khách quét mã để xem thực đơn và đặt mang đi tại chi nhánh này (đặt mang đi cần tài khoản khách hàng). Khách ngồi tại bàn dùng mã QR của bàn.</p>
          <div ref={host} data-testid="branch-qr"><QRCodeSVG value={link} size={220} marginSize={2} /></div>
          <a href={link} target="_blank" rel="noreferrer" className="break-all text-center text-sm text-clay underline">{link}</a>
          {baseIsLocal() && <Banner tone="warn">Đường dẫn đang là localhost: điện thoại của khách không mở được. Đặt VITE_PUBLIC_APP_URL là địa chỉ thật trước khi in.</Banner>}
        </div>
      )}
    </Modal>
  )
}
