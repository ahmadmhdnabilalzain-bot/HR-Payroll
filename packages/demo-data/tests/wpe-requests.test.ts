import { describe, expect, it } from "vitest";
import {
  AS_OF,
  REQUESTABLE_ROLES,
  accessRequests,
  buildDemoCompany,
  calendarMarks,
  helpTickets,
  profileChanges,
  staffRequests,
  ticketEntitlements,
  travelRequests,
  type DemoCompany,
} from "../src/index";
import { BANNED_WORDS, SEEDS, asText } from "./wpd-scan";

const each = (fn: (c: DemoCompany) => void) =>
  SEEDS.forEach((s) => fn(buildDemoCompany(s)));
const ISO = /\d{4}-\d{2}-\d{2}/;

describe("WPE profile changes", () => {
  it("name real people, with a proof line", () => each((c) => {
    const ids = new Set(c.employees.map((e) => e.id));
    const rows = profileChanges(c);
    expect(rows.length).toBeGreaterThanOrEqual(5);
    expect(rows.some((r) => r.base === "open")).toBe(true);
    for (const r of rows) {
      expect(ids.has(r.employeeId)).toBe(true);
      expect(r.display.raised).not.toMatch(ISO);
      expect(r.proof).not.toBe("");
    }
  }));
  it("the home address change matches the HR queue", () => {
    const c = buildDemoCompany();
    const rq = staffRequests(c).find((r) => r.kind === "profile-change")!;
    const pc = profileChanges(c).find((r) => r.fieldId === "address")!;
    expect(pc.employeeId).toBe(rq.employeeId);
    expect(pc.raisedOn.iso).toBe(rq.raisedOn);
  });
});

describe("WPE travel", () => {
  it("only people who are not UAE nationals have a ticket", () =>
    each((c) => {
      for (const t of ticketEntitlements(c)) {
        const e = c.employees.find((x) => x.id === t.employeeId)!;
        expect(t.eligible).toBe(e.workerClass !== "uae-national");
        if (t.eligible) {
          expect(t.dueOn!.iso >= AS_OF).toBe(true);
          expect(t.daysLeft).toBeGreaterThanOrEqual(0);
        } else expect(t.dueOn).toBeNull();
      }
    }));
  it("requests are for eligible people with dates in order", () =>
    each((c) => {
      const ok = new Set(ticketEntitlements(c).filter((t) => t.eligible)
        .map((t) => t.employeeId));
      const rs = travelRequests(c);
      expect(rs.length).toBeGreaterThanOrEqual(4);
      expect(rs.some((r) => r.base === "open")).toBe(true);
      for (const r of rs) {
        expect(ok.has(r.employeeId)).toBe(true);
        expect(r.returnOn.iso > r.departOn.iso).toBe(true);
        expect(r.display.trip).not.toMatch(ISO);
      }
    }));
});

describe("WPE help desk and access", () => {
  it("tickets have a thread that starts with the employee", () =>
    each((c) => {
      const ts = helpTickets(c);
      expect(ts.length).toBeGreaterThanOrEqual(6);
      for (const t of ts) {
        expect(t.thread[0]!.from).toBe("employee");
        expect(t.thread[0]!.byId).toBe(t.employeeId);
        if (t.base === "waiting") expect(t.thread.at(-1)!.from).toBe("hr");
        if (t.base === "open") expect(t.thread.at(-1)!.from)
          .toBe("employee");
      }
      expect(new Set(ts.map((t) => t.id)).size).toBe(ts.length);
    }));
  it("access requests name a role from the demo's roles", () => {
    const c = buildDemoCompany();
    const roles = new Set(REQUESTABLE_ROLES.map((r) => r.id));
    for (const r of accessRequests(c)) expect(roles.has(r.roleId))
      .toBe(true);
    expect(roles.has("employee")).toBe(false);
  });
});

describe("WPE calendar", () => {
  it("October has the sample payday the pay run uses", () => {
    const c = buildDemoCompany();
    const pay = calendarMarks(c, "2026-10").find((m) => m.kind === "payday")!;
    expect(pay.from).toBe("2026-10-30");
    expect(calendarMarks(c, "2026-12").some((m) => m.kind === "holiday"))
      .toBe(true);
  });
  it("every mark touches its month", () => each((c) => {
    for (const ym of ["2026-10", "2026-11", "2026-12"]) {
      for (const m of calendarMarks(c, ym)) {
        expect(m.from <= `${ym}-31` && m.to >= `${ym}-01`).toBe(true);
      }
    }
  }));
});

describe("WPE words", () => {
  it("no authority wording and no raw ISO date in display text", () =>
    each((c) => {
      const all = { a: profileChanges(c), t: ticketEntitlements(c),
        r: travelRequests(c), h: helpTickets(c), x: accessRequests(c),
        m: calendarMarks(c, "2026-10"), n: calendarMarks(c, "2026-12") };
      expect(asText(all)).not.toMatch(BANNED_WORDS);
    }));
});
