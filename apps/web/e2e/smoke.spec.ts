import { expect, test } from "@playwright/test";
import { PRODUCT_NAME } from "../src/brand";

test("loads-in-english", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html[lang=en][dir=ltr]")).toHaveCount(1);
  await expect(page).toHaveTitle(`Home · ${PRODUCT_NAME.en}`);
  await page.evaluate(() => { location.hash = "#/reports/variance"; });
  await expect(page).toHaveTitle(
    `Variance against last month · ${PRODUCT_NAME.en}`);
  await expect(page.getByText("demo: fictional data")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("arabic-hidden-until-reviewed", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "العربية" }))
    .toHaveCount(0);
});

test("switches-to-arabic", async ({ page }) => {
  await page.goto("/?ar=1");
  await page.getByRole("button", { name: "العربية" }).click();
  await expect(page.locator("html[lang=ar][dir=rtl]")).toHaveCount(1);
  await expect(page.getByRole("note")).toBeVisible();
  await page.reload();
  await expect(page.locator("html[lang=ar][dir=rtl]")).toHaveCount(1);
  await expect(page.getByRole("note")).toBeVisible();
});

test("dark-theme", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("heading", { level: 1 }).waitFor();
  const desk = page.getByRole("button", { name: "Switch to dark theme" });
  // On a phone the theme sits in the one overflow menu (the avatar).
  if (await desk.isVisible()) await desk.click();
  else {
    await page.getByRole("button", { name: /Viewing as/ }).click();
    await page.getByRole("menuitem", { name: "Switch to dark theme" })
      .click();
  }
  await expect(page.locator("html[data-theme=dark]")).toHaveCount(1);
  await expect.poll(() => page.evaluate(() =>
    getComputedStyle(document.body).backgroundColor))
    .toBe("rgb(11, 11, 12)");
});

test("palette-runs-an-action", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("heading", { level: 1 }).waitFor();
  await page.keyboard.press("Control+k");
  const box = page.getByRole("combobox");
  await expect(box).toBeFocused();
  await box.fill("theme");
  await page.keyboard.press("Enter");
  await expect(page.locator("html[data-theme=dark]")).toHaveCount(1);
});

test("no-horizontal-scroll", async ({ page }) => {
  await page.goto("/");
  const over = await page.evaluate(() =>
    document.documentElement.scrollWidth -
    document.documentElement.clientWidth);
  expect(over).toBeLessThanOrEqual(0);
});
