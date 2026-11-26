import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/**
 * "Why this number" on the figures a General manager quotes: each page
 * opens with its figures as dotted-rule buttons, one opens its working
 * in the panel, and the page and the open panel are axe-clean.
 */

async function asRole(page: Page, name: string): Promise<void> {
  await page.getByRole("button", { name: /Viewing as/ }).click();
  await page.getByRole("menuitemradio", { name }).click();
}

async function clean(page: Page): Promise<void> {
  // Axe reads colours mid-fade otherwise: let entrances finish first.
  await page.waitForFunction(() => document.getAnimations()
    .every((a) => a.playState !== "running"));
  const r = await new AxeBuilder({ page }).analyze();
  expect(r.violations).toEqual([]);
}

/** Opens one figure's working, checks it, closes it again. */
async function why(page: Page, title: RegExp, result: RegExp)
  : Promise<void> {
  await page.getByRole("button", { name: title }).first().click();
  const panel = page.getByRole("dialog");
  await expect(panel).toBeVisible();
  await expect(panel).toContainText("How it is worked out");
  await expect(panel).toContainText(result);
  await clean(page);
  await page.keyboard.press("Escape");
  await expect(panel).toHaveCount(0);
}

const PAGES: [string, string, RegExp, RegExp][] = [
  ["trend", "Payroll trend", /worked out: Gross pay, Jan 2026 to Oct 2026/,
    /October/],
  ["variance", "Variance against last month", /worked out: Leaver/,
    /Change in gross/],
  ["overtime", "Overtime cost", /worked out: Overtime paid this year/,
    /October/],
  ["headcount", "Headcount and turnover", /worked out: Turnover this year/,
    /average headcount/],
  ["leave", "Leave and absence", /worked out: Annual leave left/, /days/],
  ["dashboard-hr", "HR dashboard", /worked out: Open items that stop pay/,
    /Open items/],
  ["departments", "Cost by department", /worked out: Department cost/,
    /Gross cost/],
  ["nationality", "Headcount by nationality",
    /worked out: Headcount by nationality/, /People/],
  ["summary", "Payroll summary", /worked out: Gross pay, whole run/,
    /by department/],
];

for (const [id, h1, title, result] of PAGES) {
  test(`why-this-number-${id}`, async ({ page }) => {
    await page.goto(`/#/reports/${id}`);
    await expect(page.getByRole("heading", { level: 1, name: h1 }))
      .toBeVisible();
    await expect(page.getByText(/Figures with a dotted line open/))
      .toHaveCount(1);
    await clean(page);
    await why(page, title, result);
  });
}

test("why-this-number-executive-dashboard", async ({ page }) => {
  await page.goto("/");
  await asRole(page, "General manager");
  await page.evaluate(() => { location.hash = "#/reports/dashboard-exec"; });
  await expect(page.getByRole("heading", { level: 1,
    name: "Executive dashboard" })).toBeVisible();
  await clean(page);
  await why(page, /worked out: Net pay, whole run/, /Salary file and held/);
  await why(page, /worked out: Department cost/, /Gross cost/);
});
