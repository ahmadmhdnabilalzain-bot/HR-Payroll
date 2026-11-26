import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const clean = async (page: Page) => {
  const r = await new AxeBuilder({ page }).analyze();
  expect(r.violations.map((v) => v.id)).toEqual([]);
};
const roleAs = async (page: Page, name: string): Promise<void> => {
  await page.locator("button[aria-haspopup=menu]").click();
  await page.getByRole("menuitemradio", { name }).click();
};

test("new hire registered, pack appears, signed on a phone, HR sees it",
  async ({ page }) => {
    await page.goto("/#/people/more/new");
    await page.getByRole("button", { name: "Add employee" }).click();
    await page.getByLabel("Full name").fill("Noor Al Hashimi");
    await page.getByLabel("Department").selectOption("dept-retail");
    await page.getByLabel("Job title")
      .selectOption("customer-service-officer");
    await page.getByRole("combobox", { name: "Grade" })
      .selectOption("3");
    await page.getByLabel("Place").selectOption("br-al-ain");
    await page.getByLabel("Monthly basic pay (AED)").fill("9000");
    await page.getByLabel("Start date").fill("2026-11-16");
    await page.getByRole("button", { name: "Send for sign-off" }).click();
    const row = page.getByRole("listitem")
      .filter({ hasText: "Noor Al Hashimi" });
    await expect(row.getByText("Signing pack: 0 of 7 signed")).toBeVisible();
    await clean(page);
    await row.getByRole("button", { name: /Send a reminder/ }).click();
    await expect(row.getByText(/Reminder sent 27 October/)).toBeVisible();
    const link = await row.getByRole("link", {
      name: /Open the signing link/ }).getAttribute("href");
    expect(link).toMatch(/^#\/people\/esign\/link\//);

    await page.goto("/#/people/esign/profiles");
    await expect(page.getByText("noor.al.hashimi@zarqan-demo.test"))
      .toBeVisible();

    await page.setViewportSize({ width: 393, height: 852 });
    await roleAs(page, "Employee");
    await page.goto(`/${link!}`);
    await expect(page.getByRole("heading", { level: 1,
      name: "Documents to sign for Noor Al Hashimi" })).toBeVisible();
    await clean(page);
    await page.getByRole("button", {
      name: "Sign document electronically: Confidentiality agreement" })
      .click();
    const sheet = page.getByRole("dialog");
    await expect(sheet.getByText(/no legal validity is claimed/))
      .toBeVisible();
    await expect(sheet.getByText(/^Fingerprint/).first()).toBeVisible();
    await sheet.getByLabel("Type your full name").fill("Noor Al Hashimi");
    await sheet.getByRole("button", { name: "Sign", exact: true }).click();
    await expect(sheet.getByRole("alert")).toContainText("Tick the box");
    await sheet.getByLabel(/I confirm I have read this document/).check();
    await clean(page);
    await sheet.getByRole("button", { name: "Sign", exact: true }).click();
    await expect(page.getByText(/Signed: Confidentiality agreement/))
      .toBeVisible();
    await expect(page.getByRole("button", { name: "Undo my signature" }))
      .toBeVisible();

    await page.setViewportSize({ width: 1280, height: 800 });
    await roleAs(page, "HR manager");
    await page.goto("/#/people/more/new");
    await expect(page.getByRole("listitem")
      .filter({ hasText: "Noor Al Hashimi" })
      .getByText("Signing pack: 1 of 7 signed")).toBeVisible();
    await page.goto("/#/people/files/signatures");
    await page.getByRole("searchbox").fill("Noor Al Hashimi");
    await page.getByRole("button", { name: /^All/ }).click();
    await page.getByRole("link", { name: /Confidentiality agreement/ })
      .first().click();
    await expect(page.getByText("Noor Al Hashimi, Customer service " +
      "officer").first()).toBeVisible();
    await page.getByRole("tab", { name: "Audit trail" }).click();
    await expect(page.getByText(/Signed \(typed name\)/)).toBeVisible();
    await clean(page);
  });

test("the employee's Documents to sign and the To sign count on Home",
  async ({ page }) => {
    await page.goto("/#/home");
    await expect(page.getByRole("link", { name: /^Sign \d+ document/ }))
      .toBeVisible();
    await roleAs(page, "Employee");
    await expect(page.getByRole("link", { name: /^Sign \d+ document/ }))
      .toBeVisible();
    await page.getByRole("link", { name: /^Sign \d+ document/ }).click();
    await expect(page.getByRole("heading", { level: 1,
      name: "Documents to sign" })).toBeVisible();
    await clean(page);
  });

test("the sign option on host screens, lists and every sheet state",
  async ({ page }) => {
    await page.goto("/#/people/papers/letters/lt-2");
    await page.getByRole("tab", { name: "E-signature" }).click();
    await expect(page.getByText("Awaiting signature").first())
      .toBeVisible();
    await clean(page);
    await page.getByRole("button", {
      name: "Sign document electronically: Salary certificate" }).click();
    await expect(page.getByRole("dialog").getByRole("status"))
      .toContainText("Only the people listed");
    await clean(page);
    await page.keyboard.press("Escape");
    for (const path of ["profiles", "links"]) {
      await page.goto(`/#/people/esign/${path}`);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await clean(page);
    }
    await roleAs(page, "Employee");
    await page.goto("/#/me/profile");
    await page.getByRole("tab", { name: "E-signature" }).click();
    await page.getByRole("button", {
      name: "Sign document electronically: Bank details form" }).click();
    const sheet = page.getByRole("dialog");
    await sheet.getByLabel("Draw my signature").check();
    await sheet.getByRole("button", { name: "Sign", exact: true }).click();
    await expect(sheet.getByRole("alert")).toContainText("Draw your");
    await clean(page);
    await sheet.getByRole("button", { name: "Decline" }).click();
    await sheet.getByLabel("Reason").fill("Wrong account");
    await clean(page);
    await sheet.getByRole("button", { name: "Decline to sign" }).click();
    await expect(page.getByText("Declined").first()).toBeVisible();
  });
