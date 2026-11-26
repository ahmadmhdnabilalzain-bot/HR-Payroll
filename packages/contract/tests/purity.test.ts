import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(import.meta.dirname, "..", "src");
const ALLOWED = new Set(["write-openapi.ts"]);
const BANNED = /(?:from|import)\s*\(?\s*["'](node:|@payroll\/|hono|pg\b)/;

describe("contract purity", () => {
  const files = readdirSync(SRC).filter((f) => f.endsWith(".ts"));
  it("scans the source files", () => {
    expect(files.length).toBeGreaterThan(15);
  });
  it("the pattern catches planted imports", () => {
    expect(BANNED.test('import x from "node:fs";')).toBe(true);
    expect(BANNED.test('import { y } from "@payroll/engine";')).toBe(true);
    expect(BANNED.test('import { Hono } from "hono";')).toBe(true);
    expect(BANNED.test('import pg from "pg";')).toBe(true);
    expect(BANNED.test('import { z } from "zod";')).toBe(false);
  });
  it("only write-openapi.ts touches node:, @payroll, hono or pg", () => {
    for (const f of files) {
      if (ALLOWED.has(f)) continue;
      expect(BANNED.test(readFileSync(join(SRC, f), "utf8")), f)
        .toBe(false);
    }
  });
});
