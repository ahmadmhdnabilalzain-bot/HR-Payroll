import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const clean = async (page: Page) => {
  const r = await new AxeBuilder({ page }).analyze();
  expect(r.violations.map((v) => v.id)).toEqual([]);
};

const asRole = async (page: Page, name: string) => {
  await page.getByRole("button", { name: /Viewing as/ }).click();
  await page.getByRole("menuitemradio", { name }).click();
};

const go = (page: Page, hash: string) =>
  page.evaluate((h) => { location.hash = h; }, hash);

test("help-desk-reply-solve-and-undo", async ({ page }) => {
  await page.goto("/#/people/requests/helpdesk");
  await expect(page.getByRole("heading", { level: 1,
    name: "HR help desk" })).toBeVisible();
  await clean(page);
  await page.getByRole("link", { name: /work visa renewal/ }).click();
  await page.getByLabel("Your reply")
    .fill("Your visa renewal starts this week.");
  await page.getByRole("button", { name: "Send reply" }).click();
  await expect(page.getByText("Your visa renewal starts this week."))
    .toBeVisible();
  await page.getByRole("button", { name: "Mark solved" }).click();
  await page.getByRole("tab", { name: "Details" }).click();
  await expect(page.getByText(/Solved by .*, HR manager, 27 October/))
    .toBeVisible();
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByRole("button", { name: "Mark solved" }))
    .toBeVisible();
});

test("profile-change-decision-names-who-and-undoes", async ({ page }) => {
  await page.goto("/#/people/requests/changes");
  await page.getByRole("link", { name: /Home address/ }).click();
  await page.getByRole("button", { name: "Update the record" }).click();
  await page.getByRole("tab", { name: "History" }).click();
  await expect(page.getByText(
    /Record updated by .*, HR manager, 27 October/)).toBeVisible();
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByRole("button", { name: "Update the record" }))
    .toBeVisible();
});

test("employee-asks-hr-and-hr-sees-the-ticket", async ({ page }, info) => {
  test.skip(info.project.name === "phone", "role menu is an avatar");
  await page.goto("/");
  await asRole(page, "Employee");
  await go(page, "#/me/hr-requests");
  await expect(page.getByRole("heading", { level: 1,
    name: "My requests and letters" })).toBeVisible();
  await clean(page);
  await page.getByRole("button", { name: "Ask HR a question" }).click();
  await page.getByLabel("In a few words").fill("Public holiday pay");
  await page.getByLabel("Your question").fill("Is National Day paid?");
  await page.getByRole("button", { name: "Send to HR" }).click();
  await expect(page.getByRole("link", { name: /Public holiday pay/ }))
    .toBeVisible();
  await asRole(page, "HR manager");
  await go(page, "#/people/requests/helpdesk");
  await expect(page.getByRole("link", { name: /Public holiday pay/ }))
    .toBeVisible();
});

test("calendar-help-and-splits-open-and-stay-clean", async ({ page }) => {
  await page.goto("/#/people/requests/splits");
  await expect(page.getByRole("heading", { level: 1,
    name: "Approval splits and resets" })).toBeVisible();
  await clean(page);
  await go(page, "#/people/requests/travel");
  await expect(page.getByRole("heading", { level: 1,
    name: "Travel and air tickets" })).toBeVisible();
  await clean(page);
  await go(page, "#/me/help");
  await page.getByLabel("Search help").fill("letter");
  await expect(page.getByRole("heading", { name: "Get a letter" }))
    .toBeVisible();
  await clean(page);
  for (const h of ["splits", "travel", "helpdesk", "changes"]) {
    await go(page, `#/people/requests/${h}`);
    await page.getByRole("heading", { level: 1 }).waitFor();
    const over = await page.evaluate(() =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth);
    expect(over).toBe(0);
  }
});
