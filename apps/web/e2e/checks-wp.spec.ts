import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function asRole(page: Page, name: string): Promise<void> {
  await page.getByRole("button", { name: /Viewing as/ }).click();
  await page.getByRole("menuitemradio", { name }).click();
}

test("anomaly checks: findings link to people, marks are undoable",
  async ({ page }) => {
    await page.goto("/#/reports/anomalies");
    await expect(page.getByRole("heading", { level: 1,
      name: "Anomaly checks" })).toBeVisible();
    await expect(page.getByText("Nothing found").first()).toBeVisible();
    await expect(page.getByRole("link", { name: /James Whitfield/ })
      .first()).toHaveAttribute("href", /#\/people\/emp-014/);
    const row = page.getByRole("listitem").filter({
      hasText: "Kavya Iyer" }).first();
    await row.getByRole("button", { name: "Reviewed" }).click();
    await expect(page.getByRole("status").first())
      .toContainText("Marked Kavya Iyer as reviewed");
    await expect(row).toContainText("Reviewed");
    const bad = await new AxeBuilder({ page }).analyze();
    expect(bad.violations).toEqual([]);
    await row.getByRole("button", { name: "Undo" }).click();
    await expect(row).toContainText("To check");
    await page.goto("/#/reports/audit");
    await expect(page.getByText(/marked a check on Kavya Iyer/).first())
      .toBeVisible();
  });

test("report templates open a report; my view is saved and removed",
  async ({ page }) => {
    await page.goto("/#/reports/templates");
    await expect(page.getByRole("heading", { level: 1,
      name: "Report templates" })).toBeVisible();
    await expect(page.getByRole("listitem").filter({
      has: page.getByRole("heading", { name: "Variance" }) }))
      .toHaveCount(1);
    await page.getByLabel("Month").selectOption("2026-09");
    await page.getByRole("button", { name: "Save my view of Variance" })
      .click();
    await expect(page.getByRole("status").first())
      .toContainText("Saved Variance, Sep 2026");
    const mine = page.getByRole("list", { name: "My views" });
    await expect(mine.getByRole("link", { name: "Variance, Sep 2026" }))
      .toHaveAttribute("href", "#/reports/variance/2026-09");
    const bad = await new AxeBuilder({ page }).analyze();
    expect(bad.violations).toEqual([]);
    await mine.getByRole("link", { name: "Variance, Sep 2026" }).click();
    await expect(page.getByRole("heading", { level: 1,
      name: "Variance against last month" })).toBeVisible();
    await page.goto("/#/reports/templates");
    await page.getByRole("button", { name: "Remove Variance, Sep 2026" })
      .click();
    await expect(page.getByText("No saved views yet.")).toBeVisible();
  });

test("the checks turn away the IT manager and show no amounts",
  async ({ page }) => {
    await page.goto("/");
    await asRole(page, "IT manager");
    for (const h of ["anomalies", "templates"]) {
      await page.evaluate((x) => { location.hash = `#/reports/${x}`; }, h);
      await expect(page.getByRole("heading", { level: 1 }))
        .toContainText("outside your view");
      await expect(page.getByText(/AED \d/)).toHaveCount(0);
    }
  });
