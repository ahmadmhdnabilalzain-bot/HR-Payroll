import { expect, test, type Page } from "@playwright/test";

/** E16 and X34: asking about a payslip line, asking for a report. */
async function asRole(page: Page, name: string): Promise<void> {
  await page.getByRole("button", { name: /Viewing as/ }).click();
  await page.getByRole("menuitemradio", { name }).click();
}

test("employee-asks-about-a-line-and-sends-it-to-hr", async ({ page }) => {
  await page.goto("/");
  await asRole(page, "Employee");
  await page.goto("/#/me/payslips");
  await page.getByRole("link", { name: /thi?s month|October/i }).first()
    .click();
  await page.getByRole("button", { name: /About this line: Overtime/ })
    .click();
  const sheet = page.getByRole("dialog");
  await expect(sheet.getByRole("heading", { name: "About this line" }))
    .toBeVisible();
  await sheet.getByRole("button", { name: /Why is overtime/ }).click();
  await expect(sheet.getByText(/Answers are worked out from your payslip/))
    .toBeVisible();
  await sheet.getByRole("button", { name: "Ask HR about this line" })
    .click();
  await expect(sheet.getByLabel("Your question to HR"))
    .toHaveValue(/Overtime/);
  await sheet.getByRole("button", { name: "Send to HR" }).click();
  await expect(sheet.getByText(/Sent to HR/)).toBeVisible();
});

test("hr-asks-for-a-report-in-words", async ({ page }) => {
  await page.goto("/#/reports");
  const box = page.getByLabel("Say which report you want");
  await box.fill("variance for september");
  await page.getByRole("button", { name: "Show report" }).click();
  await expect(page).toHaveURL(/#\/reports\/variance\/2026-09$/);
  await page.goto("/#/reports");
  await box.fill("tell me a joke");
  await page.getByRole("button", { name: "Show report" }).click();
  await expect(page.getByText(/No report matched those words/))
    .toBeVisible();
});
