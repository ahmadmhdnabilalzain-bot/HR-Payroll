import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function asRole(page: Page, name: string): Promise<void> {
  await page.getByRole("button", { name: /Viewing as/ }).click();
  await page.getByRole("menuitemradio", { name }).click();
}

test("gratuity-provision-to-explain-to-liability-to-employer-cost",
  async ({ page }) => {
    await page.goto("/#/reports/gratuity-provision");
    await expect(page.getByRole("heading", { level: 1,
      name: "Gratuity provision" })).toBeVisible();
    await expect(page.getByText("Company's accrued liability estimate"))
      .toBeVisible();
    await expect(page.getByText("Not applicable (UAE national)").first())
      .toBeVisible();
    await expect(page.getByText("Not yet eligible").first()).toBeVisible();
    await page.getByRole("button", {
      name: /How this is worked out: Gratuity provision/ }).first().click();
    await expect(page.getByRole("dialog")).toContainText("as we read");
    await page.keyboard.press("Escape");
    const bad = await new AxeBuilder({ page }).analyze();
    expect(bad.violations).toEqual([]);
    await page.goto("/#/reports/gratuity-liability");
    await expect(page.getByRole("heading", { level: 1,
      name: "Gratuity liability" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "Total" })).toBeVisible();
    await page.goto("/#/reports/employer-cost");
    await expect(page.getByRole("cell", { name: "Not computed" })
      .first())
      .toBeVisible();
    await expect(page.getByText(/ILOE, insurance and other employer costs/))
      .toBeVisible();
    const bad2 = await new AxeBuilder({ page }).analyze();
    expect(bad2.violations).toEqual([]);
  });

test("cost-reports-turn-away-an-employee", async ({ page }) => {
  await page.goto("/");
  await asRole(page, "Employee");
  await page.evaluate(() => { location.hash = "#/reports/employer-cost"; });
  await expect(page.getByRole("heading", { level: 1,
    name: "This page is outside your view." })).toBeVisible();
  await expect(page.getByText(/AED \d/)).toHaveCount(0);
});
