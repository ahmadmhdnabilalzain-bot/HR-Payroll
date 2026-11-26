import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function asRole(page: Page, name: string): Promise<void> {
  await page.getByRole("button", { name: /Viewing as/ }).click();
  await page.getByRole("menuitemradio", { name }).click();
}

test("exit-flow-steps-flags-and-settlement", async ({ page }) => {
  await page.goto("/#/pay-run/more/exit");
  await expect(page.getByRole("heading", { level: 1,
    name: "People leaving" })).toBeVisible();
  await page.getByRole("link", { name: /James Whitfield/ }).click();
  await expect(page.getByRole("heading", { level: 1,
    name: "James Whitfield" })).toBeVisible();
  await expect(page.getByText("Pay by").first()).toBeVisible();
  await page.getByRole("tab", { name: "To check" }).click();
  await expect(page.getByText(/The final dues are paid within/)).toBeVisible();
  await expect(page.getByText("Steps still open")).toBeVisible();
  await page.getByRole("tab", { name: "Steps" }).click();
  await page.getByRole("button", { name: /Mark done.*Final settlement paid/ })
    .click();
  await page.getByRole("tab", { name: "To check" }).click();
  await expect(page.getByRole("list", { name: "Legal and pay flags" }))
    .not.toContainText("Final settlement paid");
  await page.getByRole("tab", { name: "Settlement" }).click();
  await expect(page.getByRole("tabpanel", { name: "Settlement" })
    .getByText("Gratuity and leave pay so far")).toBeVisible();
  const bad = await new AxeBuilder({ page }).analyze();
  expect(bad.violations).toEqual([]);
  await page.getByRole("link", { name: "Open the settlement" }).click();
  await expect(page.getByText("Statement").first()).toBeVisible();
});

test("a-switch-is-recorded-and-undone", async ({ page }) => {
  await page.goto("/");
  await asRole(page, "IT manager");
  await page.evaluate(() => { location.hash = "#/setup/more/whatsapp"; });
  await expect(page.getByRole("heading", { level: 1,
    name: "Decisions by WhatsApp" })).toBeVisible();
  await expect(page.getByText(/Nothing is connected yet/))
    .toBeVisible();
  await page.getByRole("button", { name: "Edit" }).first().click();
  await page.getByRole("textbox").fill("maybe");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("alert")).toContainText("Type one of");
  await page.getByRole("textbox").fill("on");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText(/Decisions by WhatsApp set to On/).first())
    .toBeVisible();
  await expect(page.getByRole("listitem").filter({
    hasText: "Decisions by WhatsApp set to On" }).last())
    .toContainText(/\w+ \w+, \w+/);
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByText(/set to On \(undone\)/)).toBeVisible();
  const bad = await new AxeBuilder({ page }).analyze();
  expect(bad.violations).toEqual([]);
  await page.evaluate(() => { location.hash = "#/setup/more/email-in"; });
  await expect(page.getByText(/Bank letter from/).first()).toBeVisible();
  await page.evaluate(() => { location.hash = "#/setup/more/calendar"; });
  await expect(page.getByRole("heading", { level: 1,
    name: "Calendar feeds" })).toBeVisible();
  const bad2 = await new AxeBuilder({ page }).analyze();
  expect(bad2.violations).toEqual([]);
});

test("the-new-pages-turn-away-an-employee", async ({ page }) => {
  await page.goto("/");
  await asRole(page, "Employee");
  for (const hash of ["#/pay-run/more/exit", "#/setup/more/whatsapp"]) {
    await page.evaluate((h) => { location.hash = h; }, hash);
    await expect(page.getByRole("heading", { level: 1,
      name: "This page is outside your view." })).toBeVisible();
  }
});

test("prior-pay-is-entered-by-hr-and-checked-by-the-gm", async ({ page }) => {
  await page.goto("/#/pay-run/more/prior");
  await expect(page.getByRole("heading", { level: 1,
    name: "Prior-employment pay" })).toBeVisible();
  await expect(page.getByText("None entered").first()).toBeVisible();
  await page.getByRole("button", { name: /Add record.*Kavya Iyer/ }).click();
  await page.getByLabel("Earlier employer").fill("Gulf Trade Bank");
  await page.getByLabel("From", { exact: true }).fill("2021-02-01");
  await page.getByLabel("To", { exact: true }).fill("2026-09-30");
  await page.getByLabel(/Last monthly pay/).fill("0");
  await page.getByRole("button", { name: "Save the record" }).click();
  await expect(page.getByRole("alert")).toContainText("amount in AED");
  await page.getByLabel(/Last monthly pay/).fill("18500");
  await page.getByRole("button", { name: "Save the record" }).click();
  await expect(page.getByText(/Gulf Trade Bank/)).toBeVisible();
  await expect(page.getByText(/Entered by .*HR manager/)).toBeVisible();
  const bad = await new AxeBuilder({ page }).analyze();
  expect(bad.violations).toEqual([]);
  await asRole(page, "General manager");
  await page.getByRole("button", { name: /Mark checked.*Kavya Iyer/ })
    .click();
  await expect(page.getByText(/Checked by Khalid Al Nuaimi/)).toBeVisible();
});
