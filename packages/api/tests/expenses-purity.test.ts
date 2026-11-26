import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(import.meta.dirname, "..", "src");
/** Pure modules: no clock, environment, network, node APIs, ids or db. */
const PURE = ["approvals/resolve.ts", "expenses/policy.ts",
  "expenses/check.ts", "expenses/reimburse.ts"];
const BANNED = [/\bDate\b/, /\bprocess\b/, /\bfetch\b/, /node:/,
  /randomUUID/, /["']\.\/db/, /["']\.\.\/db/];

describe("pure expense modules", () => {
  for (const f of PURE) {
    it(f, () => {
      const text = readFileSync(join(SRC, f), "utf8");
      for (const re of BANNED) expect(re.test(text), `${f} ${re}`)
        .toBe(false);
    });
  }
  it("the pattern catches planted uses", () => {
    expect(BANNED.some((re) => re.test("const t = Date.now();"))).toBe(true);
    expect(BANNED.some((re) => re.test('import x from "../db/db";')))
      .toBe(true);
  });
});
