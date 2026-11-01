import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { Page } from "../../App"
import { Banner, Button, Card, Field, Modal, QueryBoundary, StatusPill } from "../../components/ui"
import { useToast } from "../../context/ToastContext"
import { platformApi, type PaymentProvider, type ProviderInput } from "../../lib/api/platform"
import { PlatformPage } from "./PlatformPage"

const SUPPORTED = [
  { code: "Mock", name: "Mock (giả lập)" },
  { code: "VietQR", name: "VietQR" },
  { code: "Momo", name: "MoMo" },
  { code: "ZaloPay", name: "ZaloPay" },
]

const inputOf = (p: PaymentProvider): ProviderInput => ({ displayName: p.name, mode: p.mode, merchantId: p.merchantId ?? "", callbackUrl: p.callbackUrl ?? "", apiKey: "", secretKey: "" })

/** UC-08: which gateways customers can pay through, in which mode, with which merchant keys. Keys are write-only: the API returns the last 4 characters at most. */
export default function PlatformProviders({ navigate }: { navigate: (p: Page) => void }) {
  const qc = useQueryClient()
  const { showToast } = useToast()
  const providers = useQuery({ queryKey: ["platform", "providers"], queryFn: platformApi.providers })
  const [editing, setEditing] = useState<PaymentProvider | null>(null)
  const [adding, setAdding] = useState<string | null>(null)
  const [draft, setDraft] = useState<ProviderInput>({ displayName: "", mode: "sandbox", merchantId: "", callbackUrl: "", apiKey: "", secretKey: "" })
  const [error, setError] = useState<string | null>(null)
  const done = (message: string) => { void qc.invalidateQueries({ queryKey: ["platform", "providers"] }); showToast(message, "success") }
  /** Turns the chosen gateway on first, so a gateway that cannot be enabled leaves the current one running. */
  const useOnly = useMutation({
    mutationFn: async (v: { provider: PaymentProvider; others: PaymentProvider[] }) => {
      if (!v.provider.enabled) await platformApi.setProviderEnabled(v.provider.id, true)
      for (const other of v.others) await platformApi.setProviderEnabled(other.id, false)
    },
    onSuccess: (_, v) => done(`Khách giờ chỉ thanh toán qua ${v.provider.name}`),
    onError: (e) => { void qc.invalidateQueries({ queryKey: ["platform", "providers"] }); showToast(e.message, "error") },
  })
  const toggle = useMutation({
    mutationFn: (p: PaymentProvider) => platformApi.setProviderEnabled(p.id, !p.enabled),
    onSuccess: (p) => done(p.enabled ? `Đã bật ${p.name}` : `Đã tắt ${p.name}`),
    onError: (e) => showToast(e.message, "error"),
  })
  const save = useMutation({
    mutationFn: () => adding ? platformApi.createProvider(adding, draft) : platformApi.updateProvider(editing?.id ?? "", draft),
    onSuccess: () => { done("Đã lưu cấu hình"); setEditing(null); setAdding(null) },
    onError: (e) => setError(e.message),
  })
  const set = (k: keyof ProviderInput, v: string) => setDraft((d) => ({ ...d, [k]: v }))
  const openEdit = (p: PaymentProvider) => { setEditing(p); setAdding(null); setDraft(inputOf(p)); setError(null) }
  const openAdd = (code: string, name: string) => { setAdding(code); setEditing(null); setDraft({ displayName: name, mode: code === "Mock" ? "mock" : "sandbox", merchantId: "", callbackUrl: "", apiKey: "", secretKey: "" }); setError(null) }
  const code = adding ?? editing?.code
  const isMock = code === "Mock"
  const modalOpen = !!adding || !!editing
  const close = () => { setEditing(null); setAdding(null) }

  return (
    <PlatformPage page="platform-providers" navigate={navigate} uc="UC-08" title="Cổng thanh toán" subtitle="Chọn cổng khách dùng để thanh toán. Cổng Mock chỉ giả lập, các cổng khác chạy Sandbox. Khóa bí mật không bao giờ được hiển thị lại.">
      <QueryBoundary query={providers}>
        {(rows) => {
          const active = rows.filter((p) => p.enabled)
          const missing = SUPPORTED.filter((s) => !rows.some((p) => p.code === s.code))
          return (
            <>
              <div className="mb-4">
                {active.length > 0
                  ? <Banner tone="success">Khách đang thanh toán qua: {active.map((p) => `${p.name} (${p.mode === "mock" ? "Mock" : "Sandbox"})`).join(", ")}.</Banner>
                  : <Banner tone="warn">Chưa bật cổng nào: khách không thể thanh toán online.</Banner>}
                <p className="mt-2 text-xs text-text-secondary">Với cổng khác Mock, từng thương hiệu cần khai báo tài khoản nhận tiền ở trang Cổng thanh toán của mình thì khách của thương hiệu đó mới thấy cổng này.</p>
              </div>
              {missing.length > 0 && (
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <span className="text-sm text-text-secondary">Thêm cổng:</span>
                  {missing.map((s) => <Button key={s.code} variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => openAdd(s.code, s.name)}>{s.name}</Button>)}
                </div>
              )}
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {rows.map((p) => (
                  <Card key={p.id}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h2 className="font-serif text-xl text-text-primary">{p.name}</h2>
                        <p className="text-xs text-text-secondary">{p.code}</p>
                      </div>
                      <StatusPill tone={p.enabled ? "success" : "neutral"}>{p.enabled ? "Đang bật" : "Đang tắt"}</StatusPill>
                    </div>
                    <dl className="mt-4 space-y-3 text-sm">
                      <div className="flex items-center justify-between"><dt className="text-text-secondary">Chế độ</dt><dd className="text-text-primary">{p.mode === "mock" ? "Mock" : "Sandbox"}</dd></div>
                      {p.code !== "Mock" && <>
                        <div className="flex items-center justify-between gap-3"><dt className="text-text-secondary">Mã merchant</dt><dd className="truncate text-text-primary">{p.merchantId || "Chưa có"}</dd></div>
                        <div className="flex items-center justify-between"><dt className="text-text-secondary">API key</dt><dd className="font-mono text-text-primary">{p.hasApiKey ? p.apiKeyHint ?? "••••" : "Chưa có"}</dd></div>
                        <div className="flex items-center justify-between"><dt className="text-text-secondary">Khóa bí mật</dt><dd className="font-mono text-text-primary">{p.hasSecretKey ? "••••••••" : "Chưa có"}</dd></div>
                      </>}
                      <div className="flex items-center justify-between">
                        <dt className="text-text-secondary">Kích hoạt</dt>
                        <dd>
                          <button role="switch" aria-checked={p.enabled} aria-label={`Bật ${p.name}`} disabled={toggle.isPending} onClick={() => toggle.mutate(p)} className={`relative h-6 w-11 rounded-full transition-colors ${p.enabled ? "bg-state-success" : "bg-border"}`}>
                            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-surface transition-all ${p.enabled ? "left-5" : "left-0.5"}`} />
                          </button>
                        </dd>
                      </div>
                    </dl>
                    <div className="mt-5 flex gap-2">
                      <Button variant="secondary" className="flex-1" onClick={() => openEdit(p)}>Cấu hình</Button>
                      {!(p.enabled && active.length === 1) && <Button className="flex-1" loading={useOnly.isPending && useOnly.variables?.provider.id === p.id} disabled={useOnly.isPending} onClick={() => useOnly.mutate({ provider: p, others: active.filter((o) => o.id !== p.id) })}>Chỉ dùng cổng này</Button>}
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )
        }}
      </QueryBoundary>

      <Modal open={modalOpen} title={adding ? `Thêm cổng ${adding}` : `Cấu hình ${editing?.name ?? ""}`} onClose={close}
        footer={<><Button variant="secondary" onClick={close}>Hủy</Button><Button loading={save.isPending} onClick={() => { setError(null); save.mutate() }}>Lưu</Button></>}>
        <div className="space-y-4">
          {error && <Banner>{error}</Banner>}
          <Field label="Tên hiển thị" value={draft.displayName} onChange={(e) => set("displayName", e.target.value)} />
          {!isMock && <>
            <Field label="Mã merchant" autoComplete="off" value={draft.merchantId} onChange={(e) => set("merchantId", e.target.value)} />
            <Field label="Địa chỉ callback" hint="Không bắt buộc." autoComplete="off" value={draft.callbackUrl} onChange={(e) => set("callbackUrl", e.target.value)} />
            <Field label="API key" hint={editing?.hasApiKey ? "Để trống nếu giữ khóa hiện tại." : "Cần có trước khi bật cổng."} type="password" autoComplete="new-password" value={draft.apiKey} onChange={(e) => set("apiKey", e.target.value)} />
            <Field label="Khóa bí mật" hint={editing?.hasSecretKey ? "Để trống nếu giữ khóa hiện tại." : "Cần có trước khi bật cổng."} type="password" autoComplete="new-password" value={draft.secretKey} onChange={(e) => set("secretKey", e.target.value)} />
          </>}
        </div>
      </Modal>
    </PlatformPage>
  )
}
