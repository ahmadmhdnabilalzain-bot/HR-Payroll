import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { addDays } from "../src/dates";
import { TIME_PACKS } from "../src/rules/time-pack";
import { computeDaySheet, periodHourFlags } from "../src/time/day-sheet";
import {
  accruedHalves,
  balanceHalves,
  checkLeavePolicy,
} from "../src/time/leave-accrual";
import { loadTimeParams } from "../src/time/params";
import { checkRoster } from "../src/time/roster-checks";
import type {
  BalanceInput,
  DayInput,
  LeavePolicyFacts,
  RosterDayInput,
  ShiftSlot,
} from "../src/time/types";

/** Pins each threshold and rounding the engine review's mutants hit. */
const P = loadTimeParams(TIME_PACKS[0]!, undefined);

const shift = (start: number, end: number, breakMinutes: number):
  ShiftSlot => ({ start, end, breakMinutes });

function sheet(over: Partial<DayInput>) {
  return computeDaySheet({ date: "2026-03-02", kind: "work", shift: null,
    worked: [], openRecord: false, ramadan: false, leave: "none",
    ...over }, P);
}

const minutesRun = (mins: number[]) => mins.map((workedMinutes, i) =>
  ({ date: addDays("2026-03-01", i), workedMinutes }));

describe("144 hours in 3 weeks", () => {
  it("exact_limit_no_flag_one_more_flags", () => {
    const exact = [...Array(20).fill(411), 420];
    expect(periodHourFlags(minutesRun(exact), P)).toEqual([]);
    const over = [...Array(20).fill(411), 421];
    expect(periodHourFlags(minutesRun(over), P).length).toBe(1);
  });
  it("window_is_21_days", () => {
    const flags = periodHourFlags(minutesRun([400,
      ...Array(21).fill(412)]), P);
    expect(flags.length).toBe(1);
    expect(flags[0]!.dates).toEqual(["2026-03-02", "2026-03-22"]);
    expect(flags[0]!.detail.minutes).toBe("8652");
  });
});

describe("day sheet thresholds", () => {
  it("overtime_cap_at_limit_no_flag", () => {
    const at = (end: number) => sheet({ shift: shift(540, 1020, 0),
      worked: [{ start: 540, end }] });
    expect(at(1140).overtimeMinutes).toBe(120);
    expect(at(1140).flags).toEqual([]);
    expect(at(1141).flags.map((f) => f.code))
      .toEqual(["OVERTIME_DAILY_CAP_EXCEEDED"]);
  });
  it("half_day_schedule_rounds_down", () => {
    expect(sheet({ leave: "am", shift: shift(540, 1021, 0) })
      .scheduledMinutes).toBe(240);
  });
  it("clocked_below_break_is_zero_not_negative", () => {
    const at = (end: number) => sheet({ shift: shift(540, 1080, 60),
      worked: [{ start: 540, end }] }).workedMinutes;
    expect([at(570), at(600), at(601)]).toEqual([0, 0, 1]);
  });
});

function rday(date: string, slot: RosterDayInput["slot"]): RosterDayInput {
  return { date, slot, holiday: false, companyRestDay: false,
    ramadan: false, onApprovedLeave: false };
}
const roster = (slots: RosterDayInput["slot"][]) => checkRoster({
  employeeId: "e1",
  days: slots.map((s, i) => rday(addDays("2026-03-02", i), s)),
}, P).map((f) => f.code);

describe("roster thresholds", () => {
  it("week_at_48_hours_no_flag", () => {
    const net480 = shift(540, 1080, 60);
    expect(roster(Array(6).fill(net480))).not.toContain(
      "WEEK_OVER_48_HOURS");
    expect(roster([...Array(5).fill(net480), shift(540, 1081, 60)]))
      .toContain("WEEK_OVER_48_HOURS");
  });
  it("shift_at_normal_hours_no_flag", () => {
    expect(roster([shift(540, 1080, 60)])).not.toContain(
      "SHIFT_OVER_NORMAL_HOURS");
    expect(roster([shift(540, 1081, 60)])).toContain(
      "SHIFT_OVER_NORMAL_HOURS");
  });
});

describe("accrual rounding", () => {
  const pol = (accrual: "upfront" | "monthly") =>
    ({ accrual, annualDays: 25, joiningYearProRata: true });
  it("monthly_rounds_down", () => {
    expect(accruedHalves(pol("monthly"), "2020-01-01", 2026, "2026-01-31"))
      .toBe(4);
  });
  it("upfront_pro_rata_rounds_down", () => {
    expect(accruedHalves(pol("upfront"), "2026-04-01", 2026, "2026-04-01"))
      .toBe(37);
  });
});

const BAL: BalanceInput = {
  accruedHalves: 60, carriedHalves: 10, carriedExpiresOn: "2026-03-31",
  adjustmentHalves: 0, taken: [{ date: "2026-03-31", halves: 4 }],
  pendingHalves: 0, asOf: "2026-03-31",
};

/** Independent model: walk taken entries in date order. */
function modelExpired(b: BalanceInput): number {
  let carried = b.carriedHalves;
  const exp = b.carriedExpiresOn;
  for (const t of [...b.taken].sort((x, y) =>
    x.date < y.date ? -1 : 1)) {
    if (exp === null || t.date <= exp) {
      carried -= Math.min(carried, t.halves);
    }
  }
  return exp !== null && b.asOf > exp ? carried : 0;
}

describe("carried leave expiry", () => {
  it("expiry_day_itself_not_expired", () => {
    expect(balanceHalves(BAL).expiredHalves).toBe(0);
    expect(balanceHalves({ ...BAL, asOf: "2026-04-01" }).expiredHalves)
      .toBe(6);
  });
  it("leave_taken_on_expiry_day_uses_carried", () => {
    expect(balanceHalves(BAL).carriedUsedHalves).toBe(4);
  });
  it("expiry_matches_model", () => {
    const dates = ["2026-03-30", "2026-03-31", "2026-04-01"];
    const arb = fc.record({
      accruedHalves: fc.integer({ min: 0, max: 60 }),
      carriedHalves: fc.integer({ min: 0, max: 30 }),
      carriedExpiresOn: fc.constantFrom(null, "2026-03-31"),
      adjustmentHalves: fc.constant(0),
      taken: fc.array(fc.record({ date: fc.constantFrom(...dates),
        halves: fc.integer({ min: 0, max: 12 }) }), { maxLength: 4 }),
      pendingHalves: fc.constant(0),
      asOf: fc.constantFrom(...dates),
    });
    fc.assert(fc.property(arb, (b) => {
      const r = balanceHalves(b);
      expect(r.expiredHalves).toBe(modelExpired(b));
      const taken = b.taken.reduce((s, t) => s + t.halves, 0);
      expect(r.availableHalves).toBe(b.accruedHalves + b.carriedHalves -
        modelExpired(b) - taken);
    }), { numRuns: 300 });
  });
});

const facts = (over: Partial<LeavePolicyFacts>): LeavePolicyFacts => ({
  payrollKind: "annual", annualDays: 30, accrual: "monthly",
  dayCount: "calendar", carryOverMaxDays: null, ...over });
const policy = (over: Partial<LeavePolicyFacts>) =>
  checkLeavePolicy(facts(over), P).map((f) => f.code);

describe("policy thresholds", () => {
  it("monthly_rate_boundary", () => {
    expect(policy({ annualDays: 24 })).not.toContain(
      "MONTHLY_BELOW_FIRST_YEAR_RATE");
    expect(policy({ annualDays: 23 })).toContain(
      "MONTHLY_BELOW_FIRST_YEAR_RATE");
  });
  it("sick_days_over_90_differ", () => {
    expect(policy({ payrollKind: "sick", annualDays: 120 }))
      .toEqual(["SICK_DAYS_DIFFER_FROM_LAW"]);
    expect(policy({ payrollKind: "sick", annualDays: 90 })).toEqual([]);
  });
});
