import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(import.meta.dirname, "..", "src");

function listTs(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const path = join(dir, e.name);
    if (e.isDirectory()) return listTs(path);
    return e.name.endsWith(".ts") ? [path] : [];
  });
}

const files = listTs(SRC).map((f) => ({
  rel: relative(SRC, f).split("\\").join("/"),
  text: readFileSync(f, "utf8"),
}));
const outsideDb = files.filter((f) => !f.rel.startsWith("db/"));

const ADAPTER = /from\s+["'][./]*(?:\.\.\/)*db\/(pglite|pg)["']/;

describe("one place for transactions and adapters", () => {
  it("scans the source", () => {
    expect(files.some((f) => f.rel === "db/tenant.ts")).toBe(true);
  });
  it(".transaction( and SET LOCAL ROLE appear only in src/db", () => {
    for (const f of outsideDb) {
      expect(f.text.includes(".transaction("), f.rel).toBe(false);
      expect(f.text.includes("SET LOCAL ROLE"), f.rel).toBe(false);
    }
  });
  it("the adapter pattern catches planted imports", () => {
    expect(ADAPTER.test('import { openPg } from "./db/pg";')).toBe(true);
    expect(ADAPTER.test('import { x } from "../db/pglite";')).toBe(true);
    expect(ADAPTER.test('import { x } from "../db/tenant";')).toBe(false);
  });
  it("only main.ts imports an adapter, and only pg", () => {
    for (const f of outsideDb) {
      const m = ADAPTER.exec(f.text);
      if (m === null) continue;
      expect(f.rel, f.rel).toBe("main.ts");
      expect(m[1]).toBe("pg");
    }
  });
});
