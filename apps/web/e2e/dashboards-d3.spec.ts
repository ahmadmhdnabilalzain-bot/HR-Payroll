import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function asRole(page: Page, name: string): Promise<void> {
  await page.getByRole("button", { name: /Viewing as/ }).click();
  await page.getByRole("menuitemradio", { name }).click();
}

async function noAxe(page: Page): Promise<void> {
  const bad = await new AxeBuilder({ page }).analyze();
  expect(bad.violations).toEqual([]);
}

test("hr-dashboard-says-what-fix-says-and-hides-amounts",
  async ({ page }) => {
    await page.goto("/#/reports/dashboard-hr");
    const tiles = page.getByRole("list", { name: "Key figures" });
    await expect(tiles.getByText("stop pay", { exact: true })).toBeVisible();
    await expect(tiles.getByText("6 to check")).toBeVisible();
    await expect(page.getByRole("cell", { name: "2 stop pay, 6 to check" }))
      .toBeVisible();
    await expect(page.getByRole("list", { name: "People by nationality" }))
      .toBeVisible();
    await noAxe(page);
  });

test("executive-dashboard-tiles-chart-and-masking", async ({ page },
  info) => {
  await page.goto("/");
  await asRole(page, "General manager");
  await page.evaluate(() => { location.hash = "#/reports/dashboard-exec"; });
  const tiles = page.getByRole("list", { name: "Key figures" });
  await expect(tiles.getByText("AED 933,730.94")).toBeVisible();
  await expect(page.getByRole("img", { name: /Gross pay by month/ }))
    .toBeVisible();
  await noAxe(page);
  await page.emulateMedia({ colorScheme: "dark" });
  await noAxe(page);
  if (info.project.name === "phone") return;
  await page.getByRole("button", { name: /Hide amounts/i }).first().click();
  await expect(tiles.getByText(/933,730/)).toHaveCount(0);
  await expect(page.getByRole("img", { name: /Gross pay by month/ })
    .getByText(/\dk$/)).toHaveCount(0);
});

test("owner-brief-summary-follows-the-decision", async ({ page }) => {
  await page.goto("/");
  await asRole(page, "General manager");
  await page.evaluate(() => { location.hash = "#/reports/owner-brief"; });
  const sum = page.getByRole("group", { name: "This week in brief" });
  await expect(sum.getByText("Held by bank details")).toBeVisible();
  await expect(sum.getByText("6 to check")).toBeVisible();
  await noAxe(page);
});

test("trend-marks-september-and-october", async ({ page }) => {
  await page.goto("/#/reports/trend");
  const chart = page.getByRole("img", { name: /Gross pay by month/ });
  await expect(chart.getByText("Sep", { exact: true })).toBeVisible();
  await expect(chart.getByText("Oct", { exact: true })).toBeVisible();
  await expect(chart.getByText("500k")).toBeVisible();
  await noAxe(page);
});

test("org-chart-tree-opens-a-team-in-its-card", async ({ page }) => {
  await page.goto("/#/people/team/org");
  await page.getByRole("button", { name: /Show Arjun Menon's team/ })
    .click();
  await expect(page.locator("#team-" + await page.locator(
    "[data-person]").filter({ hasText: "Arjun Menon" })
    .getAttribute("data-person"))).toBeVisible();
  await noAxe(page);
});

test("it-home-says-not-checked-yet-until-the-check", async ({ page }) => {
  await page.goto("/");
  await asRole(page, "IT manager");
  await expect(page.getByText("Not checked yet")).toBeVisible();
  await noAxe(page);
  await page.getByRole("button", { name: "Check the chain" }).click();
  await expect(page.getByText("Not checked yet")).toHaveCount(0);
  await expect(page.getByText(/All \d+ entries match/)).toBeVisible();
});
