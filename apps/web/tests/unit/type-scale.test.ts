import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The type scale is 12 / 13 / 15 / 17 / 22 / 28 plus the 56 display.
 * A CSS module may only set a font size from it: a token
 * (var(--text-*)), a scale px value, inherit, or a clamp / min / max
 * made only of those. No em, rem, pt or percent sizes anywhere: Money
 * maps its AED and fils sizes to tokens per size instead of scaling.
 */
const SCALE = new Set([12, 13, 15, 17, 22, 28, 56]);
const SRC = join(__dirname, "..", "..", "src");

function cssFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) return cssFiles(p);
    return p.endsWith(".css") ? [p] : [];
  });
}

function offScale(value: string): boolean {
  const v = value.trim();
  if (v === "inherit") return false;
  const rest = v.replace(/var\(--text-[a-z0-9-]+\)/g, "").replace(
    /\b(clamp|min|max|calc)\b/g, "");
  const nums = rest.match(/[\d.]+[a-z%]*/g) ?? [];
  return nums.some((n) => {
    const m = /^(\d+)px$/.exec(n);
    return m === null || !SCALE.has(Number(m[1]));
  });
}

describe("type scale", () => {
  const sizes: { file: string; value: string }[] = [];
  for (const f of cssFiles(SRC)) {
    const css = readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    for (const m of css.matchAll(/font-size:\s*([^;}]+)/g)) {
      sizes.push({ file: f.slice(SRC.length + 1), value: m[1]!.trim() });
    }
  }
  it("finds font sizes to check", () => {
    expect(sizes.length).toBeGreaterThan(100);
  });
  it("uses only scale sizes", () => {
    const bad = sizes.filter((x) => offScale(x.value)).map(
      (x) => `${x.file}: ${x.value}`);
    expect(bad).toEqual([]);
  });
  it("defines the --text tokens on the scale", () => {
    const css = readFileSync(join(SRC, "theme", "tokens.css"), "utf8");
    const toks = [...css.matchAll(/--text-(?!.*-lh)([a-z0-9-]+):\s*(\d+)px/g)]
      .filter((m) => !m[1]!.endsWith("lh"));
    const bad = toks.filter((m) => !SCALE.has(Number(m[2])))
      .map((m) => m[0]);
    expect(bad).toEqual([]);
  });
});
