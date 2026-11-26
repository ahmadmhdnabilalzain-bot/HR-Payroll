import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { fromDayNumber, toDayNumber } from "../src/dates";
import { computeEmiratisation } from "../src/emiratisation/compute";
import { activeOn, notCountedReasons } from "../src/emiratisation/count";
import type {
  EmiratisationEmployee,
  EmiratisationInput,
} from "../src/emiratisation/types";
import { fils } from "../src/money";
import { FINE_2026_NOTE } from "../src/rules/emiratisation-pack";

function codeOf(fn: () => unknown): string {
  try {
    fn();
  } catch (e) {
    return (e as { code: string }).code;
  }
  return "NONE";
}

/** A non-national, unskilled, active since 2020. */
function emp(id: string, patch: Partial<EmiratisationEmployee> = {})
  : EmiratisationEmployee {
  return { employeeId: id, isUaeNational: false,
    joiningDate: "2020-01-01", lastWorkingDate: null, skilled: false,
    workPermitValid: true, paidViaWps: true, gpssaRegistered: true,
    monthlyWage: fils(700000n), ...patch };
}

/** A counted national: all three flags true, wage 700000 fils. */
const national = (id: string, patch: Partial<EmiratisationEmployee> = {}) =>
  emp(id, { isUaeNational: true, skilled: true, ...patch });

/** active staff, skilled of them, counted of the skilled nationals. */
function staff(active: number, skilled: number, counted: number) {
  const list: EmiratisationEmployee[] = [];
  for (let i = 0; i < active; i += 1) {
    const id = `e${i}`;
    if (i < counted) list.push(national(id));
    else list.push(emp(id, { skilled: i < skilled }));
  }
  return list;
}

const input = (asOf: string, employees: EmiratisationEmployee[],
  sectorInScope: boolean | null = null): EmiratisationInput =>
  ({ asOf, sectorInScope, employees });

const DOWN = { largeRequiredRounding: "DOWN" };

describe("computeEmiratisation, large band", () => {
  it("large_on_target", () => {
    const r = computeEmiratisation(input("2026-12-01", staff(60, 40, 4)),
      undefined, DOWN);
    expect(r.checkpoint).toBe("2026-12-31");
    expect(r.band).toBe("large");
    expect(r.headcount).toBe(60);
    expect(r.skilledHeadcount).toBe(40);
    expect(r.required).toBe(4);
    expect(r.countedNationals).toBe(4);
    expect(r.status).toBe("on-target");
    expect(r.shortfall).toBe(0);
    expect(r.fineExposure).toBe(0n);
    expect(r.missingParams).toEqual([]);
    expect(r.trace.map((l) => l.id)).toEqual([
      "emiratisation.headcount", "emiratisation.band",
      "emiratisation.skilled", "emiratisation.required",
      "emiratisation.counted", "emiratisation.fine"]);
  });
  it("large_needs_rounding", () => {
    const r = computeEmiratisation(input("2026-12-01", staff(60, 40, 4)));
    expect(r.status).toBe("needs-input");
    expect(r.missingParams).toEqual(["largeRequiredRounding"]);
    expect(r.required).toBeNull();
    expect(r.shortfall).toBeNull();
    expect(r.countedNationals).toBe(4);
  });
  it("fine_2026_unsourced_does_not_throw", () => {
    const r = computeEmiratisation(input("2026-12-01", staff(60, 40, 3)),
      undefined, DOWN);
    expect(r.status).toBe("below-target");
    expect(r.required).toBe(4);
    expect(r.shortfall).toBe(1);
    expect(r.fineExposure).toBeNull();
    expect(r.fineNote).toBe(FINE_2026_NOTE);
    expect(r.missingParams).toEqual(["finePerPostPerYear_2026"]);
  });
  it("fine_2026_override", () => {
    const r = computeEmiratisation(input("2026-12-01", staff(60, 40, 3)),
      undefined, { ...DOWN, finePerPostPerYear_2026: 12000000 });
    expect(r.fineExposure).toBe(12000000n);
    expect(r.fineNote).toBeNull();
    const fine = r.trace.find((l) => l.id === "emiratisation.fine")!;
    expect(fine.rules[0]!.key).toBe("finePerPostPerYear_2026");
    expect(fine.rules[0]!.overridden).toBe(true);
  });
  it("checkpoint_2025", () => {
    const r = computeEmiratisation(input("2025-08-01", staff(60, 40, 1)),
      undefined, DOWN);
    expect(r.checkpoint).toBe("2025-12-31");
    expect(r.required).toBe(3);
    expect(r.shortfall).toBe(2);
    expect(r.fineExposure).toBe(21600000n);
    const req = r.trace.find((l) => l.id === "emiratisation.required")!;
    expect(req.rules[0]!.key).toBe("largeTargetBps_2025-12-31");
    expect(req.rules[0]!.status).toBe("convention");
    expect(req.rules[1]!.overridden).toBe(true);
  });
  it("half-year checkpoint has no sourced target", () => {
    const r = computeEmiratisation(input("2026-03-01", staff(60, 40, 4)),
      undefined, DOWN);
    expect(r.checkpoint).toBe("2026-06-30");
    expect(r.status).toBe("needs-input");
    expect(r.missingParams).toEqual(["largeTargetBps_2026-06-30"]);
  });
  it("refuses HALF_EVEN rounding", () => {
    expect(codeOf(() => computeEmiratisation(
      input("2026-12-01", staff(60, 40, 4)), undefined,
      { largeRequiredRounding: "HALF_EVEN" }))).toBe("INVALID_PARAM");
  });
  it("skilled_null_needs_input", () => {
    const list = staff(60, 40, 4);
    list[50] = emp("x1", { skilled: null });
    const r = computeEmiratisation(input("2026-12-01", list),
      undefined, DOWN);
    expect(r.missingInputs).toContain("skilled:x1");
    expect(r.status).toBe("needs-input");
    expect(r.required).toBeNull();
    expect(r.shortfall).toBeNull();
    expect(r.fineExposure).toBeNull();
  });
  it("counts only skilled nationals in the large band", () => {
    const list = staff(60, 40, 4);
    list[55] = national("n9", { skilled: false });
    const r = computeEmiratisation(input("2026-12-01", list),
      undefined, DOWN);
    expect(r.nationals).toBe(5);
    expect(r.countedNationals).toBe(4);
  });
});

describe("computeEmiratisation, other bands", () => {
  it("mid_band", () => {
    const yes = computeEmiratisation(input("2025-10-01", staff(30, 0, 0),
      true));
    expect(yes.band).toBe("mid");
    expect(yes.checkpoint).toBe("2025-12-31");
    expect(yes.required).toBe(2);
    expect(yes.skilledHeadcount).toBeNull();
    const unknown = computeEmiratisation(input("2025-10-01",
      staff(30, 0, 0), null));
    expect(unknown.band).toBe("unknown");
    expect(unknown.status).toBe("needs-input");
    expect(unknown.missingInputs).toEqual(["sectorInScope"]);
    const no = computeEmiratisation(input("2025-10-01", staff(30, 0, 0),
      false));
    expect(no.band).toBe("none");
    expect(no.status).toBe("not-applicable");
  });
  it("mid band in 2026 needs the unsourced figure", () => {
    const r = computeEmiratisation(input("2026-10-01", staff(30, 0, 0),
      true));
    expect(r.status).toBe("needs-input");
    expect(r.missingParams).toEqual(["midRequired_2026-12-31"]);
  });
  it("under_20", () => {
    const r = computeEmiratisation(input("2026-10-01", staff(19, 0, 0),
      true));
    expect(r.band).toBe("none");
    expect(r.status).toBe("not-applicable");
    expect(r.checkpoint).toBeNull();
  });
  it("asof_out_of_range", () => {
    expect(codeOf(() => computeEmiratisation(input("2024-06-01", []))))
      .toBe("NO_PACK_FOR_DATE");
    expect(codeOf(() => computeEmiratisation(input("2026-02-30", []))))
      .toBe("INVALID_DATE");
  });
});

describe("counting", () => {
  it("not_counted_reasons", () => {
    const at = (e: EmiratisationEmployee) =>
      notCountedReasons(e, "2026-01-15", 600000n, "2026-07-01");
    expect(at(national("a", { paidViaWps: false })))
      .toEqual(["not-paid-via-wps"]);
    expect(at(national("b", { gpssaRegistered: null, paidViaWps: false })))
      .toEqual(["flags-not-entered"]);
    expect(at(national("c", { workPermitValid: false,
      gpssaRegistered: false }))).toEqual(["work-permit-not-valid",
      "not-gpssa-registered"]);
    expect(at(national("d"))).toEqual([]);
  });
  it("min_wage_cutoff", () => {
    const list = staff(60, 40, 0);
    list[0] = national("low", { monthlyWage: fils(550000n) });
    const june = computeEmiratisation(input("2026-06-15", list));
    expect(june.countedNationals).toBe(1);
    expect(june.notCounted).toEqual([]);
    const july = computeEmiratisation(input("2026-07-01", list));
    expect(july.countedNationals).toBe(0);
    expect(july.notCounted).toEqual([{ employeeId: "low",
      reasons: ["below-minimum-wage"] }]);
  });
  it("leaver_excluded", () => {
    const leaver = emp("l", { lastWorkingDate: "2026-05-31" });
    expect(activeOn(leaver, "2026-05-31")).toBe(true);
    expect(activeOn(leaver, "2026-06-01")).toBe(false);
    expect(activeOn(emp("j", { joiningDate: "2026-06-02" }), "2026-06-01"))
      .toBe(false);
    const list = [...staff(20, 0, 0), leaver];
    expect(computeEmiratisation(input("2026-06-01", list)).headcount)
      .toBe(20);
    expect(computeEmiratisation(input("2026-05-31", list)).headcount)
      .toBe(21);
  });
});

const flag = fc.constantFrom<boolean | null>(true, false, null);
const arbEmp = fc.record({
  employeeId: fc.uuid(), isUaeNational: fc.boolean(),
  joiningDate: fc.constantFrom("2020-01-01", "2025-06-01", "2026-09-01"),
  lastWorkingDate: fc.constantFrom(null, "2025-03-31", "2026-08-31"),
  skilled: flag, workPermitValid: flag, paidViaWps: flag,
  gpssaRegistered: flag,
  monthlyWage: fc.option(fc.bigInt({ min: 0n, max: 2000000n })
    .map((n) => fils(n))),
});
const arbAsOf = fc.integer({ min: toDayNumber("2025-01-01"),
  max: toDayNumber("2026-12-31") }).map(fromDayNumber);

describe("computeEmiratisation, properties", () => {
  it("counts stay within bounds and never throw in 2025 or 2026", () => {
    fc.assert(fc.property(arbAsOf, fc.array(arbEmp, { maxLength: 120 }),
      fc.constantFrom<boolean | null>(true, false, null),
      fc.constantFrom(undefined, "DOWN", "HALF_UP", "UP"),
      (asOf, employees, sector, mode) => {
        const ov = mode === undefined ? undefined
          : { largeRequiredRounding: mode };
        const r = computeEmiratisation({ asOf, sectorInScope: sector,
          employees }, undefined, ov);
        expect(r.countedNationals).toBeLessThanOrEqual(r.nationals);
        if (r.band === "large" && r.required !== null) {
          expect(r.required).toBeLessThanOrEqual(r.skilledHeadcount!);
        }
      }), { numRuns: 100 });
  });
  it("large band: required never exceeds the skilled headcount", () => {
    const second = fc.constantFrom(
      ["2025-07-01", "2025-12-31"], ["2026-07-01", "2026-12-31"]);
    const asOf = second.chain(([lo, hi]) => fc.integer({
      min: toDayNumber(lo!), max: toDayNumber(hi!) })).map(fromDayNumber);
    const worker = fc.record({ skilled: fc.boolean(),
      isUaeNational: fc.boolean() });
    fc.assert(fc.property(asOf,
      fc.array(worker, { minLength: 50, maxLength: 120 }),
      fc.constantFrom("DOWN", "HALF_UP", "UP"), (day, list, mode) => {
        const employees = list.map((w, i) => emp(`e${i}`, w));
        const r = computeEmiratisation({ asOf: day, sectorInScope: null,
          employees }, undefined, { largeRequiredRounding: mode });
        expect(r.band).toBe("large");
        expect(r.required).not.toBeNull();
        expect(r.required!).toBeLessThanOrEqual(r.skilledHeadcount!);
      }), { numRuns: 100 });
  });
});
