import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const roleAs = async (page: Page, name: string): Promise<void> => {
  await page.locator("button[aria-haspopup=menu]").click();
  await page.getByRole("menuitemradio", { name }).click();
};
const clean = async (page: Page) => {
  const r = await new AxeBuilder({ page }).analyze();
  expect(r.violations.map((v) => v.id)).toEqual([]);
};

test("a question is answered by a quote with a section citation",
  async ({ page }) => {
    await page.goto("/#/me/policies");
    await page.getByLabel("Your question").fill("How do I report sick?");
    await page.getByRole("button", { name: "Find in policies" }).click();
    await expect(page.getByText(/medical report/).first())
      .toBeVisible();
    await page.getByRole("link", { name: "Leave policy, section 3.2" })
      .click();
    await expect(page.getByRole("heading", { name: "3.2 Sick leave" }))
      .toBeVisible();
    await page.getByRole("button", { name: "Acknowledge" }).click();
    await expect(page.getByText(/Acknowledged by/)).toBeVisible();
    await clean(page);
  });

test("an uncovered question offers Ask HR, in the app", async ({ page }) => {
  await page.goto("/#/me/policies");
  await page.getByLabel("Your question").fill("zebra crossing");
  await page.getByRole("button", { name: "Find in policies" }).click();
  await expect(page.getByText("Not covered in our policies")).toBeVisible();
  await page.getByRole("button", { name: "Ask HR", exact: true }).click();
  await expect(page.getByText(/Question sent to HR/)).toBeVisible();
  await roleAs(page, "IT manager");
  await page.goto("/#/me/policies");
  await expect(page.getByText("All policies")).toBeVisible();
  await clean(page);
});
