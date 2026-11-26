import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(import.meta.dirname, "..", "..");

/** Deadline and compliance code; paths not built yet are skipped. */
const SCANNED = [
  "engine/src/deadlines",
  "engine/src/rules/deadlines-pack.ts",
  "api/src/compliance",
  "api/src/deadlines",
];

/** The WPS per-worker fine and cap "commonly understood", unsourced. */
const FIGURES = ["1,000", "20,000", "100000", "2000000"];

function filesUnder(path: string): string[] {
  if (!existsSync(path)) return [];
  if (!statSync(path).isDirectory()) return [path];
  return readdirSync(path).flatMap((n) => filesUnder(join(path, n)));
}

describe("no unsourced fine figures", () => {
  const files = SCANNED.flatMap((p) => filesUnder(join(ROOT, p)));
  it("scans the engine's deadline files", () => {
    expect(files.some((f) => f.endsWith("deadlines-pack.ts"))).toBe(true);
    expect(files.some((f) => f.endsWith("late.ts"))).toBe(true);
  });
  it("none of the scanned files holds a WPS fine figure", () => {
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      const hits = FIGURES.filter((f) => text.includes(f));
      expect(hits, file).toEqual([]);
    }
  });
});
