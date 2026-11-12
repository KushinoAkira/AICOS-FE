import { expect, test, type APIRequestContext } from "@playwright/test"

/**
 * Quản lý chi nhánh duyệt hoàn tiền ngoại lệ do thu ngân tạo.
 * Chuẩn bị bằng API với tài khoản thu ngân: một đơn tại quầy 1 món, thu tiền mặt, rồi xin hoàn 1.000đ loại Exception (luôn chờ duyệt).
 * Cần chính sách hủy để "Người duyệt ngoại lệ" là Quản lý chi nhánh (mặc định). Test để lại 1 đơn đã thu tiền và 1 lần hoàn 1.000đ tiền mặt.
 */
const API = process.env.E2E_API ?? "http://localhost:8080/api/v1"
const PASSWORD = process.env.E2E_PASSWORD ?? ""

async function login(request: APIRequestContext, login: string) {
  const res = await request.post(`${API}/identity/auth/login`, { data: { login, password: PASSWORD } })
  expect(res.ok(), `login ${login}: ${res.status()}`).toBeTruthy()
  return { Authorization: `Bearer ${(await res.json()).accessToken as string}` }
}
const items = (b: unknown): Record<string, unknown>[] => (Array.isArray(b) ? b : ((b as { items?: Record<string, unknown>[] }).items ?? []))

async function cashierRefundRequest(request: APIRequestContext): Promise<string> {
  const headers = await login(request, "cashier@demo.local")
  const products = items(await (await request.get(`${API}/menu/products`, { headers, params: { page: 1, pageSize: 100 } })).json())
  const product = products.find((p) => /Ca phe sua/i.test(String(p.name))) ?? products[0]
  expect(product, "cần ít nhất 1 món").toBeTruthy()

  const orderRes = await request.post(`${API}/orders`, { headers, data: { type: "Takeaway", tableNumber: null, promotionCode: null, items: [{ productId: product!.id, quantity: 1, note: "E2E hoàn tiền" }] } })
  expect(orderRes.ok(), `create order: ${orderRes.status()} ${await orderRes.text()}`).toBeTruthy()
  const order = await orderRes.json()
  const pay = await request.post(`${API}/payments/transactions/cash`, { headers, data: { orderId: order.id, amount: order.finalAmount, amountTendered: order.finalAmount } })
  expect(pay.ok(), `cash: ${pay.status()} ${await pay.text()}`).toBeTruthy()
  const tx = items(await (await request.get(`${API}/payments/transactions`, { headers, params: { orderId: order.id, limit: 5 } })).json())[0]
  const refund = await request.post(`${API}/payments/transactions/${tx!.id}/refunds`, { headers, data: { kind: "Exception", amount: 1000, reason: "E2E: khách phàn nàn" } })
  expect(refund.status(), await refund.text()).toBe(201)
  expect((await refund.json()).status).toBe("PendingApproval")
  return String(order.orderCode)
}

test.beforeAll(() => {
  if (!PASSWORD) throw new Error("Đặt E2E_PASSWORD = mật khẩu demo (TESTING-GUIDE-FOR-ME.md mục 3).")
})

test("Quản lý chi nhánh duyệt yêu cầu hoàn tiền của thu ngân", async ({ page, request }) => {
  const code = await cashierRefundRequest(request)
  await page.goto("/login")
  await page.getByRole("button", { name: "Quản lý chi nhánh", exact: true }).click()
  await page.waitForURL(/branch\/dashboard/)
  await page.goto("/branch/orders")

  const section = page.getByRole("region", { name: "Hoàn tiền chờ duyệt" })
  const row = section.getByRole("row", { name: new RegExp(code) })
  await expect(row).toContainText("1.000")
  await row.getByRole("button", { name: "Duyệt" }).click()
  await page.getByRole("dialog", { name: "Duyệt hoàn tiền" }).getByRole("button", { name: "Duyệt và hoàn tiền" }).click()
  await expect(page.getByText("Đã duyệt hoàn 1.000 ₫.")).toBeVisible()
  await expect(section.getByRole("row", { name: new RegExp(code) })).toHaveCount(0)
})
