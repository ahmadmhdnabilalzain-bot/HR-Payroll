import { expect, test, type Page } from "@playwright/test";

/**
 * Home has no dead clicks (laptop, HR and the GM). Everything on Home
 * that shows a count, a name, a row or a status must, at its centre,
 * reach a live control (a link, a button, a row link), unless it is
 * marked `data-static`. Every distinct link is then pressed with a
 * real mouse click (no actionability wait, so a cover or an inert
 * window shows up as the audit saw it) and must open a real page.
 * A click made within 100 ms of a route change, on a stalled
 * animation timeline, must land too.
 */
test.use({ viewport: { width: 1440, height: 900 } });

test.beforeEach(({ page: _ }, info) => {
  test.skip(info.project.name === "phone", "laptop guard");
});

async function asRole(page: Page, name: string): Promise<void> {
  await page.getByRole("button", { name: /Viewing as/ }).click();
  await page.getByRole("menuitemradio", { name }).click();
}

async function home(page: Page): Promise<void> {
  await page.evaluate(() => { location.hash = "#/home"; });
  await expect(page.locator("#run-title")).toBeVisible();
  await expect(page.locator("#dept-title")).toBeVisible();
}

interface Probe {
  text: string;
  kind: string;
  /** What a click at its centre reaches: a link's href, a button. */
  target: string | null;
  /** The element under the pointer, for the failure message. */
  top: string;
}

/**
 * Every element of `main` that looks like it holds a count, a name, a
 * row or a status, and what a click at its centre would reach.
 */
async function probe(page: Page): Promise<Probe[]> {
  return page.evaluate(async () => {
    const main = document.querySelector("main");
    if (main === null) return [];
    const LIVE = "a[href],button,summary,input,select,textarea," +
      "[role=link],[role=button],[role=tab],[tabindex]:not([tabindex='-1'])";
    const KW = new RegExp("(^|_)(row|item|line|status|count|card|who|" +
      "name|face|ready|figure|kpi|doc|days|kind|what|meta|value)(_|$)", "i");
    const COUNT = /^\s*\d[\d,.]*\+?\s+[A-Za-z][\w\s,.'-]{1,40}$/;
    const cls = (e: Element): string => {
      const c = e.className as unknown;
      return typeof c === "string" ? c
        : (c as { baseVal?: string } | null)?.baseVal ?? "";
    };
    const say = (e: Element | null): string => e === null ? "null"
      : `${e.tagName.toLowerCase()}.${cls(e).split(/\s+/)[0] ?? ""}`;
    const looks = (e: Element): string | null => {
      if (e.closest("[data-ghost],svg")) return null;
      // Drawn only (a bar, a chart's tag), unless it is a face.
      if (e.closest("[aria-hidden='true']") !== null &&
        !e.hasAttribute("data-face")) return null;
      // A box that holds its own controls: its parts are checked.
      if (e.querySelector(LIVE) !== null) return null;
      const t = e.tagName.toLowerCase();
      const text = (e as HTMLElement).innerText?.trim() ?? "";
      if (text === "" && e.querySelector("[data-face]") === null) {
        return null;
      }
      if (text.length > 200) return null;
      if (t === "li" && text.length > 2) return "list-item";
      if (e.parentElement?.tagName === "DL" && t === "div") return "row";
      if (e.children.length === 0 && COUNT.test(text)) return "count-label";
      if (e.hasAttribute("data-face")) return "person";
      if (KW.test(cls(e))) return "named";
      return null;
    };
    const out: Probe[] = [];
    const all = [...main.querySelectorAll<HTMLElement>("*")];
    for (const e of all) {
      if (e.closest("h1,h2,h3,[data-static],[role=dialog]")) continue;
      const kind = looks(e);
      if (kind === null) continue;
      e.scrollIntoView({ block: "center", inline: "nearest" });
      const r = e.getBoundingClientRect();
      if (r.width < 5 || r.height < 5) continue;
      const style = getComputedStyle(e);
      if (style.visibility === "hidden" || style.display === "none") continue;
      const x = r.left + r.width / 2;
      const y = r.top + r.height / 2;
      const top = document.elementFromPoint(x, y);
      const live = top?.closest(LIVE) ?? null;
      const ok = live !== null && !(live as HTMLElement).inert &&
        (live.closest("main") !== null);
      out.push({ text: (e.innerText ?? "").replace(/\s+/g, " ").trim()
        .slice(0, 60), kind, top: say(top),
      target: !ok ? null : live!.getAttribute("href") ??
        live!.getAttribute("data-href") ??
        `button:${(live as HTMLElement).innerText.trim().slice(0, 30)}` });
    }
    scrollTo({ top: 0, behavior: "instant" });
    return out;
  });
}

/** Pages that are not a destination: the role's wall, a missing page. */
const NOWHERE = /outside your view|does not exist/i;

async function pressEveryLink(page: Page, hrefs: string[]): Promise<void> {
  const failed: string[] = [];
  for (const href of hrefs) {
    await home(page);
    const el = page.locator(`main [href="${href}"], ` +
      `main [data-href="${href}"]`).first();
    await el.scrollIntoViewIfNeeded();
    const box = await el.boundingBox();
    if (box === null) { failed.push(`${href}: not on screen`); continue; }
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    if (href.startsWith("#approvals")) {
      await expect(page.locator("#approvals-title")).toBeFocused();
      continue;
    }
    try {
      await expect(page).toHaveURL(new RegExp(`${href.replace(
        /[.*+?^${}()|[\]\\/]/g, "\\$&")}$`), { timeout: 3000 });
      const h1 = page.getByRole("heading", { level: 1 }).first();
      await expect(h1).toBeVisible();
      if (NOWHERE.test(await h1.innerText())) {
        failed.push(`${href}: ${await h1.innerText()}`);
      }
    } catch {
      failed.push(`${href}: the click did not open it`);
    }
  }
  expect(failed).toEqual([]);
}

for (const [role, name] of [["hr", null],
  ["gm", "General manager"]] as const) {
  test(`${role}-home-has-no-dead-clicks`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto("/");
    if (name !== null) await asRole(page, name);
    await home(page);
    // The headline numbers stay as they were.
    if (role === "hr") {
      const strip = page.locator("main li", { hasText:
        "Waiting for a decision" });
      await expect(strip).toContainText("4");
      await expect(page.locator("#issues-title + span"))
        .toHaveText("2 items block sign-off · 6 to review");
    }
    const found = await probe(page);
    expect(found.length).toBeGreaterThan(40);
    const dead = found.filter((x) => x.target === null)
      .map((x) => `${x.kind} "${x.text}" (under: ${x.top})`);
    expect(dead).toEqual([]);
    // Every distinct link, pressed once with the mouse.
    const hrefs = [...new Set(found.map((x) => x.target ?? "")
      .filter((x) => x.startsWith("#")))];
    // The GM decides no leave here; HR's run sign-off waits on the GM.
    expect(hrefs).toEqual(expect.arrayContaining([
      "#/pay-run/fix", "#/pay-run/approve", "#/reports/summary",
      "#/people/papers/pension", "#/home/notices", "#/reports/departments",
      "#/home/tasks/soon",
      ...(role === "hr" ? ["#/time-off", "#approvals-title"]
        : ["#/reports/dashboard-exec"])]));
    await pressEveryLink(page, hrefs);
  });
}

test("gm-sign-off-says-why-and-goes-to-fix", async ({ page }) => {
  await page.goto("/");
  await asRole(page, "General manager");
  await home(page);
  const sign = page.getByRole("button", { name: "Sign off October pay" });
  await expect(sign).toBeDisabled();
  const why = page.locator("#approve-why");
  await expect(why).toContainText("Sign-off waits for bank details");
  await expect(why).toContainText(
    /Fatima\sAl\sKetbi in HR is fixing them, since 27 Oct/);
  // The waiting tile, from the keyboard, takes the focus to Decisions.
  await page.getByRole("link", { name: "Waiting for a decision" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#approvals-title")).toBeFocused();
  await why.getByRole("link", { name: "Go to Fix" }).click();
  await expect(page).toHaveURL(/#\/pay-run\/fix$/);
});

test("trend-points-toggle-their-month", async ({ page }) => {
  await page.goto("/");
  await home(page);
  const june = page.getByRole("button", { name: /^June 2026/ });
  const box = await june.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await expect(june).toHaveAttribute("aria-pressed", "true");
  await june.press("Enter");
  await expect(june).toHaveAttribute("aria-pressed", "false");
});

test("a-click-within-100ms-of-a-route-change-lands", async ({ page }) => {
  await page.goto("/");
  await home(page);
  // Stall every animation: a route change's motion then holds at its
  // first frame, as on a slow laptop.
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Animation.enable");
  await cdp.send("Animation.setPlaybackRate", { playbackRate: 0 });
  // Home to the pay run's sign-off step: a change of section.
  const row = page.locator("main [data-href='#/pay-run/approve']").first();
  await row.scrollIntoViewIfNeeded();
  const at = await row.boundingBox();
  expect(at).not.toBeNull();
  await page.mouse.click(at!.x + 40, at!.y + at!.height / 2);
  await page.waitForFunction(() => location.hash === "#/pay-run/approve");
  await page.waitForTimeout(50);
  // The first link of the new page that is on screen, pressed at once.
  const next = await page.evaluate(() => {
    for (const a of document.querySelectorAll<HTMLAnchorElement>(
      "main a[href^='#/']")) {
      const r = a.getBoundingClientRect();
      const href = a.getAttribute("href") ?? "";
      if (href !== location.hash && r.width > 4 && r.height > 4 &&
        r.top > 0 && r.bottom < innerHeight) {
        return { href, x: r.left + r.width / 2, y: r.top + r.height / 2 };
      }
    }
    return null;
  });
  expect(next).not.toBeNull();
  await page.mouse.click(next!.x, next!.y);
  await expect(page).toHaveURL(new RegExp(`${next!.href.replace(
    /[.*+?^${}()|[\]\\/]/g, "\\$&")}$`), { timeout: 1000 });
  await cdp.send("Animation.setPlaybackRate", { playbackRate: 1 });
});
