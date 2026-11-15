import { useMutation, useQuery } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { useSearchParams } from "react-router"
import type { Page } from "../../App"
import { Button, Field } from "../../components/ui"
import { ApiError, http } from "../../lib/api/http"
import { formatVND } from "../../lib/format"

/** The payment the test page is paying (GET /payments/zalopay/test-page/{ref}). */
interface TestPayment { transactionRef: string; amount: number; status: string; description: string; expiresAtUtc: string | null; resultUrl: string | null }
interface PayAnswer { status: "paid" | "failed"; reason: string | null; resultUrl: string }
type Kind = "atm" | "credit"

/** ZaloPay's published test cards (docs.zalopay.vn, Test resources), the same list the server checks against. */
const ATM_CARDS: { number: string; label: string; tone: string }[] = [
  { number: "9704540000000062", label: "Hợp lệ", tone: "text-state-success" },
  { number: "9704540000000070", label: "Hợp lệ", tone: "text-state-success" },
  { number: "9704540000000013", label: "Thẻ bị mất", tone: "text-state-danger" },
  { number: "9704540000000047", label: "Hết tiền", tone: "text-state-danger" },
  { number: "9704540000000039", label: "Quá thời gian", tone: "text-state-danger" },
]

const ERRORS: Record<string, string> = {
  "zalopay_test.card_unknown": "Số thẻ không nằm trong danh sách thẻ thử của ZaloPay.",
  "zalopay_test.holder_wrong": "Tên chủ thẻ không đúng. Thẻ thử mang tên NGUYEN VAN A.",
  "zalopay_test.date_wrong": "Ngày trên thẻ không đúng (thẻ ATM: 10/18; thẻ quốc tế: 01/25).",
  "zalopay_test.cvv_wrong": "Mã CVV không đúng (thẻ thử: 123).",
  "payment.not_pending": "Giao dịch này đã kết thúc. Quay lại mục Đơn của bạn để thanh toán lại.",
  "payment.zalopay_test_page_off": "Trang thanh toán thử đang tắt (ZALOPAY_TEST_PAGE).",
}

const messageOf = (e: unknown) => e instanceof ApiError ? ERRORS[e.code ?? ""] ?? e.message : "Không kết nối được máy chủ. Thử lại sau."

/** 9704540000000062 -> "9704 5400 0000 0062" while typing. */
const groupDigits = (v: string) => v.replace(/\D/g, "").slice(0, 19).replace(/(\d{4})(?=\d)/g, "$1 ")
/** "1018" -> "10/18". */
const monthYear = (v: string) => { const d = v.replace(/\D/g, "").slice(0, 4); return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d }

/**
 * Test payment page for ZaloPay (only when the server runs with ZALOPAY_TEST_PAGE=true). ZaloPay's public sandbox apps accept every
 * test card, so this page stands in for ZaloPay's: the customer types one of ZaloPay's test cards and the server applies what that card
 * does (paid, lost, out of money, timeout), then the browser goes to the result page like after ZaloPay's real page.
 */
export default function ZaloPayTest({ navigate }: { navigate: (p: Page) => void }) {
  const [params] = useSearchParams()
  const ref = params.get("ref") ?? ""
  const [kind, setKind] = useState<Kind>("atm")
  const [card, setCard] = useState("")
  const [holder, setHolder] = useState("")
  const [date, setDate] = useState("")
  const [cvv, setCvv] = useState("")

  const payment = useQuery({
    queryKey: ["zalopay-test", ref],
    queryFn: () => http.get<TestPayment>(`/payments/zalopay/test-page/${encodeURIComponent(ref)}`),
    enabled: !!ref,
    retry: false,
  })
  // A payment that is already over goes straight to its result.
  useEffect(() => { if (payment.data?.resultUrl) window.location.replace(payment.data.resultUrl) }, [payment.data?.resultUrl])

  const pay = useMutation({
    mutationFn: (body: object) => http.post<PayAnswer>(`/payments/zalopay/test-page/${encodeURIComponent(ref)}/pay`, body),
    onSuccess: (a) => window.location.assign(a.resultUrl),
  })

  const switchKind = (k: Kind) => { setKind(k); setCard(""); setDate(""); setCvv(""); pay.reset() }
  const fill = (number: string) => { setCard(groupDigits(number)); setHolder("NGUYEN VAN A"); setDate(kind === "atm" ? "10/18" : "01/25"); if (kind === "credit") setCvv("123"); pay.reset() }
  const submit = () => pay.mutate({ kind, cardNumber: card, holder, date, cvv: kind === "credit" ? cvv : null })

  return (
    <div className="min-h-screen bg-[#F2F5FA] text-[#001F3E]">
      <header className="border-b border-[#DCE3EE] bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-4">
          <p className="whitespace-nowrap text-xl font-bold tracking-tight text-[#0068FF]">ZaloPay <span className="text-sm font-semibold text-[#00CF6A]">cổng thử</span></p>
          <span className="rounded-full bg-[#FFF4E5] px-3 py-1 text-right text-xs font-medium text-[#8A5A00]">Trang thử của AICOS<span className="hidden sm:inline">, không phải ZaloPay thật</span></span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        {!ref || payment.isError ? (
          <section className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <h1 className="text-lg font-semibold">Không mở được giao dịch</h1>
            <p className="mt-2 text-sm text-[#5B6B80]">{ref ? messageOf(payment.error) : "Đường dẫn thiếu mã giao dịch."}</p>
            <Button className="mt-6" onClick={() => navigate("customer-tracking")}>Đơn của bạn</Button>
          </section>
        ) : !payment.data || payment.data.resultUrl ? (
          <p className="py-16 text-center text-sm text-[#5B6B80]">Đang tải giao dịch…</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-[1fr_1.4fr]">
            <section className="rounded-2xl bg-white p-6 shadow-sm">
              <p className="text-sm text-[#5B6B80]">Số tiền thanh toán</p>
              <p className="mt-1 text-3xl font-bold text-[#0068FF]">{formatVND(payment.data.amount)}</p>
              <dl className="mt-6 space-y-3 text-sm">
                <div><dt className="text-[#5B6B80]">Mã giao dịch</dt><dd className="font-mono text-xs">{payment.data.transactionRef}</dd></div>
                <div><dt className="text-[#5B6B80]">Nội dung</dt><dd>{payment.data.description}</dd></div>
              </dl>
              <div className="mt-6 rounded-xl bg-[#F2F5FA] p-4 text-xs text-[#5B6B80]">
                <p className="font-semibold text-[#001F3E]">Thẻ thử của ZaloPay</p>
                <p className="mt-1">Bấm một thẻ để điền sẵn. Kết quả đi theo đúng loại thẻ.</p>
                <ul className="mt-3 space-y-1.5">
                  {kind === "atm"
                    ? ATM_CARDS.map((c) => (
                        <li key={c.number}>
                          <button type="button" onClick={() => fill(c.number)} className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-1 text-left hover:bg-white">
                            <span className="whitespace-nowrap font-mono">{groupDigits(c.number)}</span><span className={`whitespace-nowrap font-medium ${c.tone}`}>{c.label}</span>
                          </button>
                        </li>
                      ))
                    : (
                        <li>
                          <button type="button" onClick={() => fill("4111111111111111")} className="flex w-full justify-between rounded-lg px-2 py-1 text-left hover:bg-white">
                            <span className="font-mono">4111 1111 1111 1111</span><span className="font-medium text-state-success">Hợp lệ</span>
                          </button>
                        </li>
                      )}
                </ul>
                <p className="mt-3">Chủ thẻ NGUYEN VAN A · {kind === "atm" ? "phát hành 10/18" : "hết hạn 01/25 · CVV 123"}</p>
              </div>
            </section>

            <section className="rounded-2xl bg-white p-6 shadow-sm">
              <div role="tablist" className="grid grid-cols-2 gap-2 rounded-xl bg-[#F2F5FA] p-1">
                {(["atm", "credit"] as const).map((k) => (
                  <button key={k} role="tab" aria-selected={kind === k} type="button" onClick={() => switchKind(k)}
                    className={`rounded-lg py-2 text-sm font-medium ${kind === k ? "bg-white text-[#0068FF] shadow-sm" : "text-[#5B6B80]"}`}>
                    {k === "atm" ? "Thẻ ATM nội địa" : "Thẻ Visa / Master"}
                  </button>
                ))}
              </div>

              <form className="mt-6 space-y-4" onSubmit={(e) => { e.preventDefault(); submit() }}>
                <Field label="Số thẻ" inputMode="numeric" autoComplete="off" value={card} onChange={(e) => setCard(groupDigits(e.target.value))} placeholder={kind === "atm" ? "9704 5400 0000 0062" : "4111 1111 1111 1111"} />
                <Field label="Tên chủ thẻ" autoComplete="off" value={holder} onChange={(e) => setHolder(e.target.value.toUpperCase())} placeholder="NGUYEN VAN A" />
                <div className={kind === "credit" ? "grid grid-cols-2 gap-4" : ""}>
                  <Field label={kind === "atm" ? "Ngày phát hành (MM/YY)" : "Ngày hết hạn (MM/YY)"} inputMode="numeric" autoComplete="off" value={date} onChange={(e) => setDate(monthYear(e.target.value))} placeholder="MM/YY" />
                  {kind === "credit" && <Field label="CVV" inputMode="numeric" autoComplete="off" value={cvv} onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="123" />}
                </div>
                {pay.isError && <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-state-danger">{messageOf(pay.error)}</p>}
                <Button type="submit" loading={pay.isPending} disabled={!card || !holder || !date || (kind === "credit" && !cvv)} className="w-full !bg-[#0068FF] !py-3 hover:!bg-[#0052CC]">
                  Thanh toán {formatVND(payment.data.amount)}
                </Button>
                <button type="button" disabled={pay.isPending} onClick={() => pay.mutate({ cancel: true })} className="w-full py-2 text-sm text-[#5B6B80] hover:text-[#001F3E]">
                  Hủy giao dịch
                </button>
              </form>
            </section>
          </div>
        )}
      </main>
    </div>
  )
}
