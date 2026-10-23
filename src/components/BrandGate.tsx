import type { ReactNode } from "react"
import { Logo } from "./AuthShell"
import { LoadingState } from "./ui"
import { useBrand } from "../context/BrandContext"

/**
 * Sits in front of a brand's own login / sign-up pages: unknown brand, suspended brand and loading
 * get their own screen instead of the form. On the platform site (no brand) it renders the children.
 */
export function BrandGate({ children }: { children: ReactNode }) {
  const b = useBrand()
  if (b.kind === "platform" || (b.kind === "ready" && b.brand.status === "Active")) return <>{children}</>
  const message =
    b.kind === "loading" ? null
    : b.kind === "notFound" ? { title: "Không tìm thấy quán", body: `Địa chỉ "${b.slug}" chưa thuộc thương hiệu nào trên AICOS. Hãy kiểm tra lại đường dẫn bạn nhận được từ quán.` }
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
          </>
        ) : <LoadingState />}
      </div>
    </div>
  )
}
