import { describe, expect, it } from "vitest";
import { accountDays } from "../src/payroll/days";
import { fixedEarnings } from "../src/payroll/earnings";
import { validatePayslipInput } from "../src/payroll/validate";
import { TraceBuilder } from "../src/trace";
import {
  absent,
  dates,
  fx,
  P,
  type FxPatch,
} from "./payroll-fixture";

function earn(patch: FxPatch) {
  const input = fx(patch);
  const t = new TraceBuilder();
  const d = accountDays(input, validatePayslipInput(input, P), P, t);
  const lines = fixedEarnings(input, d, P, t);
  return { lines, t, amounts: lines.map((l) => l.amount) };
}

/** Basic, housing, transport, then their sum. */
function amounts(patch: FxPatch): bigint[] {
  const a = earn(patch).amounts;
  return [...a, a.reduce((x, y) => x + y, 0n)];
}

describe("fixedEarnings", () => {
  it("pays a full June in full", () => {
    expect(amounts({})).toEqual([1000000n, 400000n, 100000n, 1500000n]);
    const { lines } = earn({});
    expect(lines.map((l) => [l.traceId, l.kind])).toEqual([
      ["earn.basic", "basic"], ["earn.allowance#housing", "housing"],
      ["earn.allowance#transport", "conveyance"]]);
  });
  it("prorates a joiner on 11 June", () => {
    expect(amounts({ employee: { joiningDate: "2026-06-11" } }))
      .toEqual([666667n, 266667n, 66667n, 1000001n]);
  });
  it("prorates a leaver on 15 March", () => {
    expect(amounts({ month: 3, employee: { leavingDate: "2026-03-15" } }))
      .toEqual([483871n, 193548n, 48387n, 725806n]);
  });
  it("handles joining and leaving in one February", () => {
    expect(amounts({ month: 2, employee: { joiningDate: "2026-02-10",
      leavingDate: "2026-02-20" } }))
      .toEqual([392857n, 157143n, 39286n, 589286n]);
  });
  it("uses 29 days in a leap February", () => {
    expect(amounts({ year: 2028, month: 2,
      employee: { joiningDate: "2028-02-15" } }))
      .toEqual([517241n, 206897n, 51724n, 775862n]);
  });
  it("takes out three unpaid days", () => {
    expect(amounts({ absences: absent("unpaid", dates("2026-06", 2, 4)) }))
      .toEqual([900000n, 360000n, 90000n, 1350000n]);
  });
  it("pays nothing for a whole unpaid month", () => {
    expect(amounts({ absences: absent("unpaid",
      dates("2026-06", 1, 30)) })).toEqual([0n, 0n, 0n, 0n]);
  });
  it("steps sick pay from full to half", () => {
    expect(amounts({ sickDaysUsedBefore: 10,
      absences: absent("sick", dates("2026-06", 1, 10)) }))
      .toEqual([916667n, 366667n, 91667n, 1375001n]);
  });
  it("crosses 15 sick days inside July", () => {
    expect(amounts({ month: 7, sickDaysUsedBefore: 10,
      absences: absent("sick", dates("2026-07", 1, 31)) }))
      .toEqual([580645n, 232258n, 58065n, 870968n]);
  });
  it("crosses 45 sick days", () => {
    expect(amounts({ sickDaysUsedBefore: 40,
      absences: absent("sick", dates("2026-06", 1, 20)) }))
      .toEqual([416667n, 166667n, 41667n, 625001n]);
  });
  it("crosses 90 sick days", () => {
    expect(amounts({ sickDaysUsedBefore: 80,
      absences: absent("sick", dates("2026-06", 1, 15)) }))
      .toEqual([500000n, 200000n, 50000n, 750000n]);
  });
  it("ends probation mid-month", () => {
    expect(amounts({ employee: { probationEndDate: "2026-06-10" },
      absences: absent("sick", dates("2026-06", 9, 12)) }))
      .toEqual([933333n, 373333n, 93333n, 1399999n]);
  });
  it("steps maternity from half to unpaid", () => {
    expect(amounts({ maternityDaysUsedBefore: 55,
      absences: absent("maternity", dates("2026-06", 1, 10)) }))
      .toEqual([750000n, 300000n, 75000n, 1125000n]);
  });
  it("traces each line with its rules", () => {
    const { t } = earn({ sickDaysUsedBefore: 10,
      absences: absent("sick", dates("2026-06", 1, 10)) });
    const line = t.lines().find((l) => l.id === "earn.allowance#housing");
    expect(line?.result).toBe("366667");
    expect(line?.inputs).toMatchObject({ code: "housing",
      monthly: "400000", paidHalfDays: "55", totalHalfDays: "60" });
    const keys = line?.rules.map((r) => r.key) ?? [];
    expect(keys).toContain("prorationBasis");
    expect(keys).toContain("paidLeaveBase");
  });
});
