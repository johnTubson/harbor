import { expect, test } from "@playwright/test";

const adminBase =
  process.env.ADMIN_URL ??
  `http://localhost:${process.env.ADMIN_PORT ?? "3011"}`;

test.describe("admin KYC approval", () => {
  test("login → approve pending merchant", async ({ page }) => {
    await page.goto(`${adminBase}/login`);

    await page.getByLabel("Email").fill("admin@harbor.demo");
    await page.getByLabel("Password").fill("demo1234");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
    await expect(
      page.getByRole("heading", { name: "Dashboard" })
    ).toBeVisible();

    await page.goto(`${adminBase}/merchants?status=pending`);

    await expect(
      page.getByRole("heading", { name: "Merchants" })
    ).toBeVisible();
    await expect(page.getByText("Pending Artisan Co")).toBeVisible();

    await page
      .getByRole("row", { name: /Pending Artisan Co/ })
      .getByRole("link", { name: "View" })
      .click();

    await expect(page).toHaveURL(/\/merchants\/.+/);
    await expect(
      page.getByRole("heading", { name: "Pending Artisan Co" })
    ).toBeVisible();
    await expect(page.getByText("KYC Documents")).toBeVisible();

    await page.getByRole("button", { name: "Approve merchant" }).click();
    await expect(
      page.getByRole("dialog", { name: "Approve merchant" })
    ).toBeVisible();
    await page.getByRole("button", { name: "Confirm approval" }).click();

    await expect(page.getByText("Merchant approved")).toBeVisible();
    await expect(page.getByText("active", { exact: true })).toBeVisible();
  });
});
