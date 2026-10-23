import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { Page } from "../../App"
import { Card, QueryBoundary, StatusPill } from "../../components/ui"
import { useToast } from "../../context/ToastContext"
import { platformApi, type PaymentProvider } from "../../lib/api/platform"
import { PlatformPage } from "./PlatformPage"

export default function PlatformProviders({ navigate }: { navigate: (p: Page) => void }) {
  const qc = useQueryClient()
  const { showToast } = useToast()
  const providers = useQuery({ queryKey: ["platform", "providers"], queryFn: platformApi.providers })
  const update = useMutation({
    mutationFn: (v: { id: string; mode: PaymentProvider["mode"]; enabled: boolean }) => platformApi.updateProvider(v.id, v),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["platform", "providers"] }); showToast("Đã lưu cấu hình", "success") },
    onError: (e) => showToast(e.message, "error"),
  })

  return (
    <PlatformPage page="platform-providers" navigate={navigate} uc="UC-08" title="Cổng thanh toán" subtitle="Chỉ dùng mock hoặc sandbox. Khóa bí mật luôn được che.">
      <QueryBoundary query={providers}>
        {(rows) => (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {rows.map((p) => (
              <Card key={p.id}>
                <div className="flex items-center justify-between">
                  <h2 className="font-serif text-xl text-text-primary">{p.name}</h2>
                  <StatusPill tone={p.enabled ? "success" : "neutral"}>{p.enabled ? "Đang bật" : "Đang tắt"}</StatusPill>
                </div>
                <dl className="mt-4 space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <dt className="text-text-secondary">Chế độ</dt>
                    <dd>
                      <select aria-label={`Chế độ ${p.name}`} value={p.mode} onChange={(e) => update.mutate({ id: p.id, mode: e.target.value as PaymentProvider["mode"], enabled: p.enabled })} className="rounded-[8px] border border-border bg-surface px-2 py-1.5">
                        <option value="mock">Mock</option>
                        <option value="sandbox">Sandbox</option>
                      </select>
                    </dd>
                  </div>
                  <div className="flex items-center justify-between"><dt className="text-text-secondary">Khóa bí mật</dt><dd className="font-mono text-text-primary">{p.secretHint}</dd></div>
                  <div className="flex items-center justify-between">
                    <dt className="text-text-secondary">Kích hoạt</dt>
                    <dd>
                      <button role="switch" aria-checked={p.enabled} aria-label={`Bật ${p.name}`} onClick={() => update.mutate({ id: p.id, mode: p.mode, enabled: !p.enabled })} className={`relative h-6 w-11 rounded-full transition-colors ${p.enabled ? "bg-state-success" : "bg-border"}`}>
                        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-surface transition-all ${p.enabled ? "left-5" : "left-0.5"}`} />
                      </button>
                    </dd>
                  </div>
                </dl>
              </Card>
            ))}
          </div>
        )}
      </QueryBoundary>
    </PlatformPage>
  )
}
