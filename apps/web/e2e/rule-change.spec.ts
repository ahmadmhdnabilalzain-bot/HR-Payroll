import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function asRole(page: Page, name: string): Promise<void> {
  await page.getByRole("button", { name: /Viewing as/ }).click();
  await page.getByRole("menuitemradio", { name }).click();
}

test("rule-change-preview-hr-then-gm", async ({ page }) => {
  await page.goto("/#/setup/rules/packs");
  await page.getByRole("link", { name: "Waiting", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1,
    name: "Rule change preview" })).toBeVisible();
  await expect(page.getByText(/Hypothetical, for demonstration/).first())
    .toBeVisible();
  await expect(page.getByRole("cell", { name: "Vikram Rao" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "+AED 37.76" })).toBeVisible();
  await expect(page.getByText("Waiting for HR")).toBeVisible();
  const bad = await new AxeBuilder({ page }).analyze();
  expect(bad.violations).toEqual([]);
  await page.getByRole("button", { name: "Plan for the next run" }).click();
  await expect(page.getByText("Waiting for the General manager"))
    .toBeVisible();
  await asRole(page, "General manager");
  await page.evaluate(() => { location.hash = "#/setup/rule-change"; });
  await page.getByRole("button", { name: "Plan for the next run" }).click();
  await expect(page.getByText("Planned for the next run").first())
    .toBeVisible();
  await expect(page.getByText(/Nothing is sent\./)).toBeVisible();
  await page.getByRole("button", { name: "Undo my decision" }).click();
  await expect(page.getByText("Waiting for the General manager"))
    .toBeVisible();
  await page.getByRole("button", { name: "Hold" }).click();
  await expect(page.getByText("Held").first()).toBeVisible();
  await page.getByRole("link", { name: "50% to 60%" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});
