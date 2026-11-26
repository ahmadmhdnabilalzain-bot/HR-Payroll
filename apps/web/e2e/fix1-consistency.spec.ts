import { expect, test, type Page } from "@playwright/test";

/** Rehearsal fixes: one figure everywhere, and who may see or do what. */

async function asRole(page: Page, name: string): Promise<void> {
  await page.getByRole("button", { name: /Viewing as/ }).click();
  await page.getByRole("menuitemradio", { name }).click();
}

const go = async (page: Page, hash: string): Promise<void> => {
  await page.evaluate((h) => { location.hash = h; }, hash);
};

test("other dues add to the settlement on its page and the brief",
  async ({ page }) => {
    await page.goto("/#/pay-run/settlements/emp-014");
    await expect(page.getByText("Gratuity and leave pay worked out; " +
      "notice pay and other dues to add").first()).toBeVisible();
    await page.getByRole("button", { name: "Add other dues" }).click();
    await page.getByLabel("Amount (AED)").fill("4500");
    await page.getByLabel("What it is for").fill("Notice pay, one month");
    await page.getByRole("button", { name: "Add to the settlement" })
      .click();
    await expect(page.getByText(/196,202\.27/).first()).toBeVisible();
    await go(page, "#/reports/owner-brief");
    await expect(page.getByRole("cell", { name: /196,202\.27/ }))
      .toBeVisible();
    await go(page, "#/pay-run/settlements/emp-014");
    await page.getByRole("button", { name: "Remove" }).click();
    await expect(page.getByText(/191,702\.27/).first()).toBeVisible();
  });

test("the GM decides crew overtime and the expense from Home",
  async ({ page }) => {
    await page.goto("/");
    await asRole(page, "General manager");
    const list = page.locator("section", { has: page.getByRole("heading",
      { name: "Approvals" }) });
    await expect(list.getByText("Crew overtime").first()).toBeVisible();
    await expect(list.getByText(/Waiting for Arjun Menon/)).toHaveCount(0);
  });
