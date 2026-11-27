import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { PRODUCT_NAME } from "../src/brand";

/* Wave 1c fixes: leave by eligibility, Skip from the first frame,
 * no white screen without Element.animate, a real Copy link, and the
 * fuller report pages. */
const roleAs = async (page: Page, name: RegExp): Promise<void> => {
  await page.locator("button[aria-haspopup=menu]").click();
  await page.getByRole("menuitemradio", { name }).click();
};
const home = `Home · ${PRODUCT_NAME.en}`;
const clean = async (page: Page): Promise<void> => {
  // The sheet fades in: check the settled colours, not a frame of it.
  await page.waitForFunction(() => document.getAnimations()
    .every((a) => a.playState !== "running"));
  const r = await new AxeBuilder({ page }).analyze();
  expect(r.violations.map((v) => v.id)).toEqual([]);
};

test("a-man-is-not-offered-maternity-leave", async ({ page }) => {
  await page.goto("/");
  await roleAs(page, /^Employee/);
  await page.goto("/#/time-off");
  await page.getByRole("button", { name: "Request time off" }).click();
  const type = page.getByLabel("Type", { exact: true });
  await expect(type.locator("option")).toHaveText(["Annual leave",
    "Sick leave", "Parental leave", "Bereavement leave", "Study leave",
    "Unpaid leave"]);
  const held = /^Maternity leave: not available for your profile\. For/;
  await expect(page.getByText(held)).toBeVisible();
  await expect(page.getByText(/58 days left after this/)).toHaveCount(0);
  await clean(page);
});

test("setup-says-who-may-take-maternity-leave", async ({ page }) => {
  await page.goto("/#/setup/rules/leave");
  await expect(page.getByText("Paid, up to 60 days, female employees"))
    .toBeVisible();
});

test("the-app-draws-without-element-animate", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => {
    const p = Element.prototype as unknown as Record<string, unknown>;
    delete p["animate"];
    delete p["getAnimations"];
  });
  await page.goto("/");
  await expect(page).toHaveTitle(home);
  await expect(page.getByRole("heading", { level: 1 }).first())
    .toBeVisible();
  await page.goto("/#/reports/summary");
  await expect(page.getByRole("heading", { level: 1,
    name: "Payroll summary" })).toBeVisible();
  await page.goto("/#/reports");
  await page.getByRole("link", { name: /Cost by department/ }).click();
  await expect(page.getByRole("heading", { level: 1,
    name: "Cost by department" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("copy-link-copies-and-says-so", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/#/reports/summary");
  await page.getByRole("button", { name: "Copy link" }).click();
  await expect(page.getByRole("status").getByText("Link copied"))
    .toBeVisible();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toMatch(/#\/reports\/summary$/);
});

test("copy-link-falls-back-when-the-clipboard-refuses", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", { value: {
      writeText: () => Promise.reject(new Error("denied")) } });
  });
  await page.goto("/#/reports/summary");
  await page.getByRole("button", { name: "Copy link" }).click();
  await expect(page.getByRole("status").getByText("Link copied"))
    .toBeVisible();
});

test("the-thin-report-pages-say-what-they-are", async ({ page }) => {
  await page.goto("/#/reports/ask");
  await expect(page.getByRole("heading", { level: 1,
    name: "Ask for a report" })).toBeVisible();
  await page.goto("/#/reports/files");
  await expect(page.getByRole("heading", { level: 1,
    name: "Salary file register" })).toBeVisible();
  await expect(page.getByText(/Every salary file made for the bank/))
    .toBeVisible();
  await page.getByRole("button", { name: /Ready to upload/ }).click();
  await expect(page.getByText(/No file is ready to upload yet/))
    .toBeVisible();
  await page.getByRole("button", { name: /^All/ }).click();
  await expect(page.getByText("All 1 shown")).toBeVisible();
  await page.goto("/#/reports/safety-incidents");
  await expect(page.getByText(/Safety incidents logged each month/))
    .toBeVisible();
  await page.goto("/#/people/growth/probation");
  await expect(page.getByText(/in probation, \d+ waiting for the General/))
    .toBeVisible();
});

test("the-new-pages-pass-axe-and-hide-amounts", async ({ page },
  info) => {
  for (const hash of ["#/reports/files", "#/reports/safety-incidents",
    "#/people/growth/probation", "#/reports/ask"]) {
    await page.goto(`/${hash}`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await clean(page);
    await page.screenshot({ path: info.outputPath(
      `${hash.replace(/\W+/g, "-")}.png`), fullPage: true });
  }
  await page.goto("/#/reports/files");
  await page.getByRole("button", { name: /Ready to upload/ }).click();
  await clean(page);
  await page.getByRole("button", { name: /^All/ }).click();
  await expect(page.getByText(/AED [\d,]+\.\d\d/).first()).toBeVisible();
  test.skip(info.project.name !== "desktop", "Hide amounts: top bar");
  await page.getByRole("button", { name: /Hide amounts/ }).first().click();
  await expect(page.getByText(/AED [\d,]+\.\d\d/)).toHaveCount(0);
});

test.describe("opening", () => {
  test.use({ storageState: { cookies: [], origins: [] } });
  test.skip(({ viewport }) => (viewport?.width ?? 0) < 1024,
    "laptop only");

  test("skip-is-there-before-the-film-loads", async ({ page }) => {
    // Hold the opening's own chunks back: Skip must already be there.
    await page.route(/\/assets\/(Welcome|stage)-[^/]*\.js$/, async (r) => {
      await new Promise((ok) => setTimeout(ok, 3000));
      await r.continue();
    });
    await page.goto("/?film=1");
    await expect(page.getByRole("button", { name: "Skip" }))
      .toBeVisible({ timeout: 1000 });
    await page.getByRole("button", { name: "Skip" }).click();
    await expect(page).toHaveTitle(home);
    await expect(page.getByRole("heading", { level: 1 }).first())
      .toBeVisible();
  });
});
