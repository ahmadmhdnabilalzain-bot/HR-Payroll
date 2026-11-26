import { expect, test } from "@playwright/test";

test("staff-request-decision-and-undo", async ({ page }) => {
  await page.goto("/#/people/papers/requests");
  await expect(page.getByRole("heading", { level: 1,
    name: "Staff requests" })).toBeVisible();
  await page.getByRole("link", { name: /Update bank details/ }).click();
  await page.getByRole("button", { name: "Start" }).click();
  await expect(page.getByRole("status")).toContainText("Request started");
  await page.getByRole("button", { name: "Mark done" }).click();
  await page.getByRole("tab", { name: "History" }).click();
  await expect(page.getByText(/Marked done by .*, HR manager, 27 October/))
    .toBeVisible();
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByRole("button", { name: "Mark done" }))
    .toBeVisible();
});

test("letter-requested-then-signed-by-the-general-manager", async ({
  page }) => {
  await page.goto("/#/people/papers/letters");
  await page.getByRole("button", { name: "Request a letter" }).click();
  await page.getByLabel("What it is for").fill("Bank account opening");
  await page.getByRole("button", { name: "Send for signature" }).click();
  const row = page.getByRole("link", { name: /Aisha Al Marri/ });
  await expect(row).toBeVisible();
  await row.click();
  await expect(page.getByText("For signature").first()).toBeVisible();
  await page.getByRole("button", { name: "View as General manager" })
    .click();
  await page.getByRole("button", { name: "Sign and issue" }).click();
  await expect(page.getByRole("button", { name: "Print" })).toBeVisible();
});

test("papers-are-for-hr-and-the-gm-only", async ({ page }, info) => {
  test.skip(info.project.name === "phone", "role menu is an avatar");
  await page.goto("/#/people/papers/warnings");
  await page.getByRole("button", { name: /HR manager/ }).click();
  await page.getByRole("menuitemradio", { name: /Employee/ }).click();
  await expect(page.getByRole("heading", { level: 1,
    name: "Outside your view" })).toBeVisible();
});

test("areas-are-reachable-from-the-people-section", async ({ page }) => {
  await page.goto("/#/s/people");
  for (const name of ["Staff requests", "Letters", "Visas", "Warnings",
    "Checks and dates", "Due dates", "Emiratisation", "Pension"]) {
    await expect(page.getByRole("link", { name }).first())
      .toBeVisible();
  }
  await page.getByRole("link", { name: /^Letters/ })
    .first().click();
  await expect(page.getByRole("heading", { level: 1, name: "Letters" }))
    .toBeVisible();
});

test("calendar-and-lists-do-not-scroll-sideways", async ({ page }) => {
  for (const hash of ["calendar", "requests", "compliance", "pension"]) {
    await page.goto(`/#/people/papers/${hash}`);
    await page.getByRole("heading", { level: 1 }).waitFor();
    const over = await page.evaluate(() =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth);
    expect(over).toBe(0);
  }
});

test("an issued letter prints alone", async ({ page }) => {
  await page.goto("/#/people/papers/letters/lt-1");
  await page.emulateMedia({ media: "print" });
  await expect(page.getByRole("article", { name: "Letter" }))
    .toBeVisible();
  await expect(page.getByRole("navigation").first()).toBeHidden();
});
