import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function asRole(page: Page, name: string): Promise<void> {
  await page.getByRole("button", { name: /Viewing as/ }).click();
  await page.getByRole("menuitemradio", { name }).click();
}

test("owner-brief-follows-the-sign-off-and-the-board-pack-repeats-figures",
  async ({ page }) => {
    await page.goto("/");
    await asRole(page, "General manager");
    await page.evaluate(() => { location.hash = "#/reports/owner-brief"; });
    await expect(page.getByRole("heading", { level: 1,
      name: "Owner brief" })).toBeVisible();
    await expect(page.getByText("Waits for Khalid Al Nuaimi to sign off"))
      .toBeVisible();
    await expect(page.getByText(/Pension for UAE nationals: Not computed/))
      .toBeVisible();
    const bad = await new AxeBuilder({ page }).analyze();
    expect(bad.violations).toEqual([]);
    await page.evaluate(() => { location.hash = "#/reports/board-pack"; });
    await expect(page.getByRole("heading", { level: 1,
      name: "Board report" })).toBeVisible();
    await expect(page.getByText("Pay: October net pay")).toBeVisible();
    const bad2 = await new AxeBuilder({ page }).analyze();
    expect(bad2.violations).toEqual([]);
  });

test("loans-report-and-it-dashboard", async ({ page }) => {
  await page.goto("/#/reports/loans");
  await expect(page.getByRole("heading", { level: 1,
    name: "Loans report" })).toBeVisible();
  await expect(page.getByText("Loan LN-2041")).toBeVisible();
  await expect(page.getByRole("cell", { name: "Repaid" })).toBeVisible();
  await page.goto("/");
  await asRole(page, "IT manager");
  await page.evaluate(() => { location.hash = "#/reports/it-dashboard"; });
  await expect(page.getByRole("heading", { level: 1,
    name: "IT dashboard" })).toBeVisible();
  await expect(page.getByText(/Not checked yet in this session/)).toBeVisible();
  await expect(page.getByText(/AED \d/)).toHaveCount(0);
  const bad = await new AxeBuilder({ page }).analyze();
  expect(bad.violations).toEqual([]);
});

test("board-pack-and-loans-turn-away-the-wrong-role", async ({ page }) => {
  await page.goto("/");
  await asRole(page, "IT manager");
  await page.evaluate(() => { location.hash = "#/reports/loans"; });
  await expect(page.getByRole("heading", { level: 1,
    name: "This page is outside your view." })).toBeVisible();
  await page.goto("/");
  await asRole(page, "HR manager");
  await page.evaluate(() => { location.hash = "#/reports/board-pack"; });
  await expect(page.getByRole("heading", { level: 1,
    name: "This page is outside your view." })).toBeVisible();
});
