import { useCallback, useEffect, useRef, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { Page } from "../../App"
import { Logo } from "../../components/AuthShell"
import { BranchPicker } from "../../components/BranchPicker"
import { CounterDigitalPay } from "../../components/CounterDigitalPay"
import { OrderComposer, type MenuItem } from "../../components/OrderComposer"
import { Banner, Button, ErrorState, LoadingState } from "../../components/ui"
import { homePageOf, useAuth } from "../../context/AuthContext"
import { brandApi } from "../../lib/api/brand"
import { kioskApi, type KioskMember } from "../../lib/api/kiosk"
import { ordersApi, type LineInput, type Order } from "../../lib/api/orders"
import { formatVND } from "../../lib/format"
import { KIOSK_DONE_MS, KIOSK_IDLE_MS, greetingName, kioskBranches, maskContact, readContact, rememberKioskBranch, rememberedKioskBranch, type Contact } from "../../lib/kiosk"
import { draftToCart } from "../../lib/orderDraft"
import { orderErrorMessage } from "../../lib/promotionCode"

type Stage = "welcome" | "branch" | "menu" | "member" | "done"
interface Picked { lines: LineInput[]; code: string }

/**
 * Self-order kiosk at the counter: customers and walk-in guests first choose the branch, then their drinks for here; members add their
 * phone or email to earn points, then pay at the cashier or by QR right on the kiosk. A cashier or manager account orders for its own
 * branch only; a brand admin account can order for any branch of the brand. The tablet stays signed in; after a
 * while without a touch it goes back to the welcome screen and forgets the cart. Hold the logo for 2 seconds to leave the kiosk.
 */
export default function Kiosk({ navigate }: { navigate: (p: Page) => void }) {
  const { user, role } = useAuth()
  const qc = useQueryClient()
  const branchList = useQuery({ queryKey: ["kiosk", "branches"], queryFn: kioskApi.branches })
  const allowed = kioskBranches(branchList.data ?? [], { role, branchId: user?.branchId })
  const [chosen, setChosen] = useState<string>(() => rememberedKioskBranch() ?? "")
  const branch = allowed.find((b) => b.id === chosen) ?? (allowed.length === 1 ? allowed[0] : undefined)
  const branchId = branch?.id ?? ""
  const products = useQuery({ queryKey: ["brand", "products"], queryFn: brandApi.products, refetchInterval: 30000 })
  const items: MenuItem[] = (products.data ?? []).filter((p) => p.published).map((p) => ({ ...p, price: p.branchPrices[branchId] ?? p.basePrice, soldOut: p.soldOutAt.includes(branchId) }))

  const [stage, setStage] = useState<Stage>("welcome")
  const [round, setRound] = useState(0)
  const [picked, setPicked] = useState<Picked | null>(null)
  const [contactText, setContactText] = useState("")
  const [contact, setContact] = useState<Contact | null>(null)
  const [member, setMember] = useState<KioskMember | null>(null)
  const [placed, setPlaced] = useState<Order | null>(null)
  const [paying, setPaying] = useState(false)
  const [paid, setPaid] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const find = useMutation({
    mutationFn: (c: Contact) => kioskApi.findMember(c),
    onSuccess: (m, c) => { setMember(m); setContact(c) },
  })
  const place = useMutation({
    mutationFn: (p: Picked & { memberId?: string }) => ordersApi.placeKiosk(p.lines, { branchId, memberId: p.memberId, promotionCode: p.code }),
    onSuccess: (o) => { setPlaced(o); setStage("done"); setError(null); void qc.invalidateQueries({ queryKey: ["kiosk", "queue"] }) },
    onError: (e, p) => setError(orderErrorMessage(e, p.code)),
  })

  const reset = useCallback(() => {
    setStage("welcome"); setRound((n) => n + 1); setPicked(null); setContactText(""); setContact(null); setMember(null)
    setPlaced(null); setPaying(false); setPaid(false); setError(null); find.reset(); place.reset()
  }, [find.reset, place.reset])

  // Back to the start after a while without a touch, so the next person never sees the last cart or member.
  const lastTouch = useRef(Date.now())
  useEffect(() => {
    const touch = () => { lastTouch.current = Date.now() }
    window.addEventListener("pointerdown", touch)
    window.addEventListener("keydown", touch)
    const timer = window.setInterval(() => {
      const idle = Date.now() - lastTouch.current
      if (stage === "done" && !paying && idle > KIOSK_DONE_MS) reset()
      else if ((stage === "branch" || stage === "menu" || stage === "member") && idle > KIOSK_IDLE_MS) reset()
    }, 5000)
    return () => { window.removeEventListener("pointerdown", touch); window.removeEventListener("keydown", touch); window.clearInterval(timer) }
  }, [stage, paying, reset])

  // Staff only: hold the logo for 2 seconds to leave the kiosk.
  const hold = useRef<number | null>(null)
  const startHold = () => { hold.current = window.setTimeout(() => { if (user) navigate(homePageOf(user)) }, 2000) }
  const endHold = () => { if (hold.current) window.clearTimeout(hold.current); hold.current = null }

  const estimate = picked ? draftToCart(picked.lines, items).cart.reduce((s, l) => s + l.unit * l.qty, 0) : 0
  const count = picked ? picked.lines.reduce((n, l) => n + l.qty, 0) : 0
  const lookUp = () => {
    const c = readContact(contactText)
    if (!c) { setError("Số điện thoại hoặc email chưa đúng. Ví dụ: 0901234567"); return }
    setError(null)
    find.mutate(c)
  }
  const confirm = (withMember: boolean) => { if (picked) place.mutate({ ...picked, memberId: withMember ? member?.id : undefined }) }

  const pickBranch = (id: string) => {
    setChosen(id)
    rememberKioskBranch(id)
  }

  if (branchList.isSuccess && allowed.length === 0) {
    const noBranch = role !== "brandAdmin" && !user?.branchId
    return (
      <Shell onHoldStart={startHold} onHoldEnd={endHold}>
        <ErrorState
          title={noBranch ? "Tài khoản này chưa gắn chi nhánh" : "Chưa có chi nhánh nào đang mở bán"}
          description={noBranch ? "Đăng nhập kiosk bằng tài khoản thu ngân hoặc quản lý của một chi nhánh, hoặc tài khoản chủ thương hiệu." : "Chi nhánh của tài khoản này đang tạm ngưng. Kiểm tra ở mục Chi nhánh."}
        />
      </Shell>
    )
  }

  return (
    <Shell onHoldStart={startHold} onHoldEnd={endHold} step={stage === "welcome" ? null : stage === "branch" ? 1 : stage === "menu" ? 2 : stage === "member" ? 3 : 4} onCancel={stage === "branch" || stage === "menu" || stage === "member" ? reset : undefined}>
      {stage === "welcome" && (
        <section data-testid="kiosk-welcome" className="flex min-h-[70vh] flex-col items-center justify-center gap-6 text-center">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-text-secondary">Uống tại quán</p>
          <h1 className="max-w-xl font-serif text-4xl text-text-primary sm:text-5xl">Tự gọi món, nhận đồ uống tại quầy</h1>
          <p className="max-w-md text-text-secondary">Chọn chi nhánh và món, nhập số điện thoại nếu bạn là thành viên để tích điểm, rồi thanh toán ở quầy hoặc quét mã QR.</p>
          <Button className="min-h-14 px-10 text-lg" onClick={() => { lastTouch.current = Date.now(); setStage("branch") }}>Bắt đầu gọi món</Button>
        </section>
      )}

      {stage === "branch" && (
        <section data-testid="kiosk-branch" className="mx-auto grid max-w-4xl gap-4">
          <div>
            <h1 className="font-serif text-3xl text-text-primary">Bạn đang ở chi nhánh nào?</h1>
            <p className="mt-1 text-text-secondary">Đồ uống được pha và giao tại chi nhánh này. Giá và món còn bán có thể khác nhau giữa các chi nhánh.</p>
          </div>
          {branchList.isPending ? <LoadingState /> : branchList.isError ? <ErrorState description={branchList.error.message} onRetry={() => void branchList.refetch()} /> : (
            <BranchPicker branches={allowed} value={branchId} onChange={pickBranch} label="Chi nhánh" hint={allowed.length === 1 ? "Kiosk này đặt món cho chi nhánh của tài khoản đang đăng nhập." : ""} alwaysCards />
          )}
          <div className="flex flex-wrap gap-3">
            <Button className="min-h-12 flex-1 text-base sm:flex-none sm:px-10" disabled={!branchId} disabledReason="Chọn một chi nhánh" onClick={() => setStage("menu")}>
              {branch ? `Gọi món tại ${branch.name}` : "Chọn chi nhánh"}
            </Button>
          </div>
        </section>
      )}

      {/* Kept mounted while the member step is open, so "Sửa món" comes back to the same cart. */}
      <div hidden={stage !== "menu"}>
        {branch && (
          <p className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-text-secondary">
            <span>Chi nhánh <b data-testid="kiosk-branch-name" className="text-text-primary">{branch.name}</b></span>
            {allowed.length > 1 && <button type="button" onClick={() => setStage("branch")} className="text-clay underline">Đổi chi nhánh</button>}
          </p>
        )}
        {products.isPending ? <LoadingState /> : products.isError ? <ErrorState description={products.error.message} onRetry={() => void products.refetch()} /> : (
          <OrderComposer
            key={branchId} /* another branch: other prices and sold-out drinks, so the cart starts empty */
            clearSignal={round}
            products={items}
            submitLabel="Tiếp tục"
            submitting={false}
            error={null}
            onSubmit={(lines, code) => { setPicked({ lines, code }); setError(null); setStage("member") }}
            voucher={{ preview: (code, amount) => ordersApi.previewVoucher(code, amount, branchId) }}
          />
        )}
      </div>

      {stage === "member" && picked && (
        <section data-testid="kiosk-member" className="mx-auto grid max-w-xl gap-6">
          <div>
            <h1 className="font-serif text-3xl text-text-primary">Bạn là thành viên?</h1>
            <p className="mt-1 text-text-secondary">Nhập số điện thoại hoặc email đã đăng ký để đơn này được tích điểm. Không phải thành viên thì bấm “Đặt món không tích điểm”.</p>
          </div>

          <div className="rounded-[16px] border border-border bg-surface p-5">
            <p className="flex justify-between text-text-secondary"><span>{count} món</span><span data-testid="kiosk-estimate">Tạm tính {formatVND(estimate)}</span></p>
            {picked.code && <p className="mt-1 text-sm text-state-success">Mã giảm giá {picked.code} sẽ được trừ khi đặt món.</p>}
          </div>

          {member && contact ? (
            <div data-testid="kiosk-member-found" className="rounded-[16px] border border-state-success/40 bg-state-success/10 p-5">
              <p className="font-serif text-2xl text-text-primary">Chào {greetingName(member.fullName)}!</p>
              <p className="text-sm text-text-secondary">{maskContact(contact)} · {member.points} điểm hiện có</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button className="min-h-12 flex-1 text-base" loading={place.isPending} onClick={() => confirm(true)}>Đặt món và tích điểm</Button>
                <Button variant="secondary" className="min-h-12" onClick={() => { setMember(null); setContact(null); setContactText(""); find.reset() }}>Không phải tôi</Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-3">
              <label htmlFor="kiosk-contact" className="text-sm font-medium text-text-primary">Số điện thoại hoặc email</label>
              <div className="flex flex-wrap gap-3">
                <input
                  id="kiosk-contact" value={contactText} autoComplete="off" inputMode="text" placeholder="0901234567"
                  onChange={(e) => { setContactText(e.target.value); if (find.isSuccess) find.reset() }}
                  onKeyDown={(e) => { if (e.key === "Enter") lookUp() }}
                  className="min-h-12 min-w-0 flex-1 rounded-[12px] border border-border bg-surface px-4 text-lg"
                />
                <Button variant="secondary" className="min-h-12 px-6" loading={find.isPending} onClick={lookUp}>Tìm</Button>
              </div>
              {find.isSuccess && !find.data && <Banner tone="warn">Chưa tìm thấy thành viên với thông tin này. Kiểm tra lại, hoặc đặt món không tích điểm.</Banner>}
              {find.isError && <Banner>{find.error?.message}</Banner>}
            </div>
          )}

          {error && <Banner>{error}</Banner>}
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" className="min-h-12" onClick={() => setStage("menu")}>Sửa món</Button>
            <Button data-testid="kiosk-guest" variant={member ? "secondary" : "primary"} className="min-h-12 flex-1 text-base" loading={place.isPending && !place.variables?.memberId} onClick={() => confirm(false)}>Đặt món không tích điểm</Button>
          </div>
        </section>
      )}

      {stage === "done" && placed && (
        <section data-testid="kiosk-done" className="mx-auto grid max-w-xl justify-items-center gap-5 text-center">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-text-secondary">Mã đơn của bạn</p>
          <p data-testid="kiosk-code" className="font-serif text-6xl text-text-primary">{placed.code}</p>
          {branch && <p className="text-text-secondary">Nhận đồ uống tại quầy <b className="text-text-primary">{branch.name}</b></p>}
          {!!placed.discountAmount && <p className="text-state-success">Đã giảm {formatVND(placed.discountAmount)} (mã {placed.promotionCode})</p>}
          <p className="text-2xl text-text-primary">Tổng cần trả <b data-testid="kiosk-total">{formatVND(placed.total)}</b></p>
          {paid ? (
            <Banner tone="success">Đã thanh toán. Quầy pha chế đang làm đồ uống, mời bạn chờ gọi mã {placed.code}.</Banner>
          ) : (
            <>
              <p className="max-w-md text-text-secondary">Đọc mã đơn cho thu ngân để trả tiền mặt hoặc thẻ, hoặc quét mã QR chuyển khoản ngay tại đây.{member && placed.customerId ? ` Đơn sẽ được tích điểm cho ${greetingName(member.fullName)}.` : ""}</p>
              <Button variant="secondary" className="min-h-12 px-8" onClick={() => setPaying(true)}>Thanh toán bằng QR</Button>
            </>
          )}
          <Button className="min-h-12 px-10" onClick={reset}>Xong</Button>
        </section>
      )}

      <CounterDigitalPay
        open={paying && !!placed}
        amount={placed?.total ?? 0}
        start={(provider) => ordersApi.orderPayStart(placed as Order, provider)}
        onClose={() => setPaying(false)}
        onSettled={() => { setPaid(true); setPaying(false); void qc.invalidateQueries({ queryKey: ["kiosk", "queue"] }) }}
      />
    </Shell>
  )
}

/** Full-screen frame without the staff sidebar: the logo (hold to leave), the step, and a way to start over. */
function Shell({ children, step = null, onCancel, onHoldStart, onHoldEnd }: { children: React.ReactNode; step?: 1 | 2 | 3 | 4 | null; onCancel?: () => void; onHoldStart: () => void; onHoldEnd: () => void }) {
  const steps = ["Chi nhánh", "Chọn món", "Thành viên", "Thanh toán"]
  return (
    <div data-uc="UC-KIOSK" className="min-h-screen bg-bg-base">
      <header className="border-b border-border bg-surface px-4 py-3 sm:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div
            aria-label="Giữ 2 giây để thoát kiosk (dành cho nhân viên)"
            className="select-none" onPointerDown={onHoldStart} onPointerUp={onHoldEnd} onPointerLeave={onHoldEnd} onContextMenu={(e) => e.preventDefault()}
          >
            <Logo />
          </div>
          {step && (
            <ol aria-label="Các bước" className="hidden items-center gap-4 text-sm sm:flex">
              {steps.map((s, i) => <li key={s} aria-current={step === i + 1 ? "step" : undefined} className={step === i + 1 ? "font-medium text-text-primary" : "text-text-secondary"}>{i + 1}. {s}</li>)}
            </ol>
          )}
          {onCancel ? <Button variant="secondary" className="min-h-11" onClick={onCancel}>Hủy, làm lại</Button> : <span />}
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-8">{children}</main>
    </div>
  )
}
