import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const roleAs = async (page: Page, name: string): Promise<void> => {
  await page.locator("button[aria-haspopup=menu]").click();
  await page.getByRole("menuitemradio", { name }).click();
};

test("new employee: HR adds from the offer, the GM signs off", async ({
  page }) => {
  await page.goto("/#/people/more/new");
  await page.getByRole("button", { name: /Add record: Faisal/ }).click();
  await page.getByRole("button", { name: "Send for sign-off" }).click();
  await expect(page.getByText("Waiting for sign-off")).toBeVisible();
  await page.getByRole("button", { name: "View as General manager" })
    .click();
  await page.getByRole("button", { name: /Sign off: Faisal/ }).click();
  await expect(page.getByText("Signed off").first()).toBeVisible();
  await expect(page.getByText(/Joins the staff list on 16 November/))
    .toBeVisible();
  await page.getByRole("button", { name: "Undo", exact: false }).first()
    .click();
  await expect(page.getByText("Waiting for sign-off")).toBeVisible();
});

test("new employee: a basic pay outside the band is refused", async ({
  page }) => {
  await page.goto("/#/people/more/new");
  await page.getByRole("button", { name: /Add record: Faisal/ }).click();
  await page.getByLabel("Monthly basic pay (AED)").fill("90000");
  await page.getByRole("button", { name: "Send for sign-off" }).click();
  await expect(page.getByRole("alert")).toContainText("Basic pay for grade");
});

test("cover: a manager asks, HR agrees", async ({ page }) => {
  await page.goto("/#/home");
  await roleAs(page, "Team manager");
  await page.goto("/#/me/cover");
  await page.getByRole("button", { name: /Set cover: Arjun/ }).click();
  await page.getByLabel("From", { exact: true }).fill("2026-11-02");
  await page.getByLabel("To", { exact: true }).fill("2026-11-06");
  await page.getByRole("button", { name: "Send for agreement" }).click();
  await expect(page.getByText(/Waiting for Fatima/)).toBeVisible();
  await roleAs(page, "HR manager");
  await page.goto("/#/people/more/cover");
  await page.getByRole("button", { name: /^To agree/ }).click();
  await page.getByRole("button", { name: /Agree: Arjun/ }).click();
  await page.getByRole("button", { name: /^In place/ }).click();
  await expect(page.locator("span[data-tone=ok]")).toHaveText("In place");
});

test("expenses: an employee sends a claim, the manager decides it", async ({
  page }) => {
  await page.goto("/#/home");
  await roleAs(page, "Employee");
  await page.goto("/#/me/expenses");
  await page.getByRole("button", { name: "New claim" }).click();
  await page.getByLabel("What it is for").selectOption("Taxi and parking");
  await page.getByLabel("Amount (AED)").fill("85.50");
  await page.getByRole("button", { name: "Send claim" }).click();
  await expect(page.getByText("Waiting for Arjun Menon")).toBeVisible();
  await roleAs(page, "Team manager");
  await page.goto("/#/me/expenses");
  await expect(page.getByText("Claims waiting for you")).toBeVisible();
  await page.getByRole("button", { name: /^Agree: Jose/ }).click();
  await roleAs(page, "Employee");
  await page.goto("/#/me/expenses");
  await expect(page.getByText("Agreed", { exact: true })).toBeVisible();
});

test("expenses: a bad amount is refused in plain words", async ({ page }) => {
  await page.goto("/#/home");
  await roleAs(page, "Employee");
  await page.goto("/#/me/expenses");
  await page.getByRole("button", { name: "New claim" }).click();
  await page.getByLabel("What it is for").selectOption("Travel");
  await page.getByLabel("Amount (AED)").fill("abc");
  await page.getByRole("button", { name: "Send claim" }).click();
  await expect(page.getByRole("alert")).toContainText("as a number");
});

test("time card: ask for a correction, the manager agrees", async ({
  page }) => {
  await page.goto("/#/home");
  await roleAs(page, "Employee");
  await page.goto("/#/me/timecard");
  await page.getByRole("button", { name: /^Correct:/ })
    .first().click();
  await page.getByLabel("Reason").fill("The reader was down");
  await page.getByRole("button", { name: "Send correction" }).click();
  await expect(page.getByText("Waiting for Arjun Menon")).toBeVisible();
  await roleAs(page, "Team manager");
  await page.goto("/#/me/timecard");
  await page.getByRole("button", { name: /^Agree: Jose/ }).click();
  await expect(page.getByText("Agreed").first()).toBeVisible();
});

test("kpis and team reviews open for a manager", async ({ page }) => {
  await page.goto("/#/home");
  await roleAs(page, "Team manager");
  await page.goto("/#/me/kpis");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("My KPIs");
  await page.goto("/#/me/team-reviews");
  await expect(page.getByText("No one in your team is on probation."))
    .toBeVisible();
});

const PAGES: [string, string, string][] = [
  ["people/more/new", "HR manager", "New employee"],
  ["people/more/cover", "HR manager", "Approval cover"],
  ["me/expenses", "Employee", "My expenses"],
  ["me/timecard", "Employee", "My time card"],
  ["me/kpis", "Employee", "My KPIs"],
  ["me/team-reviews", "Team manager", "Team probation and appraisal"],
];

for (const [hash, role, title] of PAGES) {
  test(`axe clean: ${title}`, async ({ page }) => {
    await page.goto("/#/home");
    await roleAs(page, role);
    await page.goto(`/#/${hash}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
    await page.waitForTimeout(400);
    const r = await new AxeBuilder({ page }).analyze();
    expect(r.violations.map((v) => v.id)).toEqual([]);
  });
}
