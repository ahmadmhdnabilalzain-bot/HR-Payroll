import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const SHOTS = process.env.WP26_SHOTS;

async function asRole(page: Page, name: string): Promise<void> {
  await page.getByRole("button", { name: /Viewing as/ }).click();
  await page.getByRole("menuitemradio", { name }).click();
}

async function shot(page: Page, name: string): Promise<void> {
  if (SHOTS === undefined) return;
  const project = test.info().project.name;
  await page.setViewportSize(project === "phone" ? { width: 393,
    height: 852 } : { width: 1920, height: 1080 });
  for (const scheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    await page.screenshot({ path: `${SHOTS}/${name}-${project}-${scheme}.png`,
      fullPage: true });
  }
  await page.emulateMedia({ colorScheme: "light" });
}

test("erp-ledger-teams-say-nothing-is-connected", async ({ page }) => {
  await page.goto("/");
  await asRole(page, "IT manager");
  await page.evaluate(() => { location.hash = "#/setup/erp/erp"; });
  await expect(page.getByRole("heading", { level: 1,
    name: "ERP connection" })).toBeVisible();
  await expect(page.getByText(/Nothing is connected\./))
    .toBeVisible();
  await expect(page.getByRole("region", { name: "Employee sync preview" }))
    .toContainText("Cost centre");
  await page.getByRole("button", { name: "Test connection" }).click();
  await expect(page.getByText(/Test connection: not available/)).toContainText(
    "not available yet");
  await page.getByRole("button", { name: "Edit" }).first().click();
  await page.getByRole("textbox").fill("on");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText(/ERP connection set to On/).first())
    .toBeVisible();
  await shot(page, "erp");
  const bad = await new AxeBuilder({ page }).analyze();
  expect(bad.violations).toEqual([]);

  await page.evaluate(() => { location.hash = "#/setup/erp/gl"; });
  await expect(page.getByRole("heading", { level: 1,
    name: "General ledger" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Posting preview" }))
    .toContainText("Total");
  const dl = page.waitForEvent("download");
  await page.getByRole("button", { name: /Download payroll-posting/ })
    .click();
  expect((await dl).suggestedFilename()).toBe(
    "payroll-posting-october-2026.csv");
  await shot(page, "gl");
  const bad2 = await new AxeBuilder({ page }).analyze();
  expect(bad2.violations).toEqual([]);

  await page.evaluate(() => { location.hash = "#/setup/erp/teams"; });
  await expect(page.getByRole("heading", { level: 1,
    name: "Teams messages" })).toBeVisible();
  await expect(page.getByRole("article").first()).toBeVisible();
  await shot(page, "teams");
  const bad3 = await new AxeBuilder({ page }).analyze();
  expect(bad3.violations).toEqual([]);
});
