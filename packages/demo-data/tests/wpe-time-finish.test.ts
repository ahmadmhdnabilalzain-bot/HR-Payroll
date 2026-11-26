import { describe, expect, it } from "vitest";
import {
  AS_OF,
  COMP_OFF_VALID_DAYS,
  buildDemoCompany,
  checkGrant,
  checkIncidentReport,
  compOffBalances,
  compOffRows,
  grantRows,
  holidays,
  incidentFromReport,
  incidentPlaces,
  incidents,
  incidentsByMonth,
  incidentsByMonthWith,
  isWorkingDay,
  payslipByEmployee,
  type DemoCompany,
} from "../src/index";
import { BANNED_WORDS, SEEDS, asText } from "./wpd-scan";

const each = (fn: (c: DemoCompany) => void) =>
  SEEDS.forEach((s) => fn(buildDemoCompany(s)));

describe("WPE time finish: comp-off (T07)", () => {
  it("is earned on a working day of a past listed holiday", () => each(
    (c) => {
      const rows = compOffRows(c);
      expect(rows.length).toBeGreaterThan(2);
      const past = holidays(c).filter((h) => h.state === "past");
      for (const r of rows) {
        const h = past.find((x) => x.id === r.holidayId)!;
        expect(h).toBeDefined();
        expect(r.workedOn.iso >= h.from && r.workedOn.iso <= h.to).toBe(true);
        expect(isWorkingDay(r.workedOn.iso)).toBe(true);
        expect(r.days).toBe(1);
        const e = c.employees.find((x) => x.id === r.employeeId)!;
        expect(e.joiningDate <= r.workedOn.iso).toBe(true);
        expect(e.leavingDate === null || e.leavingDate > r.workedOn.iso)
          .toBe(true);
      }
    }));

  it("expires after the sample period and the status follows it", () =>
    each((c) => {
      for (const r of compOffRows(c)) {
        const days = (Date.parse(r.expiresOn.iso) -
          Date.parse(r.workedOn.iso)) / 86400000;
        expect(days).toBe(COMP_OFF_VALID_DAYS);
        expect(r.status === "expired").toBe(r.expiresOn.iso < AS_OF);
      }
      const st = new Set(compOffRows(c).map((r) => r.status));
      expect(st.has("expired")).toBe(true);
      expect(st.has("available") || st.has("expiring")).toBe(true);
    }));

  it("balances add up and nobody is credited twice for a holiday", () =>
    each((c) => {
      const rows = compOffRows(c);
      expect(new Set(rows.map((r) => r.id)).size).toBe(rows.length);
      for (const b of compOffBalances(c)) {
        const mine = rows.filter((r) => r.employeeId === b.employeeId);
        expect(b.earned).toBe(b.available + b.expired);
        expect(b.earned).toBe(mine.length);
      }
    }));

  it("the October pay run has no holiday pay for the same people", () =>
    each((c) => {
      const ids = new Set(compOffRows(c).map((r) => r.employeeId));
      for (const id of ids) {
        const p = payslipByEmployee(c, id);
        expect(p?.payslip.earnings.some((l) => l.kind === "holiday") ??
          false).toBe(false);
      }
    }));
});

describe("WPE time finish: grants (T07)", () => {
  it("are signed off by the General manager, before today", () => each(
    (c) => {
      const gm = c.employees.find((e) => e.jobKey === "general-manager")!;
      const rows = grantRows(c);
      expect(rows.length).toBe(2);
      for (const g of rows) {
        expect(g.signedOffById).toBe(gm.id);
        expect(g.grantedOn.iso <= AS_OF).toBe(true);
        expect(g.days).toBeGreaterThan(0);
        expect(g.requestedById).not.toBe(g.signedOffById);
      }
    }));

  it("checks a new grant in plain words", () => each((c) => {
    const who = c.employees.find((e) => e.leavingDate === null)!.id;
    expect(checkGrant(c, { employeeId: who, days: 2,
      reason: "Worked the audit weekend" })).toBeNull();
    expect(checkGrant(c, { employeeId: "nobody", days: 2,
      reason: "Worked the audit weekend" })).toMatch(/works here/);
    expect(checkGrant(c, { employeeId: who, days: 0,
      reason: "Worked the audit weekend" })).toMatch(/whole number/);
    expect(checkGrant(c, { employeeId: who, days: 9,
      reason: "Worked the audit weekend" })).toMatch(/1 to 5/);
    expect(checkGrant(c, { employeeId: who, days: 1, reason: "x" }))
      .toMatch(/why/);
    const left = c.employees.find((e) => e.leavingDate !== null);
    if (left !== undefined) {
      expect(checkGrant(c, { employeeId: left.id, days: 1,
        reason: "Worked the audit weekend" })).not.toBeNull();
    }
  }));
});

describe("WPE time finish: incident report (E14)", () => {
  it("checks the three fields", () => {
    const ok = { what: "Wet floor by the lift, nobody fell.",
      place: incidentPlaces()[0]!.id, severity: "low" as const };
    expect(checkIncidentReport(ok)).toBeNull();
    expect(checkIncidentReport({ ...ok, what: "wet" })).toMatch(/what/i);
    expect(checkIncidentReport({ ...ok, place: "moon" })).toMatch(/where/i);
  });

  it("lands in the log and the monthly report agree", () => each((c) => {
    const who = c.employees.find((e) => e.leavingDate === null)!.id;
    const v = incidentFromReport(c, "inc-new-1", who, AS_OF, {
      what: "Wet floor by the lift. Nobody fell.",
      place: incidentPlaces()[1]!.id, severity: "medium" });
    expect(v.title).toBe("Wet floor by the lift");
    expect(v.status).toBe("open");
    expect(v.happenedOn.iso).toBe(AS_OF);
    const base = incidentsByMonth(c, []);
    const more = incidentsByMonthWith(c, [], [v]);
    const sum = (m: { total: number }[]) =>
      m.reduce((n, x) => n + x.total, 0);
    expect(sum(more)).toBe(sum(base) + 1);
    expect(sum(base)).toBe(incidents(c).filter((i) =>
      i.happenedOn.iso >= `${AS_OF.slice(0, 4)}-07`).length);
    const last = more.at(-1)!;
    expect(last.total).toBe(last.low + last.medium + last.high);
    expect(last.medium).toBe(base.at(-1)!.medium + 1);
    expect(incidentsByMonthWith(c, ["inc-new-1"], [v]).at(-1)!.open)
      .toBe(base.at(-1)!.open);
  }));
});

describe("WPE time finish: words", () => {
  it("never claims an authority decision", () => each((c) => {
    const all = asText([compOffRows(c), compOffBalances(c), grantRows(c)]);
    expect(all).not.toMatch(BANNED_WORDS);
    expect(all).not.toMatch(/\b20\d\d-\d\d-\d\d\b(?=[^"]*display)/);
    for (const r of compOffRows(c)) {
      expect(r.display.earned + r.display.left).not.toMatch(/\d{4}-\d\d/);
    }
  }));
});
