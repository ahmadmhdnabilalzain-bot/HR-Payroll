import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const FILES = ["payroll/compute.ts", "payroll/compute-settlement.ts",
  "leave/days.ts"].map((f) => join(import.meta.dirname, "..", "src", f));

const BANNED: [string, RegExp][] = [
  ["Date", /\bDate\b/],
  ["process", /\bprocess\b/],
  ["fetch", /\bfetch\b/],
  ["node:", /["']node:/],
  ["randomUUID", /\brandomUUID\b/],
  ["db import", /from\s+["'][./]*(?:\.\.\/)*db\//],
  ["Math.random", /\bMath\.random\b/],
];

describe("compute is pure", () => {
  it("the patterns catch planted breaches and spare look-alikes", () => {
    expect(BANNED.some(([, r]) => r.test("new Date()"))).toBe(true);
    expect(BANNED.some(([, r]) => r.test('import x from "../db/db";')))
      .toBe(true);
    expect(BANNED.some(([, r]) => r.test("joiningDate; lastWorkingDate")))
      .toBe(false);
  });
  it("uses no clock, env, network, randomness or database", () => {
    for (const f of FILES) {
      const text = readFileSync(f, "utf8");
      for (const [name, re] of BANNED) expect(re.test(text), `${f} ${name}`)
        .toBe(false);
    }
  });
});
