import { describe, expect, it } from "vitest";
import { gpssaDeadline, wpsDeadline } from "../src/deadlines/dates";
import { gpssaLateAddition } from "../src/deadlines/late";
import { fils } from "../src/money";
import { DEADLINE_PACKS } from "../src/rules/deadlines-pack";
import type { TraceLine } from "../src/trace-types";

const code = (c: string) => expect.objectContaining({ code: c });

function statusOf(trace: TraceLine[], id: string, key: string): string {
  const line = trace.find((l) => l.id === id);
  const rule = line?.rules.find((r) => r.key === key);
  if (rule === undefined) throw new Error(`no ${key} on ${id}`);
  return rule.status;
}

const pack = () => {
  const p = DEADLINE_PACKS[0];
  if (p === undefined) throw new Error("no pack");
  return p;
};

describe("ae-deadlines dates", () => {
  it("wps_due_first_of_next_month", () => {
    const june = wpsDeadline(2026, 6);
    expect(june.value).toEqual({ dueDate: "2026-07-01",
      alertFrom: "2026-07-02" });
    expect(wpsDeadline(2026, 12).value.dueDate).toBe("2027-01-01");
    expect(statusOf(june.trace, "deadline.wps.due",
      "wpsDueDayOfNextMonth")).toBe("secondary");
    expect(statusOf(june.trace, "deadline.wps.alert",
      "wpsLateAlertDayOfNextMonth")).toBe("convention");
  });
  it("no_pack_before_resolution_340", () => {
    expect(() => wpsDeadline(2026, 4)).toThrow(code("NO_PACK_FOR_DATE"));
    expect(wpsDeadline(2026, 5).value.dueDate).toBe("2026-06-01");
    expect(() => gpssaDeadline(2026, 4))
      .toThrow(code("NO_PACK_FOR_DATE"));
  });
  it("gpssa_last_day_fifteenth", () => {
    const d = gpssaDeadline(2026, 6);
    expect(d.value).toEqual({ payableFrom: "2026-07-01",
      lastDay: "2026-07-15" });
    expect(statusOf(d.trace, "deadline.gpssa.last-day",
      "gpssaLastDayOfNextMonth")).toBe("official");
  });
  it("refuses a bad period", () => {
    expect(() => wpsDeadline(2026, 13)).toThrow(code("INVALID_PERIOD"));
    expect(() => gpssaDeadline(2026.5, 1))
      .toThrow(code("INVALID_PERIOD"));
  });
});

describe("gpssaLateAddition", () => {
  const on = "2026-07-15";
  const late = (amount: bigint, days: number) =>
    gpssaLateAddition(fils(amount), days, undefined, on);
  it("gpssa_late_addition_daily", () => {
    expect(late(1000000n, 3).value).toBe(3000n);
    expect(late(1000000n, 0).value).toBe(0n);
  });
  it("gpssa_late_addition_capped", () => {
    expect(late(1000000n, 1001).value).toBe(1000000n);
  });
  it("gpssa_late_addition_rounds_down", () => {
    expect(late(999n, 1).value).toBe(0n);
  });
  it("traces the three rules on gpssa.late-addition", () => {
    const t = late(1000000n, 3).trace;
    const line = t.find((l) => l.id === "gpssa.late-addition");
    expect(line?.rules.map((r) => r.key)).toEqual(["gpssaLateDailyBps",
      "gpssaLateCapBps", "gpssaLateRounding"]);
    expect(line?.result).toBe("3000");
  });
  it("refuses a bad day count or amount", () => {
    expect(() => late(1000n, -1)).toThrow(code("INVALID_COUNT"));
    expect(() => late(1000n, 1.5)).toThrow(code("INVALID_COUNT"));
    expect(() => late(-1n, 1)).toThrow(code("INVALID_AMOUNT"));
  });
  it("needs a pack on the given date", () => {
    expect(() => gpssaLateAddition(fils(1000n), 1, undefined,
      "2026-05-31")).toThrow(code("NO_PACK_FOR_DATE"));
  });
});

describe("ae-deadlines pack", () => {
  it("wps_fines_unsourced", () => {
    for (const key of ["wpsFinePerWorkerFils", "wpsFineCapFils"]) {
      expect(pack().params[key]).toEqual({ value: null, source: null,
        status: "unsourced" });
    }
  });
  it("pack_frozen", () => {
    expect(Object.isFrozen(pack().params.wpsDueDayOfNextMonth))
      .toBe(true);
    expect(Object.isFrozen(DEADLINE_PACKS)).toBe(true);
  });
  it("holds exactly the plan's params and dates", () => {
    const p = pack();
    expect(p).toMatchObject({ id: "ae-deadlines", version: "2026-06-01",
      effectiveFrom: "2026-06-01", effectiveTo: null });
    expect(Object.keys(p.params).sort()).toEqual([
      "gpssaLastDayOfNextMonth", "gpssaLateCapBps", "gpssaLateDailyBps",
      "gpssaLateRounding", "gpssaPayableFromDayOfNextMonth",
      "wpsDueDayOfNextMonth", "wpsFineCapFils", "wpsFinePerWorkerFils",
      "wpsLateAlertDayOfNextMonth"]);
    expect(p.params.gpssaLateDailyBps?.value).toBe(10);
    expect(p.params.gpssaLateCapBps?.value).toBe(10000);
    expect(p.params.gpssaLateRounding?.value).toBe("DOWN");
  });
});
