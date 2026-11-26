import { expect, test, type Page } from "@playwright/test";
import { PRODUCT_NAME } from "../src/brand";

/* The opening plays once, at the first load, so these specs start
 * from a browser that has not seen it (the config marks it seen). */
test.use({ storageState: { cookies: [], origins: [] } });

/** Records whether the 3D chunk (three.js, the stage) is fetched. */
function watchStage(page: Page): () => boolean {
  let hit = false;
  page.on("request", (r) => {
    if (/\/assets\/stage-[^/]*\.js$/.test(r.url())) hit = true;
  });
  return () => hit;
}

const film = (page: Page) => page.locator("[data-mode=webgl]");
const still = (page: Page) => page.locator("[data-mode=static]");
const home = `Home · ${PRODUCT_NAME.en}`;

test.describe("laptop", () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) < 1024,
    "laptop only");

  test("plays-once-at-first-load-then-hands-to-home", async ({ page }) => {
    const stage = watchStage(page);
    await page.goto("/");
    await expect(film(page)).toBeVisible();
    await expect(page.getByRole("button", { name: "Skip" })).toBeVisible();
    await expect(page).toHaveTitle(home, { timeout: 20000 });
    /* The film itself, from its first frame to its hand-off. */
    const took = await page.evaluate(() =>
      performance.getEntriesByName("opening")[0]?.duration ?? 0) / 1000;
    expect(took).toBeGreaterThan(6);
    /* Loose on top: parallel workers on software GL drop frames. */
    expect(took).toBeLessThan(14);
    expect(stage()).toBe(true);
    await expect(film(page)).toHaveCount(0);
    expect(await page.evaluate(() => localStorage.getItem("opening")))
      .toBe("seen");
    await page.reload();
    await expect(page).toHaveTitle(home);
    await expect(film(page)).toHaveCount(0);
  });

  test("skip-ends-it-at-once", async ({ page }) => {
    await page.goto("/");
    await expect(film(page)).toBeVisible();
    await page.getByRole("button", { name: "Skip" }).click();
    await expect(film(page)).toHaveCount(0);
    await expect(page).toHaveTitle(home);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("a-deep-link-skips-it", async ({ page }) => {
    const stage = watchStage(page);
    await page.goto("/#/people");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(film(page)).toHaveCount(0);
    expect(stage()).toBe(false);
  });

  test("reduced-motion-gets-no-film-and-a-still-on-replay",
    async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      const stage = watchStage(page);
      await page.goto("/");
      await expect(page).toHaveTitle(home);
      await expect(film(page)).toHaveCount(0);
      await page.evaluate(() => { location.hash = "#/welcome"; });
      await expect(still(page)).toBeVisible();
      await expect(page.getByRole("button", { name: "Skip" }))
        .toBeVisible();
      expect(stage()).toBe(false);
    });

  test("replay-in-the-palette-for-hr-and-gm-only", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Skip" }).click();
    await expect(page).toHaveTitle(home);
    const replay = async (): Promise<number> => {
      await page.keyboard.press("Control+k");
      await page.getByRole("combobox").fill("replay");
      const n = await page.getByRole("option",
        { name: /Replay opening/ }).count();
      await page.keyboard.press("Escape");
      return n;
    };
    expect(await replay()).toBe(1);
    /* The replay plays the film at #/welcome and Skip lands on Home. */
    await page.keyboard.press("Control+k");
    await page.getByRole("combobox").fill("replay");
    await page.keyboard.press("Enter");
    await expect(film(page)).toBeVisible();
    await page.getByRole("button", { name: "Skip" }).click();
    await expect(page).toHaveTitle(home);
    await expect(page).toHaveURL(/#\/home$/);
    await page.getByRole("button", { name: /Viewing as/ }).click();
    await page.getByRole("menuitemradio", { name: "General manager" })
      .click();
    expect(await replay()).toBe(1);
    await page.getByRole("button", { name: /Viewing as/ }).click();
    await page.getByRole("menuitemradio", { name: /Employee/ }).first()
      .click();
    expect(await replay()).toBe(0);
  });
});

test.describe("phone", () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) >= 1024,
    "phones only");

  test("no-film-on-a-phone-and-a-still-at-welcome", async ({ page }) => {
    const stage = watchStage(page);
    await page.goto("/");
    await expect(page).toHaveTitle(home);
    await expect(film(page)).toHaveCount(0);
    await page.evaluate(() => { location.hash = "#/welcome"; });
    await expect(still(page)).toBeVisible();
    expect(stage()).toBe(false);
  });
});
