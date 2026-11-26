import { describe, expect, it } from "vitest";
import {
  attendanceAgainstShifts,
  attendanceToday,
  buildDemoCompany,
  employeesWithCase,
  overtimeClaims,
  overtimePreApprovals,
  punches,
  rosterPlan,
  serializeDemo,
  shifts,
  unmatchedPunches,
} from "../src/index";

const c = buildDemoCompany();
const ISO = /\d{4}-\d{2}-\d{2}/;

describe("WP5 shifts and rosters", () => {
  it("shift templates have display times", () => {
    const s = shifts();
    expect(s.length).toBeGreaterThanOrEqual(3);
    for (const x of s) expect(x.display.hours).toMatch(/^\d{2}:\d{2} to /);
  });

  it("November's roster: two weeks, leave shown, engine checks", () => {
    const r = rosterPlan(c);
    expect(r.days[0]!.iso).toBe("2026-11-09");
    expect(r.days).toHaveLength(14);
    expect(r.days.filter((d) => d.status === "published")).toHaveLength(7);
    for (const row of r.rows) expect(row.cells).toHaveLength(14);
    const leave = c.leaveRequests.find((x) => x.startDate ===
      "2026-11-16");
    expect(leave).toBeDefined();
    expect(r.rows.some((row) => row.cells.some((x) => x.kind ===
      "leave"))).toBe(true);
    expect(Array.isArray(r.flags)).toBe(true);
    for (const d of r.days) expect(d.display).not.toMatch(ISO);
  });
});

describe("WP5 attendance against shifts (engine day sheets)", () => {
  const a = attendanceAgainstShifts(c);

  it("overtime minutes match the overtime cases", () => {
    const ot = employeesWithCase(c, "overtime")[0]!;
    const row = a.find((x) => x.employeeId === ot.id)!;
    expect(row.overtimeMinutes).toBe(120 + 90 + 150);
    const night = employeesWithCase(c, "night-overtime")[0]!;
    const n = a.find((x) => x.employeeId === night.id)!;
    expect(n.nightOvertimeMinutes).toBe(90 + 60);
  });

  it("late arrivals count only past the sample grace", () => {
    for (const row of a) {
      for (const l of row.late) {
        expect(l.minutes).toBeGreaterThan(15);
        expect(l.display).not.toMatch(ISO);
      }
    }
    const late = a.flatMap((r) => r.late.map((l) => [r.employeeId,
      l.date, l.minutes]));
    expect(late).toEqual([["emp-008", "2026-10-05", 38],
      ["emp-008", "2026-10-13", 25], ["emp-008", "2026-10-21", 47]]);
    const saeed = a.find((r) => r.employeeId === "emp-008")!;
    expect(saeed.late[0]!.display).toBe("5 October, 38 minutes late");
  });
});

describe("WP5 punches and today", () => {
  it("today's board adds up", () => {
    const t = attendanceToday(c);
    expect(t.display.date).toBe("27 October");
    expect(t.present + t.onLeave + t.absent + t.notRecorded)
      .toBe(t.active);
  });

  it("punches come in pairs; unmatched ones are listed", () => {
    const p = punches(c);
    expect(p.length).toBeGreaterThan(0);
    expect(p.every((x) => x.in !== null && x.out !== null)).toBe(true);
    const u = unmatchedPunches(c);
    expect(u).toHaveLength(2);
    for (const x of u) {
      expect(x.status).toBe("to-match");
      expect(x.display.when).not.toMatch(ISO);
    }
  });
});

describe("WP5 overtime claims (values through the engine)", () => {
  it("October claims are approved and match the payslip", () => {
    const claims = overtimeClaims(c);
    const paid = claims.filter((x) => x.status === "approved");
    expect(paid).toHaveLength(5);
    for (const e of [...employeesWithCase(c, "overtime"),
      ...employeesWithCase(c, "night-overtime")]) {
      const slip = c.payRun.payslips.find((s) => s.employeeId === e.id)!;
      const ot = slip.payslip.earnings.filter((l) => l.kind === "overtime")
        .reduce((n, l) => n + l.amount, 0n);
      const mine = paid.filter((x) => x.employeeId === e.id);
      const sum = mine.reduce((n, x) => n + x.value, 0n);
      // Per-claim values are engine deltas; their sum is within the
      // rounding of one fils per claim of the payslip's overtime.
      expect(sum - ot <= BigInt(mine.length)).toBe(true);
      expect(ot - sum <= BigInt(mine.length)).toBe(true);
    }
    const pending = claims.filter((x) => x.status === "pending");
    expect(pending.length).toBeGreaterThan(0);
    for (const x of pending) expect(x.display.value).toMatch(/estimate/);
  });

  it("a crew pre-approval waits, with an engine estimate", () => {
    const p = overtimePreApprovals(c);
    expect(p).toHaveLength(1);
    expect(p[0]!.status).toBe("pending");
    expect(p[0]!.people.length).toBe(3);
    expect(p[0]!.estimate > 0n).toBe(true);
    expect(p[0]!.display.date).toBe("3 November");
  });

  it("is deterministic", () => {
    const d = buildDemoCompany();
    expect(serializeDemo([overtimeClaims(d), rosterPlan(d)]))
      .toBe(serializeDemo([overtimeClaims(c), rosterPlan(c)]));
  });
});
