import { describe, expect, it } from "vitest";
import {
  assembly,
  STEP_GAP,
  STEP_MS,
  STEPS_FROM,
} from "../../src/components/explain/assembly";
import { buildRunSource } from "../../src/demo/data/run-detail";

const all = Object.values(buildRunSource().at({}).explain);

describe("explain assembly", () => {
  it("lines-land-in-order-and-totals-after-their-parts", () => {
    for (const e of all) {
      for (const phone of [false, true]) {
        const p = assembly(e.steps, phone);
        expect(p.at.length).toBe(e.steps.length);
        p.at.forEach((t, i) => {
          const prev = p.at[i - 1];
          if (prev === undefined) return expect(t).toBe(STEPS_FROM);
          expect(t).toBeGreaterThan(prev);
          // A total starts only once the line before it has landed.
          if (e.steps[i]?.op === "total") {
            expect(t).toBeGreaterThanOrEqual(prev + STEP_MS);
          }
        });
        expect(p.after).toBeGreaterThanOrEqual((p.at.at(-1) ?? 0) +
          STEP_MS);
      }
    }
  });

  it("the-sum-check-is-the-last-total", () => {
    const sums = all.filter((e) => e.steps.some((x) => x.op === "total"));
    expect(sums.length).toBeGreaterThan(5);
    for (const e of sums) {
      const p = assembly(e.steps);
      const last = e.steps.map((x) => x.op).lastIndexOf("total");
      expect(p.check).toBe(last);
    }
  });

  it("short-workings-keep-the-designed-stagger", () => {
    const p = assembly([{ text: "a" }, { text: "b" }, { text: "c" }]);
    expect(p.at).toEqual([STEPS_FROM, STEPS_FROM + STEP_GAP,
      STEPS_FROM + 2 * STEP_GAP]);
    expect(STEP_GAP).toBeGreaterThanOrEqual(80);
    expect(STEP_GAP).toBeLessThanOrEqual(120);
  });
});
