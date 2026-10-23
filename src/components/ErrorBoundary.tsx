import { Component, type ErrorInfo, type ReactNode } from "react"

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

/** Last line of defence: a crash in one screen shows a recoverable message instead of a blank page. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[AICOS] Unhandled UI error", error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div
        className="min-h-screen flex items-center justify-center px-6"
        style={{ backgroundColor: "#FAF6F0", color: "#3A2E22" }}
      >
        <div className="max-w-md text-center">
          <h1 className="text-xl font-medium mb-2">Đã có lỗi xảy ra</h1>
          <p className="text-sm mb-6" style={{ color: "rgba(58,46,34,0.7)" }}>
            AICOS gặp sự cố khi hiển thị màn hình này. Bạn có thể tải lại trang để thử lại.
          </p>
          <button
            className="px-4 py-2 rounded-full text-sm"
            style={{ backgroundColor: "#6F4E37", color: "#FAF6F0" }}
            onClick={() => window.location.reload()}
          >
            Tải lại trang
          </button>
        </div>
      </div>
    )
  }
}
