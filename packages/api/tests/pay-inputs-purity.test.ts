import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(import.meta.dirname, "..", "src");
const read = (f: string) => readFileSync(join(SRC, f), "utf8");

describe("pay inputs never read tracking data", () => {
  it("no wfh text or import in the pay-input modules", () => {
    for (const f of ["time/pay-inputs.ts", "time/pay-inputs-load.ts"]) {
      const t = read(f).toLowerCase();
      expect(t.includes("wfh"), f).toBe(false);
      expect(t.includes("/wfh/"), f).toBe(false);
    }
  });
  it("pay-inputs.ts is pure", () => {
    const t = read("time/pay-inputs.ts");
    for (const re of [/\bDate\b/, /\bdeps\b/, /\btx\b/, /\.\/db/]) {
      expect(re.test(t), String(re)).toBe(false);
    }
  });
  it("the loader writes nothing", () => {
    const t = read("time/pay-inputs-load.ts");
    expect(/\b(INSERT|UPDATE|DELETE)\b/.test(t)).toBe(false);
    expect(t.includes("pay_runs")).toBe(false);
  });
});
