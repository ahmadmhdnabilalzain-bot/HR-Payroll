import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const live = (page: Page) => page.locator("[aria-live=polite]").first();

const clean = async (page: Page) => {
  const r = await new AxeBuilder({ page }).analyze();
  expect(r.violations.map((v) => v.id)).toEqual([]);
};
const h1 = (page: Page, name: string) =>
  expect(page.getByRole("heading", { level: 1, name })).toBeVisible();

test("letter-code-check-and-withdraw", async ({ page }) => {
  await page.goto("/#/people/verify/letters");
  await h1(page, "Verifiable letters");
  await clean(page);
  const code = (await page.locator("td, li").getByText(/^VL-/).first()
    .textContent())?.trim() ?? "";
  expect(code).toMatch(/^VL-/);
  await page.getByRole("link", { name: "Open the check page" }).click();
  await h1(page, "Check a letter");
  await page.getByLabel("Letter code").fill("VL-AAAA-BBBB");
  await page.getByRole("button", { name: "Check" }).click();
  await expect(live(page)).toContainText("Not found");
  await page.getByLabel("Letter code").fill(code.toLowerCase());
  await page.getByRole("button", { name: "Check" }).click();
  await expect(live(page)).toContainText(/Issued by .* for /);
  await expect(live(page)).not.toContainText(/AED/);
  await clean(page);
  await page.goto("/#/people/verify/letters");
  await page.getByRole("link", { name: new RegExp(code) }).first().click();
  await page.getByRole("button", { name: "Withdraw this code" }).click();
  await page.goto("/#/people/verify/check");
  await page.getByLabel("Letter code").fill(code);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(live(page)).toContainText("Withdrawn");
});

test("intake-lists-sample-and-takes-in-a-scan", async ({ page }) => {
  await page.goto("/#/people/verify/intake");
  await h1(page, "Document intake");
  await expect(page.getByText(/stays in this browser tab only/).first())
    .toBeVisible();
  await expect(page.getByText("Not filed yet").first()).toBeVisible();
  await clean(page);
  await page.getByRole("button", { name: "Add a scanned document" })
    .click();
  await page.getByLabel("Scanned file").setInputFiles({
    name: "licence-scan.pdf", mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4 demo") });
  await page.getByLabel("Expiry date").fill("2027-02-01");
  await page.getByRole("button", { name: "Take in" }).click();
  await expect(page.getByText("licence-scan.pdf").first()).toBeVisible();
  await page.goto("/#/people/verify/expiry");
  await h1(page, "Document expiry list");
  await expect(page.getByText("Taken in").first()).toBeVisible();
  await clean(page);
});
