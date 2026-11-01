import { useEffect, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { Page } from "../../App"
import { FloorPlanCanvas } from "../../components/floor/FloorPlanCanvas"
import { OrderStatusPill } from "../../components/OrderStatusPill"
import { PageFrame } from "../../components/PageFrame"
import { Banner, Button, EmptyState, Field, LoadingState, Modal, QueryBoundary, StatusPill } from "../../components/ui"
import { useAuth } from "../../context/AuthContext"
import { useToast } from "../../context/ToastContext"
import { useActiveBranch } from "../../hooks/useActiveBranch"
import { useFloorRealtime } from "../../hooks/useFloorRealtime"
import { floorsApi, type FloorDto } from "../../lib/api/floors"
import { ordersApi, type TableRow } from "../../lib/api/orders"
import { formatVND } from "../../lib/format"
import { liveStatusLabel, liveStatusOf } from "../../lib/floorPlan/liveStatus"

const billOf = (t: TableRow) =>
  t.orders
    .filter((o) => o.paymentStatus === "Unpaid" && o.status !== "Cancelled" && o.status !== "Unfulfillable")
    .reduce((s, o) => s + o.total, 0)
const isSettled = (t: TableRow) => t.orders.length > 0 && billOf(t) === 0
const stillMaking = (t: TableRow) => t.orders.some((o) => o.status === "Pending" || o.status === "Preparing")

/**
 * Read-only published floor plan with live table colors (Phase 3).
 * Cashier can open a table's bill; Barista / Brand Admin view only.
 */
export default function FloorPlanViewer({ navigate }: { navigate: (p: Page) => void }) {
  const { role } = useAuth()
  const { branchId, branch, needsSelection } = useActiveBranch()
  const qc = useQueryClient()
  const { showToast } = useToast()
  const canBill = role === "cashier"

  useFloorRealtime(branchId)

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
    queryKey: ["floor-layout", activeFloor?.id, "published"],
    queryFn: () => floorsApi.getLayout(activeFloor!.id, "Published"),
    enabled: !!activeFloor?.id,
  })

  const tablesQ = useQuery({
    queryKey: ["tables", branchId],
    queryFn: () => ordersApi.tables(),
    enabled: !!branchId,
    refetchInterval: 8_000,
  })

  const [selectedTableId, setSelectedTableId] = useState<string | null>(null)
  const [received, setReceived] = useState("")
  const [error, setError] = useState<string | null>(null)

  const tables = tablesQ.data ?? []
  const current = tables.find((t) => t.id === selectedTableId) ?? null

  const tableMeta = useMemo(() => {
    const m: Record<string, { code: string; status: ReturnType<typeof liveStatusOf> }> = {}
    for (const t of tables) {
      if (activeFloor && t.floorId && t.floorId !== activeFloor.id) continue
      if (activeFloor && !t.floorId && t.floor !== activeFloor.level) continue
      m[t.id] = { code: t.code, status: liveStatusOf(t) }
    }
    return m
  }, [tables, activeFloor])

  const pay = useMutation({
    mutationFn: (t: TableRow) => ordersApi.payTable(t.id, { method: "cash", received: Number(received) }),
    onSuccess: (r) => {
      void qc.invalidateQueries({ queryKey: ["tables"] })
      setSelectedTableId(null)
      setReceived("")
      showToast(r.change > 0 ? `Đã thanh toán. Thối lại ${formatVND(r.change)}` : "Đã thanh toán", "success")
    },
    onError: (e) => setError(e.message),
  })

  const complete = useMutation({
    mutationFn: (t: TableRow) => ordersApi.completeTable(t.id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["tables"] })
      void qc.invalidateQueries({ queryKey: ["orders"] })
      void qc.invalidateQueries({ queryKey: ["mine"] })
      setSelectedTableId(null)
      showToast("Đã hoàn thành bàn.", "success")
    },
    onError: (e) => setError(e.message),
  })

  const onSelectElement = (elId: string | null) => {
    if (!elId || !layoutQ.data) {
      setSelectedTableId(null)
      return
    }
    const el = layoutQ.data.layout.elements.find((e) => e.id === elId)
    if (!el || el.type !== "table") {
      setSelectedTableId(null)
      return
    }
    const row = tables.find((t) => t.id === el.tableId)
    if (!row || liveStatusOf(row) === "Free") {
      setSelectedTableId(null)
      return
    }
    if (!canBill) {
      setSelectedTableId(el.tableId)
      return
    }
    setSelectedTableId(el.tableId)
    setReceived("")
    setError(null)
  }

  if (needsSelection) {
    return (
      <PageFrame page="floor-plan-view" navigate={navigate} uc="UC-26" title="Sơ đồ tầng" subtitle="Chọn chi nhánh để xem sơ đồ đã công bố.">
        <EmptyState title="Chưa chọn chi nhánh" description="Chọn chi nhánh trên thanh bên." />
      </PageFrame>
    )
  }

  return (
    <PageFrame
      page="floor-plan-view"
      navigate={navigate}
      uc="UC-26"
      title="Sơ đồ tầng"
      subtitle={
        branch
          ? `${branch.name} — xem sơ đồ đã công bố${canBill ? ", bấm bàn để mở bill" : ""}.`
          : "Sơ đồ mặt bằng chi nhánh (chỉ xem)."
      }
    >
      <div className="mb-3 flex flex-wrap items-center gap-3 text-xs text-text-secondary">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm" style={{ background: "#E8DCC8" }} /> Trống
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm" style={{ background: "#E8B4A0" }} /> Đang phục vụ
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm" style={{ background: "#E8D48A" }} /> Chờ thanh toán
        </span>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        {floors.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFloorId(f.id)}
            className={`rounded-[10px] px-3 py-1.5 text-sm ${
              f.id === activeFloor?.id ? "bg-terracotta text-bg-base" : "border border-border bg-surface text-text-primary"
            }`}
          >
            {f.name}
          </button>
        ))}
      </div>

      <QueryBoundary query={floorsQ}>
        {(floorRows) =>
          floorRows.length === 0 ? (
            <EmptyState title="Chưa có tầng" description="Quản lý chi nhánh chưa tạo tầng / sơ đồ." />
          ) : !activeFloor ? (
            <LoadingState />
          ) : layoutQ.isLoading ? (
            <LoadingState label="Đang tải sơ đồ…" />
          ) : layoutQ.isError ? (
            <Banner tone="danger">Chưa có sơ đồ đã công bố cho tầng này.</Banner>
          ) : (
            <div className="grid gap-4 lg:grid-cols-[1fr_240px]">
              <FloorPlanCanvas
                className="h-[min(70vh,640px)] min-h-[420px]"
                layout={layoutQ.data!.layout}
                widthUnits={activeFloor.widthUnits}
                heightUnits={activeFloor.heightUnits}
                editable={false}
                tool="select"
                tableMeta={tableMeta}
                selectedId={
                  selectedTableId
                    ? (layoutQ.data!.layout.elements.find((e) => e.type === "table" && e.tableId === selectedTableId)?.id ?? null)
                    : null
                }
                onSelect={onSelectElement}
              />
              <aside className="rounded-[16px] border border-border bg-surface p-4">
                <h2 className="font-serif text-lg text-text-primary">Bàn trên tầng</h2>
                <ul className="mt-3 space-y-2 text-sm">
                  {Object.entries(tableMeta).length === 0 && (
                    <li className="text-text-secondary">Chưa có bàn trên sơ đồ này.</li>
                  )}
                  {Object.entries(tableMeta).map(([id, meta]) => (
                    <li key={id}>
                      <button
                        type="button"
                        className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left hover:bg-sand"
                        onClick={() => onSelectElement(
                          layoutQ.data!.layout.elements.find((e) => e.type === "table" && e.tableId === id)?.id ?? null,
                        )}
                      >
                        <span className="font-medium text-text-primary">{meta.code}</span>
                        <StatusPill tone={meta.status === "Free" ? "neutral" : meta.status === "WaitingPayment" ? "danger" : "pending"}>
                          {liveStatusLabel(meta.status)}
                        </StatusPill>
                      </button>
                    </li>
                  ))}
                </ul>
                {!canBill && (
                  <p className="mt-4 text-xs text-text-secondary">Chỉ thu ngân mới mở được bill từ sơ đồ.</p>
                )}
              </aside>
            </div>
          )
        }
      </QueryBoundary>

      <Modal
        open={canBill && !!current && liveStatusOf(current) !== "Free"}
        title={`Bill bàn ${current?.code ?? ""}`}
        onClose={() => setSelectedTableId(null)}
        footer={
          current && (
            <>
              <Button variant="secondary" onClick={() => setSelectedTableId(null)}>
                Đóng
              </Button>
              {isSettled(current) ? (
                <Button
                  loading={complete.isPending}
                  disabled={stillMaking(current)}
                  disabledReason="Còn món chưa pha xong"
                  onClick={() => complete.mutate(current)}
                >
                  Hoàn thành bàn
                </Button>
              ) : (
                <Button
                  loading={pay.isPending}
                  disabled={Number(received) < billOf(current)}
                  disabledReason="Số tiền nhận chưa đủ"
                  onClick={() => pay.mutate(current)}
                >
                  Xác nhận đã nhận tiền
                </Button>
              )}
            </>
          )
        }
      >
        {current && (
          <div className="space-y-4">
            {error && <Banner>{error}</Banner>}
            <ul className="divide-y divide-border text-sm">
              {current.orders.map((o) => (
                <li key={o.id} className="py-2">
                  <div className="flex items-center justify-between">
                    <b className="text-text-primary">{o.code}</b>
                    <OrderStatusPill status={o.status} />
                  </div>
                  {o.lines.map((l, i) => (
                    <p key={i} className="text-text-secondary">
                      {l.qty}× {l.name} ({l.size}) · {formatVND(l.unitPrice * l.qty)}
                    </p>
                  ))}
                </li>
              ))}
            </ul>
            {isSettled(current) ? (
              <Banner tone="success">Bàn đã thanh toán. Bấm hoàn thành để trả bàn.</Banner>
            ) : (
              <p className="flex justify-between font-serif text-lg text-text-primary">
                <span>Tổng</span>
                <span>{formatVND(billOf(current))}</span>
              </p>
            )}
            {!isSettled(current) && (
              <Field
                label="Khách đưa (₫)"
                inputMode="numeric"
                value={received}
                onChange={(e) => setReceived(e.target.value.replace(/\D/g, ""))}
                hint={
                  Number(received) >= billOf(current) && received
                    ? `Thối lại ${formatVND(Number(received) - billOf(current))}`
                    : "Nhập số tiền mặt nhận được"
                }
              />
            )}
          </div>
        )}
      </Modal>
    </PageFrame>
  )
}
