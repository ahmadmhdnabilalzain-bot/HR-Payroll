import { expect, test } from "@playwright/test";

/**
 * Hiring, joining and leaving: one flow per kind of screen, on the
 * desktop and the phone project. Each step shows who did it, and has an
 * undo.
 */
test("joiner: mark a step done and undo it", async ({ page }) => {
  await page.goto("/#/people/moves/joiners/join-001");
  const stat = page.locator("dl").first();
  await expect(stat).toContainText("7 of 10");
  await page.getByRole("button", { name: /Mark done/ }).first().click();
  await expect(stat).toContainText("8 of 10");
  await expect(page.getByText(/Done by .*HR manager/).first())
    .toBeVisible();
  await page.getByRole("button", { name: "Undo", exact: false }).first()
    .click();
  await expect(stat).toContainText("7 of 10");
});

test("leaver: the gratuity opens its working", async ({ page }) => {
  await page.goto("/#/people/moves/leavers/emp-014");
  await page.getByRole("tab", { name: "Final settlement" }).click();
  await page.getByRole("button", { name: /End-of-service gratuity/ })
    .first().click();
  const panel = page.getByRole("dialog");
  await expect(panel).toContainText("How it is worked out");
  await expect(panel).toContainText("21 days a year");
});

test("board: move a candidate on, then undo", async ({ page }) => {
  await page.goto("/#/people/moves/board");
  await page.getByRole("button", { name: /Move to Screening for Tess/ })
    .click();
  await expect(page.getByRole("status")).toContainText("Tess Alvarez");
  await page.getByRole("button", { name: "Undo" }).first().click();
  await expect(page.getByRole("button", {
    name: /Move to Screening for Tess/ })).toBeVisible();
});

test("offer: sign-off goes to the General manager", async ({ page }) => {
  await page.goto("/#/people/moves/offers/offer-005");
  await page.getByRole("button", { name: /to sign off/ }).click();
  await expect(page.getByText("Waiting").first()).toBeVisible();
  await page.getByRole("button", { name: "View as General manager" })
    .click();
  await page.getByRole("button", { name: "Sign off and send" }).click();
  await expect(page.getByText("With candidate")).toBeVisible();
});

test("resignation: recorded, waiting, withdrawn", async ({ page }) => {
  await page.goto("/#/people/moves/end");
  await page.getByRole("button", { name: "Record a resignation" }).click();
  const sheet = page.getByRole("dialog");
  await sheet.getByLabel("Person").selectOption({ index: 1 });
  await sheet.getByLabel("Last working day").fill("2027-01-15");
  await sheet.getByRole("button", { name: /Send to the General/ }).click();
  await expect(page.getByText(/Waiting for/)).toBeVisible();
  await page.getByRole("button", { name: "Withdraw" }).click();
  await expect(page.getByText(/Waiting for/)).toHaveCount(0);
});

test("other roles are kept out", async ({ page }) => {
  // The phone bar has no role button (the avatar menu is covered by
  // the unit tests of the guard).
  test.skip(test.info().project.name === "phone");
  await page.goto("/");
  await page.getByRole("button", { name: /HR manager/ }).click();
  await page.getByRole("menuitemradio", { name: /Employee/ }).click();
  await page.goto("/#/people/moves/leavers");
  await expect(page.getByRole("heading", { name: "Outside your view" }))
    .toBeVisible();
});
