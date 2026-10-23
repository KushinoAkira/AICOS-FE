import { useQuery } from "@tanstack/react-query"
import type { Page } from "../../App"
import { Button, Card, QueryBoundary, StatusPill, type Tone } from "../../components/ui"
import { formatTime } from "../../lib/format"
import { platformApi, type HealthItem } from "../../lib/api/platform"
import { PlatformPage } from "./PlatformPage"

const LABEL: Record<HealthItem["status"], string> = { Up: "Hoạt động", Degraded: "Chậm", Down: "Ngừng" }
const TONE: Record<HealthItem["status"], Tone> = { Up: "success", Degraded: "pending", Down: "danger" }

export default function PlatformHealth({ navigate }: { navigate: (p: Page) => void }) {
  const health = useQuery({ queryKey: ["platform", "health"], queryFn: platformApi.health, refetchInterval: 30_000 })
  return (
    <PlatformPage page="platform-health" navigate={navigate} uc="UC-09" title="Sức khỏe hệ thống" subtitle="Tự làm mới mỗi 30 giây."
      action={<Button variant="secondary" loading={health.isFetching} onClick={() => void health.refetch()}>Làm mới</Button>}>
      <QueryBoundary query={health}>
        {(rows) => (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {rows.map((h) => (
              <Card key={h.name}>
                <div className="flex items-center justify-between">
                  <h2 className="font-medium text-text-primary">{h.name}</h2>
                  <StatusPill tone={TONE[h.status]}>{LABEL[h.status]}</StatusPill>
                </div>
                <p className="mt-3 font-serif text-2xl text-text-primary">{h.latencyMs} ms</p>
                <p className="text-xs text-text-secondary">Kiểm tra lúc {formatTime(h.checkedAtUtc)}</p>
              </Card>
            ))}
          </div>
        )}
      </QueryBoundary>
    </PlatformPage>
  )
}
