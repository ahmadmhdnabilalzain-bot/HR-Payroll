import { expect, test, type Page } from "@playwright/test";

/**
 * A changed amount never shows a third readable figure: the real
 * WAAPI roll on Home (an IBAN passes, the salary-file total and the
 * held amount change) is paused and stepped every 5 ms; in each frame
 * every changed digit reads as its old glyph, its new glyph, or
 * nothing (opacity x share of the glyph's ink inside the clip under
 * 0.5), and old and new are never readable in the same frame.
 */

/** Waits for a roll, pauses it, steps it; returns what each frame
 * reads ("o" old, "n" new, "-" neither) per changed digit. */
function stepRoll(page: Page): Promise<string[]> {
  return page.evaluate(() => new Promise<string[]>((resolve) => {
    const cx = document.createElement("canvas").getContext("2d")!;
    const ink = (g: Element, clip: Element): number => {
      const a = g.getBoundingClientRect();
      const b = clip.getBoundingClientRect();
      const cs = getComputedStyle(g);
      cx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      const m = cx.measureText(g.textContent ?? "");
      const base = (a.height - m.fontBoundingBoxAscent -
        m.fontBoundingBoxDescent) / 2 + m.fontBoundingBoxAscent;
      const top = a.top + base - m.actualBoundingBoxAscent;
      const bot = a.top + base + m.actualBoundingBoxDescent;
      return Math.max(0, Math.min(bot, b.bottom) - Math.max(top, b.top)) /
        ((bot - top) || 1);
    };
    const op = (el: Element | null): number => {
      let o = 1;
      for (let n = el; n !== null && n !== document.body;
        n = n.parentElement) o *= Number(getComputedStyle(n).opacity);
      return o;
    };
    const tick = (): void => {
      const cols = [...document.querySelectorAll("[data-roll-col]")];
      if (cols.length === 0) {
        requestAnimationFrame(tick);
        return;
      }
      const anims = document.getAnimations().filter((a) => {
        const t = (a.effect as KeyframeEffect | null)?.target;
        return t instanceof Element && (t.matches("[data-roll-col]") ||
          t.querySelector(":scope > [data-roll-col]") !== null);
      });
      for (const a of anims) a.pause();
      const frames: string[] = [];
      for (let t = 0; t <= 330; t += 5) {
        for (const a of anims) a.currentTime = t;
        frames.push(cols.map((c) => {
          const o = op(c);
          const old = c.querySelector('[data-glyph="old"]')!;
          const now = c.querySelector('[data-glyph="new"]')!;
          if (o * ink(old, c.parentElement!) >= 0.5) return "o";
          if (o * ink(now, c.parentElement!) >= 0.5) return "n";
          return "-";
        }).join(""));
      }
      for (const a of anims) a.play();
      resolve(frames);
    };
    requestAnimationFrame(tick);
  }));
}

test("money-roll-never-shows-a-third-amount", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Enter IBAN" }).first().click();
  await page.getByRole("button", { name: "Fill from bank letter" }).click();
  const frames = stepRoll(page);
  await page.getByRole("button", { name: "Save and check" }).click();
  const seen = await frames;
  expect(seen.length).toBeGreaterThan(60);
  for (const f of seen) {
    expect(f.includes("o") && f.includes("n"), f).toBe(false);
  }
  expect(seen[0]).toMatch(/^o+$/);
  expect(seen.at(-1)).toMatch(/^n+$/);
});
