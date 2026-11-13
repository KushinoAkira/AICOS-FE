import { useQuery } from "@tanstack/react-query"
import { useSearchParams } from "react-router"
import type { Page } from "../../App"
import { PublicPage } from "../../components/PublicChrome"
import { Button } from "../../components/ui"
import { useAuth } from "../../context/AuthContext"
import { ordersApi } from "../../lib/api/orders"

type State = "paid" | "pending" | "failed" | "invalid"
const STATE_OF: Record<string, State> = { Paid: "paid", Pending: "pending", Failed: "failed" }
const TEXT: Record<State, { title: string; body: string; tone: string; mark: string }> = {
  paid: { title: "Thanh toán thành công", body: "Quán đã nhận tiền và đang chuẩn bị đơn của bạn.", tone: "bg-success-bg text-state-success", mark: "✓" },
  pending: { title: "Đang chờ xác nhận thanh toán", body: "Cổng thanh toán chưa báo kết quả. Nếu bạn đã chuyển tiền, đơn sẽ tự cập nhật sau ít phút.", tone: "bg-pending-bg text-[#8A5A2B]", mark: "…" },
  failed: { title: "Chưa thanh toán được", body: "Giao dịch đã hủy hoặc không thành công. Bạn chưa bị trừ tiền cho lần này và có thể thanh toán lại trong mục Đơn của bạn.", tone: "bg-danger-bg text-state-danger", mark: "!" },
  invalid: { title: "Không tìm thấy giao dịch", body: "Đường dẫn trả về không hợp lệ hoặc đã hết hạn. Kiểm tra lại đơn trong mục Đơn của bạn.", tone: "bg-danger-bg text-state-danger", mark: "?" },
}

/**
 * Where a gateway with its own payment page (payOS) sends the customer back. The query string is not signed, so it is only a hint:
 * a signed-in customer's payment is asked again from the server (`POST /payments/transactions/{id}/query`), and the order list stays the truth.
 */
export default function PayResult({ navigate }: { navigate: (p: Page) => void }) {
  const [params] = useSearchParams()
  const { isAuthenticated } = useAuth()
  const paymentId = params.get("paymentId") ?? ""
  const hinted: State = (["paid", "pending", "failed"] as const).find((s) => s === params.get("status")) ?? "invalid"
  const check = useQuery({
    queryKey: ["payment-state", paymentId],
    queryFn: () => ordersApi.paymentState(paymentId),
    enabled: isAuthenticated && !!paymentId && hinted !== "invalid",
    refetchInterval: (q) => (q.state.data === "Pending" ? 5000 : false),
    retry: false,
  })
  const state: State = check.data ? STATE_OF[check.data] ?? hinted : hinted
  const t = TEXT[state]
  const reason = state === "failed" ? params.get("reason") : null

  return (
    <PublicPage navigate={navigate} uc="UC-PAY">
      <section className="mx-auto flex max-w-lg flex-col items-center px-4 py-16 text-center sm:py-24" aria-live="polite">
        <span aria-hidden className={`grid h-16 w-16 place-items-center rounded-full font-serif text-3xl ${t.tone}`}>{t.mark}</span>
        <h1 className="mt-6 font-serif text-3xl text-text-primary">{t.title}</h1>
        <p className="mt-3 text-text-secondary">{t.body}</p>
        {reason && <p className="mt-2 text-sm text-text-secondary">Lý do từ cổng thanh toán: {reason}</p>}
        {check.isFetching && <p className="mt-2 text-sm text-text-secondary">Đang kiểm tra lại với cổng thanh toán…</p>}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {isAuthenticated
            ? <Button onClick={() => navigate("customer-tracking")}>Đơn của bạn</Button>
            : <Button onClick={() => navigate("auth-customer-login")}>Đăng nhập để xem đơn</Button>}
          {state === "pending" && isAuthenticated && <Button variant="secondary" loading={check.isFetching} onClick={() => void check.refetch()}>Kiểm tra lại</Button>}
          <Button variant="secondary" onClick={() => navigate("landing")}>Về trang chủ</Button>
        </div>
      </section>
    </PublicPage>
  )
}
