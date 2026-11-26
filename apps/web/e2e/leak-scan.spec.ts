import { appendFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { findMoney } from "../src/ui/moneyScan";
import routes from "./leak-routes.json" with { type: "json" };

/**
 * With "Hide amounts" on, no screen of any role may show a figure:
 * not in text, aria-labels, titles, SVG labels, the tab title, the
 * explain panel, the search palette or a toast. Walks every route
 * each role may open (leak-routes.json, kept honest by the unit test
 * tests/unit/leak-routes.test.ts) at 1440 x 900.
 */
const ROLES = ["hr", "gm", "manager", "employee", "it"] as const;
type Role = (typeof ROLES)[number];
const ROLE_NAME: Record<Role, RegExp> = {
  hr: /^HR manager/, gm: /^General manager/, manager: /^Team manager/,
  employee: /^Employee/, it: /^IT manager/,
};

/** All text a viewer or a screen reader could read right now. */
async function visibleText(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const out: string[] = [document.title, document.body.innerText];
    const attrs = ["aria-label", "title", "alt", "placeholder",
      "aria-valuetext", "aria-description", "data-tip", "data-label"];
    for (const el of document.querySelectorAll("*")) {
      for (const a of attrs) {
        const v = el.getAttribute(a);
        if (v) out.push(v);
      }
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement
        || el instanceof HTMLSelectElement) out.push(el.value);
      if (el instanceof SVGElement) {
        const t = el.textContent;
        if (t && el.children.length === 0) out.push(t);
      }
    }
    return out;
  });
}

async function leaks(page: Page, where: string): Promise<string[]> {
  const found = new Set<string>();
  for (const text of await visibleText(page)) {
    for (const [rule, hit] of findMoney(text)) {
      const at = text.indexOf(hit);
      const ctx = text.slice(Math.max(0, at - 30), at + hit.length + 20)
        .replace(/\s+/g, " ");
      found.add(`${where} [${rule}] "${hit}" in "${ctx}"`);
    }
  }
  return [...found];
}

/** Hover the chart marks so tooltips draw, then read them. */
async function hoverCharts(page: Page): Promise<void> {
  const marks = page.locator("main svg :is(rect, circle, path)[tabindex]");
  const n = Math.min(await marks.count(), 3);
  for (let i = 0; i < n; i++) {
    await marks.nth(i).hover({ timeout: 300, force: true })
      .catch(() => undefined);
  }
  const plots = page.locator("main svg[role=img], main svg:has(title)");
  for (let i = 0; i < Math.min(await plots.count(), 3); i++) {
    const box = await plots.nth(i).boundingBox({ timeout: 300 })
      .catch(() => null);
    if (box === null) continue;
    for (const f of [0.2, 0.5, 0.8]) {
      await page.mouse.move(box.x + box.width * f, box.y + box.height / 2);
    }
  }
}

/** Open each figure's explain panel (first few), read, close. */
async function openExplains(page: Page): Promise<string[]> {
  const out: string[] = [];
  const btns = page.locator("main button[aria-haspopup=dialog]");
  const n = Math.min(await btns.count(), 2);
  for (let i = 0; i < n; i++) {
    await btns.nth(i).click({ timeout: 500 }).catch(() => undefined);
    out.push(...await leaks(page, "explain"));
    await page.keyboard.press("Escape");
  }
  return out;
}

async function pickRole(page: Page, role: Role): Promise<void> {
  await page.getByRole("button", { name: /Viewing as/ }).click();
  await page.getByRole("menuitemradio", { name: ROLE_NAME[role] })
    .click({ timeout: 5000 });
  const hide = page.getByRole("button", { name: /Hide amounts|Show amounts/ })
    .first();
  // LEAK_CONTROL=1 leaves amounts showing: the scan must then find many.
  if (process.env["LEAK_CONTROL"] === "1") return;
  if ((await hide.getAttribute("aria-pressed")) !== "true") {
    await hide.click();
  }
  await expect(hide).toHaveAttribute("aria-pressed", "true");
}

for (const role of ROLES) {
  test(`no amount shows while hidden: ${role}`, async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "1440 x 900 only");
    test.setTimeout(600_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await page.getByRole("heading", { level: 1 }).waitFor();
    await pickRole(page, role);
    const bad: string[] = [];
    for (const hash of routes[role]) {
      if (process.env["LEAK_OUT"]) appendFileSync(
        `${process.env["LEAK_OUT"]}.prog`, `${Date.now()} ${role} ${hash}\n`);
      await page.evaluate((h) => { location.hash = h; }, hash);
      await page.waitForTimeout(120);
      bad.push(...await leaks(page, `${role} ${hash}`));
      await hoverCharts(page);
      bad.push(...await leaks(page, `${role} ${hash} (hover)`));
      bad.push(...(await openExplains(page))
        .map((l) => `${role} ${hash} ${l}`));
    }
    // The search palette: every result it offers for a few queries.
    await page.evaluate(() => { location.hash = "#/"; });
    await page.getByRole("heading", { level: 1 }).first().waitFor();
    for (const q of ["a", "pay", "1", "net", "aed"]) {
      const box = page.getByRole("combobox");
      await expect(async () => {
        if (!(await box.isVisible())) await page.keyboard.press("Control+k");
        await expect(box).toBeVisible({ timeout: 1000 });
      }).toPass({ timeout: 10000 });
      await box.fill(q);
      bad.push(...await leaks(page, `${role} palette "${q}"`));
      await page.keyboard.press("Escape");
      await expect(box).toBeHidden();
    }
    const all = [...new Set(bad)];
    const out = process.env["LEAK_OUT"];
    if (out !== undefined) appendFileSync(`${out}.${role}.txt`,
      all.join("\n") + "\n");
    expect(all).toEqual([]);
  });
}

const ACT = new RegExp("^(approve|agree|decline|save|send|mark|resolve|" +
  "decide|confirm|hold|release|submit|accept|sign off|record|add|request|" +
  "undo)\\b", "i");

/** What a person reads after acting: the toast, the page, the labels. */
for (const role of ROLES) {
  test(`no amount shows after an action while hidden: ${role}`,
    async ({ page }, info) => {
      test.skip(info.project.name !== "desktop", "1440 x 900 only");
      test.setTimeout(600_000);
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto("/");
      await page.getByRole("heading", { level: 1 }).waitFor();
      await pickRole(page, role);
      const bad: string[] = [];
      for (const hash of routes[role]) {
        await page.evaluate((h) => { location.hash = h; }, hash);
        await page.waitForTimeout(120);
        if (process.env["LEAK_OUT"]) appendFileSync(
          `${process.env["LEAK_OUT"]}.actprog`, `${Date.now()} ${hash}\n`);
        const acts = page.locator("main button:visible").filter({
          hasText: ACT });
        const n = Math.min(await acts.count(), 2);
        for (let i = 0; i < n; i++) {
          const b = acts.nth(i);
          const on = await b.isEnabled({ timeout: 300 })
            .catch(() => false);
          if (!on) continue;
          await b.click({ timeout: 500 }).catch(() => undefined);
          await page.waitForTimeout(150);
          bad.push(...await leaks(page, `${role} ${hash} after action`));
          await page.keyboard.press("Escape");
        }
      }
      const all = [...new Set(bad)];
      const out = process.env["LEAK_OUT"];
      if (out !== undefined) appendFileSync(`${out}.act.${role}.txt`,
        all.join("\n") + "\n");
      expect(all).toEqual([]);
    });
}
