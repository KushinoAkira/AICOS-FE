import { expect, test } from "@playwright/test"

/**
 * Khách chọn chi nhánh khi đặt mang đi. Dữ liệu demo (TESTING-GUIDE-FOR-ME.md mục 3): Ca phe sua 30.000đ, riêng Demo Quan 3 giá 35.000đ.
 * Không đặt đơn để không để lại dữ liệu rác.
 */
test("Mang đi: chọn Demo Quan 3 thì thấy giá riêng của Quận 3, tải lại trang vẫn giữ chi nhánh", async ({ page }) => {
  await page.goto("/customer-login")
  await page.getByRole("button", { name: "Đăng nhập nhanh khách hàng demo" }).click()
  await page.waitForURL(/brands/)
  await page.getByRole("button", { name: /Chọn quán|Tiếp tục với quán này/ }).first().click()
  await page.waitForURL(/menu/)

  const branches = page.getByRole("radiogroup", { name: "Chi nhánh nhận hàng" })
  await expect(branches.getByRole("radio")).toHaveCount(3)
  await branches.getByRole("radio", { name: /Demo Quan 3/ }).click()
  await expect(page.getByText("Giờ nhận hàng · Demo Quan 3")).toBeVisible()
  await expect(page.getByRole("button", { name: /Ca phe sua/ }).last()).toContainText("35.000")

  await page.reload()
  await expect(page.getByText("Giờ nhận hàng · Demo Quan 3")).toBeVisible()
  await expect(branches.getByRole("radio", { name: /Demo Quan 3/ })).toHaveAttribute("aria-checked", "true")

  await branches.getByRole("radio", { name: /Demo Quan 1/ }).click()
  await expect(page.getByRole("button", { name: /Ca phe sua/ }).last()).toContainText("30.000")
})
