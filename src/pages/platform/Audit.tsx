import { useQuery } from "@tanstack/react-query"
import type { Page } from "../../App"
import { DataTable, QueryBoundary, type Column } from "../../components/ui"
import { formatDateTime } from "../../lib/format"
import { platformApi, type PlatformAuditEntry } from "../../lib/api/platform"
import { PlatformPage } from "./PlatformPage"

const columns: Column<PlatformAuditEntry>[] = [
  { key: "at", header: "Thời gian", sort: (e) => e.at, render: (e) => formatDateTime(e.at) },
  { key: "actor", header: "Người thực hiện", render: (e) => e.actor },
  { key: "action", header: "Hành động", render: (e) => <span className="font-medium text-text-primary">{e.action}</span> },
  { key: "target", header: "Đối tượng", render: (e) => e.target },
]

/** Append-only: no edit or delete controls by design. Platform-level events only (BR-06). */
export default function PlatformAudit({ navigate }: { navigate: (p: Page) => void }) {
  const audit = useQuery({ queryKey: ["platform", "audit"], queryFn: platformApi.audit })
  return (
    <PlatformPage page="platform-audit" navigate={navigate} uc="UC-11" title="Nhật ký nền tảng" subtitle="Thay đổi tenant, đăng ký và cấu hình cấp nền tảng. Không thể sửa hoặc xóa.">
      <QueryBoundary query={audit}>{(rows) => <DataTable rows={rows} rowKey={(e) => e.id} columns={columns} pageSize={15} />}</QueryBoundary>
    </PlatformPage>
  )
}
