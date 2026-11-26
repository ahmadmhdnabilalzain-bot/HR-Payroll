import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const SHOTS = process.env.FT3_SHOTS;

async function asRole(page: Page, name: string): Promise<void> {
  await page.getByRole("button", { name: /Viewing as/ }).click();
  await page.getByRole("menuitemradio", { name }).click();
}

/** The toggle is on the bar; on a phone it is in the role menu. */
async function hideAmounts(page: Page, on: boolean): Promise<void> {
  const bar = page.getByRole("button", { name: on ? /^Hide amounts/
    : /^Show amounts/ });
  if (await bar.first().isVisible()) {
    await bar.first().click();
    return;
  }
  await page.getByRole("button", { name: /Viewing as/ }).click();
  await page.getByRole("menuitemcheckbox", { name: /amounts/i }).click();
  await page.keyboard.press("Escape");
}

async function shot(page: Page, name: string): Promise<void> {
  if (SHOTS === undefined) return;
  const project = test.info().project.name;
  await page.setViewportSize(project === "phone" ? { width: 393,
    height: 852 } : { width: 1920, height: 1080 });
  for (const scheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    await page.screenshot({ path: `${SHOTS}/${name}-${project}-${scheme}.png`,
      fullPage: true });
  }
  await page.emulateMedia({ colorScheme: "light" });
}

async function clean(page: Page): Promise<void> {
  const bad = await new AxeBuilder({ page }).analyze();
  expect(bad.violations).toEqual([]);
}

test("sandbox: try a draft, read the working, save, discard; the real " +
  "run does not move", async ({ page }) => {
  await page.goto("/#/pay-run/more/sandbox");
  await expect(page.getByRole("heading", { level: 1,
    name: "Pay-structure sandbox" })).toBeVisible();
  await expect(page.getByText(/nothing here changes the October run/i)
    .first()).toBeVisible();
  await page.getByRole("button", { name: "Raise housing allowance 5% " +
    "for grade G4" }).click();
  await expect(page.getByRole("cell", { name: /Whole run/ }))
    .toBeVisible();
  await expect(page.getByText(/2 people would move/)).toBeVisible();
  await expect(page.getByText("Not computed").first()).toBeVisible();
  await page.getByRole("button", { name: /Change to net pay/ }).first()
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await shot(page, "sandbox");
  await clean(page);

  await page.getByRole("combobox", { name: "Change" })
    .selectOption("overtime-rates");
  await expect(page.getByText(/2 people would move/)).toBeVisible();
  await page.getByRole("combobox", { name: "Change" })
    .selectOption("housing-raise");

  await page.getByRole("button", { name: "Save as draft plan" }).click();
  await expect(page.getByRole("button", { name: "Saved as draft plan" }))
    .toBeDisabled();
  await expect(page.getByRole("region", { name: "Draft plans" }))
    .toContainText("Draft only");
  await page.getByRole("button", { name: "Discard" }).click();
  await expect(page.getByText("Pick a change to start.")).toBeVisible();
  await shot(page, "sandbox-empty");
  await clean(page);

  await page.getByRole("button", { name: "Raise housing allowance 5% " +
    "for grade G4" }).click();
  await hideAmounts(page, true);
  await expect(page.locator("main")).not.toContainText(/AED\s?\d/);
  await hideAmounts(page, false);

  await asRole(page, "General manager");
  await page.evaluate(() => { location.hash = "#/reports/dashboard-exec"; });
  await expect(page.getByRole("list", { name: "Key figures" })
    .getByText("AED 933,730.94")).toBeVisible();
});

test("ledger: mark payable as a draft, take it back; IT is turned away",
  async ({ page }) => {
    await page.goto("/#/people/moves/referrals");
    await expect(page.getByRole("heading", { level: 1,
      name: "Referrals and agencies" })).toBeVisible();
    await expect(page.getByText(/Nothing is added to the pay run/).first())
      .toBeVisible();
    await expect(page.getByText("Outstanding").first()).toBeVisible();
    await page.getByRole("button", { name: "Mark payable" }).first().click();
    await expect(page.getByText("Marked payable").first()).toBeVisible();
    await expect(page.getByText(/Draft for November 2026/).first())
      .toBeVisible();
    await shot(page, "referrals");
    await clean(page);
    await page.getByRole("button", { name: "Take back" }).first().click();
    await expect(page.getByRole("button", { name: "Take back" }))
      .toHaveCount(0);
    await hideAmounts(page, true);
    await expect(page.locator("main")).not.toContainText(/AED\s?\d/);
    await hideAmounts(page, false);

    await asRole(page, "IT manager");
    await expect(page.getByRole("heading", { level: 1,
      name: "One connection is failing." })).toBeVisible();
    for (const h of ["#/people/moves/referrals", "#/pay-run/more/sandbox"]) {
      await page.evaluate((x) => { location.hash = x; }, h);
      await expect(page.getByRole("heading", { level: 1,
        name: "This page is outside your view." })).toBeVisible();
      await expect(page.getByText(/AED \d/)).toHaveCount(0);
    }
  });
