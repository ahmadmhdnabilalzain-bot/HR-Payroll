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
  await expect(page.getByText(/Done by .*, HR manager, 27 October/))
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
  await page.getByRole("link", { name: /Bank account opening|Salary/ })
    .first().click();
  await expect(page.getByText(/Waiting|For signature/).first())
    .toBeVisible();
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
