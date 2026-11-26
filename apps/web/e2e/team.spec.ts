import { expect, test } from "@playwright/test";

test("org-chart-opens-searches-and-walks-with-the-keyboard", async ({
  page }) => {
  await page.goto("/#/people/team/org");
  await expect(page.getByRole("heading", { level: 1,
    name: "Organisation chart" })).toBeVisible();
  await expect(page.getByText("Omar Farouk")).toHaveCount(0);
  await page.getByRole("button", { name: "Show Rashid Al Falasi's team" })
    .click();
  await expect(page.getByText("Omar Farouk")).toBeVisible();
  const first = page.locator("[data-person]").first();
  await first.focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.locator("[data-person]").nth(1)).toBeFocused();
  await page.getByRole("searchbox").fill("kavya");
  await expect(page.locator("[data-person]")).toHaveCount(3);
  await expect(page.getByRole("link", { name: /Kavya Iyer/ })).toBeVisible();
  await page.getByRole("searchbox").fill("zzzz");
  await expect(page.getByText("Nobody matches")).toBeVisible();
});

test("probation-is-recorded-then-decided-and-undone", async ({ page },
info) => {
  await page.goto("/#/people/growth/probation");
  await expect(page.getByRole("heading", { level: 1,
    name: "Probation evaluations" })).toBeVisible();
  await expect(page.getByRole("button", { name: /21 Mar 2027/ }))
    .toBeVisible();
  await page.getByRole("button", { name: "Record evaluation" }).click();
  await page.getByRole("button", { name: "Send for decision" }).click();
  await expect(page.getByText("Waiting for decision")).toBeVisible();
  await expect(page.getByText(/Fatima Al Ketbi, HR manager, \d+ Oct 2026/))
    .toBeVisible();
  await page.getByRole("button", { name: "Withdraw" }).click();
  await expect(page.getByRole("button", { name: "Record evaluation" }))
    .toBeVisible();
  if (info.project.name === "phone") return;
  await page.getByRole("button", { name: "Record evaluation" }).click();
  await page.getByRole("button", { name: "Send for decision" }).click();
  await page.getByRole("button", { name: /HR manager/ }).click();
  await page.getByRole("menuitemradio", { name: /General manager/ }).click();
  await page.getByRole("button", { name: "Confirm employment" }).click();
  await expect(page.getByText(/Khalid Al Nuaimi, General manager/))
    .toBeVisible();
  await page.getByRole("button", { name: "Undo", exact: true }).first()
    .click();
  await expect(page.getByRole("button", { name: "Confirm employment" }))
    .toBeVisible();
});

test("appraisal-reminder-is-recorded-and-undone", async ({ page }) => {
  await page.goto("/#/people/growth/appraisals");
  await page.getByRole("button", { name: /^Remind \d+ people$/ }).click();
  await expect(page.getByText(/Reminded on 27 October 2026 by/))
    .toBeVisible();
  await page.getByRole("button", { name: "Undo reminder" }).click();
  await expect(page.getByRole("button", { name: /^Remind \d+ people$/ }))
    .toBeVisible();
});

test("a-manager-is-sent-outside-the-view", async ({ page }, info) => {
  test.skip(info.project.name === "phone", "role menu is desktop only");
  await page.goto("/#/people/team/org");
  await page.getByRole("button", { name: /HR manager/ }).click();
  await page.getByRole("menuitemradio", { name: /Team manager/ }).click();
  await expect(page.getByRole("heading", { level: 1,
    name: "This profile is outside your view." })).toBeVisible();
});
