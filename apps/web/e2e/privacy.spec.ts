import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const clean = async (page: import("@playwright/test").Page) => {
  const r = await new AxeBuilder({ page }).analyze();
  expect(r.violations.map((v) => v.id)).toEqual([]);
};

test("privacy-and-retention-flow", async ({ page }) => {
  await page.goto("/#/setup/privacy/settings");
  await expect(page.getByRole("heading", { level: 1,
    name: "Privacy and retention" })).toBeVisible();
  await expect(page.getByText(/does not say the company meets/)).toBeVisible();
  await clean(page);

  await page.goto("/#/setup/privacy/register");
  await expect(page.getByRole("heading", { level: 1,
    name: "Personal data kept" })).toBeVisible();
  await expect(page.getByText("Sensitive: health").first()).toBeVisible();
  await clean(page);

  await page.goto("/#/setup/privacy/requests/dsr-003");
  await page.getByRole("button", { name: "Keep for a legal duty" }).click();
  await expect(page.getByText(/Kept for a legal duty by .*HR/).first())
    .toBeVisible();
  await page.getByRole("main").getByRole("button", { name: "Undo" }).click();
  await expect(page.getByRole("button", { name: "Mark as answered" }))
    .toBeVisible();
  await clean(page);

  await page.goto("/#/setup/privacy/run");
  await expect(page.getByText(/No leaver record is past its period/))
    .toBeVisible();
});
