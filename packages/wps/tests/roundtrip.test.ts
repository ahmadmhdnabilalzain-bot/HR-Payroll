import { daysInMonth, fils } from "@payroll/engine";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { generateSif, type SifEmployee } from "../src/generate";
import { defaultLayout as L } from "../src/layout";
import { validateSif } from "../src/validate";

const digits = (min: number, max: number): fc.Arbitrary<string> =>
  fc.stringMatching(new RegExp(`^[0-9]{${min},${max}}$`));
const amount = fc.bigInt({ min: 0n, max: 10_000_000n }).map(fils);
const pad2 = (n: number): string => String(n).padStart(2, "0");

const employee = (y: number, m: number, i: number) =>
  fc
    .record({
      routing: digits(9, 9),
      account: fc.stringMatching(/^[A-Z0-9]{23}$/),
      start: fc.integer({ min: 1, max: 31 }),
      len: fc.integer({ min: 0, max: 30 }),
      fullMonth: fc.boolean(),
      fixed: amount,
      variable: amount,
      leave: fc.nat({ max: 31 }),
    })
    .map((r): SifEmployee => {
      const last = daysInMonth(y, m);
      const start = r.fullMonth ? 1 : Math.min(r.start, last);
      const end = r.fullMonth ? last : Math.min(last, start + r.len);
      const edr = {
        personId: String(i + 1),
        routingCode: r.routing,
        account: r.account,
        payStart: `${y}-${pad2(m)}-${pad2(start)}`,
        payEnd: `${y}-${pad2(m)}-${pad2(end)}`,
        days: end - start + 1,
        fixed: r.fixed,
        variable: r.variable,
        unpaidLeaveDays: r.leave,
      };
      if (r.variable === 0n) return { edr };
      const z = fils(0n);
      return {
        edr,
        evp: {
          personId: edr.personId, routingCode: r.routing,
          housing: r.variable, conveyance: z, medical: z, passage: z,
          overtime: z, otherAllowances: z, leaveEncashment: z,
        },
      };
    });

const batch = fc
  .record({
    y: fc.integer({ min: 2011, max: 2099 }),
    m: fc.integer({ min: 1, max: 12 }),
    n: fc.integer({ min: 1, max: 20 }),
    employer: digits(1, 13),
    routing: digits(9, 9),
    ref: fc.stringMatching(/^[A-Za-z0-9 ]{0,35}$/),
  })
  .chain((b) =>
    fc
      .tuple(...Array.from({ length: b.n }, (_, i) => employee(b.y, b.m, i)))
      .map((employees) => ({
        employerId: b.employer,
        bankRoutingCode: b.routing,
        createdDate: `${b.y}-${pad2(b.m)}-15`,
        createdTime: "093000",
        month: { year: b.y, month: b.m },
        reference: b.ref,
        employees,
      })),
  );

describe("round trip", () => {
  it("generateSif output validates with zero errors", () => {
    fc.assert(
      fc.property(batch, (b) => {
        const { text } = generateSif(b, L);
        const errs = validateSif(text, L, "2100-01-01").filter(
          (f) => f.severity === "error",
        );
        expect(errs).toEqual([]);
        const evp = validateSif(text, L, "2100-01-01").filter(
          (f) => f.code.startsWith("EVP_"),
        );
        expect(evp).toEqual([]);
      }),
      { numRuns: 100 },
    );
  });
});
