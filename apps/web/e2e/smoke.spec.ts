import { expect, test } from "@playwright/test";
import { PRODUCT_NAME } from "../src/brand";

test("loads-in-english", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html[lang=en][dir=ltr]")).toHaveCount(1);
  await expect(page.getByText(PRODUCT_NAME.en)).toBeVisible();
  await expect(page).toHaveTitle(PRODUCT_NAME.en);
  await expect(page.getByText("Sample data")).toBeVisible();
});

test("switches-to-arabic", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "العربية" }).click();
  await expect(page.locator("html[lang=ar][dir=rtl]")).toHaveCount(1);
  const banner = page.getByRole("note");
  await expect(banner).toBeVisible();
  await page.reload();
  await expect(page.locator("html[lang=ar][dir=rtl]")).toHaveCount(1);
  await expect(page.getByText(PRODUCT_NAME.ar)).toBeVisible();
  await expect(page.getByRole("note")).toBeVisible();
});

test("dark-theme", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Dark" }).click();
  await expect(page.locator("html[data-theme=dark]")).toHaveCount(1);
  const bg = await page.evaluate(() =>
    getComputedStyle(document.body).backgroundColor);
  expect(bg).toBe("rgb(14, 23, 38)");
});

test("no-horizontal-scroll", async ({ page }) => {
  await page.goto("/");
  const over = await page.evaluate(() =>
    document.documentElement.scrollWidth -
    document.documentElement.clientWidth);
  expect(over).toBeLessThanOrEqual(0);
});
