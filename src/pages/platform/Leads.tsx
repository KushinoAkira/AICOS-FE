import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { Page } from "../../App"
import { Banner, Button, EmptyState, Modal, QueryBoundary, StatusPill, chipClass } from "../../components/ui"
import { useToast } from "../../context/ToastContext"
import { formatDateTime } from "../../lib/format"
import { platformApi, type Lead } from "../../lib/api/platform"
import { PlatformPage } from "./PlatformPage"

type Filter = "New" | "Handled" | "All"

/** Visitors who asked for advice on the contact page (pricing, demo, support): the platform team calls them back and notes what was agreed. */
export default function PlatformLeads({ navigate }: { navigate: (p: Page) => void }) {
  const qc = useQueryClient()
  const { showToast } = useToast()
  const leads = useQuery({ queryKey: ["platform", "leads"], queryFn: platformApi.leads, refetchInterval: 30_000 })
  const [filter, setFilter] = useState<Filter>("New")
  const [search, setSearch] = useState("")
  const [open, setOpen] = useState<Lead | null>(null)
  const [note, setNote] = useState("")
  const handle = useMutation({
    mutationFn: (l: Lead) => platformApi.handleLead(l.id, note),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["platform", "leads"] }); showToast("Đã lưu: khách đã được tư vấn.", "success"); setOpen(null) },
    onError: (e) => showToast(e.message, "error"),
  })
  const show = (l: Lead) => { setNote(l.note ?? ""); setOpen(l) }

  return (
    <PlatformPage page="platform-leads" navigate={navigate} uc="UC-05" title="Tư vấn khách hàng" subtitle="Người để lại thông tin ở trang Liên hệ. Gọi lại tư vấn rồi ghi lại kết quả.">
      <QueryBoundary query={leads}>
        {(rows) => {
          const fresh = rows.filter((l) => l.status === "New").length
          const term = search.trim().toLowerCase()
          const shown = rows
            .filter((l) => filter === "All" || l.status === filter)
            .filter((l) => !term || [l.name, l.email, l.phone ?? "", l.message, l.topic ?? ""].some((v) => v.toLowerCase().includes(term)))
          return (
            <>
              {fresh > 0 && <div className="mb-4"><Banner tone="warn">{fresh} khách mới đang chờ được liên hệ.</Banner></div>}
              <div className="mb-4 flex flex-wrap items-center gap-2">
                {([["New", `Chưa liên hệ (${fresh})`], ["Handled", "Đã tư vấn"], ["All", "Tất cả"]] as const).map(([v, label]) => (
                  <button key={v} type="button" aria-pressed={filter === v} onClick={() => setFilter(v)} className={`${chipClass(filter === v)} !min-h-9 !py-1.5`}>{label}</button>
                ))}
                <input aria-label="Tìm khách" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm tên, email, số điện thoại…" className="ml-auto w-full max-w-xs rounded-[10px] border border-border bg-surface px-3 py-2 text-sm" />
              </div>
              {shown.length === 0 ? <EmptyState title={filter === "New" ? "Không còn khách nào chờ liên hệ" : "Chưa có lời nhắn nào"} /> : (
                <ul className="grid gap-3 lg:grid-cols-2">
                  {shown.map((l) => (
                    <li key={l.id} className={`rounded-[14px] border bg-surface p-4 ${l.status === "New" ? "border-clay" : "border-border"}`}>
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-text-primary">{l.name}{l.topic && <span className="ml-2 rounded-full bg-sand px-2 py-0.5 text-xs font-normal text-text-secondary">{l.topic}</span>}</p>
                          <p className="mt-0.5 text-sm"><a href={`mailto:${l.email}`} className="text-clay hover:underline">{l.email}</a>{l.phone && <> · <a href={`tel:${l.phone}`} className="text-clay hover:underline">{l.phone}</a></>}</p>
                        </div>
                        <StatusPill tone={l.status === "New" ? "pending" : "success"}>{l.status === "New" ? "Chưa liên hệ" : "Đã tư vấn"}</StatusPill>
                      </div>
                      <p className="mt-3 line-clamp-3 whitespace-pre-line text-sm text-text-primary">{l.message}</p>
                      {l.note && <p className="mt-2 text-xs italic text-text-secondary">Ghi chú: {l.note}</p>}
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <span className="text-xs text-text-secondary">Gửi lúc {formatDateTime(l.createdAtUtc)}{l.handledAtUtc ? ` · tư vấn lúc ${formatDateTime(l.handledAtUtc)}` : ""}</span>
                        <Button variant={l.status === "New" ? "primary" : "secondary"} className="px-3 py-1.5 text-xs" onClick={() => show(l)}>{l.status === "New" ? "Đã liên hệ" : "Sửa ghi chú"}</Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )
        }}
      </QueryBoundary>
      <Modal open={!!open} title={`Tư vấn: ${open?.name ?? ""}`} onClose={() => setOpen(null)}
        footer={<><Button variant="secondary" onClick={() => setOpen(null)}>Hủy</Button><Button loading={handle.isPending} onClick={() => open && handle.mutate(open)}>Lưu</Button></>}>
        {open && (
          <div className="space-y-4 text-sm">
            <div className="rounded-[12px] bg-sand/50 p-3">
              <p className="text-text-secondary">{open.topic ?? "Liên hệ"} · {formatDateTime(open.createdAtUtc)}</p>
              <p className="mt-1 whitespace-pre-line text-text-primary">{open.message}</p>
            </div>
            <p className="text-text-secondary">Liên hệ: <a href={`tel:${open.phone ?? ""}`} className="text-clay">{open.phone ?? "không để số"}</a> · <a href={`mailto:${open.email}`} className="text-clay">{open.email}</a></p>
            <label className="block font-medium text-text-primary">Kết quả tư vấn
              <textarea value={note} maxLength={500} rows={3} onChange={(e) => setNote(e.target.value)} placeholder="Ví dụ: đã gọi, quán 2 chi nhánh, hẹn demo thứ Hai, gợi ý Gói Chuỗi Tiêu Chuẩn" className="mt-1.5 w-full rounded-[10px] border border-border p-3 font-normal" />
            </label>
          </div>
        )}
      </Modal>
    </PlatformPage>
  )
}
