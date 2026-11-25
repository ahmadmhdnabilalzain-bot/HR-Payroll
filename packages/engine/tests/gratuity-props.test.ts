import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { addDays } from "../src/dates";
import { calculateGratuity, type GratuityInput } from "../src/gratuity";
import { fils } from "../src/money";
import { GRATUITY_PACKS } from "../src/rules/gratuity-pack";

// Joining from 1980 to 2020; leaving on or after the pack start, so the
// real pack always applies and total service is at least 397 days.
const joining = fc.integer({ min: 0, max: 14975 })
  .map((n) => addDays("1980-01-01", n));
const leaveOffset = fc.integer({ min: 0, max: 15000 });
const step = fc.integer({ min: 0, max: 4000 });
const basic = fc.bigInt({ min: 1n, max: 100000000000n });
const unpaid = fc.integer({ min: 0, max: 300 });

function gratuity(
  join: string,
  last: string,
  basicFils: bigint,
  unpaidDays: number,
): bigint {
  const i: GratuityInput = {
    joiningDate: join,
    lastWorkingDate: last,
    unpaidLeaveDays: unpaidDays,
    lastBasicMonthly: fils(basicFils),
    workerClass: "expat-full-time",
  };
  return calculateGratuity(i, GRATUITY_PACKS).value.amount;
}

describe("calculateGratuity properties", () => {
  it("never decreases as the last working date moves later", () => {
    fc.assert(
      fc.property(joining, leaveOffset, step, basic, unpaid,
        (j, off, d, b, u) => {
          const last1 = addDays("2022-02-02", off);
          const last2 = addDays(last1, d);
          const a1 = gratuity(j, last1, b, u);
          const a2 = gratuity(j, last2, b, u);
          expect(a2 >= a1).toBe(true);
        }),
      { numRuns: 500 },
    );
  });
  it("is never negative and never exceeds the cap", () => {
    fc.assert(
      fc.property(joining, leaveOffset, basic, unpaid, (j, off, b, u) => {
        const amount = gratuity(j, addDays("2022-02-02", off), b, u);
        expect(amount >= 0n).toBe(true);
        expect(amount <= b * 12n * 2n).toBe(true);
      }),
      { numRuns: 500 },
    );
  });
  it("checks every consecutive day across a leap-day joiner's years", () => {
    let prev = -1n;
    for (let n = 0; n < 6 * 366; n += 1) {
      const a = gratuity("2020-02-29", addDays("2022-02-02", n), 1000000n,
        0);
      expect(a >= prev).toBe(true);
      prev = a;
    }
  });
});
