import { expect, test } from "@playwright/test"

/**
 * Trang thực đơn công khai /b/demo: khách chưa đăng nhập xem chi nhánh và chọn món, bấm đặt hàng thì đăng nhập,
 * rồi tự sang trang Đặt mang đi với đúng chi nhánh và giỏ hàng đã chọn. Không đặt đơn nên không để lại dữ liệu.
 */
test("Khách chọn món ở /b/demo trước khi đăng nhập, đăng nhập xong giỏ hàng vẫn còn", async ({ page }) => {
  await page.goto("/b/demo")
  await expect(page.getByRole("heading", { name: "Demo Coffee" })).toBeVisible()
  await page.getByLabel("Chi nhánh nhận hàng").selectOption({ label: "Demo Quan 3" })
  await page.getByRole("button", { name: /Ca phe sua/ }).last().click()
  await page.getByRole("button", { name: /^Thêm ·/ }).click()

  const cart = page.getByRole("complementary", { name: "Giỏ hàng" })
  await cart.getByRole("button", { name: "Đăng nhập để đặt hàng" }).click()
  await page.waitForURL(/customer-login/)
  await page.getByRole("button", { name: "Đăng nhập nhanh khách hàng demo" }).click()

  await page.waitForURL(/\/menu$/)
  await expect(page.getByText("Giờ nhận hàng · Demo Quan 3")).toBeVisible()
  await expect(cart).toContainText("Ca phe sua")
  await expect(cart).toContainText("35.000")
})
