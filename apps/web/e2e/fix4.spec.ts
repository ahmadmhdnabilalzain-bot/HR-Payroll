import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("unknown-route-says-so-and-links-home", async ({ page }) => {
  await page.goto("/#/nonsense");
  await expect(page.getByRole("heading",
    { name: "This page does not exist" })).toBeVisible();
  await page.getByRole("link", { name: "Back to Home" }).click();
  await expect(page.getByRole("heading", { level: 1 })).not.toHaveText(
    "This page does not exist");
  expect(await page.evaluate(() => location.hash)).toBe("#/home");
});

test("letter-prints-alone-on-a-light-a4-page", async ({ page }) => {
  await page.goto("/#/people/papers/letters/lt-1");
  await expect(page.getByText(/^ZB-LTR-2026-\d{4}$/).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Save as PDF" }))
    .toBeVisible();
  await page.emulateMedia({ media: "print", colorScheme: "dark" });
  const hidden = await page.evaluate(() => {
    const shown = (sel: string): boolean => {
      const el = document.querySelector(sel);
      return el !== null && getComputedStyle(el).display !== "none";
    };
    const paper = document.querySelector("article[aria-label=Letter]")!;
    return { paper: shown("article[aria-label=Letter]"), top: shown("header"),
      ribbon: shown("nav"),
      bg: getComputedStyle(paper).backgroundColor,
      fg: getComputedStyle(paper).color };
  });
  expect(hidden.paper).toBe(true);
  expect(hidden.top).toBe(false);
  expect(hidden.ribbon).toBe(false);
  expect(hidden.bg).toBe("rgb(255, 255, 255)");
  expect(hidden.fg).toBe("rgb(0, 0, 0)");
});

test("print-rules-leave-other-pages-alone", async ({ page }) => {
  await page.goto("/#/people");
  await page.emulateMedia({ media: "print" });
  await expect(page.locator("main h1").first()).toBeVisible();
});

test("emirates-id-show-is-logged-and-masks-again", async ({ page }) => {
  test.skip(test.info().project.name === "phone", "desktop flow");
  await page.goto("/#/people/emp-023");
  await expect(page.getByText(/^784-[*•]+/)).toBeVisible();
  await page.getByRole("button", { name: "Show" }).click();
  await expect(page.getByText(/^784-\d{4}-\d{7}-\d$/)).toBeVisible();
  await page.evaluate(() => { location.hash = "#/reports/audit"; });
  await expect(page.getByText("Emirates ID shown").first()).toBeVisible();
  await page.evaluate(() => { location.hash = "#/people/emp-023"; });
  await expect(page.getByText(/^784-[*•]+/)).toBeVisible();
});

test("expiry-register-says-what-it-tracks", async ({ page }) => {
  await page.goto("/#/reports/documents");
  await expect(page.getByText(/Passports and contracts are not tracked/))
    .toBeVisible();
});

test("pages-that-slid-sideways-now-fit", async ({ page }) => {
  for (const r of ["#/pay-run/review", "#/pay-run/approve",
    "#/setup/rules/calendar", "#/time-off/more/cover",
    "#/time-off/register", "#/pay-run/gate/what-if"]) {
    await page.goto("/" + r);
    await page.getByRole("heading", { level: 1 }).first().waitFor();
    const over = await page.evaluate(() =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth);
    expect([r, over]).toEqual([r, 0]);
  }
});

test("letter-page-is-axe-clean", async ({ page }) => {
  await page.goto("/#/people/papers/letters/lt-1");
  await page.getByRole("heading", { level: 1 }).waitFor();
  const r = await new AxeBuilder({ page }).analyze();
  expect(r.violations).toEqual([]);
});
