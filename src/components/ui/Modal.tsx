import { useEffect, type ReactNode } from "react"
import { Button } from "./Button"

export function Modal({ open, title, onClose, children, footer }: { open: boolean; title: string; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(58,46,34,0.45)] p-4 sm:items-center" onMouseDown={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} onMouseDown={(e) => e.stopPropagation()} className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[20px] bg-surface p-6 shadow-xl">
        <h2 className="font-serif text-xl text-text-primary">{title}</h2>
        <div className="mt-4">{children}</div>
        {footer && <div className="mt-6 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  )
}

/** Sensitive actions: confirmation + optional mandatory reason (audit). */
export function ConfirmDialog({ open, title, message, confirmLabel = "Xác nhận", requireReason, danger, onConfirm, onCancel, reason, onReason }: {
  open: boolean; title: string; message: string; confirmLabel?: string; requireReason?: boolean; danger?: boolean
  onConfirm: () => void; onCancel: () => void; reason?: string; onReason?: (v: string) => void
}) {
  const blocked = requireReason && !(reason ?? "").trim()
  return (
    <Modal
      open={open}
      title={title}
      onClose={onCancel}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel}>Hủy</Button>
          <Button variant={danger ? "danger" : "primary"} disabled={blocked} disabledReason="Vui lòng nhập lý do" onClick={onConfirm}>{confirmLabel}</Button>
        </>
      }
    >
      <p className="text-sm text-text-secondary">{message}</p>
      {requireReason && (
        <textarea
          aria-label="Lý do"
          value={reason ?? ""}
          onChange={(e) => onReason?.(e.target.value)}
          placeholder="Nhập lý do (bắt buộc)"
          className="mt-4 w-full rounded-[10px] border border-border p-3 text-sm outline-none focus:border-terracotta"
          rows={3}
        />
      )}
    </Modal>
  )
}
