import { describe, expect, it } from "vitest";
import { readWeb } from "../helpers/files";

type Tokens = Record<string, string>;

function block(css: string, selector: string): Tokens {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) throw new Error(`no block ${selector}`);
  const body = css.slice(start, css.indexOf("}", start));
  const out: Tokens = {};
  for (const m of body.matchAll(/(--color-[a-z0-9-]+):\s*(#[0-9a-f]{6})/gi)) {
    out[m[1] ?? ""] = m[2] ?? "";
  }
  return out;
}

function luminance(hex: string): number {
  const ch = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * (ch[0] ?? 0) + 0.7152 * (ch[1] ?? 0) +
    0.0722 * (ch[2] ?? 0);
}

function ratio(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return ((x ?? 0) + 0.05) / ((y ?? 0) + 0.05);
}

const TEXT = ["text", "text-muted", "accent", "trace", "danger", "success"];

function check(t: Tokens): string[] {
  const c = (n: string): string => {
    const v = t[`--color-${n}`];
    if (v === undefined) throw new Error(`missing --color-${n}`);
    return v;
  };
  const fails: string[] = [];
  const need = (fg: string, bg: string, min: number): void => {
    const r = ratio(c(fg), c(bg));
    if (r < min) fails.push(`${fg} on ${bg}: ${r.toFixed(2)}`);
  };
  for (const fg of TEXT) {
    need(fg, "surface", 4.5);
    need(fg, "bg", 4.5);
  }
  need("warning", "warning-bg", 4.5);
  need("on-accent", "accent", 4.5);
  need("focus", "surface", 3);
  need("border", "surface", 3);
  need("accent", "surface", 3);
  need("bar-1", "surface", 3);
  for (let i = 1; i <= 8; i += 1) {
    need("text", `avatar-${i}`, 4.5);
    need("text", `avatar-c${i}`, 4.5);
  }
  need("grey-700", "surface", 4.5);
  need("grey-700", "bg", 4.5);
  need("grey-700", "grey-100", 4.5);
  need("text", "grey-200", 4.5);
  need("text", "grey-300", 4.5);
  need("grey-500", "surface", 3);
  return fails;
}

/** Ink only (owner's choice C): no accent hue left in the tokens. */
function hueless(t: Tokens): string[] {
  const keys = ["accent", "accent-hover", "accent-soft", "focus", "trace",
    "info", "bar-1", "bar-2", "bar-3", "bar-4", "grey-100", "grey-200",
    "grey-300", "grey-500", "grey-700"];
  return keys.filter((k) => {
    const v = t[`--color-${k}`] ?? "#000000";
    const ch = [1, 3, 5].map((i) => parseInt(v.slice(i, i + 2), 16));
    return Math.max(...ch) - Math.min(...ch) > 20;
  });
}

describe("tokens", () => {
  it("ink-only-no-accent-hue", () => {
    const css = readWeb("src/theme/tokens.css");
    expect(hueless(block(css, ":root"))).toEqual([]);
    expect(hueless(block(css, ':root[data-theme="dark"]'))).toEqual([]);
  });

  it("contrast-pairs-pass", () => {
    const css = readWeb("src/theme/tokens.css");
    expect(check(block(css, ":root"))).toEqual([]);
    expect(check(block(css, ':root[data-theme="dark"]'))).toEqual([]);
  });
});
