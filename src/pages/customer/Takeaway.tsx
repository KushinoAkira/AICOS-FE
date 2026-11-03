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
import { customerApi } from "../../lib/api/customer"
import { env } from "../../config/env"
import { featureFlags } from "../../config/featureFlags"
import { formatVND } from "../../lib/format"
import { discountNote, orderErrorMessage } from "../../lib/promotionCode"
import { ordersApi, type LineInput, type Order, type PayOutcome } from "../../lib/api/orders"
import { earliestPickup, type PickupHours } from "../../lib/earliestPickup"
import { currentBrandSlug } from "../../lib/brand"
import { defaultBranch, hoursLabel, isOpenAt, rememberBranch, rememberedBranch, type BranchChoice } from "../../lib/takeawayBranch"

/** Demo branch of the mock data, preselected there. With the real API the customer's last choice (or the first branch) is. */
const MOCK_BRANCH_ID = "00000000-0000-0000-0000-000000000b01"

/** Takeaway ordering with a pickup slot and online payment (UC-33..35). Prices are recomputed by the server. */
export default function CustomerTakeaway({ navigate }: { navigate: (p: Page) => void }) {
  const qc = useQueryClient()
  const { showToast } = useToast()
  const branches = useQuery({ queryKey: ["takeaway", "branches"], queryFn: () => branchesApi.listActive() })
  const brand = currentBrandSlug()
  const [chosen, setChosen] = useState<string | null>(null)
  const list = branches.data ?? []
  const branch = list.find((b) => b.id === chosen) ?? defaultBranch(list, rememberedBranch(brand), MOCK_BRANCH_ID)
  const BRANCH_ID = branch?.id ?? ""
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
  /** Menu, prices, opening hours and pickup slots all belong to the branch, so a new branch starts with an empty cart and no time. */
  function pickBranch(id: string) {
    if (id === BRANCH_ID) return
    setChosen(id)
    rememberBranch(brand, id)
    setDay("today")
    setTime("")
    setError(null)
  }
  // The customer's own vouchers at this brand, offered as one-tap choices (the mock data has none).
  const myVouchers = useQuery({ queryKey: ["customer", "vouchers"], queryFn: customerApi.vouchers, enabled: !env.useMock && featureFlags.voucherAtTakeaway, retry: false })
  const suggestions = (myVouchers.data ?? []).filter((v) => v.usable).map((v) => ({ code: v.code, label: v.discountLabel, minOrderAmount: v.minOrderAmount }))

  const place = useMutation({
    mutationFn: ({ lines, code }: { lines: LineInput[]; code: string }) => ordersApi.placeTakeaway({ branchId: BRANCH_ID, slot, lines, promotionCode: code }),
    onSuccess: (o) => {
      setPaying(o)
      void qc.invalidateQueries({ queryKey: ["takeaway", "check"] })
      if (o.promotionCode) { void qc.invalidateQueries({ queryKey: ["customer", "vouchers"] }); showToast(`Đã giữ chỗ đơn ${o.code}.${discountNote(o, formatVND)}`, "success") }
    },
    onError: (e, v) => { setError(orderErrorMessage(e, v.code)); void qc.invalidateQueries({ queryKey: ["takeaway", "check"] }) },
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
      {branch && <BranchPicker branches={list} value={BRANCH_ID} onChange={pickBranch} />}
      {menu.data && info.data && (
        <>
          <fieldset className="mb-6">
            <legend className="mb-2 text-sm font-medium text-text-primary">Giờ nhận hàng · {branch?.name || menu.data.branchName}</legend>
            <div className="flex flex-wrap items-center gap-3">
              <div role="radiogroup" aria-label="Ngày nhận" className="flex gap-2">
                {(["today", "tomorrow"] as const).map((d) => <button key={d} role="radio" aria-checked={day === d} onClick={() => setDay(d)} className={`rounded-full px-4 py-2 text-sm ${day === d ? "bg-espresso text-white" : "bg-sand text-text-secondary"}`}>{d === "today" ? "Hôm nay" : "Ngày mai"}</button>)}
              </div>
              <TimePicker24 value={time} openHour={Number(info.data.open.slice(0, 2))} closeHour={Number(info.data.close.slice(0, 2))} onChange={setTime} />
              <button type="button" onClick={() => earliest(info.data)} className="rounded-full border border-border px-3 py-2 text-sm text-clay hover:bg-sand">Sớm nhất có thể</button>
              <span className="text-sm text-text-secondary">Quán mở {info.data.open} - {info.data.close}, đặt trước tối thiểu {info.data.cutoffMinutes} phút</span>
            </div>
            {slot && check.data && <p role="status" className={`mt-2 text-sm ${check.data.ok ? "text-state-success" : "text-state-danger"}`}>{check.data.ok ? `Còn nhận được ${check.data.remaining} đơn quanh giờ này` : check.data.message}</p>}
          </fieldset>
          <OrderComposer key={BRANCH_ID} products={menu.data.products} recommendations={picks.data} submitLabel="Đặt và thanh toán" submitting={place.isPending} error={!slot ? "Chọn giờ nhận hàng trước khi đặt" : check.data && !check.data.ok ? check.data.message : error} onSubmit={(l, code) => { if (!slot) return setError("Chọn giờ nhận hàng"); if (check.data && !check.data.ok) return; setError(null); place.mutate({ lines: l, code }) }}
            voucher={env.useMock || featureFlags.voucherAtTakeaway ? { suggestions, hint: "Giảm giá được trừ khi đặt đơn, trước bước thanh toán." } : undefined} />
        </>
      )}
      <PayGateway open={!!paying} amount={paying?.total ?? 0} code={paying?.code ?? ""} busy={pay.isPending} onOutcome={(o) => pay.mutate(o)} onClose={() => { setPaying(null); navigate("customer-tracking") }} />
    </CustomerFrame>
  )
}

/** Where the customer picks the order up. One branch: just says which. Several: one card each, with its hours and whether it is open now. */
export function BranchPicker({ branches, value, onChange }: { branches: BranchChoice[]; value: string; onChange: (id: string) => void }) {
  const now = new Date()
  const current = branches.find((b) => b.id === value)
  if (branches.length === 1 && current) {
    return <p className="mb-5 text-sm text-text-secondary">Nhận tại <b className="text-text-primary">{current.name}</b>{current.address ? ` · ${current.address}` : ""}</p>
  }
  return (
    <fieldset className="mb-6">
      <legend className="mb-1 text-sm font-medium text-text-primary">Chi nhánh nhận hàng</legend>
      <p className="mb-2 text-xs text-text-secondary">Thực đơn, giá và khung giờ theo từng chi nhánh. Đổi chi nhánh sẽ làm trống giỏ hàng.</p>
      <div role="radiogroup" aria-label="Chi nhánh nhận hàng" className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {branches.map((b) => {
          const selected = b.id === value
          const open = isOpenAt(b, now)
          const hours = hoursLabel(b)
          return (
            <button key={b.id} type="button" role="radio" aria-checked={selected} onClick={() => onChange(b.id)}
              className={`rounded-[14px] border p-3 text-left ${selected ? "border-espresso bg-sand/60 ring-1 ring-espresso" : "border-border bg-surface hover:border-clay"}`}>
              <span className="flex items-center justify-between gap-2">
                <span className="font-medium text-text-primary">{b.name}</span>
                {open !== null && <span className={`shrink-0 text-xs ${open ? "text-state-success" : "text-text-secondary"}`}>{open ? "Đang mở" : "Đã đóng cửa"}</span>}
              </span>
              {b.address && <span className="mt-0.5 block text-xs text-text-secondary">{b.address}</span>}
              {hours && <span className="mt-0.5 block text-xs text-text-secondary">Giờ mở cửa {hours}</span>}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
