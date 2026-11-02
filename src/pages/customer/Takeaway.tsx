import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { Page } from "../../App"
import { CustomerFrame } from "../../components/CustomerFrame"
import { TimePicker24 } from "../../components/TimePicker24"
import { OrderComposer } from "../../components/OrderComposer"
import { PayGateway } from "../../components/PayGateway"
import { ErrorState, LoadingState } from "../../components/ui"
import { useToast } from "../../context/ToastContext"
import { addDays, todayKey } from "../../lib/dates"
import { branchesApi } from "../../lib/api/identity"
import { ordersApi, type LineInput, type Order, type PayOutcome } from "../../lib/api/orders"
import { earliestPickup, type PickupHours } from "../../lib/earliestPickup"

/** Demo branch of the mock data; with the real API the first active branch of the brand is used. */
const MOCK_BRANCH_ID = "00000000-0000-0000-0000-000000000b01"

/** Takeaway ordering with a pickup slot and online payment (UC-33..35). Prices are recomputed by the server. */
export default function CustomerTakeaway({ navigate }: { navigate: (p: Page) => void }) {
  const qc = useQueryClient()
  const { showToast } = useToast()
  const branches = useQuery({ queryKey: ["takeaway", "branches"], queryFn: () => branchesApi.listActive() })
  const BRANCH_ID = branches.data?.find((b) => b.id === MOCK_BRANCH_ID)?.id ?? branches.data?.[0]?.id ?? ""
  const menu = useQuery({ queryKey: ["takeaway", "menu", BRANCH_ID], queryFn: () => ordersApi.takeawayMenu(BRANCH_ID), enabled: !!BRANCH_ID })
  const picks = useQuery({ queryKey: ["recommendations", BRANCH_ID], queryFn: () => ordersApi.recommendations(BRANCH_ID), enabled: !!BRANCH_ID, retry: false })
  const info = useQuery({ queryKey: ["takeaway", "info", BRANCH_ID], queryFn: () => ordersApi.pickupInfo(BRANCH_ID), enabled: !!BRANCH_ID })
  const [day, setDay] = useState<"today" | "tomorrow">("today")
  const [time, setTime] = useState("")
  const slot = time ? new Date(`${addDays(todayKey(), day === "today" ? 0 : 1)}T${time}:00`).toISOString() : ""
  function earliest(i: PickupHours) {
    const first = earliestPickup(new Date(), i)
    setDay(first.day)
    setTime(first.time)
  }
  const check = useQuery({ queryKey: ["takeaway", "check", BRANCH_ID, slot], queryFn: () => ordersApi.pickupCheck(BRANCH_ID, slot), enabled: !!slot && !!BRANCH_ID })
  const [error, setError] = useState<string | null>(null)
  const [paying, setPaying] = useState<Order | null>(null)

  const place = useMutation({
    mutationFn: (lines: LineInput[]) => ordersApi.placeTakeaway({ branchId: BRANCH_ID, slot, lines }),
    onSuccess: (o) => { setPaying(o); void qc.invalidateQueries({ queryKey: ["takeaway", "check"] }) },
    onError: (e) => { setError(e.message); void qc.invalidateQueries({ queryKey: ["takeaway", "check"] }) },
  })
  const pay = useMutation({
    mutationFn: (outcome: PayOutcome) => ordersApi.payOnline(paying!.id, outcome),
    onSuccess: (o) => {
      setPaying(null)
      void qc.invalidateQueries({ queryKey: ["mine"] })
      showToast(o.paymentStatus === "Paid" ? "Thanh toán thành công" : o.paymentStatus === "Failed" ? "Thanh toán thất bại. Bạn có thể thanh toán lại ở Đơn của tôi" : "Đang chờ xác nhận từ cổng thanh toán", o.paymentStatus === "Paid" ? "success" : "error")
      navigate("customer-tracking")
    },
    onError: (e) => showToast(e.message, "error"),
  })

  return (
    <CustomerFrame page="customer-menu" navigate={navigate} uc="UC-33" title="Đặt mang đi">
      {branches.isError && <ErrorState description={branches.error.message} onRetry={() => void branches.refetch()} />}
      {branches.data?.length === 0 && <ErrorState description="Thương hiệu chưa có chi nhánh nào nhận đơn mang đi." />}
      {(branches.isPending || (!!BRANCH_ID && (menu.isPending || info.isPending))) && <LoadingState />}
      {menu.isError && <ErrorState description={menu.error.message} onRetry={() => void menu.refetch()} />}
      {menu.data && info.data && (
        <>
          <fieldset className="mb-6">
            <legend className="mb-2 text-sm font-medium text-text-primary">Giờ nhận hàng · {menu.data.branchName}</legend>
            <div className="flex flex-wrap items-center gap-3">
              <div role="radiogroup" aria-label="Ngày nhận" className="flex gap-2">
                {(["today", "tomorrow"] as const).map((d) => <button key={d} role="radio" aria-checked={day === d} onClick={() => setDay(d)} className={`rounded-full px-4 py-2 text-sm ${day === d ? "bg-espresso text-white" : "bg-sand text-text-secondary"}`}>{d === "today" ? "Hôm nay" : "Ngày mai"}</button>)}
              </div>
              <TimePicker24 value={time} openHour={Number(info.data.open.slice(0, 2))} closeHour={Number(info.data.close.slice(0, 2))} onChange={setTime} />
              <button type="button" onClick={() => earliest(info.data)} className="rounded-full border border-border px-3 py-2 text-sm text-clay hover:bg-sand">Sớm nhất có thể</button>
              <span className="text-sm text-text-secondary">Quán mở {info.data.open} - {info.data.close}, đặt trước tối thiểu {info.data.cutoffMinutes} phút</span>
            </div>
            {slot && check.data && <p role="status" className={`mt-2 text-sm ${check.data.ok ? "text-state-success" : "text-state-danger"}`}>{check.data.ok ? `Còn nhận được ${check.data.remaining} đơn quanh giờ này` : check.data.message}</p>}
          </fieldset>          <OrderComposer products={menu.data.products} recommendations={picks.data} submitLabel="Đặt và thanh toán" submitting={place.isPending} error={!slot ? "Chọn giờ nhận hàng trước khi đặt" : check.data && !check.data.ok ? check.data.message : error} onSubmit={(l) => { if (!slot) return setError("Chọn giờ nhận hàng"); if (check.data && !check.data.ok) return; setError(null); place.mutate(l) }} />
        </>
      )}
      <PayGateway open={!!paying} amount={paying?.total ?? 0} code={paying?.code ?? ""} busy={pay.isPending} onOutcome={(o) => pay.mutate(o)} onClose={() => { setPaying(null); navigate("customer-tracking") }} />
    </CustomerFrame>
  )
}