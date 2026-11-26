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
