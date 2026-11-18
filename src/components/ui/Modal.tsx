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

/** Sensitive actions: confirmation + optional mandatory reason (audit) or typed phrase (GitHub-style). */
export function ConfirmDialog({ open, title, message, confirmLabel = "Xác nhận", requireReason, confirmPhrase, danger, onConfirm, onCancel, reason, onReason, phrase, onPhrase }: {
  open: boolean; title: string; message: string; confirmLabel?: string; requireReason?: boolean
  /** Exact string the user must type to enable confirm (e.g. floor name). */
  confirmPhrase?: string
  danger?: boolean
  onConfirm: () => void; onCancel: () => void; reason?: string; onReason?: (v: string) => void
  phrase?: string; onPhrase?: (v: string) => void
}) {
  const reasonBlocked = requireReason && !(reason ?? "").trim()
  const phraseBlocked = !!confirmPhrase && (phrase ?? "").trim() !== confirmPhrase
  const blocked = reasonBlocked || phraseBlocked
  const disabledReason = reasonBlocked
    ? "Vui lòng nhập lý do"
    : phraseBlocked
      ? `Nhập đúng “${confirmPhrase}” để xác nhận`
      : undefined
  return (
    <Modal
      open={open}
      title={title}
      onClose={onCancel}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel}>Hủy</Button>
          <Button variant={danger ? "danger" : "primary"} disabled={blocked} disabledReason={disabledReason} onClick={onConfirm}>{confirmLabel}</Button>
        </>
      }
    >
      <p className="text-sm text-text-secondary">{message}</p>
      {confirmPhrase && (
        <div className="mt-4">
          <label className="mb-1.5 block text-sm text-text-secondary">
            Nhập <span className="font-medium text-text-primary">{confirmPhrase}</span> để xác nhận
          </label>
          <input
            aria-label="Xác nhận bằng cách nhập tên"
            value={phrase ?? ""}
            onChange={(e) => onPhrase?.(e.target.value)}
            placeholder={confirmPhrase}
            autoComplete="off"
            className="w-full rounded-[10px] border border-border px-3 py-2 text-sm outline-none focus:border-terracotta"
          />
        </div>
      )}
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
