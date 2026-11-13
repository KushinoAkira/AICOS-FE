import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { TimePicker24 } from "./TimePicker24"
import { addDays, todayKey } from "../lib/dates"
import { ordersApi } from "../lib/api/orders"
import { earliestPickup } from "../lib/earliestPickup"

/**
 * The pickup time of a takeaway order at one branch: today or tomorrow, a time inside opening hours, and a live check that the slot still
 * takes orders. Shared by the takeaway page and the "Đặt mang đi" option of the table QR menu. A new branch starts with no time chosen.
 */
export function usePickupSlot(branchId: string, enabled = true) {
  const [forBranch, setForBranch] = useState(branchId)
  const [day, setDay] = useState<"today" | "tomorrow">("today")
  const [time, setTime] = useState("")
  if (forBranch !== branchId) { setForBranch(branchId); setDay("today"); setTime("") }
  const on = enabled && !!branchId
  const info = useQuery({ queryKey: ["takeaway", "info", branchId], queryFn: () => ordersApi.pickupInfo(branchId), enabled: on })
  const slot = time ? new Date(`${addDays(todayKey(), day === "today" ? 0 : 1)}T${time}:00`).toISOString() : ""
  const check = useQuery({ queryKey: ["takeaway", "check", branchId, slot], queryFn: () => ordersApi.pickupCheck(branchId, slot), enabled: on && !!slot })
  /** Why the order cannot be placed yet, or null when the slot is fine. */
  const problem = !slot ? "Chọn giờ nhận hàng trước khi đặt" : check.data && !check.data.ok ? check.data.message : null

  function picker(legend: string, compact = false) {
    if (info.isError) return <p role="alert" className="text-sm text-state-danger">Chi nhánh này chưa nhận đơn mang đi: {info.error.message}</p>
    if (!info.data) return <p className="text-sm text-text-secondary">Đang tải giờ mở cửa…</p>
    const hours = info.data
    return (
      <fieldset className={compact ? "" : "mb-6"}>
        <legend className="mb-2 text-sm font-medium text-text-primary">{legend}</legend>
        <div className="flex flex-wrap items-center gap-3">
          <div role="radiogroup" aria-label="Ngày nhận" className="flex gap-2">
            {(["today", "tomorrow"] as const).map((d) => <button key={d} type="button" role="radio" aria-checked={day === d} onClick={() => setDay(d)} className={`rounded-full px-4 py-2 text-sm ${day === d ? "bg-espresso text-white" : compact ? "bg-surface text-text-secondary" : "bg-sand text-text-secondary"}`}>{d === "today" ? "Hôm nay" : "Ngày mai"}</button>)}
          </div>
          <TimePicker24 value={time} openHour={Number(hours.open.slice(0, 2))} closeHour={Number(hours.close.slice(0, 2))} onChange={setTime} />
          <button type="button" onClick={() => { const first = earliestPickup(new Date(), hours); setDay(first.day); setTime(first.time) }} className="rounded-full border border-border px-3 py-2 text-sm text-clay hover:bg-sand">Sớm nhất có thể</button>
          <span className="text-sm text-text-secondary">Quán mở {hours.open} - {hours.close}, đặt trước tối thiểu {hours.cutoffMinutes} phút</span>
        </div>
        {slot && check.data && <p role="status" className={`mt-2 text-sm ${check.data.ok ? "text-state-success" : "text-state-danger"}`}>{check.data.ok ? `Còn nhận được ${check.data.remaining} đơn quanh giờ này` : check.data.message}</p>}
      </fieldset>
    )
  }

  return { slot, problem, ready: !!info.data, loading: on && info.isPending, picker }
}
