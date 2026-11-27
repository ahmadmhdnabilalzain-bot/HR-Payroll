import { expect, test, type Page } from "@playwright/test";

/**
 * The dashboards have no dead clicks (laptop, 1366 x 768). As HR (HR
 * dashboard, owner brief) and as the GM (executive dashboard, board
 * report), every panel heading and note, bar, nationality row, brief
 * point and table row is pressed with a real mouse click at a spot
 * outside any link or button of its own (the place the live check
 * found dead), and each must open a page or a sheet. The report
 * tables (departments, variance, journal, headcount) and the pay
 * run's current step dot are held to the same.
 *
 * Static on purpose (not pressed): the brief's column titles (What
 * changed, Needs a decision, At risk) are plain headings over their
 * points, and a table's total row sums the rows above it. The pay
 * run's current dot, already at its own address, scrolls to the top.
 */
test.use({ viewport: { width: 1366, height: 768 } });

test.beforeEach(({ page: _ }, info) => {
  test.skip(info.project.name === "phone", "laptop guard");
});

async function asRole(page: Page, name: string): Promise<void> {
  await page.getByRole("button", { name: /Viewing as/ }).click();
  await page.getByRole("menuitemradio", { name }).click();
}

/** What a page must show before its parts are pressed. */
async function open(page: Page, hash: string, h1: string): Promise<void> {
  await page.evaluate((h) => { location.hash = h; }, hash);
  await expect(page.getByRole("heading", { level: 1, name: h1 }))
    .toBeVisible();
  await expect(page.locator("main table tbody tr").first()).toBeVisible();
  // Rows rise in; wait for them to settle before aiming at them.
  await page.waitForTimeout(400);
}

/** The groups pressed on each page, as CSS within `main`. */
const PARTS = {
  panel: "section[data-href] h2, section[data-href] [class*='panelNote']",
  chart: "section[data-href] [class*='splitBar'], " +
    "section[data-href] [class*='trendBox']",
  bar: "[class*='hbars'] > li",
  key: "[class*='splitKey'] > li",
  point: "[class*='points'] > li",
  row: "table > tbody > tr",
} as const;

/**
 * A spot inside the nth element of a group that is not on a link or
 * button inside it (the label, a figure's working): the element's own
 * whole-row link, or a box around it, is what must answer there.
 */
async function spot(page: Page, css: string, n: number)
  : Promise<{ x: number; y: number; text: string } | null> {
  return page.evaluate(([sel, i]) => {
    const el = document.querySelectorAll<HTMLElement>(
      (sel as string).split(", ").map((x) => `main ${x}`).join(", "),
    )[i as number];
    if (el === undefined) return null;
    el.scrollIntoView({ block: "center", inline: "nearest" });
    const r = el.getBoundingClientRect();
    const CONTROL = "a[href],button,[role=link],[role=button]";
    let best: { x: number; y: number } | null = null;
    for (const fy of [0.5, 0.25, 0.75]) {
      for (const fx of [0.9, 0.7, 0.5, 0.3, 0.1, 0.97]) {
        const x = r.left + r.width * fx;
        const y = r.top + r.height * fy;
        const hit = document.elementFromPoint(x, y);
        if (hit === null || !el.contains(hit) && !hit.contains(el)) continue;
        const c = hit.closest(CONTROL);
        // A control inside the element is its own target: look on.
        if (c !== null && c !== el && el.contains(c) &&
          !c.hasAttribute("data-rowlink")) continue;
        best = { x, y };
        break;
      }
      if (best !== null) break;
    }
    const at = best ?? { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    return { ...at, text: (el.innerText ?? "").replace(/\s+/g, " ")
      .trim().slice(0, 50) };
  }, [css, n] as const);
}

async function count(page: Page, css: string): Promise<number> {
  return page.locator(css.split(", ").map((x) => `main ${x}`).join(", "))
    .count();
}

/** Pages that are not a destination: the role's wall, a missing page. */
const NOWHERE = /outside your view|does not exist/i;

/**
 * Press every part of a page once. Each press must change the address
 * to a real page or open a sheet (a figure's working). Returns what
 * was dead, as "group: text".
 */
async function pressAll(page: Page, hash: string, h1: string,
  groups: (keyof typeof PARTS)[], min: number): Promise<string[]> {
  const dead: string[] = [];
  let pressed = 0;
  const seen: string[] = [];
  await open(page, hash, h1);
  for (const g of groups) {
    if (page.url().split("#")[1] !== hash.slice(1)) {
      await open(page, hash, h1);
    }
    const n = await count(page, PARTS[g]);
    seen.push(`${g} ${n}`);
    for (let i = 0; i < n; i++) {
      if (page.url().split("#")[1] !== hash.slice(1)) {
        await open(page, hash, h1);
      }
      const at = await spot(page, PARTS[g], i);
      if (at === null) { dead.push(`${g} ${i}: not on screen`); continue; }
      await page.mouse.click(at.x, at.y);
      pressed++;
      const sheet = page.getByRole("dialog");
      const ok = await expect.poll(async () =>
        page.url().split("#")[1] !== hash.slice(1) ||
        await sheet.isVisible(), { timeout: 2000 }).toBe(true)
        .then(() => true, () => false);
      if (!ok) { dead.push(`${g}: "${at.text}"`); continue; }
      if (await sheet.isVisible()) {
        await page.keyboard.press("Escape");
        await expect(sheet).toBeHidden();
        continue;
      }
      const head = page.getByRole("heading", { level: 1 }).first();
      await expect(head).toBeVisible();
      const words = await head.innerText();
      if (NOWHERE.test(words)) dead.push(`${g}: "${at.text}" -> ${words}`);
    }
  }
  expect(pressed, `${hash}: parts pressed (${seen.join(", ")})`)
    .toBeGreaterThanOrEqual(min);
  return dead;
}

test("hr-dashboard-and-owner-brief-have-no-dead-clicks", async ({ page }) => {
  test.setTimeout(240_000);
  await page.goto("/");
  await open(page, "#/reports/dashboard-hr", "HR dashboard");
  // The headline figure stays: four requests wait for a decision.
  await expect(page.locator("main tbody tr", { hasText:
    "Waiting for a decision" })).toContainText("4");
  const dead = [
    ...await pressAll(page, "#/reports/dashboard-hr", "HR dashboard",
      ["panel", "chart", "bar", "key", "row"], 25),
    ...await pressAll(page, "#/reports/owner-brief", "Owner brief",
      ["point", "row"], 15),
  ];
  expect(dead).toEqual([]);
});

test("gm-dashboard-and-board-report-have-no-dead-clicks", async ({ page }) => {
  test.setTimeout(240_000);
  await page.goto("/");
  await asRole(page, "General manager");
  const dead = [
    ...await pressAll(page, "#/reports/dashboard-exec",
      "Executive dashboard", ["panel", "chart", "bar", "row"], 15),
    ...await pressAll(page, "#/reports/board-pack", "Board report",
      ["point", "row"], 15),
  ];
  expect(dead).toEqual([]);
});

test("report-table-rows-open-their-record", async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto("/");
  const dead = [
    ...await pressAll(page, "#/reports/departments", "Cost by department",
      ["row"], 3),
    ...await pressAll(page, "#/reports/headcount", "Headcount and turnover",
      ["row"], 3),
    ...await pressAll(page, "#/reports/variance",
      "Variance against last month", ["row"], 2),
    ...await pressAll(page, "#/reports/journal", "Payroll journal",
      ["row"], 3),
  ];
  expect(dead).toEqual([]);
  // A department's row opens that department's people.
  await open(page, "#/reports/departments", "Cost by department");
  const first = page.locator("main tbody tr").first();
  const name = (await first.locator("td").first().innerText()).trim();
  const box = await first.locator("td").nth(1).boundingBox();
  await page.mouse.click(box!.x + 8, box!.y + box!.height / 2);
  await expect(page).toHaveURL(/#\/people\/department\/dept-/);
  const rows = page.locator("main a[href^='#/people/emp-']");
  await expect(rows.first()).toBeVisible();
  await expect(page.locator("main")).toContainText(name);
});

test("a-figure-in-a-row-keeps-its-working", async ({ page }) => {
  await page.goto("/");
  await asRole(page, "General manager");
  await open(page, "#/reports/dashboard-exec", "Executive dashboard");
  const hash = "/reports/dashboard-exec";
  const why = page.locator("main tbody tr").first()
    .getByRole("button").first();
  await why.click();
  const sheet = page.getByRole("dialog");
  await expect(sheet).toBeVisible();
  expect(page.url().split("#")[1]).toBe(hash);
  // A press inside the working (a portal under the row) stays there.
  const body = await sheet.boundingBox();
  await page.mouse.click(body!.x + body!.width / 2, body!.y + 60);
  await page.waitForTimeout(300);
  expect(page.url().split("#")[1]).toBe(hash);
  await page.keyboard.press("Escape");
  // The same on a brief point whose figure is its own button.
  await open(page, "#/reports/board-pack", "Board report");
  const ytd = page.locator("main [class*='points'] > li", { hasText:
    "Gross pay, January to October" });
  await ytd.getByRole("button").first().click();
  await expect(sheet).toBeVisible();
  const b2 = await sheet.boundingBox();
  await page.mouse.click(b2!.x + b2!.width / 2, b2!.y + 60);
  await page.waitForTimeout(300);
  expect(page.url().split("#")[1]).toBe("/reports/board-pack");
});

test("bars-are-focusable-links-with-names", async ({ page }) => {
  await page.goto("/");
  await open(page, "#/reports/dashboard-hr", "HR dashboard");
  const bar = page.locator("main [class*='hbars'] > li > a").first();
  await expect(bar).toHaveAttribute("href", /#\/people\/department\//);
  await expect(bar).toHaveAttribute("aria-label", /\d/);
  const h = (await bar.boundingBox())!.height;
  expect(h).toBeGreaterThanOrEqual(44);
  await bar.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#\/people\/department\//);
  await open(page, "#/reports/dashboard-hr", "HR dashboard");
  const nat = page.locator("main [class*='splitKey'] > li > a").first();
  await expect(nat).toHaveAttribute("href", "#/reports/nationality");
});

test("the-current-pay-run-dot-opens-its-step", async ({ page }) => {
  await page.goto("/#/pay-run");
  const review = page.locator("nav ol a[href='#/pay-run/review']");
  await expect(review).toBeVisible();
  await review.click();
  await expect(page).toHaveURL(/#\/pay-run\/review$/);
});
