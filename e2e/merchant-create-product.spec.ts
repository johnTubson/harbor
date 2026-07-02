import { expect, test } from "@playwright/test";

const merchantBase =
  process.env.MERCHANT_URL ??
  `http://localhost:${process.env.MERCHANT_PORT ?? "3012"}`;

test.describe("merchant product catalog", () => {
  test("login → create product", async ({ page }) => {
    const unique = `E2E Candle ${Date.now()}`;
    const slug = `e2e-candle-${Date.now()}`;
    const sku = `E2E-${Date.now()}`;

    await page.goto(`${merchantBase}/login`);

    await page.getByLabel("Email").fill("merchant@harbor.demo");
    await page.getByLabel("Password").fill("demo1234");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });

    await page.goto(`${merchantBase}/products/new`);

    await expect(
      page.getByRole("heading", { name: "New product" })
    ).toBeVisible();

    await page.getByLabel("Title").fill(unique);
    await page.getByLabel("Slug").fill(slug);
    await page
      .getByLabel("Description")
      .fill("Hand-poured soy candle for e2e tests.");

    const variantGrid = page
      .locator("div.grid")
      .filter({ has: page.getByText("SKU", { exact: true }) });
    const variantInputs = variantGrid.getByRole("textbox");
    const variantNumbers = variantGrid.getByRole("spinbutton");

    await variantInputs.nth(0).fill(sku);
    await variantInputs.nth(1).fill("Standard");
    await variantNumbers.nth(0).fill("1899");
    await variantNumbers.nth(1).fill("12");

    await page.getByRole("button", { name: "Create product" }).click();

    await expect(page).toHaveURL(/\/products\/.+\/edit/);
    await expect(
      page.getByRole("heading", { name: "Edit product" })
    ).toBeVisible();
    await expect(page.getByLabel("Title")).toHaveValue(unique);
    await expect(page.getByLabel("Slug")).toHaveValue(slug);
  });
});
