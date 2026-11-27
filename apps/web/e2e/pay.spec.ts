import { expect, test } from "@playwright/test";

test("loan-request-is-decided-by-the-gm", async ({ page }) => {
  await page.goto("/#/pay-run/loans");
  await expect(page.getByRole("heading", { level: 1,
    name: "Loans and advances" })).toBeVisible();
  await page.getByRole("button", { name: "New loan" })
    .click();
  const sheet = page.getByRole("dialog");
  await sheet.getByLabel("Amount (AED)").fill("abc");
  await sheet.getByRole("button", { name: "Send for a decision" }).click();
  await expect(sheet.getByRole("alert")).toContainText("Enter the amount");
  await sheet.getByLabel("Amount (AED)").fill("5000");
  await sheet.getByRole("button", { name: "Send for a decision" }).click();
  await expect(page.getByRole("status")).toContainText("to decide");
  const row = page.getByRole("link", { name: /New request/ });
  await expect(row).toContainText("Waiting");
  await row.click();
  await expect(page.getByText(/Waiting for .*General Manager/i))
    .toBeVisible();
  await page.getByRole("button", { name: "View as General Manager" })
    .click();
  await page.getByRole("button", { name: "Sign off", exact: true }).click();
  await expect(page.getByText(/^Signed off by /)).toBeVisible();
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByText(/Waiting for /)).toBeVisible();
});

test("fine-decision-has-an-undo", async ({ page }) => {
  await page.goto("/#/pay-run/fines/tf-1");
  await page.getByRole("button", { name: "The company pays" }).click();
  await expect(page.getByText(/^The company pays: /)).toBeVisible();
  await page.getByRole("button", { name: "Take back decision" }).click();
  await expect(page.getByRole("button", { name: "The company pays" }))
    .toBeVisible();
});

test("past-run-lists-every-payslip", async ({ page }) => {
  await page.goto("/#/pay-run/runs/2026-09");
  await expect(page.getByRole("heading", { level: 1,
    name: "September 2026" })).toBeVisible();
  await page.getByRole("tab", { name: /Payslips/ }).click();
  await expect(page.getByRole("list", { name: "Payslips" })
    .getByRole("listitem")).toHaveCount(30);
});

test("pay-records-are-outside-an-employees-view", async ({ page }) => {
  await page.goto("/#/pay-run/loans/LN-2041");
  await expect(page.getByRole("heading", { level: 1,
    name: "Ayesha Siddiqui" })).toBeVisible();
  await page.evaluate(() => { location.hash = "#/home"; });
  await page.getByRole("heading", { level: 1 }).first().waitFor();
  await page.getByRole("button", { name: /HR manager|Viewing as/ })
    .first().click();
  await page.getByRole("menuitemradio", { name: /Employee/ }).click();
  await page.evaluate(() => { location.hash = "#/pay-run/loans/LN-2041"; });
  await expect(page.getByRole("heading", { level: 1,
    name: "Outside your view" })).toBeVisible();
  await expect(page.getByText("Ayesha Siddiqui")).toHaveCount(0);
});

test("expense-claim-is-decided-through-the-inbox-id", async ({ page }) => {
  await page.goto("/#/pay-run/expenses/exp-002");
  await page.getByRole("button", { name: "View as General Manager" })
    .click();
  await page.getByRole("button", { name: "Sign off", exact: true }).click();
  await expect(page.getByText(/^Signed off by /)).toBeVisible();
  await page.getByRole("link", { name: "Expense claims" }).click();
  await expect(page.getByRole("link", { name: /Rashid Al Falasi/ }))
    .toContainText("Signed off");
});

test("it-opens-pay-groups-and-elements-from-setup", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Viewing as/ }).first().click();
  await page.getByRole("menuitemradio", { name: /IT manager/ }).click();
  for (const [hash, title] of [["groups", "Pay groups"],
    ["elements", "Pay elements"]] as const) {
    await page.evaluate((h) => { location.hash = `#/pay-run/${h}`; }, hash);
    await expect(page.getByRole("heading", { level: 1, name: title }))
      .toBeVisible();
  }
});
