import { expect, test, type Locator, type Page }
  from "@playwright/test";

/**
 * The bell and Notices have no dead items (laptop, five roles). Every
 * notification in the bell sheet and every row on `#/home/notices` is
 * pressed with a real mouse click at its centre and must open a real
 * page: not the role's wall, not a missing page, not the bare People
 * or Home front, and never the viewer's own documents for someone
 * else's paper.
 */
test.use({ viewport: { width: 1440, height: 900 } });

test.beforeEach(({ page: _ }, info) => {
  test.skip(info.project.name === "phone", "laptop guard");
});

const ROLES = [["hr", "HR manager"], ["gm", "General manager"],
  ["it", "IT manager"], ["manager", "Team manager"],
  ["employee", "Employee"]] as const;

/** Pages that are not a destination: the role's wall, a missing page. */
const NOWHERE = /outside your view|does not exist|not found/i;
/** Fronts a record should never fall back to. */
const FRONT = /#\/(people|home)\/?$/;

async function asRole(page: Page, name: string): Promise<void> {
  await page.getByRole("button", { name: /Viewing as/ }).click();
  await page.getByRole("menuitemradio", { name }).click();
}

async function go(page: Page, hash: string): Promise<void> {
  await page.evaluate((h) => { location.hash = h; }, hash);
  await expect(page.getByRole("heading", { level: 1 }).first())
    .toBeVisible();
}

async function bellItems(page: Page) {
  await page.getByRole("button", { name: /^Notifications/ }).first()
    .click();
  const sheet = page.getByRole("dialog", { name: "Notifications" });
  await expect(sheet).toBeVisible();
  // Every notification is a link: an item without one fails here.
  await expect(sheet.locator("li:not(:has(a[href]))")).toHaveCount(0);
  return sheet.locator("li a[href]");
}

/** Click at the centre, then check where it landed. */
async function pressAndCheck(page: Page, what: string, x: Locator)
  : Promise<string[]> {
  const href = await x.getAttribute("href");
  await x.scrollIntoViewIfNeeded();
  const box = await x.boundingBox();
  if (href === null || box === null) return [`${what}: no link`];
  if (FRONT.test(href)) return [`${what}: ${href} is a front page`];
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  try {
    await expect(page).toHaveURL(new RegExp(`${href.replace(
      /[.*+?^${}()|[\]\\/]/g, "\\$&")}$`), { timeout: 5000 });
    const h1 = page.getByRole("heading", { level: 1 }).first();
    await expect(h1).toBeVisible({ timeout: 10000 });
    const text = await h1.innerText();
    return NOWHERE.test(text) ? [`${what}: ${href}: ${text}`] : [];
  } catch {
    return [`${what}: ${href}: the click did not open it`];
  }
}

for (const [role, name] of ROLES) {
  test(`${role}-bell-and-notices-open-real-pages`, async ({ page }) => {
    test.setTimeout(180_000);
    await page.goto("/");
    if (role !== "hr") await asRole(page, name);
    const failed: string[] = [];
    await go(page, "#/home");
    const n = await (await bellItems(page)).count();
    expect(n).toBeGreaterThan(0);
    await page.keyboard.press("Escape");
    for (let i = 0; i < n; i += 1) {
      await go(page, "#/home");
      const item = (await bellItems(page)).nth(i);
      const title = await item.innerText();
      failed.push(...await pressAndCheck(page, `bell ${title}`, item));
    }
    await go(page, "#/home/notices");
    const rows = page.locator("main a[data-row]");
    await expect(page.locator("main li[data-key]:not(:has(a[href]))"))
      .toHaveCount(0);
    const m = await rows.count();
    expect(m).toBeGreaterThan(0);
    for (let i = 0; i < m; i += 1) {
      await go(page, "#/home/notices");
      const row = page.locator("main a[data-row]").nth(i);
      const title = (await row.innerText()).split("\n")[0] ?? "";
      failed.push(...await pressAndCheck(page, `notice ${title}`, row));
    }
    expect(failed).toEqual([]);
  });
}

test("manager-visa-note-opens-the-person-not-my-documents", async ({
  page }) => {
  await page.goto("/");
  await asRole(page, "Team manager");
  await go(page, "#/home");
  const item = (await bellItems(page))
    .filter({ hasText: "residence visa expires soon" });
  await item.click();
  await expect(page).toHaveURL(/#\/people\/emp-\d+$/);
  await expect(page.getByRole("heading", { level: 1 }).first())
    .toContainText("Jose Reyes");
});
