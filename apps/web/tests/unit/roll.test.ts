import { describe, expect, it } from "vitest";
import {
  dimAt,
  legibleAt,
  MAX_RANK,
  planRoll,
  ROLL_MS,
  slideAt,
  swapAt,
  type Slot,
} from "../../src/ui/roll";

const rolled = (from: string, to: string): Slot[] => {
  const p = planRoll(from, to);
  if (p.kind !== "roll") throw new Error(`not a roll: ${p.kind}`);
  return p.slots;
};

describe("roll plan", () => {
  it("rolls only the digits that changed, ranked right to left", () => {
    const slots = rolled("1,234.50", "1,284.55");
    expect(slots.map((x) => x.to).join("")).toBe("1,284.55");
    expect(slots.filter((x) => x.from !== undefined).map((x) =>
      [x.from, x.to, x.rank])).toEqual([["3", "8", 1], ["0", "5", 0]]);
  });

  it("swaps when the figure changes shape", () => {
    expect(planRoll("999.00", "1,000.00").kind).toBe("swap");
    expect(planRoll("1,000.00", "999.00").kind).toBe("swap");
    expect(planRoll("12", "12").kind).toBe("same");
  });

  it("caps the stagger", () => {
    const slots = rolled("11,111,111.11", "22,222,222.22");
    const ranks = slots.flatMap((x) => x.rank === undefined ? [] : [x.rank]);
    expect(Math.max(...ranks)).toBe(MAX_RANK);
  });
});

describe("never a wrong amount", () => {
  const cases: [string, string][] = [
    ["1,234.50", "1,284.55"],
    ["11,111,111.11", "22,222,222.22"],
    ["953,120.40", "958,655.40"],
    ["119", "120"],
  ];
  for (const [from, to] of cases) {
    it(`${from} to ${to}: every 1 ms reads old, new or nothing`, () => {
      const slots = rolled(from, to);
      for (let t = 0; t <= ROLL_MS; t += 1) {
        const read = legibleAt(slots, t);
        const set = new Set(read);
        // Old and new digits never legible together.
        expect(set.has("old") && set.has("new")).toBe(false);
        // A changed digit is never blank beside a legible one.
        if (set.has("old") || set.has("new")) {
          expect(set.has(null)).toBe(false);
        }
      }
      expect(legibleAt(slots, 0).every((x) => x === "old")).toBe(true);
      expect(legibleAt(slots, ROLL_MS).every((x) => x === "new"))
        .toBe(true);
    });
  }

  it("slides monotonically and ends settled", () => {
    for (let r = 0; r <= MAX_RANK; r++) {
      let last = 0;
      for (let t = 0; t <= ROLL_MS; t += 1) {
        const p = slideAt(r, t);
        expect(p).toBeGreaterThanOrEqual(last);
        last = p;
      }
      expect(last).toBe(1);
    }
    expect(dimAt(ROLL_MS)).toBe(1);
  });

  it("a swap never shows the old and the new figure at once", () => {
    for (let t = 0; t <= 300; t += 1) {
      const o = swapAt(t);
      expect(o.old > 0 && o.new > 0).toBe(false);
    }
  });
});
