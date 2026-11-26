import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function asRole(page: Page, name: string): Promise<void> {
  await page.getByRole("button", { name: /Viewing as/ }).click();
  await page.getByRole("menuitemradio", { name }).click();
}

test("propose, sign off as a batch, see it in salary revisions, then " +
  "the budget and forecast", async ({ page }) => {
  await page.goto("/#/reports/comp-plan");
  await expect(page.getByRole("heading", { level: 1,
    name: "Compensation planning" })).toBeVisible();
  await page.getByRole("button", { name: "Propose an increase" }).click();
  await page.getByRole("button", { name: "Send for a decision" }).click();
  await expect(page.getByRole("status").first()).toContainText("Proposed");
  const bad = await new AxeBuilder({ page }).analyze();
  expect(bad.violations).toEqual([]);
  await asRole(page, "General manager");
  await page.getByRole("button", { name: /^Sign off 1 increase/ }).click();
  await expect(page.getByText(/Signed off by/)).toBeVisible();
  await page.goto("/#/pay-run/revisions");
  await expect(page.getByText("2027 plan, signed off").first())
    .toBeVisible();
  await page.goto("/#/reports/workforce-plan");
  await expect(page.getByText("2027 payroll budget, estimate"))
    .toBeVisible();
  await page.goto("/#/reports/cost-budget");
  await expect(page.getByText(/estimates/).first()).toBeVisible();
  await page.goto("/#/reports/forecast");
  await expect(page.getByRole("cell", { name: "Estimate" }).first())
    .toBeVisible();
  const bad2 = await new AxeBuilder({ page }).analyze();
  expect(bad2.violations).toEqual([]);
});

test("planning screens turn away an employee", async ({ page }) => {
  await page.goto("/");
  await asRole(page, "Employee");
  await page.evaluate(() => { location.hash = "#/reports/forecast"; });
  await expect(page.getByRole("heading", { level: 1,
    name: "This page is outside your view." })).toBeVisible();
  await expect(page.getByText(/AED \d/)).toHaveCount(0);
});
