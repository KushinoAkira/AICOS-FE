import { useEffect, useState, type ReactNode } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Banner, Button, Card, Field, QueryBoundary } from "./ui"
import { useToast } from "../context/ToastContext"

export type SettingField<T> =
  | { key: keyof T & string; label: string; kind: "number"; suffix?: string; min?: number; max?: number; hint?: string }
  | { key: keyof T & string; label: string; kind: "text"; hint?: string }
  | { key: keyof T & string; label: string; kind: "boolean"; hint?: string }

interface Props<T extends object> {
  queryKey: unknown[]
  load: () => Promise<T>
  save: (v: T) => Promise<T>
  fields: SettingField<T>[]
  note?: ReactNode
  /** Extra rule beyond per-field min/max. Return an error message or null. */
  validate?: (v: T) => string | null
}

/** Declarative settings screen: load, edit, validate, save. Used by the Brand Admin configuration pages. */
export function SettingsForm<T extends object>({ queryKey, load, save, fields, note, validate }: Props<T>) {
  const query = useQuery({ queryKey, queryFn: load })
  return <QueryBoundary query={query}>{(data) => <Editor key={JSON.stringify(data)} initial={data} queryKey={queryKey} save={save} fields={fields} note={note} validate={validate} />}</QueryBoundary>
}

function Editor<T extends object>({ initial, queryKey, save, fields, note, validate }: { initial: T; queryKey: unknown[]; save: (v: T) => Promise<T>; fields: SettingField<T>[]; note?: ReactNode; validate?: (v: T) => string | null }) {
  const qc = useQueryClient()
  const { showToast } = useToast()
  const [draft, setDraft] = useState<Record<string, string | boolean>>(() => Object.fromEntries(Object.entries(initial as Record<string, unknown>).map(([k, v]) => [k, typeof v === "boolean" ? v : String(v)])))
  const [error, setError] = useState<string | null>(null)
  useEffect(() => setError(null), [draft])

  const mutation = useMutation({
    mutationFn: save,
    onSuccess: (data) => { qc.setQueryData(queryKey, data); showToast("Đã lưu cấu hình", "success") },
    onError: (e) => setError(e.message),
  })

  function submit() {
    const value: Record<string, unknown> = {}
    for (const f of fields) {
      const raw = draft[f.key]
      if (f.kind === "number") {
        const n = Number(String(raw).replace(",", "."))
        if (raw === "" || Number.isNaN(n)) return setError(`Nhập số cho "${f.label}"`)
        if (f.min !== undefined && n < f.min) return setError(`"${f.label}" tối thiểu ${f.min}`)
        if (f.max !== undefined && n > f.max) return setError(`"${f.label}" tối đa ${f.max}`)
        value[f.key] = n
      } else if (f.kind === "text") {
        if (!String(raw).trim()) return setError(`Nhập "${f.label}"`)
        value[f.key] = String(raw).trim()
      } else value[f.key] = Boolean(raw)
    }
    const typed = value as T
    const extra = validate?.(typed)
    if (extra) return setError(extra)
    mutation.mutate(typed)
  }

  return (
    <Card className="max-w-2xl">
      {note && <div className="mb-5 text-sm text-text-secondary">{note}</div>}
      <form onSubmit={(e) => { e.preventDefault(); submit() }} className="space-y-5" noValidate>
        {error && <Banner>{error}</Banner>}
        {fields.map((f) =>
          f.kind === "boolean" ? (
            <label key={f.key} className="flex cursor-pointer items-start justify-between gap-4">
              <span><span className="block text-sm font-medium text-text-primary">{f.label}</span>{f.hint && <span className="text-xs text-text-secondary">{f.hint}</span>}</span>
              <input type="checkbox" className="mt-1 h-5 w-5 accent-[var(--color-terracotta)]" checked={Boolean(draft[f.key])} onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.checked }))} />
            </label>
          ) : (
            <div key={f.key} className="flex items-end gap-2">
              <div className="flex-1">
                <Field label={f.label} hint={f.hint} inputMode={f.kind === "number" ? "decimal" : undefined} value={String(draft[f.key] ?? "")} onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))} />
              </div>
              {f.kind === "number" && f.suffix && <span className="pb-3 text-sm text-text-secondary">{f.suffix}</span>}
            </div>
          ),
        )}
        <Button type="submit" loading={mutation.isPending}>Lưu cấu hình</Button>
      </form>
    </Card>
  )
}
