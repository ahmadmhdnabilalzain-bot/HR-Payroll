import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("gate-to-what-if-to-hold-to-advice-to-parallel-run",
  async ({ page }) => {
    await page.goto("/#/pay-run/gate");
    await expect(page.getByRole("heading", { level: 1,
      name: "Checks before pay" })).toBeVisible();
    await expect(page.getByText("1 of 5 checks stop pay")).toBeVisible();

    await page.goto("/#/pay-run/gate/what-if");
    await expect(page.getByRole("heading", { level: 1, name: "What-if" }))
      .toBeVisible();
    await page.getByLabel("Overtime hours to add").fill("3");
    await page.getByRole("button", { name: "Work it out" }).click();
    await expect(page.getByText(/3 hours more overtime/)).toBeVisible();
    await page.getByRole("button", { name: "Back to the run" }).click();
    await expect(page.getByText(/as run\. Change a figure/)).toBeVisible();

    await page.goto("/#/pay-run/gate/holds");
    await page.getByRole("button", { name: "Hold a salary" }).click();
    const sheet = page.getByRole("dialog");
    await sheet.getByLabel("Person").selectOption({ label: "Maria Santos" });
    await sheet.getByRole("button", { name: "Hold salary" }).click();
    await expect(page.getByRole("button", {
      name: "Release Maria Santos's salary" })).toBeVisible();

    await page.goto("/#/pay-run/gate/advice");
    await expect(page.getByText("Held: do not pay")).toBeVisible();
    await page.goto("/#/pay-run/gate");
    await expect(page.getByText(/held by choice/)).toBeVisible();
    await page.goto("/#/pay-run/gate/holds");
    await page.getByRole("button", {
      name: "Release Maria Santos's salary" }).click();
    await expect(page.getByRole("button", { name: /^Release / }))
      .toHaveCount(0);

    await page.getByRole("button", { name: "Hide amounts" }).click();
    await page.goto("/#/pay-run/gate/what-if");
    await expect(page.getByText(/Amounts are hidden/)).toBeVisible();
    await page.getByRole("button", { name: /Show amounts|Hide amounts/ })
      .click();

    await page.goto("/#/setup/migration/parallel");
    await expect(page.getByText(/6 differ, 6 of them with a likely/))
      .toBeVisible();
    await page.getByRole("button", { name: /Second export/ }).click();
    await expect(page.getByText(/2 differ, 2 of them with a likely/))
      .toBeVisible();
    const bad = await new AxeBuilder({ page }).analyze();
    expect(bad.violations).toEqual([]);
  });

test("journal-balances-and-analysis-builds", async ({ page }) => {
  await page.goto("/#/reports/journal");
  await expect(page.getByText("Debits and credits balance, to the fils"))
    .toBeVisible();
  await page.goto("/#/reports/analysis");
  await page.getByRole("button", { name: "Overtime", exact: true }).click();
  await page.getByLabel("Group by").selectOption({ label: "Department" });
  await expect(page.getByText(/Overtime pay by department/)).toBeVisible();
  await page.goto("/#/reports/sign-offs");
  await expect(page.getByText(/Waiting for Khalid Al Nuaimi/).first())
    .toBeVisible();
});
