import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Button, ConfirmDialog, QueryBoundary } from "./ui"
import { useToast } from "../context/ToastContext"
import { sessionApi, type DeviceSession } from "../lib/api/manage"
import { formatDateTime } from "../lib/format"

/** A readable name from the browser's user agent. */
export function deviceName(agent: string | null): string {
  if (!agent) return "Thiết bị không rõ"
  const browser = /Edg\//.test(agent) ? "Edge" : /OPR\//.test(agent) ? "Opera" : /Chrome\//.test(agent) ? "Chrome" : /Firefox\//.test(agent) ? "Firefox" : /Safari\//.test(agent) ? "Safari" : ""
  const system = /Windows/.test(agent) ? "Windows" : /Android/.test(agent) ? "Android" : /iPhone|iPad/.test(agent) ? "iOS" : /Mac OS X/.test(agent) ? "macOS" : /Linux/.test(agent) ? "Linux" : ""
  if (browser && system) return `${browser} trên ${system}`
  return browser || system || "Thiết bị không rõ"
}

/** The devices this account is signed in on, each of which can be signed out from here. */
export function DeviceSessions() {
  const qc = useQueryClient()
  const { showToast } = useToast()
  const sessions = useQuery({ queryKey: ["device-sessions"], queryFn: sessionApi.list })
  const [revoking, setRevoking] = useState<DeviceSession | null>(null)
  const [revokingOthers, setRevokingOthers] = useState(false)
  const refresh = () => void qc.invalidateQueries({ queryKey: ["device-sessions"] })
  const revoke = useMutation({
    mutationFn: (id: string) => sessionApi.revoke(id),
    onSuccess: () => { refresh(); setRevoking(null); showToast("Đã đăng xuất thiết bị", "success") },
    onError: (e) => { setRevoking(null); showToast(e.message, "error") },
  })
  const revokeOthers = useMutation({
    mutationFn: sessionApi.revokeOthers,
    onSuccess: (r) => { refresh(); setRevokingOthers(false); showToast(`Đã đăng xuất ${r.revoked} thiết bị khác`, "success") },
    onError: (e) => { setRevokingOthers(false); showToast(e.message, "error") },
  })
  return (
    <QueryBoundary query={sessions}>
      {(rows) => (
        <>
          <Button variant="danger" className="mb-8" disabled={!rows.some((s) => !s.isCurrent)} onClick={() => setRevokingOthers(true)}>Đăng xuất các thiết bị khác</Button>
          <h3 className="mb-3 text-sm font-medium text-text-primary">Thiết bị đang đăng nhập</h3>
          <ul className="overflow-hidden rounded-2xl border border-border bg-surface">
            {rows.map((s) => (
              <li key={s.id} className="flex items-center gap-4 border-b border-border px-5 py-4 last:border-b-0">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text-primary">{deviceName(s.device)}</p>
                  <p className="text-xs text-text-secondary">{s.ipAddress ? `${s.ipAddress} · ` : ""}Hoạt động {formatDateTime(s.lastActiveAtUtc)}</p>
                </div>
                {s.isCurrent
                  ? <span className="rounded-full bg-success-bg px-2.5 py-1 text-xs text-state-success">Hiện tại</span>
                  : <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => setRevoking(s)}>Đăng xuất</Button>}
              </li>
            ))}
          </ul>
          <ConfirmDialog open={!!revoking} danger title={`Đăng xuất ${deviceName(revoking?.device ?? null)}?`} message="Thiết bị đó sẽ phải đăng nhập lại." confirmLabel="Đăng xuất" onCancel={() => setRevoking(null)} onConfirm={() => revoking && revoke.mutate(revoking.id)} />
          <ConfirmDialog open={revokingOthers} danger title="Đăng xuất các thiết bị khác?" message="Mọi thiết bị trừ thiết bị này sẽ phải đăng nhập lại." confirmLabel="Đăng xuất" onCancel={() => setRevokingOthers(false)} onConfirm={() => revokeOthers.mutate()} />
        </>
      )}
    </QueryBoundary>
  )
}
