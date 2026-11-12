import { useQuery } from "@tanstack/react-query"
import type { Page } from "../../App"
import { DataTable, QueryBoundary, type Column } from "../../components/ui"
import { formatDateTime } from "../../lib/format"
import { auditActionLabel, auditEntityLabel } from "../../lib/auditLabels"
import { platformApi, type PlatformAuditEntry } from "../../lib/api/platform"
import { PlatformPage } from "./PlatformPage"

const columns: Column<PlatformAuditEntry>[] = [
  { key: "at", header: "Thời gian", sort: (e) => e.at, render: (e) => formatDateTime(e.at) },
  { key: "actor", header: "Người thực hiện", render: (e) => e.actor },
  { key: "action", header: "Hành động", render: (e) => <span><span className="font-medium text-text-primary">{auditActionLabel(e.action)}</span> <code className="text-[11px] text-text-secondary">{e.action}</code></span> },
  { key: "target", header: "Đối tượng", render: (e) => auditEntityLabel(e.target) },
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
