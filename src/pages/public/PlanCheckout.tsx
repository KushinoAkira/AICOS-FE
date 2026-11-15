import { useState } from "react"
import { Banner, Button, Modal } from "../../components/ui"
import { formatVND } from "../../lib/format"
import type { Plan } from "../../lib/api/platform"

const METHODS = [
  { id: "vietqr", label: "Chuyển khoản VietQR", hint: "Quét mã bằng app ngân hàng" },
  { id: "card", label: "Thẻ ATM / Visa", hint: "Nhập thẻ trên cổng thanh toán" },
  { id: "momo", label: "Ví MoMo", hint: "Mở app MoMo để xác nhận" },
] as const

/** A payment reference like the one a gateway would hand back. */
const newReference = () => `SIM-${Math.random().toString(36).slice(2, 8).toUpperCase()}${Date.now().toString().slice(-4)}`

/**
 * Simulated checkout of a plan on the pricing page: no money moves. On success the visitor goes on to register the brand with the plan and
 * the payment reference; the brand opens once the platform team approves it and records the payment.
 */
export function PlanCheckout({ plan, onClose, onPaid }: { plan: Plan | null; onClose: () => void; onPaid: (plan: Plan, reference: string) => void }) {
  const [method, setMethod] = useState<(typeof METHODS)[number]["id"]>("vietqr")
  const [step, setStep] = useState<"choose" | "paying" | "failed">("choose")
  const [reference, setReference] = useState(newReference)
  const close = () => { setStep("choose"); setReference(newReference()); onClose() }

  return (
    <Modal open={!!plan} title={step === "paying" ? "Cổng thanh toán (giả lập)" : `Thanh toán ${plan?.name ?? ""}`} onClose={close}
      footer={step === "choose"
        ? <><Button variant="secondary" onClick={close}>Hủy</Button><Button onClick={() => setStep("paying")}>Thanh toán {formatVND(plan?.monthlyFee ?? 0)}</Button></>
        : step === "paying"
          ? <><Button variant="secondary" onClick={() => setStep("failed")}>Giao dịch thất bại</Button><Button onClick={() => plan && onPaid(plan, reference)}>Thanh toán thành công</Button></>
          : <><Button variant="secondary" onClick={close}>Để sau</Button><Button onClick={() => { setReference(newReference()); setStep("paying") }}>Thử lại</Button></>}>
      {plan && (
        <div className="space-y-4 text-sm">
          <div className="rounded-[12px] border border-border bg-bg-base p-4">
            <div className="flex items-baseline justify-between gap-3"><span className="font-medium text-text-primary">{plan.name}</span><span className="font-serif text-xl">{formatVND(plan.monthlyFee)}<span className="text-xs text-text-secondary"> / tháng</span></span></div>
            <p className="mt-1 text-text-secondary">Tối đa {plan.maxBranches} chi nhánh, {plan.maxUsers} tài khoản nhân viên. Thanh toán tháng đầu, gia hạn hằng tháng.</p>
          </div>
          {step === "choose" && (
            <fieldset>
              <legend className="mb-2 font-medium text-text-primary">Hình thức thanh toán</legend>
              <div className="space-y-2">
                {METHODS.map((m) => (
                  <label key={m.id} className={`flex cursor-pointer items-center gap-3 rounded-[12px] border p-3 ${method === m.id ? "border-terracotta bg-sand" : "border-border"}`}>
                    <input type="radio" name="pay-method" checked={method === m.id} onChange={() => setMethod(m.id)} />
                    <span><span className="block font-medium text-text-primary">{m.label}</span><span className="text-xs text-text-secondary">{m.hint}</span></span>
                  </label>
                ))}
              </div>
              <p className="mt-3 text-xs text-text-secondary">Đây là thanh toán mô phỏng cho bản demo, không trừ tiền thật.</p>
            </fieldset>
          )}
          {step === "paying" && (
            <div className="space-y-2 text-center">
              <p className="text-text-secondary">{METHODS.find((m) => m.id === method)?.label} · Mã giao dịch <b className="text-text-primary">{reference}</b></p>
              <div aria-hidden className="mx-auto grid h-36 w-36 grid-cols-6 gap-1 rounded-[12px] border border-border bg-white p-3">
                {Array.from({ length: 36 }, (_, i) => <span key={i} className={(i * 7 + reference.length) % 3 === 0 ? "bg-espresso" : "bg-transparent"} />)}
              </div>
              <p className="text-xs text-text-secondary">Bản demo: chọn kết quả của giao dịch ở dưới.</p>
            </div>
          )}
          {step === "failed" && <Banner>Giao dịch không thành công, bạn chưa bị trừ tiền. Thử lại hoặc chọn hình thức khác.</Banner>}
        </div>
      )}
    </Modal>
  )
}
