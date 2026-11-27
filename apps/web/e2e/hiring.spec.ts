import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/** Let entrances and exits settle: axe reads colours mid-fade. */
async function settle(page: Page): Promise<void> {
  await page.waitForFunction(() => document.getAnimations().every((x) =>
    x.playState !== "running" ||
    x.effect?.getTiming().iterations === Infinity));
}

/**
 * Hiring budget and hiring requests: a manager raises a request, HR
 * asks for changes and sends it on, the General manager signs off a
 * request and a budget change, and IT is turned away. All in one
 * session (the demo keeps its state in memory), with the thread on the
 * request instead of email.
 */
async function asRole(page: Page, name: string): Promise<void> {
  await page.getByRole("button", { name: /Viewing as/ }).click();
  await page.getByRole("menuitemradio", { name }).click();
}

async function go(page: Page, hash: string): Promise<void> {
  await page.evaluate((h) => { location.hash = h; }, hash);
}

const h1 = (page: Page) => page.getByRole("heading", { level: 1 });

test("manager raises a hire; HR asks for changes, then sends it on",
  async ({ page }) => {
    await page.goto("/");
    await asRole(page, "Team manager");
    await go(page, "#/people/hiring/requests");
    await expect(h1(page)).toHaveText("My hiring requests");
    await page.locator('a[href$="/hiring/requests/new"]').first().click();
    await expect(h1(page)).toHaveText("Request a hire");
    await expect(page.getByRole("textbox", { name: "Job description" }))
      .toHaveValue(/What you will do:/);
    // The start is said in words; days before tomorrow cannot be picked.
    const date = page.getByRole("button", { name: /^Target start date/ });
    await expect(date).toHaveText(/^4 January 2027$/);
    await date.click();
    for (let i = 0; i < 3; i += 1) {
      await page.getByRole("button", { name: "Previous month" }).click();
    }
    await expect(page.getByRole("button", { name: "26 October 2026",
      exact: true }))
      .toBeDisabled();
    for (let i = 0; i < 4; i += 1) {
      await page.getByRole("button", { name: "Next month" }).click();
    }
    await page.getByRole("button", { name: "1 February 2027",
      exact: true }).click();
    await expect(date).toHaveAccessibleName(
      "Target start date: 1 February 2027");
    // Keys: Page Down moves a month and keeps the focus; Escape returns.
    await date.click();
    await page.keyboard.press("PageDown");
    await expect(page.getByRole("button", { name: "1 March 2027",
      exact: true })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(date).toBeFocused();
    // The cost summary follows the headcount; the bar carries it too.
    const sum = page.getByRole("complementary", { name: "Cost summary" });
    await expect(sum).toContainText("1 person, from 1 Feb 2027");
    await page.getByRole("button", { name: /^How many people/ }).click();
    await page.getByRole("option", { name: "2 people" }).click();
    await expect(sum).toContainText("2 people");
    await page.getByRole("button", { name: /^How many people/ }).click();
    await page.getByRole("option", { name: "1 person" }).click();
    await page.getByLabel("Days to find someone").fill("5");
    await page.getByRole("button", { name: "Send for sign-off" }).click();
    await expect(page.getByRole("alert")).toContainText("14 to 120");
    await page.getByLabel("Days to find someone").fill("45");
    await page.getByRole("button", { name: "Save draft" }).click();
    await expect(page.getByRole("status").filter({ hasText:
      "Draft saved" })).toBeVisible();
    await settle(page);
    const form = await new AxeBuilder({ page }).analyze();
    expect(form.violations).toEqual([]);
    await go(page, "#/people/hiring/requests");
    await page.locator('a[href$="/hiring/requests/new"]').first().click();
    await expect(page.getByText(/Your draft, saved/)).toBeVisible();
    await expect(date).toHaveAccessibleName(
      "Target start date: 1 February 2027");
    await page.getByRole("button", { name: "Send for sign-off" }).click();
    await expect(page.getByText("With HR").first()).toBeVisible();
    await page.getByRole("tab", { name: /Messages/ }).click();
    await page.getByLabel("Write a message").fill("Can we start in " +
      "February?");
    await page.getByRole("button", { name: "Send", exact: true }).click();
    await expect(page.getByText("Can we start in February?"))
      .toBeVisible();
    await settle(page);
    const bad = await new AxeBuilder({ page }).analyze();
    expect(bad.violations).toEqual([]);

    await asRole(page, "HR manager");
    await go(page, "#/");
    await expect(page.getByText(/Review the hiring request for/).first())
      .toBeVisible();
    await go(page, "#/people/hiring/requests");
    await expect(page.getByRole("heading", { level: 1 }))
      .toHaveText("Hiring requests");
    await expect(page.getByText("HR-REQ-2026-0007").first()).toBeVisible();
    await go(page, "#/people/hiring/requests/hreq-new-1");
    await page.getByRole("button", { name: "Ask for changes" }).click();
    await page.getByRole("button", { name: "Ask for changes" }).last()
      .click();
    await expect(page.getByRole("alert")).toContainText("Say what");
    await page.getByLabel("What and why").fill("Name the branch.");
    await page.getByRole("button", { name: "Ask for changes" }).last()
      .click();
    await expect(page.getByText("Changes asked").first()).toBeVisible();
    await page.getByRole("button", { name: "Undo" }).first().click();
    await expect(page.getByText("With HR").first()).toBeVisible();
    await page.getByRole("button", { name: "Send for sign-off" }).click();
    await page.getByRole("button", { name: "Send for sign-off" }).last()
      .click();
    await expect(page.getByText("Waiting for sign-off").first())
      .toBeVisible();
  });

test("GM signs off a request and a budget change; the trail shows it",
  async ({ page }) => {
    await page.goto("/");
    await asRole(page, "General manager");
    await go(page, "#/people/hiring/requests/hreq-006");
    await expect(h1(page)).toHaveText("AML analyst");
    // The decision is made with the cost in view, and its working.
    const side = page.getByRole("complementary", { name: "Summary" });
    await expect(side).toContainText("First-year cost");
    await expect(side).toContainText("257,661");
    await expect(side).toContainText("Left unspent today");
    await page.getByRole("button", { name: /First-year cost/ }).click();
    await expect(page.getByRole("dialog")).toContainText("Twelve payroll");
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Sign off" }).first().click();
    await page.getByRole("button", { name: "Sign off" }).last().click();
    await expect(page.getByText("Open position").first()).toBeVisible();
    await page.getByRole("tab", { name: "Timeline" }).click();
    await expect(page.getByText(/Due 30 Oct 2026, in 3 days/))
      .toBeVisible();
    await go(page, "#/people/hiring/budget");
    await expect(h1(page)).toHaveText("Hiring budget");
    await expect(page.getByText("AML analyst").first()).toBeVisible();
    await go(page, "#/people/hiring/budget/bud-pos-014");
    await page.getByRole("button", { name: /First-year budget/ }).first()
      .click();
    await expect(page.getByRole("dialog")).toContainText("Twelve payroll");
    await page.keyboard.press("Escape");
    await expect(page.getByText("First year if signed off")).toBeVisible();
    await page.getByRole("button", { name: "Sign off the change" }).click();
    await expect(page.getByRole("status").first())
      .toContainText("budget change signed off");
    await settle(page);
    const bad = await new AxeBuilder({ page }).analyze();
    expect(bad.violations).toEqual([]);
    await go(page, "#/reports/audit");
    await expect(page.getByText(/signed off the hiring request for AML/)
      .first()).toBeVisible();
  });

test("the manager, IT and the employee are turned away",
  async ({ page }) => {
    await page.goto("/");
    await asRole(page, "Team manager");
    for (const hash of ["#/people/hiring/budget",
      "#/people/hiring/budget/bud-pos-014",
      "#/people/hiring/requests/hreq-002"]) {
      await go(page, hash);
      await expect(h1(page)).toContainText("outside your view");
    }
    for (const role of ["IT manager", "Employee"]) {
      await asRole(page, role);
      for (const hash of ["#/people/hiring/budget",
        "#/people/hiring/requests", "#/people/hiring/requests/hreq-002"]) {
        await go(page, hash);
        await expect(h1(page)).toContainText("outside your view");
        await expect(page.getByText(/AED \d/)).toHaveCount(0);
      }
    }
  });

test("a candidate on the board links to the position", async ({ page }) => {
  await page.goto("/#/people/moves/board");
  await page.getByRole("button", { name: "Layla Barakat", exact: true })
    .click();
  await page.getByRole("link", { name: /Relationship manager, HR-REQ/ })
    .click();
  await expect(h1(page)).toHaveText("Relationship manager");
  await page.getByRole("tab", { name: "Candidates" }).click();
  await expect(page.getByText("Layla Barakat")).toBeVisible();
});
