import { expect, test, type Page } from "@playwright/test";

/** WP10: the inbox, Me and the IT Home, as each role uses them. */
async function asRole(page: Page, name: string): Promise<void> {
  await page.getByRole("button", { name: /Viewing as/ }).click();
  await page.getByRole("menuitemradio", { name }).click();
}

test("employee-sends-papers-from-home-and-reads-notes", async ({ page }) => {
  await page.goto("/");
  await asRole(page, "Employee");
  const bell = page.getByRole("button", { name: /Notifications, \d+ unread/ });
  await expect(bell).toBeVisible();
  await bell.click();
  await page.getByRole("button", { name: "Mark all as read" }).click();
  await page.getByRole("button", { name: "Close" }).click();
  await expect(page.getByRole("button", { name: "Notifications" }))
    .toBeVisible();

  await page.getByRole("link",
    { name: "Send your residence visa papers to HR" }).click();
  await expect(page).toHaveURL(/#\/me\/documents$/);
  await expect(page.getByRole("heading", { level: 1 }))
    .toHaveText("My documents");
  await page.getByRole("button", { name: "I sent the papers to HR" }).click();
  await expect(page.getByText("Sent to HR.")).toBeVisible();

  await page.getByRole("link", { name: "Home", exact: true }).first()
    .click();
  const todo = page.getByRole("region", { name: "To do" });
  await expect(todo.getByText("Done", { exact: true })).toBeVisible();
  await todo.getByRole("button", { name: "Undo" }).click();
  await expect(todo.getByText("This week")).toBeVisible();
});

test("me-pages-open-from-the-bar", async ({ page }) => {
  await page.goto("/");
  await asRole(page, "Employee");
  for (const [hash, title] of [["#/me/payslips", "My payslips"],
    ["#/me/leave", "My leave"], ["#/me/requests", "My requests"],
    ["#/me/profile", "Jose Reyes"]] as const) {
    await page.goto(`/${hash}`);
    await asRole(page, "Employee");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
  }
});

test("it-manager-checks-the-audit-chain", async ({ page }) => {
  await page.goto("/");
  await asRole(page, "IT manager");
  await expect(page.getByRole("link", { name: "Pay" })).toHaveCount(0);
  await page.getByRole("button", { name: "Check the chain" }).click();
  await expect(page.getByText(/All \d+ entries match/)).toBeVisible();
});

test("manager-sees-team-today", async ({ page }) => {
  await page.goto("/");
  await asRole(page, "Team manager");
  const team = page.getByRole("region", { name: "Team today" });
  await expect(team.getByRole("listitem").first()).toBeVisible();
});
