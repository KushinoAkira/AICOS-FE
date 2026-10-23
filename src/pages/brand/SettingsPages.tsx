import { PageFrame } from "../../components/PageFrame"
import { SettingsForm } from "../../components/SettingsForm"
import { brandApi, type CancelPolicy, type LoyaltySettings, type MerchantSettings, type PayRules, type PickupSettings } from "../../lib/api/brand"
import type { Page } from "../../App"

interface P { navigate: (p: Page) => void }

export const PICKUP_FIELDS = [
  { key: "slotMinutes", label: "Độ dài mỗi khung giờ", kind: "number", suffix: "phút", min: 5, max: 60 },
  { key: "capacityPerSlot", label: "Số đơn tối đa mỗi khung giờ", kind: "number", suffix: "đơn", min: 1, max: 200, hint: "Quá số này khung giờ hiển thị Đầy." },
  { key: "cutoffMinutes", label: "Giờ chốt đặt (trước giờ nhận)", kind: "number", suffix: "phút", min: 0, max: 240, hint: "Sau mốc này khách không đặt thêm cho khung giờ đó." },
  { key: "lockMinutes", label: "Khóa hủy/đổi giờ (trước giờ nhận)", kind: "number", suffix: "phút", min: 0, max: 240, hint: "Sau mốc này khách không thể hủy hoặc đổi giờ." },
] as const

export const pickupRule = (v: PickupSettings) => (v.lockMinutes < v.cutoffMinutes ? "Mốc khóa hủy phải lớn hơn hoặc bằng giờ chốt đặt." : null)

export function BrandPickup({ navigate }: P) {
  return (
    <PageFrame page="brand-pickup" navigate={navigate} uc="UC-21" title="Khung giờ lấy hàng mặc định" subtitle="Áp dụng cho mọi chi nhánh. Quản lý chi nhánh có thể ghi đè riêng.">
      <SettingsForm<PickupSettings> queryKey={["brand", "pickup"]} load={brandApi.pickupDefault} save={brandApi.savePickupDefault} fields={[...PICKUP_FIELDS]} validate={pickupRule} />
    </PageFrame>
  )
}

export function BrandLoyalty({ navigate }: P) {
  return (
    <PageFrame page="brand-loyalty" navigate={navigate} uc="UC-16" title="Chương trình tích điểm" subtitle="Điểm chỉ được cộng khi đơn hoàn tất và đã thanh toán; đơn hủy/hoàn sẽ đảo điểm.">
      <SettingsForm<LoyaltySettings>
        queryKey={["brand", "loyalty"]} load={brandApi.loyalty} save={brandApi.saveLoyalty}
        note="Khách đổi điểm thành voucher theo tỷ lệ bên dưới."
        fields={[
          { key: "earnPer10k", label: "Điểm cộng cho mỗi 10.000 ₫", kind: "number", suffix: "điểm", min: 0, max: 100 },
          { key: "redeemPoints", label: "Số điểm cần để đổi 1 voucher", kind: "number", suffix: "điểm", min: 1 },
          { key: "voucherValue", label: "Giá trị mỗi voucher đổi điểm", kind: "number", suffix: "₫", min: 1000 },
          { key: "expiryMonths", label: "Điểm hết hạn sau", kind: "number", suffix: "tháng", min: 1, max: 60 },
        ]}
      />
    </PageFrame>
  )
}

export function BrandCancelPolicy({ navigate }: P) {
  return (
    <PageFrame page="brand-cancel-policy" navigate={navigate} uc="UC-18" title="Chính sách hủy và hoàn tiền" subtitle="Áp dụng cho đơn mang đi đặt trước. Hoàn một phần đảo điểm theo tỷ lệ số tiền hoàn.">
      <SettingsForm<CancelPolicy>
        queryKey={["brand", "cancel"]} load={brandApi.cancelPolicy} save={brandApi.saveCancelPolicy}
        fields={[
          { key: "freeCancelBeforeMinutes", label: "Hủy miễn phí trước giờ nhận", kind: "number", suffix: "phút", min: 0, max: 1440 },
          { key: "refundPercentAfterLock", label: "Tỷ lệ hoàn sau mốc khóa", kind: "number", suffix: "%", min: 0, max: 100 },
          { key: "autoRefund", label: "Tự động hoàn khi nằm trong chính sách", kind: "boolean", hint: "Tắt thì mọi hoàn tiền cần quản lý duyệt." },
          { key: "exceptionNeedsApproval", label: "Ngoại lệ cần quản lý chi nhánh duyệt", kind: "boolean" },
        ]}
      />
    </PageFrame>
  )
}

export function BrandPayRules({ navigate }: P) {
  return (
    <PageFrame page="brand-pay-rules" navigate={navigate} uc="UC-19" title="Cấu hình lương" subtitle="Quy tắc tính lương cho mọi chi nhánh của thương hiệu.">
      <SettingsForm<PayRules>
        queryKey={["brand", "pay"]} load={brandApi.payRules} save={brandApi.savePayRules}
        fields={[
          { key: "fullTimeDailyRate", label: "Toàn thời gian: lương theo ngày", kind: "number", suffix: "₫/ngày", min: 1 },
          { key: "partTimeHourlyRate", label: "Bán thời gian: lương theo giờ", kind: "number", suffix: "₫/giờ", min: 1 },
          { key: "replacementMultiplier", label: "Hệ số ca thay", kind: "number", suffix: "×", min: 1, max: 5, hint: "Ví dụ 1,5 = ca thay được trả gấp rưỡi." },
          { key: "lateDeductPerHour", label: "Trừ khi đi trễ", kind: "number", suffix: "₫/giờ", min: 0 },
        ]}
      />
    </PageFrame>
  )
}

export function BrandMerchant({ navigate }: P) {
  return (
    <PageFrame page="brand-merchant" navigate={navigate} uc="UC-20" title="Thanh toán merchant" subtitle="Thông tin nhận tiền và phương thức thanh toán chấp nhận (mock/sandbox).">
      <SettingsForm<MerchantSettings>
        queryKey={["brand", "merchant"]} load={brandApi.merchant} save={brandApi.saveMerchant}
        fields={[
          { key: "merchantName", label: "Tên hiển thị", kind: "text" },
          { key: "merchantId", label: "Mã merchant", kind: "text" },
          { key: "acceptCash", label: "Nhận tiền mặt", kind: "boolean" },
          { key: "acceptQr", label: "Nhận QR / ví điện tử", kind: "boolean" },
        ]}
        validate={(v) => (!v.acceptCash && !v.acceptQr ? "Cần bật ít nhất một phương thức thanh toán." : null)}
      />
    </PageFrame>
  )
}
