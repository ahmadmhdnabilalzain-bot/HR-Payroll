import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(import.meta.dirname, "..", "src");

const stripComments = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/(^|[^:"'\\])\/\/.*$/gm, "$1");

/** No clock, unseeded randomness, environment or network in src. */
const BANNED: [string, RegExp][] = [
  ["node: import", /["']node:/],
  ["process.", /\bprocess\./],
  ["Date", /\bDate\b/],
  ["Math.random", /\bMath\.random\b/],
  ["fetch(", /\bfetch\s*\(/],
  ["crypto", /\bcrypto\b/],
];

describe("purity", () => {
  it("src uses no clock, network or unseeded randomness", () => {
    const files = readdirSync(SRC).filter((f) => f.endsWith(".ts"));
    expect(files.length).toBeGreaterThan(10);
    for (const f of files) {
      const code = stripComments(readFileSync(join(SRC, f), "utf8"));
      const hits = BANNED.filter(([, re]) => re.test(code))
        .map(([n]) => n);
      expect(hits, f).toEqual([]);
    }
  });
});
