import { describe, expect, it } from "vitest";
import { loadPayrollParams } from "../src/payroll/params";
import type { RestDayWork } from "../src/payroll/types";
import { variableEarnings } from "../src/payroll/variable";
import { PAYROLL_PACKS } from "../src/rules/payroll-pack";
import { TraceBuilder } from "../src/trace";
import { fx, P, type FxPatch } from "./payroll-fixture";

function run(patch: FxPatch, params = P) {
  const t = new TraceBuilder();
  const r = variableEarnings(fx(patch), params, t);
  const by = new Map(r.lines.map((l) => [l.traceId, l.amount]));
  return { ...r, by, trace: t.lines() };
}

const ot = (minutes: number, nightMinutes = 0, date = "2026-06-10") =>
  ({ date, minutes, nightMinutes });
const rest = (kind: RestDayWork["kind"],
  compensation: RestDayWork["compensation"] = "pay",
  date = "2026-06-06"): RestDayWork => ({ date, kind, compensation });
const codes = (r: { flags: { code: string }[] }) =>
  r.flags.map((f) => f.code);

describe("overtime", () => {
  it("pays two hours of overtime at 125%", () => {
    const r = run({ overtime: [ot(120)] });
    expect(r.by.get("earn.overtime.normal")).toBe(10417n);
    expect(r.lines).toHaveLength(1);
    expect(r.lines[0]?.kind).toBe("overtime");
    expect(r.flags).toEqual([]);
  });
  it("pays a night hour at 150%", () => {
    const r = run({ overtime: [ot(60, 60)] });
    expect(r.by.get("earn.overtime.night")).toBe(6250n);
    expect(r.by.has("earn.overtime.normal")).toBe(false);
  });
  it("splits a mixed day and flags the cap", () => {
    const r = run({ overtime: [ot(180, 60)] });
    expect(r.by.get("earn.overtime.normal")).toBe(10417n);
    expect(r.by.get("earn.overtime.night")).toBe(6250n);
    expect(codes(r)).toEqual(["OVERTIME_DAILY_CAP_EXCEEDED"]);
    expect(r.flags[0]?.detail).toMatchObject({ date: "2026-06-10",
      minutes: "180" });
  });
  it("never cuts pay above the daily cap", () => {
    const r = run({ overtime: [ot(180)] });
    expect(r.by.get("earn.overtime.normal")).toBe(15625n);
    expect(codes(r)).toEqual(["OVERTIME_DAILY_CAP_EXCEEDED"]);
  });
  it("pays shift workers 125% at night", () => {
    const r = run({ employee: { shiftWorker: true },
      overtime: [ot(60, 60), ot(30, 30, "2026-06-11")] });
    expect(r.by.get("earn.overtime.normal")).toBe(7813n);
    expect(r.by.has("earn.overtime.night")).toBe(false);
    expect(codes(r)).toEqual(["SHIFT_WORKER_NIGHT_RATE"]);
    const one = run({ employee: { shiftWorker: true },
      overtime: [ot(60, 60)] });
    expect(one.by.get("earn.overtime.normal")).toBe(5208n);
  });
  it("uses the contract's daily hours", () => {
    const r = run({ employee: { normalHoursPerDay: 7 },
      overtime: [ot(120)] });
    expect(r.by.get("earn.overtime.normal")).toBe(11905n);
  });
  it("traces the minutes paid on each line", () => {
    const r = run({ overtime: [ot(180, 60)] });
    const night = r.trace.find((l) => l.id === "earn.overtime.night");
    expect(night?.inputs).toMatchObject({ minutes: "60",
      upliftBps: "5000", hoursPerDay: "8" });
    const normal = r.trace.find((l) => l.id === "earn.overtime.normal");
    expect(normal?.inputs.minutes).toBe("120");
    expect(normal?.result).toBe("10417");
  });
});

describe("rest-day and holiday work", () => {
  it("pays a worked rest day as an extra day plus half basic", () => {
    const r = run({ restDayWork: [rest("rest-day")] });
    expect(r.by.get("earn.rest-day")).toBe(66667n);
    expect(r.lines[0]?.kind).toBe("rest-day");
  });
  it("pays the premium only under the other reading", () => {
    const p = loadPayrollParams(PAYROLL_PACKS[0]!,
      { restDayPayMode: "premium-only" });
    const r = run({ restDayWork: [rest("rest-day")] }, p);
    expect(r.by.get("earn.rest-day")).toBe(16667n);
  });
  it("pays a worked holiday the same way", () => {
    const r = run({ restDayWork: [rest("holiday")] });
    expect(r.by.get("earn.holiday")).toBe(66667n);
    expect(r.by.has("earn.rest-day")).toBe(false);
  });
  it("gives no pay for a day off in lieu", () => {
    const r = run({ restDayWork: [rest("holiday", "day-off")] });
    expect(r.by.get("earn.holiday")).toBe(0n);
    const line = r.trace.find((l) => l.id === "earn.holiday");
    expect(line?.inputs).toMatchObject({ days: "0", daysOff: "1" });
  });
  it("pays two rest days rounded once", () => {
    const r = run({ restDayWork: [rest("rest-day"),
      rest("rest-day", "pay", "2026-06-13")] });
    expect(r.by.get("earn.rest-day")).toBe(133333n);
  });
});

describe("leave encashment", () => {
  it("cashes five leave days at the wage", () => {
    const r = run({ encashLeaveDays: 5 });
    expect(r.by.get("earn.leave-encashment")).toBe(250000n);
    const line = r.trace.find((l) => l.id === "earn.leave-encashment");
    expect(line?.inputs.days).toBe("5");
  });
  it("emits no lines with no variable input", () => {
    const r = run({});
    expect(r.lines).toEqual([]);
    expect(r.flags).toEqual([]);
    expect(r.trace).toEqual([]);
  });
});
