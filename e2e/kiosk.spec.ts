import { expect, test } from "@playwright/test"

/**
 * Kiosk tự gọi món tại quầy (/kiosk): máy tính bảng đăng nhập tài khoản thu ngân, khách vãng lai tự chọn món uống tại quán,
 * nhận mã đơn; thu ngân thấy đơn đó ở mục "Đơn từ kiosk chờ thu tiền" trên POS và thu tiền.
 * Cần: BE ở E2E_API, FE chạy `npm run dev` có nút đăng nhập nhanh "Thu ngân". Tạo một đơn thật và thu tiền đơn đó.
 */
test("Khách vãng lai gọi món ở kiosk, thu ngân thu tiền đơn kiosk trên POS", async ({ page }) => {
  await page.goto("/login")
  await page.getByRole("button", { name: "Thu ngân", exact: true }).click()
  await page.waitForURL(/cashier\/pos/)

  await page.goto("/kiosk")
  await page.getByRole("button", { name: "Bắt đầu gọi món" }).click()
  await page.getByRole("button", { name: /Ca phe sua/i }).last().click()
  await page.getByRole("button", { name: /^Thêm ·/ }).click()
  await page.getByRole("complementary", { name: "Giỏ hàng" }).getByRole("button", { name: "Tiếp tục" }).click()
  await page.getByTestId("kiosk-guest").click()

  const code = (await page.getByTestId("kiosk-code").innerText()).trim()
  expect(code).not.toBe("")
  await page.getByRole("button", { name: "Xong" }).click()
  await expect(page.getByTestId("kiosk-welcome")).toBeVisible()

  await page.goto("/cashier/pos")
  const queue = page.getByTestId("kiosk-queue")
  const row = queue.getByRole("listitem").filter({ hasText: code })
  await expect(row).toBeVisible()
  await row.getByRole("button", { name: "Thu tiền" }).click()
  const dialog = page.getByRole("dialog", { name: new RegExp(`Thu tiền đơn ${code}`) })
  const total = (await dialog.innerText()).match(/Tổng\s*([\d.]+)/)?.[1]?.replace(/\./g, "") ?? "0"
  await dialog.getByLabel("Khách đưa (₫)").fill(total)
  await dialog.getByRole("button", { name: "Xác nhận đã nhận tiền" }).click()
  await expect(page.getByText(/Đã thu/)).toBeVisible()
  await expect(queue.getByRole("listitem").filter({ hasText: code })).toHaveCount(0)
})
