import { expect, test } from "@playwright/test";

test("reports-home-to-variance-to-audit-chain", async ({ page }) => {
  await page.goto("/#/reports");
  await expect(page.getByRole("heading", { level: 1, name: "Reports" }))
    .toBeVisible();
  await page.getByRole("link", { name: /^Variance/ }).first().click();
  await expect(page.getByRole("heading", { level: 1,
    name: "Variance against last month" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Leaver (part month)",
    exact: true })).toBeVisible();
  await page.goto("/#/reports/audit");
  await page.getByRole("button", { name: "Check the chain" }).click();
  await expect(page.getByText("all 58 entries fit")).toBeVisible();
  await page.getByRole("button", { name: "Edit one entry" }).click();
  await page.getByRole("button", { name: "Check the chain" }).click();
  await expect(page.getByText(/Chain broken at entry 11/)).toBeVisible();
});
