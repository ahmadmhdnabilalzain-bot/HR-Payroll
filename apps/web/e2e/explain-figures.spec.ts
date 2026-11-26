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
  ["gratuity-liability", "Gratuity liability",
    /worked out: Gratuity liability/, /Provision/],
  ["employer-cost", "Employer cost", /worked out: Employer cost, partial/,
    /All departments/],
  ["owner-brief", "Owner brief", /worked out: Waiting for a decision/,
    /Waiting/],
  ["loans", "Loans report", /worked out: Balance still owed/, /Lent/],
  ["journal", "Payroll journal", /worked out: Credits/, /balance/],
  ["elements", "Pay elements report", /worked out: Earnings in October/,
    /gross pay/],
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
  await why(page, /worked out: Gross pay, Oct 2026/, /October/);
  await why(page, /worked out: Department cost/, /Gross cost/);
  await page.evaluate(() => { location.hash = "#/reports/board-pack"; });
  await expect(page.getByRole("heading", { level: 1, name: "Board report" }))
    .toBeVisible();
  await expect(page.getByText(/Figures with a dotted line open/))
    .toHaveCount(1);
  await clean(page);
  await why(page, /worked out: Gross pay, January to October/, /October/);
  await why(page, /worked out: Loans and advances outstanding/, /owed/);
});

test("why-this-number-home-strip-and-departments", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: /Off in the next/ }).first())
    .toBeVisible();
  await clean(page);
  await why(page, /worked out: Documents expiring/, /Documents/);
  await why(page, /worked out: Waiting for a decision/, /Waiting/);
  await why(page, /worked out: Department cost/, /Gross cost/);
  await page.getByRole("link", { name: /Off in the next/ }).first().click();
  await expect(page).toHaveURL(/#\/time-off/);
});

test("why-this-number-review-totals-and-past-runs", async ({ page }) => {
  await page.goto("/#/pay-run/review");
  await expect(page.getByRole("heading", { level: 2,
    name: "What this month pays" })).toBeVisible();
  await clean(page);
  await why(page, /worked out: Gross pay, whole run/, /by department/);
  await why(page, /worked out: Deductions, whole run/, /Deductions/);
  await why(page, /worked out: People paid this month/, /People/);
  await page.goto("/#/pay-run/runs/2026-09");
  await expect(page.getByRole("heading", { level: 1,
    name: "September 2026" })).toBeVisible();
  await clean(page);
  await why(page, /worked out: Gross pay, September 2026/, /by department/);
  await why(page, /worked out: Net pay against the month before/,
    /Change/);
});
