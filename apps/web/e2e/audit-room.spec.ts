import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const roleAs = async (page: Page, name: string): Promise<void> => {
  await page.locator("button[aria-haspopup=menu]").click();
  await page.getByRole("menuitemradio", { name }).click();
};
const go = (page: Page, hash: string) =>
  page.evaluate((h) => { location.hash = h; }, hash);

test("auditor access, the auditor's view and the logged views", async ({
  page }, info) => {
  test.skip(info.project.name === "phone", "role menu is an avatar");
  await page.goto("/");
  await go(page, "#/setup/auditor");
  await expect(page.getByRole("heading", { level: 1,
    name: "Auditor access" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Give access" }))
    .toBeDisabled();
  await roleAs(page, "IT manager");
  await page.getByRole("button", { name: "Give access" }).click();
  await page.getByRole("button", { name: "Fill from the engagement letter" })
    .click();
  await page.getByLabel("Access ends").fill("");
  await page.getByRole("button", { name: "Give access" }).last().click();
  await expect(page.getByRole("alert")).toContainText("must end on a date");
  await page.getByRole("button", { name: "Fill from the engagement letter" })
    .click();
  await page.getByRole("button", { name: "Give access" }).last().click();
  await expect(page.getByText("Active").first()).toBeVisible();
  await expect(page.getByText("27 Nov 2026").first()).toBeVisible();
  await go(page, "#/setup/access/review");
  // The name is in the table and in the confirming toast: read the row.
  await expect(page.getByRole("main").getByText(/Hana Rostami/).first())
    .toBeVisible();
  await expect(page.getByText(/Auditor, read only \(ends 27 Nov 2026\)/))
    .toBeVisible();
  await roleAs(page, "General manager");
  await go(page, "#/reports/inspection/room");
  await page.getByRole("button", { name: "Open inspection pack" }).click();
  await expect(page.getByText(/not an authority filing|not a filing with/)
    .first()).toBeVisible();
  await page.getByRole("button", { name: "Sep 2026" }).click();
  await page.getByRole("button", { name: "Error-remedy record" }).click();
  await go(page, "#/setup/auditor");
  await page.getByRole("tab", { name: "View log" }).click();
  await expect(page.getByText("Inspection pack, Oct 2026")).toBeVisible();
  await expect(page.getByText("Inspection pack, Sep 2026")).toBeVisible();
  await expect(page.getByText("Error-remedy record").first()).toBeVisible();
  await page.getByRole("tab", { name: "Access" }).click();
  await page.getByRole("button", { name: "End access now" }).click();
  await expect(page.getByText("Ended").first()).toBeVisible();
});

test("inspection pack: one page per month, not a filing", async ({
  page }) => {
  await page.goto("/#/reports/inspection/2026-10");
  await expect(page.getByRole("heading", { level: 1,
    name: "Inspection pack" })).toBeVisible();
  await expect(page.getByRole("note")).toContainText("not a filing with " +
    "any authority");
  await expect(page.getByText(/all 58 entries fit/)).toBeVisible();
  await expect(page.getByRole("heading",
    { name: "Policy versions in force" })).toBeVisible();
  await page.getByRole("link", { name: "Sep 2026" }).click();
  await expect(page.getByText("Pay run Sep 2026").first()).toBeVisible();
  await expect(page.getByRole("heading",
    { name: "Audit chain check" })).toBeVisible();
  // The month switch crossfades each amount for 200 ms: let the old
  // (fading) figures go before axe measures contrast.
  await expect(page.locator("[class*=_ghost_]")).toHaveCount(0);
  const r = await new AxeBuilder({ page }).analyze();
  expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) =>
    n.html.slice(0, 90)).join(" | ")}`)).toEqual([]);
  await page.emulateMedia({ media: "print" });
  await expect(page.getByRole("heading",
    { name: "Audit chain check" })).toBeVisible();
  await page.emulateMedia({ media: "screen" });
  await page.goto("/#/reports/error-remedies");
  await expect(page.getByText(/Two days in July/)).toBeVisible();
});
