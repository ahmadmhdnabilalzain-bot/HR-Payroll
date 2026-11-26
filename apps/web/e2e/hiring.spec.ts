import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

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
    await page.getByRole("link", { name: "Request a hire" }).first().click();
    await expect(h1(page)).toHaveText("Request a hire");
    await expect(page.getByLabel("Job description"))
      .toHaveValue(/What you will do:/);
    await page.getByLabel("Target start date").fill("2026-10-01");
    await page.getByRole("button", { name: "Send to HR" }).click();
    await expect(page.getByRole("alert")).toContainText("must be after");
    await page.getByLabel("Target start date").fill("2027-02-01");
    await page.getByRole("button", { name: "Send to HR" }).click();
    await expect(page.getByText("With HR").first()).toBeVisible();
    await page.getByRole("tab", { name: /Messages/ }).click();
    await page.getByLabel("Write a message").fill("Can we start in " +
      "February?");
    await page.getByRole("button", { name: "Send", exact: true }).click();
    await expect(page.getByText("Can we start in February?"))
      .toBeVisible();
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
    await page.getByRole("button", { name: "Sign off the change" }).click();
    await expect(page.getByRole("status").first())
      .toContainText("budget change signed off");
    const bad = await new AxeBuilder({ page }).analyze();
    expect(bad.violations).toEqual([]);
    await go(page, "#/reports/audit");
    await expect(page.getByText(/signed off the hiring request for AML/)
      .first()).toBeVisible();
  });

test("IT and the employee are turned away, with no amounts",
  async ({ page }) => {
    await page.goto("/");
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
