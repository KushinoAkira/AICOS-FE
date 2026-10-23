import { useToast, type Toast } from "../context/ToastContext"

const TYPE_STYLES = {
  success: { bg: "#FFFFFF", border: "#EAEDE0", icon: "#5C7A52", bar: "#7A8450" },
  error:   { bg: "#FFFFFF", border: "#FAE8E6", icon: "#A6534B", bar: "#A6534B" },
  info:    { bg: "#FFFFFF", border: "#E6DCCB", icon: "#C97B4A", bar: "#C97B4A" },
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const s = TYPE_STYLES[toast.type]

  return (
    <div
      className={toast.exiting ? "toast-exit" : "toast-enter"}
      style={{
        backgroundColor: s.bg,
        border: `1px solid ${s.border}`,
        borderRadius: "12px",
        padding: "12px 16px",
        minWidth: "260px",
        maxWidth: "340px",
        boxShadow: "0 8px 32px rgba(58,46,34,0.14)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div className="flex items-center gap-3">
        <ToastIcon type={toast.type} color={s.icon} />
        <p className="text-sm font-medium flex-1" style={{ color: "#3A2E22", fontFamily: "'Inter', system-ui, sans-serif" }}>
          {toast.message}
        </p>
        <button
          type="button"
          onClick={onDismiss}
          style={{ background: "none", border: "none", cursor: "pointer", color: "#8A7A6C", padding: "2px", lineHeight: 1 }}
          aria-label="Đóng thông báo"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
            <path d="M2 2l10 10M12 2L2 12" />
          </svg>
        </button>
      </div>

      {/* Progress bar */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          height: "2px",
          backgroundColor: s.bar,
          opacity: 0.6,
          animation: "toast-progress 3.2s linear both",
        }}
      />
    </div>
  )
}

export function ToastContainer() {
  const { toasts, dismiss } = useToast()
  if (toasts.length === 0) return null

  return (
    <div
      className="fixed z-[70] flex flex-col gap-2"
      style={{ top: "20px", right: "20px", pointerEvents: "none" }}
    >
      {toasts.map((toast) => (
        <div key={toast.id} style={{ pointerEvents: "auto" }}>
          <ToastItem toast={toast} onDismiss={() => dismiss(toast.id)} />
        </div>
      ))}
    </div>
  )
}

function ToastIcon({ type, color }: { type: string; color: string }) {
  if (type === "success") {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="8" cy="8" r="7" />
        <path d="M5 8l2 2 4-4" />
      </svg>
    )
  }
  if (type === "error") {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="8" cy="8" r="7" />
        <path d="M8 5v3M8 11h.01" />
      </svg>
    )
  }
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="7" />
      <path d="M8 7v4M8 5h.01" />
    </svg>
  )
}
