import { readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(import.meta.dirname, "..", "src");
const IMPORT = /(?:from|import)\s*\(?\s*["'](\.[^"']+)["']/g;

/** Every source file reachable from `start` by relative imports. */
function reachable(start: string): string[] {
  const seen = new Set<string>();
  const todo = [resolve(SRC, start)];
  while (todo.length > 0) {
    const f = todo.pop()!;
    if (seen.has(f)) continue;
    seen.add(f);
    for (const m of readFileSync(f, "utf8").matchAll(IMPORT)) {
      todo.push(resolve(dirname(f), `${m[1]}.ts`));
    }
  }
  return [...seen].map((f) => relative(SRC, f).split("\\").join("/"));
}

/** Review M9: pay inputs never reach tracking code, even indirectly. */
describe("pay inputs import graph", () => {
  const files = reachable("time/pay-inputs-load.ts");
  it("walks the graph", () => {
    expect(files).toContain("time/timesheets.ts");
  });
  it("reaches no wfh module and no WFH timesheet source", () => {
    for (const f of files) {
      expect(f.startsWith("wfh/"), f).toBe(false);
      expect(f, f).not.toBe("time/sheet-wfh.ts");
      expect(readFileSync(join(SRC, f), "utf8"), f)
        .not.toMatch(/\bwfh_[a-z_]+\b/);
    }
  });
});
