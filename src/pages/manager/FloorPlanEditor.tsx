import { useCallback, useEffect, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { Page } from "../../App"
import { FloorPlanCanvas, type EditorTool } from "../../components/floor/FloorPlanCanvas"
import { PageFrame } from "../../components/PageFrame"
import { Banner, Button, ConfirmDialog, EmptyState, Field, LoadingState, QueryBoundary } from "../../components/ui"
import { useToast } from "../../context/ToastContext"
import { useActiveBranch } from "../../hooks/useActiveBranch"
import { ApiError } from "../../lib/api/http"
import {
  floorsApi,
  type DiningTableDto,
  type FloorDto,
  type FloorLayoutDto,
} from "../../lib/api/floors"
import {
  addPlaced,
  addTableElement,
  addWall,
  duplicateElement,
  nextTableCode,
  removeElement,
  resizeElement,
  rotateElement,
  tableShapeFromTool,
  updateElementLabel,
  type PlacedTool,
} from "../../lib/floorPlan/editorOps"
import { canRedo, canUndo, createHistory, pushHistory, redoHistory, undoHistory, type HistoryState } from "../../lib/floorPlan/history"
import type { FloorLayoutJson, LayoutElement } from "../../lib/floorPlan/schema"

const TOOLS: { id: EditorTool; label: string }[] = [
  { id: "select", label: "Chọn" },
  { id: "pan", label: "Xoay khung" },
  { id: "wall", label: "Tường" },
  { id: "door", label: "Cửa" },
  { id: "window", label: "Cửa sổ" },
  { id: "table-round", label: "Bàn tròn" },
  { id: "table-square", label: "Bàn vuông" },
  { id: "table-rect", label: "Bàn chữ nhật" },
  { id: "restroom", label: "WC" },
  { id: "stairs", label: "Cầu thang" },
  { id: "counter", label: "Quầy" },
  { id: "zone", label: "Khu vực" },
]

function emptyLayout(): FloorLayoutJson {
  return { unit: "grid", gridSize: 10, elements: [] }
}

export default function FloorPlanEditor({ navigate }: { navigate: (p: Page) => void }) {
  const { branchId, branch, needsSelection } = useActiveBranch()
  const qc = useQueryClient()
  const { showToast } = useToast()

  const floorsQ = useQuery({
    queryKey: ["floors", branchId],
    queryFn: () => floorsApi.list(branchId!),
    enabled: !!branchId,
  })

  const [floorId, setFloorId] = useState<string | null>(null)
  const floors = floorsQ.data ?? []
  const activeFloor: FloorDto | undefined = floors.find((f) => f.id === floorId) ?? floors[0]

  useEffect(() => {
    if (!floorId && floors[0]) setFloorId(floors[0].id)
    if (floorId && floors.length && !floors.some((f) => f.id === floorId)) setFloorId(floors[0]?.id ?? null)
  }, [floors, floorId])

  const layoutQ = useQuery({
    queryKey: ["floor-layout", activeFloor?.id, "draft"],
    queryFn: () => floorsApi.getLayout(activeFloor!.id, "Draft"),
    enabled: !!activeFloor?.id,
  })

  const tablesQ = useQuery({
    queryKey: ["floor-tables", activeFloor?.id],
    queryFn: () => floorsApi.listTables(activeFloor!.id),
    enabled: !!activeFloor?.id,
  })

  const [hist, setHist] = useState<HistoryState<FloorLayoutJson> | null>(null)
  const [version, setVersion] = useState(0)
  const [dirty, setDirty] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [tool, setTool] = useState<EditorTool>("select")
  const [draftWall, setDraftWall] = useState<[number, number][]>([])
  const [serverErrors, setServerErrors] = useState<string | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])
  const [confirm, setConfirm] = useState<
    | null
    | { kind: "delete-floor"; floor: FloorDto }
    | { kind: "delete-el" }
    | { kind: "qr"; table: DiningTableDto }
    | { kind: "leave"; nextFloorId: string }
  >(null)
  const [renameFloor, setRenameFloor] = useState<{ id: string; name: string } | null>(null)

  // Load draft into history when floor/layout arrives
  useEffect(() => {
    if (!layoutQ.data || !activeFloor) return
    setHist(createHistory(structuredClone(layoutQ.data.layout)))
    setVersion(layoutQ.data.version)
    setDirty(false)
    setSelectedId(null)
    setDraftWall([])
    setServerErrors(null)
    setWarnings(layoutQ.data.warnings ?? [])
  }, [layoutQ.data?.id, layoutQ.data?.version, activeFloor?.id])

  const layout = hist?.present ?? emptyLayout()
  const bounds = useMemo(
    () => ({
      widthUnits: activeFloor?.widthUnits ?? 400,
      heightUnits: activeFloor?.heightUnits ?? 280,
    }),
    [activeFloor],
  )

  const commit = useCallback((next: FloorLayoutJson) => {
    setHist((h) => (h ? pushHistory(h, next) : createHistory(next)))
    setDirty(true)
    setServerErrors(null)
  }, [])

  const selected: LayoutElement | undefined = layout.elements.find((e) => e.id === selectedId)
  const tables = tablesQ.data ?? []
  const selectedTable =
    selected?.type === "table" ? tables.find((t) => t.id === selected.tableId) : undefined

  const tableMeta = useMemo(() => {
    const m: Record<string, { code: string }> = {}
    for (const t of tables) m[t.id] = { code: t.code }
    return m
  }, [tables])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === "INPUT" || tag === "TEXTAREA") return
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault()
        setHist((h) => (h && canUndo(h) ? undoHistory(h) : h))
        setDirty(true)
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault()
        setHist((h) => (h && canRedo(h) ? redoHistory(h) : h))
        setDirty(true)
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedId) setConfirm({ kind: "delete-el" })
      }
      if (e.key === "Enter" && tool === "wall" && draftWall.length >= 2) {
        finishWall()
      }
      if (e.key === "Escape") {
        setDraftWall([])
        setTool("select")
        setSelectedId(null)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  })

  useEffect(() => {
    const onBefore = (e: BeforeUnloadEvent) => {
      if (!dirty) return
      e.preventDefault()
      e.returnValue = ""
    }
    window.addEventListener("beforeunload", onBefore)
    return () => window.removeEventListener("beforeunload", onBefore)
  }, [dirty])

  const finishWall = () => {
    if (draftWall.length < 2) {
      setDraftWall([])
      return
    }
    commit(addWall(layout, draftWall))
    setDraftWall([])
    setTool("select")
  }

  const onPlace = async (x: number, y: number) => {
    if (!activeFloor) return
    const shape = tableShapeFromTool(tool as PlacedTool)
    if (shape) {
      try {
        const code = nextTableCode(tables.map((t) => t.code))
        const created = await floorsApi.createTable(activeFloor.id, { code, seats: shape === "rect" ? 4 : 2 })
        await qc.invalidateQueries({ queryKey: ["floor-tables", activeFloor.id] })
        commit(addTableElement(layout, { tableId: created.id, seats: created.seats, shape }, x, y, bounds, layout.gridSize))
        setTool("select")
        showToast(`Đã thêm bàn ${created.code}`, "success")
      } catch (err) {
        showToast(err instanceof ApiError ? err.message : "Không thêm được bàn", "error")
      }
      return
    }
    if (tool === "door" || tool === "window" || tool === "restroom" || tool === "stairs" || tool === "counter" || tool === "zone") {
      commit(addPlaced(layout, tool, x, y, bounds, layout.gridSize))
      setTool("select")
    }
  }

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!activeFloor) throw new Error("no floor")
      return floorsApi.saveDraft(activeFloor.id, { expectedVersion: version, layout })
    },
    onSuccess: (row: FloorLayoutDto) => {
      setVersion(row.version)
      setDirty(false)
      setWarnings(row.warnings ?? [])
      setServerErrors(null)
      setHist(createHistory(structuredClone(row.layout)))
      showToast("Đã lưu nháp", "success")
      void qc.invalidateQueries({ queryKey: ["floor-layout", activeFloor?.id] })
    },
    onError: (err: unknown) => {
      if (err instanceof ApiError && err.status === 409) {
        setServerErrors("Sơ đồ đã được người khác cập nhật. Tải lại rồi thử lại.")
        return
      }
      if (err instanceof ApiError && err.status === 422) {
        const extra = err.fieldErrors
          ? Object.entries(err.fieldErrors)
              .map(([k, v]) => `${k}: ${v.join(", ")}`)
              .join("; ")
          : ""
        setServerErrors(extra || err.message)
        return
      }
      setServerErrors(err instanceof ApiError ? err.message : "Lưu nháp thất bại")
    },
  })

  const publishMut = useMutation({
    mutationFn: async () => {
      if (!activeFloor) throw new Error("no floor")
      if (dirty) {
        const saved = await floorsApi.saveDraft(activeFloor.id, { expectedVersion: version, layout })
        setVersion(saved.version)
        setDirty(false)
      }
      return floorsApi.publish(activeFloor.id)
    },
    onSuccess: (row) => {
      setWarnings(row.warnings ?? [])
      showToast("Đã công bố sơ đồ", "success")
      void qc.invalidateQueries({ queryKey: ["floor-layout", activeFloor?.id] })
    },
    onError: (err: unknown) => {
      setServerErrors(err instanceof ApiError ? err.message : "Công bố thất bại")
    },
  })

  const createFloorMut = useMutation({
    mutationFn: () =>
      floorsApi.create({
        name: `Tầng ${(floors.length || 0) + 1}`,
        level: (floors[floors.length - 1]?.level ?? 0) + 1,
      }),
    onSuccess: (f) => {
      void qc.invalidateQueries({ queryKey: ["floors", branchId] })
      setFloorId(f.id)
      showToast("Đã thêm tầng", "success")
    },
  })

  const switchFloor = (nextId: string) => {
    if (nextId === activeFloor?.id) return
    if (dirty) {
      setConfirm({ kind: "leave", nextFloorId: nextId })
      return
    }
    setFloorId(nextId)
  }

  const deleteSelected = async () => {
    if (!selected || !activeFloor) return
    if (selected.type === "table") {
      try {
        await floorsApi.removeTable(selected.tableId)
        await qc.invalidateQueries({ queryKey: ["floor-tables", activeFloor.id] })
      } catch (err) {
        showToast(err instanceof ApiError ? err.message : "Không xóa được bàn", "error")
        setConfirm(null)
        return
      }
    }
    commit(removeElement(layout, selected.id))
    setSelectedId(null)
    setConfirm(null)
  }

  if (needsSelection) {
    return (
      <PageFrame page="branch-floor-plan" navigate={navigate} uc="UC-25" title="Sơ đồ tầng" subtitle="Chọn chi nhánh để chỉnh sơ đồ.">
        <EmptyState title="Chưa chọn chi nhánh" description="Chọn chi nhánh trên thanh bên." />
      </PageFrame>
    )
  }

  return (
    <PageFrame
      page="branch-floor-plan"
      navigate={navigate}
      uc="UC-25"
      title="Sơ đồ tầng"
      subtitle={branch ? `${branch.name} — kéo thả bàn, lưu nháp rồi công bố.` : "Chỉnh sơ đồ mặt bằng chi nhánh."}
      action={
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" disabled={!hist || !canUndo(hist)} onClick={() => { setHist((h) => (h ? undoHistory(h) : h)); setDirty(true) }}>
            Hoàn tác
          </Button>
          <Button variant="secondary" disabled={!hist || !canRedo(hist)} onClick={() => { setHist((h) => (h ? redoHistory(h) : h)); setDirty(true) }}>
            Làm lại
          </Button>
          <Button variant="secondary" loading={saveMut.isPending} disabled={!dirty} onClick={() => saveMut.mutate()}>
            Lưu nháp{dirty ? " *" : ""}
          </Button>
          <Button loading={publishMut.isPending} onClick={() => publishMut.mutate()}>
            Công bố
          </Button>
        </div>
      }
    >
      {serverErrors && (
        <div className="mb-4">
          <Banner tone="danger">{serverErrors}</Banner>
        </div>
      )}
      {warnings.length > 0 && (
        <div className="mb-4">
          <Banner tone="warn">{warnings.join(" · ")}</Banner>
        </div>
      )}

      <div className="mb-3 flex flex-wrap items-center gap-2">
        {floors.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => switchFloor(f.id)}
            onDoubleClick={() => setRenameFloor({ id: f.id, name: f.name })}
            className={`rounded-[10px] px-3 py-1.5 text-sm ${
              f.id === activeFloor?.id ? "bg-terracotta text-bg-base" : "border border-border bg-surface text-text-primary"
            }`}
          >
            {f.name}
          </button>
        ))}
        <Button variant="ghost" onClick={() => createFloorMut.mutate()} loading={createFloorMut.isPending}>
          + Thêm tầng
        </Button>
        {activeFloor && (
          <>
            <Button
              variant="ghost"
              disabled={floors.findIndex((f) => f.id === activeFloor.id) <= 0}
              onClick={async () => {
                const i = floors.findIndex((f) => f.id === activeFloor.id)
                if (i <= 0) return
                const prev = floors[i - 1]
                await floorsApi.update(activeFloor.id, { sortOrder: prev.sortOrder })
                await floorsApi.update(prev.id, { sortOrder: activeFloor.sortOrder })
                await qc.invalidateQueries({ queryKey: ["floors", branchId] })
              }}
            >
              ←
            </Button>
            <Button
              variant="ghost"
              disabled={floors.findIndex((f) => f.id === activeFloor.id) >= floors.length - 1}
              onClick={async () => {
                const i = floors.findIndex((f) => f.id === activeFloor.id)
                if (i < 0 || i >= floors.length - 1) return
                const next = floors[i + 1]
                await floorsApi.update(activeFloor.id, { sortOrder: next.sortOrder })
                await floorsApi.update(next.id, { sortOrder: activeFloor.sortOrder })
                await qc.invalidateQueries({ queryKey: ["floors", branchId] })
              }}
            >
              →
            </Button>
            <Button
              variant="ghost"
              className="text-state-danger"
              onClick={() => setConfirm({ kind: "delete-floor", floor: activeFloor })}
            >
              Xóa tầng
            </Button>
          </>
        )}
      </div>

      <div className="mb-3 flex flex-wrap gap-1">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setTool(t.id)
              if (t.id !== "wall") setDraftWall([])
            }}
            className={`rounded-md px-2.5 py-1 text-xs ${
              tool === t.id ? "bg-espresso text-bg-base" : "border border-border bg-surface text-text-secondary"
            }`}
          >
            {t.label}
          </button>
        ))}
        {tool === "wall" && draftWall.length >= 2 && (
          <Button variant="secondary" className="!py-1 text-xs" onClick={finishWall}>
            Kết thúc tường
          </Button>
        )}
      </div>

      <QueryBoundary query={floorsQ}>
        {(floorRows) =>
          floorRows.length === 0 ? (
            <EmptyState
              title="Chưa có tầng"
              description="Thêm tầng đầu tiên để vẽ sơ đồ."
              action={
                <Button onClick={() => createFloorMut.mutate()} loading={createFloorMut.isPending}>
                  Thêm tầng
                </Button>
              }
            />
          ) : !activeFloor ? (
            <LoadingState />
          ) : layoutQ.isLoading ? (
            <LoadingState label="Đang tải sơ đồ…" />
          ) : layoutQ.isError ? (
            <Banner tone="danger">Không tải được sơ đồ. Thử lại sau.</Banner>
          ) : (
            <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
              <FloorPlanCanvas
                className="h-[min(70vh,640px)] min-h-[420px]"
                layout={layout}
                widthUnits={bounds.widthUnits}
                heightUnits={bounds.heightUnits}
                editable
                selectedId={selectedId}
                onSelect={setSelectedId}
                tool={tool}
                draftWall={draftWall}
                onDraftWallChange={setDraftWall}
                onFinishWall={finishWall}
                onPlace={(x, y) => void onPlace(x, y)}
                tableMeta={tableMeta}
                onLayoutChange={(next) => {
                  setHist((h) => (h ? { ...h, present: next, future: [] } : createHistory(next)))
                  setDirty(true)
                }}
              />
              <aside className="rounded-[16px] border border-border bg-surface p-4">
                <h2 className="font-serif text-lg text-text-primary">Thuộc tính</h2>
                {!selected && (
                  <p className="mt-2 text-sm text-text-secondary">
                    {layout.elements.length === 0
                      ? "Chưa có sơ đồ, hãy thêm bàn đầu tiên."
                      : "Chọn một phần tử trên sơ đồ để chỉnh."}
                  </p>
                )}
                {selected && selected.type !== "table" && selected.type !== "wall" && (
                  <div className="mt-3 space-y-3">
                    <Field
                      label="Nhãn"
                      value={selected.label ?? ""}
                      onChange={(e) => commit(updateElementLabel(layout, selected.id, e.target.value))}
                    />
                    <Field
                      label="Rộng"
                      type="number"
                      value={selected.w}
                      onChange={(e) =>
                        commit(
                          resizeElement(layout, selected.id, Number(e.target.value), selected.h ?? selected.w, bounds, layout.gridSize),
                        )
                      }
                    />
                    <Field
                      label="Cao"
                      type="number"
                      value={selected.h ?? selected.w}
                      onChange={(e) =>
                        commit(resizeElement(layout, selected.id, selected.w, Number(e.target.value), bounds, layout.gridSize))
                      }
                    />
                    <Field
                      label="Xoay (độ)"
                      type="number"
                      value={selected.rotation ?? 0}
                      onChange={(e) => commit(rotateElement(layout, selected.id, Number(e.target.value)))}
                    />
                  </div>
                )}
                {selected?.type === "table" && selectedTable && (
                  <div className="mt-3 space-y-3">
                    <Field
                      label="Mã bàn"
                      defaultValue={selectedTable.code}
                      key={selectedTable.id + selectedTable.code}
                      onBlur={async (e) => {
                        const code = e.target.value.trim()
                        if (!code || code === selectedTable.code) return
                        try {
                          await floorsApi.updateTable(selectedTable.id, { code })
                          await qc.invalidateQueries({ queryKey: ["floor-tables", activeFloor.id] })
                          showToast("Đã cập nhật mã bàn", "success")
                        } catch (err) {
                          showToast(err instanceof ApiError ? err.message : "Lỗi cập nhật", "error")
                        }
                      }}
                    />
                    <Field
                      label="Số chỗ"
                      type="number"
                      min={1}
                      max={20}
                      defaultValue={selectedTable.seats}
                      key={selectedTable.id + "-seats"}
                      onBlur={async (e) => {
                        const seats = Number(e.target.value)
                        if (!seats || seats === selectedTable.seats) return
                        try {
                          await floorsApi.updateTable(selectedTable.id, { seats })
                          await qc.invalidateQueries({ queryKey: ["floor-tables", activeFloor.id] })
                        } catch (err) {
                          showToast(err instanceof ApiError ? err.message : "Lỗi cập nhật", "error")
                        }
                      }}
                    />
                    <label className="flex items-center gap-2 text-sm text-text-secondary">
                      <input
                        type="checkbox"
                        checked={selectedTable.isActive}
                        onChange={async (e) => {
                          try {
                            await floorsApi.updateTable(selectedTable.id, { isActive: e.target.checked })
                            await qc.invalidateQueries({ queryKey: ["floor-tables", activeFloor.id] })
                          } catch (err) {
                            showToast(err instanceof ApiError ? err.message : "Lỗi cập nhật", "error")
                          }
                        }}
                      />
                      Đang hoạt động
                    </label>
                    <Button variant="secondary" className="w-full" onClick={() => setConfirm({ kind: "qr", table: selectedTable })}>
                      Tạo lại mã QR
                    </Button>
                    <p className="text-xs text-text-secondary">Mã QR cũ sẽ ngừng hoạt động sau khi tạo lại.</p>
                  </div>
                )}
                {selected?.type === "wall" && (
                  <p className="mt-2 text-sm text-text-secondary">Tường · {selected.points.length} điểm. Kéo để dịch chuyển.</p>
                )}
                {selected && (
                  <div className="mt-4 flex flex-col gap-2">
                    {selected.type !== "table" && (
                      <Button
                        variant="secondary"
                        onClick={() => {
                          const dup = duplicateElement(layout, selected.id, bounds, layout.gridSize)
                          if (!dup) return
                          commit(dup.layout)
                          setSelectedId(dup.newId)
                        }}
                      >
                        Nhân bản
                      </Button>
                    )}
                    <Button variant="danger" onClick={() => setConfirm({ kind: "delete-el" })}>
                      Xóa
                    </Button>
                  </div>
                )}
              </aside>
            </div>
          )
        }
      </QueryBoundary>

      <ConfirmDialog
        open={confirm?.kind === "delete-floor"}
        title="Xóa tầng?"
        message={`Xóa “${confirm?.kind === "delete-floor" ? confirm.floor.name : ""}” và toàn bộ sơ đồ của tầng này?`}
        confirmLabel="Xóa tầng"
        danger
        onCancel={() => setConfirm(null)}
        onConfirm={async () => {
          if (confirm?.kind !== "delete-floor") return
          try {
            await floorsApi.remove(confirm.floor.id)
            setConfirm(null)
            setDirty(false)
            await qc.invalidateQueries({ queryKey: ["floors", branchId] })
            showToast("Đã xóa tầng", "success")
          } catch (err) {
            showToast(err instanceof ApiError ? err.message : "Không xóa được tầng", "error")
            setConfirm(null)
          }
        }}
      />
      <ConfirmDialog
        open={confirm?.kind === "delete-el"}
        title="Xóa phần tử?"
        message={selected?.type === "table" ? "Xóa bàn khỏi sơ đồ và danh sách bàn của tầng?" : "Xóa phần tử khỏi sơ đồ?"}
        confirmLabel="Xóa"
        danger
        onCancel={() => setConfirm(null)}
        onConfirm={() => void deleteSelected()}
      />
      <ConfirmDialog
        open={confirm?.kind === "qr"}
        title="Tạo lại mã QR?"
        message="Mã QR cũ sẽ ngừng hoạt động. Khách quét mã cũ sẽ không vào được bàn này."
        confirmLabel="Tạo lại QR"
        onCancel={() => setConfirm(null)}
        onConfirm={async () => {
          if (confirm?.kind !== "qr") return
          try {
            await floorsApi.regenerateQr(confirm.table.id)
            await qc.invalidateQueries({ queryKey: ["floor-tables", activeFloor?.id] })
            showToast("Đã tạo mã QR mới", "success")
          } catch (err) {
            showToast(err instanceof ApiError ? err.message : "Không tạo lại được QR", "error")
          }
          setConfirm(null)
        }}
      />
      <ConfirmDialog
        open={confirm?.kind === "leave"}
        title="Chưa lưu nháp"
        message="Bạn có thay đổi chưa lưu. Đổi tầng sẽ mất các thay đổi chưa lưu trên tầng hiện tại."
        confirmLabel="Đổi tầng"
        danger
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          if (confirm?.kind !== "leave") return
          setDirty(false)
          setFloorId(confirm.nextFloorId)
          setConfirm(null)
        }}
      />

      {renameFloor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(58,46,34,0.45)] p-4">
          <div className="w-full max-w-sm rounded-[20px] bg-surface p-6 shadow-xl">
            <h2 className="font-serif text-xl">Đổi tên tầng</h2>
            <input
              className="mt-4 w-full rounded-[10px] border border-border px-3 py-2 text-sm"
              value={renameFloor.name}
              onChange={(e) => setRenameFloor({ ...renameFloor, name: e.target.value })}
              autoFocus
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setRenameFloor(null)}>
                Hủy
              </Button>
              <Button
                onClick={async () => {
                  try {
                    await floorsApi.update(renameFloor.id, { name: renameFloor.name })
                    await qc.invalidateQueries({ queryKey: ["floors", branchId] })
                    setRenameFloor(null)
                  } catch (err) {
                    showToast(err instanceof ApiError ? err.message : "Không đổi tên được", "error")
                  }
                }}
              >
                Lưu
              </Button>
            </div>
          </div>
        </div>
      )}
    </PageFrame>
  )
}
