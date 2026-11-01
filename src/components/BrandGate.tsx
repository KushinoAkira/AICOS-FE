import type { ReactNode } from "react"
import { Link } from "react-router"
import { Logo } from "./AuthShell"
import { Button, LoadingState } from "./ui"
import { useBrand } from "../context/BrandContext"
import { PAGE_PATHS } from "../router/pages"

/**
 * Blocks auth forms when the active shop selection is unknown/suspended.
 * With no shop selected (platform), children render normally.
 */
export function BrandGate({ children }: { children: ReactNode }) {
  const b = useBrand()
  if (b.kind === "platform" || (b.kind === "ready" && b.brand.status === "Active")) return <>{children}</>
  const message =
    b.kind === "loading" ? null
    : b.kind === "notFound" ? { title: "Không tìm thấy quán", body: `Mã quán "${b.slug}" chưa thuộc thương hiệu nào trên AICOS.` }
    : b.kind === "error" ? { title: "Không tải được thông tin quán", body: "Vui lòng thử lại sau ít phút." }
    : { title: "Quán đang tạm ngưng", body: `${b.brand.name} đang tạm ngưng hoạt động trên AICOS. Vui lòng liên hệ quán để biết thêm.` }
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-base px-6 py-12">
      <div className="w-full max-w-md rounded-[20px] border border-border bg-surface p-8 text-center">
        <div className="mb-6 flex justify-center"><Logo /></div>
        {message ? (
          <>
            <h1 className="font-serif text-2xl text-text-primary">{message.title}</h1>
            <p className="mt-2 text-sm text-text-secondary">{message.body}</p>
            <div className="mt-6 flex flex-col items-center gap-3">
              <Link to={PAGE_PATHS["staff-entry"]}>
                <Button>Chọn lại thương hiệu</Button>
              </Link>
              <Link to={PAGE_PATHS.landing} className="text-xs text-text-secondary hover:text-espresso">
                ← Về trang chủ AICOS
              </Link>
            </div>
          </>
        ) : <LoadingState />}
      </div>
    </div>
  )
}
