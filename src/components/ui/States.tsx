import type { ReactNode } from "react"
import { Button } from "./Button"

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-[16px] border border-dashed border-border px-6 py-12 text-center">
      <p className="font-serif text-lg text-text-primary">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-text-secondary">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function ErrorState({ title = "Không tải được dữ liệu", description, onRetry }: { title?: string; description?: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center rounded-[16px] border border-border bg-danger-bg px-6 py-12 text-center">
      <p className="font-serif text-lg text-state-danger">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-text-secondary">{description ?? "Vui lòng kiểm tra kết nối rồi thử lại."}</p>
      {onRetry && (
        <Button variant="secondary" className="mt-4" onClick={onRetry}>
          Thử lại
        </Button>
      )}
    </div>
  )
}

export function LoadingState({ label = "Đang tải" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center py-16" role="status" aria-label={label}>
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-espresso" />
    </div>
  )
}
