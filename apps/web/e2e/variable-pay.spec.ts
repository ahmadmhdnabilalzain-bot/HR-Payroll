import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function asRole(page: Page, name: string): Promise<void> {
  await page.getByRole("button", { name: /Viewing as/ }).click();
  await page.getByRole("menuitemradio", { name }).click();
}

test("bonus run: prepare, send, sign off, then the pay run history",
  async ({ page }) => {
    await page.goto("/#/pay-run/off-cycle");
    await expect(page.getByRole("heading", { level: 1,
      name: "Off-cycle payments" })).toBeVisible();
    await expect(page.getByText(/no bonus run this year/i)).toHaveCount(0);
    await page.goto("/#/pay-run/bonus");
    await page.getByRole("button", { name: "New bonus run" }).first()
      .click();
    await page.getByRole("button", { name: "Prepare the run" }).click();
    await page.getByRole("link", { name: "Q3 performance bonus" }).click();
    await expect(page.getByText("Draft").first()).toBeVisible();
    await page.getByRole("button", { name: "Send for sign off" }).click();
    const bad = await new AxeBuilder({ page }).analyze();
    expect(bad.violations).toEqual([]);
    await asRole(page, "General manager");
    await page.getByRole("button", { name: "Sign off", exact: true })
      .click();
    await expect(page.getByText("Signed off").first()).toBeVisible();
    await page.getByRole("button", { name:
      /How this is worked out: Bonus run, net/ }).first().click();
    await expect(page.getByRole("dialog")).toContainText("Bonus run, net");
    await page.keyboard.press("Escape");
    await page.goto("/#/pay-run/runs");
    await expect(page.getByText("Q3 performance bonus, off-cycle"))
      .toBeVisible();
    await page.goto("/#/pay-run/off-cycle");
    await expect(page.getByText(/Signed off, pays/)).toBeVisible();
  });

test("commission: HR prepares, the GM signs off, the employee sees it",
  async ({ page }) => {
    await page.goto("/#/pay-run/commission");
    await expect(page.getByRole("heading", { level: 1,
      name: "Sales commission" })).toBeVisible();
    await page.getByRole("button", { name: "Prepare statements" }).click();
    await expect(page.getByText("Waiting for sign off").first())
      .toBeVisible();
    const bad = await new AxeBuilder({ page }).analyze();
    expect(bad.violations).toEqual([]);
    await asRole(page, "General manager");
    await page.getByRole("button", { name: "Sign off", exact: true })
      .click();
    await expect(page.getByText("Signed off").first()).toBeVisible();
    await page.getByRole("link", { name: /Jose Reyes/ }).click();
    await expect(page.getByText("Commission before clawback",
      { exact: true })).toBeVisible();
    await asRole(page, "Employee");
    await page.goto("/#/me/payslips");
    await expect(page.getByRole("heading", { name:
      "Commission statement, October 2026" })).toBeVisible();
    await expect(page.getByText("Commission to pay").first()).toBeVisible();
    await asRole(page, "IT manager");
    await page.evaluate(() => { location.hash = "#/pay-run/commission"; });
    await expect(page.getByRole("heading", { level: 1,
      name: "This page is outside your view." })).toBeVisible();
    await expect(page.getByText(/AED \d/)).toHaveCount(0);
  });
