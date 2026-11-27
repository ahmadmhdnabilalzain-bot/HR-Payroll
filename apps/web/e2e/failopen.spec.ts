import { appendFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import routes from "./leak-routes.json" with { type: "json" };

/**
 * Fail-open walk: with the optional browser APIs taken away (or made
 * to stall), every link and button in the page body must still be
 * drawn, clickable and uncovered, and clicking it must do something.
 * The owner's iPhone runs Safari, which lacks some of these APIs or
 * runs them differently; WebKit is not installed here, so Chromium
 * stands in with the APIs stubbed (addInitScript).
 *
 * FAILOPEN_PROFILE:
 * - "absent" (default): no View Transitions, no requestIdleCallback,
 *   an IntersectionObserver that never reports, Element.animate that
 *   returns animations which never finish.
 * - "stall": View Transitions present, but `ready` and `finished`
 *   never settle (a spy counts skipTransition()).
 * - "none": the browser as it is.
 * FAILOPEN_ROLES: comma list (default all five).
 * FAILOPEN_SIZES: comma list of WxH (default 428x926,1366x768).
 * FAILOPEN_ROUTES: max routes per role (default all).
 * FAILOPEN_MATCH: a regular expression; only routes that match.
 * FAILOPEN_CLICKS: max items clicked per route (default 6; Home and
 * Reports pages always click up to 40).
 * FAILOPEN_OUT: a file prefix; findings are appended there too.
 */
const PROFILE = process.env["FAILOPEN_PROFILE"] ?? "absent";
const ROLES = (process.env["FAILOPEN_ROLES"] ??
  "hr,gm,manager,employee,it").split(",") as Role[];
const SIZES = (process.env["FAILOPEN_SIZES"] ?? "428x926,1366x768")
  .split(",").map((s) => s.split("x").map(Number) as [number, number]);
const MAX_ROUTES = Number(process.env["FAILOPEN_ROUTES"] ?? "100000");
const CLICKS = Number(process.env["FAILOPEN_CLICKS"] ?? "6");
const OUT = process.env["FAILOPEN_OUT"];
const MATCH = new RegExp(process.env["FAILOPEN_MATCH"] ?? "");

type Role = "hr" | "gm" | "manager" | "employee" | "it";
const ROLE_NAME: Record<Role, RegExp> = {
  hr: /^HR manager/, gm: /^General manager/, manager: /^Team manager/,
  employee: /^Employee/, it: /^IT manager/,
};

/** Runs before any page script: takes the optional APIs away. */
function stubs(profile: string): void {
  const w = window as unknown as Record<string, unknown>;
  w["__failopen"] = { skips: 0, transitions: 0 };
  const log = w["__failopen"] as { skips: number; transitions: number };
  const never = (): Promise<never> => new Promise<never>(() => undefined);
  if (profile === "absent") {
    delete (Document.prototype as unknown as Record<string, unknown>)
      ["startViewTransition"];
    delete w["requestIdleCallback"];
    delete w["cancelIdleCallback"];
    class SilentIO {
      root = null;
      rootMargin = "0px";
      thresholds = [0];
      observe(): void { /* never reports */ }
      unobserve(): void { /* nothing */ }
      disconnect(): void { /* nothing */ }
      takeRecords(): unknown[] { return []; }
    }
    w["IntersectionObserver"] = SilentIO;
    Element.prototype.animate = function stuck(): Animation {
      const target = new EventTarget();
      const a = Object.assign(target, {
        id: "", playState: "running", pending: false, currentTime: 0,
        startTime: 0, playbackRate: 1, effect: null, timeline: null,
        finished: never(), ready: Promise.resolve(),
        onfinish: null, oncancel: null, onremove: null,
        play(): void { /* never ends */ },
        pause(): void { /* nothing */ },
        cancel(): void { /* nothing */ },
        finish(): void { /* nothing */ },
        reverse(): void { /* nothing */ },
        persist(): void { /* nothing */ },
        commitStyles(): void { /* nothing */ },
        updatePlaybackRate(): void { /* nothing */ },
      });
      return a as unknown as Animation;
    };
  }
  if (profile === "stall") {
    (Document.prototype as unknown as Record<string, unknown>)
      ["startViewTransition"] = function stall(cb?: () => unknown) {
        log.transitions++;
        const done = Promise.resolve().then(() => cb?.());
        return {
          ready: never(), finished: never(), updateCallbackDone: done,
          skipTransition(): void { log.skips++; },
        };
      };
  }
}

interface Finding { kind: string; what: string }

/** Every main-content control and what blocks it, after a settle. */
async function audit(page: Page): Promise<Finding[]> {
  return page.evaluate(() => {
    const out: { kind: string; what: string }[] = [];
    const html = document.documentElement;
    for (const flag of ["routeMotion", "listMotion", "routePace"]) {
      if (html.dataset[flag] !== undefined) {
        out.push({ kind: "flag", what: `html data-${flag} left on` });
      }
    }
    if (document.querySelector("[data-reveal='wait']") !== null) {
      const n = document.querySelectorAll("[data-reveal='wait']").length;
      out.push({ kind: "reveal", what: `${n} section(s) still hidden` });
    }
    const veiled = document.querySelectorAll("[data-veil]").length;
    if (veiled > 0) out.push({ kind: "veil", what: `${veiled} veiled` });
    const paused = document.getAnimations()
      .filter((a) => a.playState === "paused").length;
    if (paused > 0) {
      out.push({ kind: "paused", what: `${paused} paused animation(s)` });
    }
    const name = (el: Element): string => {
      const t = (el.getAttribute("aria-label") ??
        (el as HTMLElement).innerText ?? "").trim().replace(/\s+/g, " ");
      const cls = typeof el.className === "string"
        ? el.className.split(" ")[0] ?? "" : "";
      return `${el.tagName.toLowerCase()}.${cls} "${t.slice(0, 40)}"`;
    };
    const items = [...document.querySelectorAll<HTMLElement>(
      "main :is(a[href], button, [role=button], [role=tab], summary)")]
      .filter((el) => {
        if (el.closest("[aria-hidden='true'], [data-ghost]") !== null) {
          return false;
        }
        if ((el as HTMLButtonElement).disabled) return false;
        const r = el.getBoundingClientRect();
        if (r.width < 4 || r.height < 4) return false;
        return el.checkVisibility({ visibilityProperty: true } as
          CheckVisibilityOptions);
      });
    for (const el of items) {
      let op = 1;
      for (let p: Element | null = el; p !== null; p = p.parentElement) {
        op *= Number(getComputedStyle(p).opacity);
      }
      if (op < 0.99) {
        out.push({ kind: "faded", what: `${name(el)} opacity ${op}` });
      }
      if (el.closest("[inert]") !== null) {
        out.push({ kind: "inert", what: name(el) });
      }
      if (getComputedStyle(el).pointerEvents === "none") {
        out.push({ kind: "no-pointer", what: name(el) });
      }
      el.scrollIntoView({ block: "center", inline: "center",
        behavior: "instant" as ScrollBehavior });
      const r = el.getBoundingClientRect();
      const x = Math.min(Math.max(r.left + r.width / 2, 1), innerWidth - 1);
      const y = Math.min(Math.max(r.top + Math.min(r.height / 2, 20), 1),
        innerHeight - 1);
      const hit = document.elementFromPoint(x, y);
      if (hit === null) continue;
      const own = hit === el || el.contains(hit) ||
        (hit instanceof HTMLLabelElement && hit.control === el);
      if (!own) {
        out.push({ kind: "covered", what: `${name(el)} under ${name(hit)}` });
      }
    }
    return out;
  });
}

/** Scrolls the page and its scrollers end to end (reveals wake). */
async function sweep(page: Page): Promise<void> {
  for (let i = 0; i < 12; i++) {
    const more = await page.evaluate((step) => {
      const y = step * innerHeight * 0.8;
      scrollTo({ top: y, behavior: "instant" as ScrollBehavior });
      return y < document.documentElement.scrollHeight;
    }, i);
    await page.waitForTimeout(60);
    if (!more) break;
  }
  await page.evaluate(() =>
    scrollTo({ top: 0, behavior: "instant" as ScrollBehavior }));
}

/** Audits after the fail-open window; retries once after more time. */
async function settledAudit(page: Page): Promise<Finding[]> {
  await sweep(page);
  await page.waitForTimeout(300);
  let f = await audit(page);
  if (f.length === 0) return f;
  await page.waitForTimeout(1600);
  await sweep(page);
  f = await audit(page);
  return f;
}

/** Clicks main-content controls; lists the ones that do nothing. */
async function clickAll(page: Page, hash: string, max: number)
  : Promise<string[]> {
  const dead: string[] = [];
  const marks = await page.evaluate((cap) => {
    const els = [...document.querySelectorAll<HTMLElement>(
      "main :is(a[href], button, [role=button], [role=tab], summary)")]
      .filter((el) => {
        if (el.closest("[aria-hidden='true'], [data-ghost]") !== null) {
          return false;
        }
        if ((el as HTMLButtonElement).disabled) return false;
        if (el.getAttribute("aria-current") === "page") return false;
        if (el.getAttribute("aria-disabled") === "true") return false;
        // The chosen segment or tab: choosing it again does nothing.
        if (el.getAttribute("aria-pressed") === "true") return false;
        if (el.getAttribute("aria-selected") === "true") return false;
        const r = el.getBoundingClientRect();
        return r.width >= 4 && r.height >= 4 && el.checkVisibility();
      }).slice(0, cap);
    els.forEach((el, i) => el.setAttribute("data-failopen", String(i)));
    return els.length;
  }, max);
  for (let i = 0; i < marks; i++) {
    const loc = page.locator(`[data-failopen="${i}"]`);
    if (await loc.count() === 0) continue;
    const label = await loc.evaluate((el) => `${el.tagName.toLowerCase()} "${
      (el.getAttribute("aria-label") ?? (el as HTMLElement).innerText)
        .trim().replace(/\s+/g, " ").slice(0, 40)}"`).catch(() => "?");
    await page.evaluate(() => {
      const w = window as unknown as { __muts: number;
        __mo?: MutationObserver };
      w.__muts = 0;
      w.__mo?.disconnect();
      w.__mo = new MutationObserver((rs) => { w.__muts += rs.length; });
      w.__mo.observe(document.body, { subtree: true, childList: true,
        attributes: true, characterData: true });
    });
    const before = await page.evaluate(() => location.href);
    await page.evaluate(() => {
      const w = window as unknown as { __scrolled: boolean; __was: unknown };
      w.__scrolled = false;
      w.__was = document.activeElement;
      document.addEventListener("scroll", () => { w.__scrolled = true; },
        { capture: true, once: true });
    });
    const popup = page.context().waitForEvent("page", { timeout: 400 })
      .catch(() => null);
    const download = page.waitForEvent("download", { timeout: 400 })
      .catch(() => null);
    const box = await loc.boundingBox().catch(() => null);
    if (box === null) continue;
    await loc.scrollIntoViewIfNeeded({ timeout: 500 }).catch(() => undefined);
    const b2 = await loc.boundingBox().catch(() => null);
    if (b2 === null) continue;
    // A real pointer at the centre: whatever is drawn there gets it.
    await page.mouse.click(b2.x + b2.width / 2,
      b2.y + Math.min(b2.height / 2, 20));
    await page.waitForTimeout(250);
    const [p, d] = await Promise.all([popup, download]);
    await p?.close().catch(() => undefined);
    const after = await page.evaluate(() => {
      const w = window as unknown as { __muts: number; __scrolled: boolean;
        __was: unknown };
      // A jump link scrolls; a focus move is an effect too.
      return { href: location.href, muts: w.__muts,
        moved: w.__scrolled || document.activeElement !== w.__was };
    });
    if (after.href === before && after.muts === 0 && !after.moved &&
      p === null && d === null) {
      dead.push(`${hash} ${label}`);
    }
    if (after.href !== before) {
      await page.evaluate((h) => { location.hash = h; }, hash);
      await page.waitForTimeout(200);
      // The page was rebuilt: mark again.
      await page.evaluate((cap) => {
        const els = [...document.querySelectorAll<HTMLElement>(
          "main :is(a[href], button, [role=button], [role=tab], summary)")]
          .filter((el) => {
            if (el.closest("[aria-hidden='true'], [data-ghost]") !== null) {
              return false;
            }
            if ((el as HTMLButtonElement).disabled) return false;
            if (el.getAttribute("aria-current") === "page") return false;
            if (el.getAttribute("aria-disabled") === "true") return false;
            // The chosen segment or tab: choosing it again does nothing.
            if (el.getAttribute("aria-pressed") === "true") return false;
            if (el.getAttribute("aria-selected") === "true") return false;
            const r = el.getBoundingClientRect();
            return r.width >= 4 && r.height >= 4 && el.checkVisibility();
          }).slice(0, cap);
        els.forEach((el, n) => el.setAttribute("data-failopen", String(n)));
      }, max);
    }
    await page.keyboard.press("Escape").catch(() => undefined);
    await page.evaluate(() => {
      document.querySelectorAll("dialog[open]").forEach((x) =>
        (x as HTMLDialogElement).close());
    });
  }
  return dead;
}

async function pickRole(page: Page, role: Role): Promise<void> {
  await page.getByRole("button", { name: /Viewing as/ }).click();
  await page.getByRole("menuitemradio", { name: ROLE_NAME[role] })
    .click({ timeout: 5000 });
  await page.waitForTimeout(400);
}

const focus = (hash: string): boolean =>
  /^#\/(reports(\/[a-z-]+)?)?$/.test(hash);

for (const [w, h] of SIZES) {
  for (const role of ROLES) {
    test(`fail-open ${PROFILE} ${role} ${w}x${h}`, async ({ page }, info) => {
      test.skip(info.project.name !== "desktop", "sizes set here");
      test.setTimeout(3_600_000);
      await page.addInitScript(stubs, PROFILE);
      await page.setViewportSize({ width: w, height: h });
      await page.goto("/");
      await page.getByRole("heading", { level: 1 }).first().waitFor();
      if (role !== "hr") await pickRole(page, role);
      const hard: string[] = [];
      const soft: string[] = [];
      const list = (routes as Record<Role, string[]>)[role]
        .filter((x) => MATCH.test(x)).slice(0, MAX_ROUTES);
      for (const hash of list) {
        await page.evaluate((x) => { location.hash = x; }, hash);
        await page.getByRole("heading", { level: 1 }).first()
          .waitFor({ timeout: 5000 }).catch(() => undefined);
        await page.waitForTimeout(150);
        const found = (await settledAudit(page)).map((f) =>
          `${role} ${w}x${h} ${hash} [${f.kind}] ${f.what}`);
        hard.push(...found);
        // Written as it goes, so a long walk cut short still reports.
        if (OUT !== undefined) {
          appendFileSync(`${OUT}.prog`, `${role} ${w}x${h} ${hash}\n`);
          if (found.length > 0) {
            appendFileSync(`${OUT}.live.txt`, found.join("\n") + "\n");
          }
        }
        const n = focus(hash) ? 40 : CLICKS;
        if (n > 0) {
          for (const d of await clickAll(page, hash, n)) {
            soft.push(`${role} ${w}x${h} [no effect] ${d}`);
          }
        }
        if (PROFILE === "stall") {
          const left = await page.evaluate(() =>
            document.documentElement.dataset["routeMotion"] ?? null);
          if (left !== null) hard.push(`${role} ${hash} route flag stuck`);
        }
      }
      if (PROFILE === "stall") {
        const log = await page.evaluate(() => (window as unknown as {
          __failopen: { skips: number; transitions: number } }).__failopen);
        if (log.transitions > 0 && log.skips === 0) {
          hard.push(`${role} stalled transitions never skipped`);
        }
      }
      const uniq = [...new Set(hard)];
      if (OUT !== undefined) {
        appendFileSync(`${OUT}.hard.txt`, uniq.join("\n") + "\n");
        appendFileSync(`${OUT}.soft.txt`, [...new Set(soft)].join("\n") +
          "\n");
      }
      if (soft.length > 0) {
        info.annotations.push({ type: "no-effect", description:
          [...new Set(soft)].join("\n") });
      }
      expect(uniq).toEqual([]);
    });
  }
}
