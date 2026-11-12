import { useEffect, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { Page } from "../../App"
import { CustomerFrame } from "../../components/CustomerFrame"
import { OrderComposer } from "../../components/OrderComposer"
import { PayGateway } from "../../components/PayGateway"
import { Banner, ErrorState, LoadingState } from "../../components/ui"
import { useToast } from "../../context/ToastContext"
import { branchesApi } from "../../lib/api/identity"
import { customerApi } from "../../lib/api/customer"
import { env } from "../../config/env"
import { featureFlags } from "../../config/featureFlags"
import { formatVND } from "../../lib/format"
import { discountNote, orderErrorMessage } from "../../lib/promotionCode"
import { orderTitle, shortOrderCode } from "../../lib/orderLabel"
import { ordersApi, type LineInput, type Order, type PayOutcome } from "../../lib/api/orders"
import { usePickupSlot } from "../../components/PickupSlot"
import { currentBrandSlug } from "../../lib/brand"
import { defaultBranch, rememberBranch, rememberedBranch } from "../../lib/takeawayBranch"
import { BranchPicker } from "../../components/BranchPicker"
import { clearDraft, draftFor, draftToCart } from "../../lib/orderDraft"

/** Demo branch of the mock data, preselected there. With the real API the customer's last choice (or the first branch) is. */
const MOCK_BRANCH_ID = "00000000-0000-0000-0000-000000000b01"

/** Takeaway ordering with a pickup slot and online payment (UC-33..35). Prices are recomputed by the server. */
export default function CustomerTakeaway({ navigate }: { navigate: (p: Page) => void }) {
  const qc = useQueryClient()
  const { showToast } = useToast()
  const branches = useQuery({ queryKey: ["takeaway", "branches"], queryFn: () => branchesApi.listActive() })
  const brand = currentBrandSlug()
  // Drinks chosen on the public brand page before signing in come back here, at the branch picked there.
  const [draft] = useState(() => draftFor(brand))
  useEffect(() => { if (draft) clearDraft() }, [draft])
  const [chosen, setChosen] = useState<string | null>(() => draft?.branchId ?? null)
  const list = branches.data ?? []
  const branch = list.find((b) => b.id === chosen) ?? defaultBranch(list, rememberedBranch(brand), MOCK_BRANCH_ID)
  const BRANCH_ID = branch?.id ?? ""
  const menu = useQuery({ queryKey: ["takeaway", "menu", BRANCH_ID], queryFn: () => ordersApi.takeawayMenu(BRANCH_ID), enabled: !!BRANCH_ID })
  const restored = draft && draft.branchId === BRANCH_ID && menu.data ? draftToCart(draft.lines, menu.data.products) : null
  const picks = useQuery({ queryKey: ["recommendations", BRANCH_ID], queryFn: () => ordersApi.recommendations(BRANCH_ID), enabled: !!BRANCH_ID, retry: false })
  const pickup = usePickupSlot(BRANCH_ID)
  const slot = pickup.slot
  const [error, setError] = useState<string | null>(null)
  const [paying, setPaying] = useState<Order | null>(null)
  /** Menu, prices, opening hours and pickup slots all belong to the branch, so a new branch starts with an empty cart and no time. */
  function pickBranch(id: string) {
    if (id === BRANCH_ID) return
    setChosen(id)
    rememberBranch(brand, id)
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
      if (o.promotionCode) { void qc.invalidateQueries({ queryKey: ["customer", "vouchers"] }); showToast(`Đã giữ chỗ đơn ${orderTitle(o.lines)} (${shortOrderCode(o.code)}).${discountNote(o, formatVND)}`, "success") }
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
      {(branches.isPending || (!!BRANCH_ID && (menu.isPending || pickup.loading))) && <LoadingState />}
      {menu.isError && <ErrorState description={menu.error.message} onRetry={() => void menu.refetch()} />}
      {branch && <BranchPicker branches={list} value={BRANCH_ID} onChange={pickBranch} />}
      {menu.data && pickup.ready && (
        <>
          {pickup.picker(`Giờ nhận hàng · ${branch?.name || menu.data.branchName}`)}
          {restored && restored.dropped > 0 && <div className="mb-4"><Banner tone="warn">{restored.dropped} món bạn chọn trước đó đã hết hoặc không còn ở chi nhánh này nên chưa được thêm vào giỏ.</Banner></div>}
          <OrderComposer key={BRANCH_ID} initialCart={restored?.cart} products={menu.data.products} recommendations={picks.data} submitLabel="Đặt và thanh toán" submitting={place.isPending} error={pickup.problem ?? error} onSubmit={(l, code) => { if (pickup.problem) return setError(pickup.problem); setError(null); place.mutate({ lines: l, code }) }}
            voucher={env.useMock || featureFlags.voucherAtTakeaway ? { suggestions, hint: "Giảm giá được trừ khi đặt đơn, trước bước thanh toán." } : undefined} />
        </>
      )}
      <PayGateway open={!!paying} amount={paying?.total ?? 0} code={paying ? shortOrderCode(paying.code) : ""} busy={pay.isPending} onOutcome={(o) => pay.mutate(o)} onClose={() => { setPaying(null); navigate("customer-tracking") }} />
    </CustomerFrame>
  )
}

