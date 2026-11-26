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
      { name: "Decisions" }) });
    await expect(list.getByText("Crew overtime").first()).toBeVisible();
    await expect(list.getByText(/Waiting for Arjun Menon/)).toHaveCount(0);
  });

const MONEY = /AED[\s ]*[+−-]?\d|\d{1,3}(,\d{3})+\.\d{2}/;

async function noAmounts(page: Page, hashes: string[]): Promise<void> {
  for (const h of hashes) {
    await go(page, h);
    await page.locator("main h1").first().waitFor();
    await page.waitForTimeout(300);
    const text = await page.locator("main").innerText();
    expect(text.match(MONEY)?.[0] ?? "", h).toBe("");
  }
}

test("hide amounts masks every amount written as text", async ({ page,
  viewport }) => {
  // The phone bar keeps the toggle in a menu; the masking is the same.
  test.skip((viewport?.width ?? 0) < 600, "toggle is on the desktop bar");
  await page.goto("/");
  await page.getByRole("button", { name: "Hide amounts" }).click();
  await noAmounts(page, ["#/home", "#/home/tasks",
    "#/time-off/more/liability", "#/reports/audit", "#/setup/access/rules"]);
});

test("the IT manager reads no pay figure", async ({ page }) => {
  await page.goto("/");
  await asRole(page, "IT manager");
  await noAmounts(page, ["#/reports/audit", "#/people/requests/splits",
    "#/setup/data/import"]);
});

test("revoking a key writes the trail; the IT dashboard waits for a check",
  async ({ page }) => {
    await page.goto("/");
    await asRole(page, "IT manager");
    await go(page, "#/reports/it-dashboard");
    await expect(page.getByText(/Not checked yet in this session/))
      .toBeVisible();
    await go(page, "#/setup/connections/keys");
    await page.getByRole("button", { name: "Revoke", exact: true }).first()
      .click();
    await go(page, "#/reports/audit");
    await expect(page.getByText("Key revoked").first()).toBeVisible();
    await page.getByRole("button", { name: "Check the chain" }).click();
    await expect(page.getByText(/Chain checked: all \d+ entries fit/))
      .toBeVisible();
    await go(page, "#/reports/it-dashboard");
    await expect(page.getByText(/Checked in this session: all/))
      .toBeVisible();
  });
