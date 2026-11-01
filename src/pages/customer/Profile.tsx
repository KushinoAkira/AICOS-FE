import { useState } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import type { Page } from "../../App"
import { CustomerFrame } from "../../components/CustomerFrame"
import { Banner, Button, Field, Modal, QueryBoundary } from "../../components/ui"
import { useAuth } from "../../context/AuthContext"
import { useToast } from "../../context/ToastContext"
import { customerApi, type Preferences } from "../../lib/api/customer"
import { ApiError } from "../../lib/api/http"
import { formatVND } from "../../lib/format"

const ICE = [{ value: "", label: "Chưa chọn" }, { value: "NoIce", label: "Không đá" }, { value: "Less", label: "Ít đá" }, { value: "Normal", label: "Bình thường" }]

/** Account, preferences and vouchers of the customer; deleting the personal data is here too. */
export default function CustomerProfile({ navigate }: { navigate: (p: Page) => void }) {
  return (
    <CustomerFrame page="customer-profile" navigate={navigate} uc="UC-03" title="Hồ sơ của bạn">
      <div className="grid gap-6 lg:grid-cols-2">
        <AccountCard />
        <PreferencesCard />
        <VouchersCard />
        <DeleteCard navigate={navigate} />
      </div>
    </CustomerFrame>
  )
}

const cardCls = "rounded-[16px] border border-border bg-surface p-6"

function AccountCard() {
  const { user, updateProfile } = useAuth()
  const { showToast } = useToast()
  const [fullName, setFullName] = useState(user?.fullName ?? "")
  const [phone, setPhone] = useState(user?.phone ?? "")
  const [errors, setErrors] = useState<{ fullName?: string; phone?: string }>({})
  const save = useMutation({
    mutationFn: () => updateProfile({ fullName: fullName.trim(), phone: phone.trim() || null, username: user?.username ?? null }),
    onSuccess: () => showToast("Đã lưu thông tin.", "success"),
    onError: (e) => showToast(e instanceof ApiError ? e.message : "Không thể kết nối máy chủ", "error"),
  })
  const submit = () => {
    const found: typeof errors = {}
    if (!fullName.trim()) found.fullName = "Vui lòng nhập họ và tên"
    if (phone.trim() && !/^0\d{9}$/.test(phone.trim())) found.phone = "Số điện thoại gồm 10 số, bắt đầu bằng 0"
    setErrors(found)
    if (Object.keys(found).length === 0) save.mutate()
  }
  return (
    <section aria-label="Thông tin tài khoản" className={cardCls}>
      <h2 className="font-serif text-xl text-text-primary">Thông tin tài khoản</h2>
      <form noValidate onSubmit={(e) => { e.preventDefault(); submit() }} className="mt-4 space-y-4">
        <Field label="Email" value={user?.email ?? ""} disabled hint="Email dùng để đăng nhập, không đổi được." />
        <Field label="Họ và tên" autoComplete="name" value={fullName} error={errors.fullName} onChange={(e) => setFullName(e.target.value)} />
        <Field label="Số điện thoại" autoComplete="tel" value={phone} error={errors.phone} onChange={(e) => setPhone(e.target.value)} />
        <Button type="submit" loading={save.isPending} className="min-h-11">Lưu thay đổi</Button>
      </form>
    </section>
  )
}

function PreferencesCard() {
  const prefs = useQuery({ queryKey: ["customer", "preferences"], queryFn: customerApi.preferences })
  return (
    <section aria-label="Khẩu vị" className={cardCls}>
      <h2 className="font-serif text-xl text-text-primary">Khẩu vị tại quán này</h2>
      <QueryBoundary query={prefs}>{(data) => <PreferencesForm key={JSON.stringify(data)} initial={data} />}</QueryBoundary>
    </section>
  )
}

function PreferencesForm({ initial }: { initial: Preferences }) {
  const { showToast } = useToast()
  const [sugar, setSugar] = useState(initial.sugarPercent === null ? "" : String(initial.sugarPercent))
  const [ice, setIce] = useState(initial.ice ?? "")
  const [notes, setNotes] = useState(initial.notes ?? "")
  const [error, setError] = useState<string | undefined>()
  const save = useMutation({
    mutationFn: () => customerApi.savePreferences({ sugarPercent: sugar === "" ? null : Number(sugar), ice: ice || null, favoriteToppings: initial.favoriteToppings, notes: notes.trim() || null }),
    onSuccess: () => showToast("Đã lưu khẩu vị.", "success"),
    onError: (e) => showToast(e instanceof ApiError ? e.message : "Không thể kết nối máy chủ", "error"),
  })
  const submit = () => {
    const bad = sugar !== "" && (!/^\d+$/.test(sugar) || Number(sugar) > 100)
    setError(bad ? "Mức đường từ 0 đến 100" : undefined)
    if (!bad) save.mutate()
  }
  return (
    <form noValidate onSubmit={(e) => { e.preventDefault(); submit() }} className="mt-4 space-y-4">
      <Field label="Mức đường (%)" inputMode="numeric" value={sugar} error={error} onChange={(e) => setSugar(e.target.value)} />
      <div>
        <label htmlFor="pref-ice" className="mb-1 block text-sm font-medium text-text-primary">Mức đá</label>
        <select id="pref-ice" value={ice} onChange={(e) => setIce(e.target.value)} className="w-full rounded-[10px] border border-border bg-surface px-4 py-3 text-sm text-text-primary">
          {ICE.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
      <Field label="Ghi chú" value={notes} onChange={(e) => setNotes(e.target.value)} />
      <Button type="submit" variant="secondary" loading={save.isPending} className="min-h-11">Lưu khẩu vị</Button>
    </form>
  )
}

function VouchersCard() {
  const vouchers = useQuery({ queryKey: ["customer", "vouchers"], queryFn: customerApi.vouchers })
  return (
    <section aria-label="Voucher của bạn" className={cardCls}>
      <h2 className="font-serif text-xl text-text-primary">Voucher tại quán này</h2>
      <QueryBoundary query={vouchers}>
        {(rows) => rows.length === 0 ? <p className="mt-4 text-sm text-text-secondary">Bạn chưa có voucher. Đổi điểm ở mục Tích điểm để nhận voucher.</p> : (
          <ul className="mt-4 space-y-3">
            {rows.map((v) => (
              <li key={v.id} className="rounded-[12px] border border-border p-3">
                <p className="font-medium text-text-primary">{v.discountLabel}</p>
                <p className="text-sm text-text-secondary">Mã <strong>{v.code}</strong>{v.minOrderAmount ? ` · Đơn từ ${formatVND(v.minOrderAmount)}` : ""}</p>
                <p className="text-xs text-text-secondary">{v.usable ? `Hạn dùng ${new Date(v.expiresAtUtc).toLocaleDateString("vi-VN")}` : "Đã dùng hoặc hết hạn"}</p>
              </li>
            ))}
          </ul>
        )}
      </QueryBoundary>
    </section>
  )
}

function DeleteCard({ navigate }: { navigate: (p: Page) => void }) {
  const { deleteMyData } = useAuth()
  const { showToast } = useToast()
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState("")
  const remove = useMutation({
    mutationFn: () => deleteMyData(password),
    onSuccess: () => { showToast("Đã xóa dữ liệu cá nhân của bạn.", "success"); navigate("landing") },
  })
  return (
    <section aria-label="Xóa dữ liệu cá nhân" className={cardCls}>
      <h2 className="font-serif text-xl text-text-primary">Xóa dữ liệu cá nhân</h2>
      <p className="mt-2 text-sm text-text-secondary">Tên, email, số điện thoại và khẩu vị của bạn sẽ bị xóa ở mọi quán, và bạn không thể đăng nhập lại bằng tài khoản này. Lịch sử giao dịch vẫn được quán lưu nhưng không còn gắn với bạn.</p>
      <Button variant="secondary" className="mt-4 min-h-11" onClick={() => setOpen(true)}>Yêu cầu xóa dữ liệu</Button>
      <Modal
        open={open}
        title="Xóa dữ liệu cá nhân?"
        onClose={() => { setOpen(false); remove.reset() }}
        footer={<>
          <Button variant="secondary" onClick={() => { setOpen(false); remove.reset() }}>Hủy</Button>
          <Button variant="danger" loading={remove.isPending} onClick={() => remove.mutate()}>Xóa vĩnh viễn</Button>
        </>}
      >
        <p className="mb-3 text-sm text-text-secondary">Không thể hoàn tác. Nhập mật khẩu để xác nhận (tài khoản đăng nhập bằng Google có thể bỏ trống).</p>
        {remove.isError && <Banner>{remove.error instanceof ApiError ? remove.error.message : "Chưa xóa được. Hãy thử lại."}</Banner>}
        <Field label="Mật khẩu" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </Modal>
    </section>
  )
}
