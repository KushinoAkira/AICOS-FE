import { expect, test, type APIRequestContext, type Page } from "@playwright/test"

/**
 * Ô nhập mã giảm giá ở POS, menu QR tại bàn và đặt mang đi.
 * Mỗi test tạo một voucher riêng (giảm 10%, không có đơn tối thiểu) bằng tài khoản owner, vì voucher chỉ dùng được một lần.
 * Cần: BE ở E2E_API (mặc định http://localhost:8080/api/v1), FE chạy `npm run dev` có nút đăng nhập nhanh, E2E_PASSWORD = mật khẩu demo.
 */
const API = process.env.E2E_API ?? "http://localhost:8080/api/v1"
const PASSWORD = process.env.E2E_PASSWORD ?? ""
/** Bàn A01 của Quận 1: không dùng A1 để giữ bàn demo chính sạch. */
const QR_TABLE = process.env.E2E_QR_TOKEN ?? "3ca31d1e2c216bc5d06a2a11ec30fe05"
const PRODUCT = /Ca phe sua/i

const vnd = (text: string) => Number(text.replace(/\D/g, ""))

async function ownerToken(request: APIRequestContext): Promise<string> {
  const res = await request.post(`${API}/identity/auth/login`, { data: { login: "owner@demo.local", password: PASSWORD } })
  expect(res.ok(), `owner login: ${res.status()} ${await res.text()}`).toBeTruthy()
  return (await res.json()).accessToken as string
}

async function newVoucher(request: APIRequestContext): Promise<string> {
  const token = await ownerToken(request)
  const code = `E2E${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 90 + 10)}`
  const res = await request.post(`${API}/customers/vouchers`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { branchId: null, code, type: "Voucher", discountType: "Percentage", value: 10, minOrderAmount: 0, expiresAt: new Date(Date.now() + 86_400_000).toISOString(), issuedToName: "E2E" },
  })
  expect(res.ok(), `create voucher: ${res.status()} ${await res.text()}`).toBeTruthy()
  return code
}

async function addProduct(page: Page) {
  await page.getByRole("button", { name: PRODUCT }).last().click()
  await page.getByRole("button", { name: /^Thêm ·/ }).click()
}

async function applyCode(page: Page, code: string) {
  const cart = page.getByRole("complementary", { name: "Giỏ hàng" })
  await cart.getByRole("button", { name: "Có mã giảm giá?" }).click()
  await cart.getByLabel("Mã giảm giá").fill(code.toLowerCase())
  await cart.getByRole("button", { name: "Áp dụng" }).click()
  return cart
}

test.beforeAll(() => {
  if (!PASSWORD) throw new Error("Đặt E2E_PASSWORD = mật khẩu demo (TESTING-GUIDE-FOR-ME.md mục 3).")
})

test("POS: thu ngân xem trước giảm giá, đặt đơn khách tại quầy, thu tiền", async ({ page, request }) => {
  const code = await newVoucher(request)
  await page.goto("/login")
  await page.getByRole("button", { name: "Thu ngân", exact: true }).click()
  await page.waitForURL(/cashier\/pos/)
  await page.getByLabel("Đơn cho").selectOption({ label: "Khách tại quầy (trả tiền ngay)" })
  await addProduct(page)

  const cart = page.getByRole("complementary", { name: "Giỏ hàng" })
  const before = vnd(await cart.getByTestId("cart-total").innerText())
  await applyCode(page, code)
  await expect(cart.getByTestId("voucher-applied")).toContainText(code)
  await expect(cart.getByTestId("voucher-applied")).toContainText("Giảm")
  const after = vnd(await cart.getByTestId("cart-total").innerText())
  expect(Math.abs(after - before * 0.9)).toBeLessThanOrEqual(1)

  await cart.getByRole("button", { name: "Đặt món", exact: true }).click()
  const dialog = page.getByRole("dialog", { name: /Thu tiền đơn/ })
  await expect(dialog).toContainText(`Đã giảm (mã ${code})`)
  await dialog.getByLabel("Khách đưa (₫)").fill(String(after))
  await dialog.getByRole("button", { name: "Xác nhận đã nhận tiền" }).click()
  await expect(page.getByText(/Đã thu/)).toBeVisible()
})

test("POS: mã sai bị báo lỗi, không áp dụng", async ({ page }) => {
  await page.goto("/login")
  await page.getByRole("button", { name: "Thu ngân", exact: true }).click()
  await page.waitForURL(/cashier\/pos/)
  await page.getByLabel("Đơn cho").selectOption({ label: "Khách tại quầy (trả tiền ngay)" })
  await addProduct(page)
  const cart = await applyCode(page, "KHONGTONTAI999")
  await expect(cart.getByRole("alert")).toContainText("Mã giảm giá")
  await expect(cart.getByTestId("voucher-applied")).toHaveCount(0)
})

test("Mang đi: khách nhập mã, số tiền thanh toán đã trừ giảm giá", async ({ page, request }) => {
  test.skip(!process.env.E2E_TAKEAWAY_VOUCHER, "Bật featureFlags.voucherAtTakeaway sau khi BE cho khách redeem voucher, rồi đặt E2E_TAKEAWAY_VOUCHER=1")
  const code = await newVoucher(request)
  await page.goto("/customer-login")
  await page.getByRole("button", { name: "Đăng nhập nhanh khách hàng demo" }).click()
  await page.waitForURL(/brands/)
  await page.getByRole("button", { name: /Chọn quán|Tiếp tục với quán này/ }).first().click()
  await page.waitForURL(/menu/)
  await page.getByRole("button", { name: "Sớm nhất có thể" }).click()
  await addProduct(page)
  const cart = page.getByRole("complementary", { name: "Giỏ hàng" })
  const before = vnd(await cart.getByTestId("cart-total").innerText())
  await applyCode(page, code)
  await expect(cart.getByTestId("voucher-applied")).toContainText(code)

  await cart.getByRole("button", { name: "Đặt và thanh toán" }).click()
  const pay = page.getByRole("dialog", { name: /Thanh toán trực tuyến/ })
  await expect(pay).toBeVisible()
  expect(Math.abs(vnd(await pay.locator("b").first().innerText()) - before * 0.9)).toBeLessThanOrEqual(1)
  await expect(page.getByText(new RegExp(`Đã giảm .*mã ${code}`))).toBeVisible()
  await pay.getByRole("button", { name: "Để sau" }).click()
})

test("QR tại bàn: khách thành viên nhập mã khi đặt món", async ({ browser, request }) => {
  test.skip(!process.env.E2E_QR_VOUCHER, "Bật featureFlags.voucherAtQr sau khi BE nhận promotionCode ở /orders/qr/checkout, rồi đặt E2E_QR_VOUCHER=1")
  const code = await newVoucher(request)
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()
  // Khách vãng lai không có token để dùng voucher, nên ô mã chỉ hiện cho khách đã đăng nhập.
  await page.goto("/customer-login")
  await page.getByRole("button", { name: "Đăng nhập nhanh khách hàng demo" }).click()
  await page.waitForURL(/brands/)
  await page.goto(`/q/${QR_TABLE}`)
  await addProduct(page)
  await applyCode(page, code)
  await page.getByRole("complementary", { name: "Giỏ hàng" }).getByRole("button", { name: "Đặt món", exact: true }).click()
  // Nếu BE chưa có qr-checkout-promotion-code.patch, trang hiện "Mã ... chưa được áp dụng" và test này báo lỗi.
  await expect(page.getByText(new RegExp(`Đã giảm .*mã ${code}`))).toBeVisible()
  await expect(page.getByText(/chưa được áp dụng/)).toHaveCount(0)
  await context.close()
})
