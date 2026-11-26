import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const clean = async (page: import("@playwright/test").Page) => {
  const r = await new AxeBuilder({ page }).analyze();
  expect(r.violations.map((v) => v.id)).toEqual([]);
};

test("insurance-incidents-iloe-policies-flow", async ({ page }, info) => {
  await page.goto("/#/s/people");
  for (const name of ["Health insurance", "Safety incidents",
    "ILOE insurance", "Policies"]) {
    await expect(page.getByRole("link", { name }).first()).toBeVisible();
  }

  await page.goto("/#/people/safety/insurance");
  await expect(page.getByRole("heading", { level: 1,
    name: "Health insurance" })).toBeVisible();
  await expect(page.getByText(/•••• \d{4}/).first()).toBeVisible();
  await clean(page);
  await page.getByRole("link", { name: /Kavya Iyer/ }).first().click();
  await page.getByRole("button", { name: "Mark card issued" }).click();
  await expect(page.getByText(/Card marked issued/).first()).toBeVisible();

  await page.goto("/#/people/safety/incidents");
  await expect(page.getByText("Slip at the entrance after rain").first())
    .toBeVisible();
  await clean(page);
  await page.getByRole("link", { name: /Chair with a broken arm rest/ })
    .first().click();
  await page.getByRole("button", { name: "Record action taken" }).click();
  await page.getByRole("tab", { name: "Actions taken" }).click();
  await expect(page.getByText(/Action recorded by .*HR manager/).first())
    .toBeVisible();
  await page.getByRole("button", { name: "Close incident" }).click();
  await page.goto("/#/reports/safety-incidents");
  await expect(page.getByRole("heading", { level: 1,
    name: "Safety incidents report" })).toBeVisible();
  await expect(page.getByText("Still open").first()).toBeAttached();
  await clean(page);

  await page.goto("/#/people/safety/iloe");
  await expect(page.getByText(/unemployment insurance scheme/).first())
    .toBeVisible();
  await expect(page.getByText(/sent to any authority/).first())
    .toBeVisible();
  await clean(page);

  await page.goto("/#/people/safety/policies");
  await page.getByRole("link", { name: /Staff handbook/ }).first().click();
  await page.getByRole("tab", { name: "Read and acknowledged" }).click();
  await expect(page.getByText(/Read and acknowledged/).first())
    .toBeVisible();
  await clean(page);
  if (info.project.name === "phone") return;
  const at = new URL(page.url()).hash;
  await page.getByRole("button", { name: "HR manager" }).click();
  await page.getByRole("menuitemradio", { name: /Employee/ }).click();
  // A role switch on a page outside the new view opens its Home.
  await expect(page).toHaveURL(/#\/home$/);
  await page.evaluate((h) => { location.hash = h; }, at);
  await expect(page.getByRole("heading", { level: 1,
    name: "Outside your view" })).toBeVisible();
});
