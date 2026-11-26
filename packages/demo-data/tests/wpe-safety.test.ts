import { describe, expect, it } from "vitest";
import {
  AS_OF,
  COVER_RENEWAL,
  FIRE_BRIEFING,
  NEW_JOINER_DAYS,
  buildDemoCompany,
  insuranceCoverRows,
  homeNoticesFor,
  iloeRows,
  incidents,
  incidentsByMonth,
  policies,
  type DemoCompany,
} from "../src/index";
import { BANNED_WORDS, SEEDS, asText } from "./wpd-scan";

const each = (fn: (c: DemoCompany) => void) =>
  SEEDS.forEach((s) => fn(buildDemoCompany(s)));
const isoRaw = /\b20\d\d-\d\d-\d\d\b/;

describe("WPE health insurance", () => {
  it("one row per person who has joined; cards masked; no money", () =>
    each((c) => {
      const rows = insuranceCoverRows(c);
      expect(rows.length).toBe(c.employees.length);
      for (const r of rows) {
        if (r.cardMasked !== null) {
          expect(r.cardMasked).toMatch(/^•••• \d{4}$/);
        }
        expect(r.status === "card-pending").toBe(r.cardMasked === null);
        expect(r.renewalOn.iso).toBe(COVER_RENEWAL);
      }
      expect(rows.filter((r) => r.status === "card-pending")).toHaveLength(1);
      expect(rows.filter((r) => r.status === "ended")).toHaveLength(1);
      expect(asText(rows)).not.toMatch(/AED|premium|quote/i);
    }));

  it("the new joiner's pending card matches the joining checklist", () =>
    each((c) => {
      const hire = c.employees.find((e) => e.cases.includes("probation"))!;
      const r = insuranceCoverRows(c).find((x) => x.employeeId === hire.id)!;
      expect(r.status).toBe("card-pending");
    }));
});

describe("WPE incidents", () => {
  it("dates are before the demo day and people are real employees", () =>
    each((c) => {
      const list = incidents(c);
      expect(list.length).toBeGreaterThanOrEqual(5);
      for (const i of list) {
        expect(i.happenedOn.iso < AS_OF).toBe(true);
        for (const id of [i.involvedId, i.reportedById]) {
          expect(c.employees.some((e) => e.id === id)).toBe(true);
        }
        for (const a of i.actions) {
          expect(a.on.iso >= i.happenedOn.iso).toBe(true);
          expect(a.on.iso <= AS_OF).toBe(true);
        }
        if (i.status === "closed") expect(i.actions.length).toBeGreaterThan(0);
      }
      expect(new Set(list.map((i) => i.id)).size).toBe(list.length);
      expect(list.some((i) => i.placeText.includes("Al Ain") &&
        /slip/i.test(i.title))).toBe(true);
    }));

  it("the fire drill note agrees with the notice and the training", () =>
    each((c) => {
      const note = incidents(c).find((i) => /fire drill/i.test(i.title))!;
      const notice = homeNoticesFor(c, "hr").find((n) =>
        n.title.includes("Fire drill"))!;
      expect(notice.body).toContain("4 Nov 2026 at 10:00");
      expect(note.actions[0]!.text).toContain("4 Nov 2026 at 10:00");
      expect(FIRE_BRIEFING.on).toBe("2026-11-04");
    }));

  it("the monthly report adds up to the log", () => each((c) => {
    const months = incidentsByMonth(c);
    const all = incidents(c);
    expect(months.reduce((n, m) => n + m.total, 0)).toBe(all.length);
    for (const m of months) expect(m.low + m.medium + m.high)
      .toBe(m.total);
    expect(months.reduce((n, m) => n + m.open, 0))
      .toBe(all.filter((i) => i.status !== "closed").length);
    const closedNow = incidentsByMonth(c, all.map((i) => i.id));
    expect(closedNow.every((m) => m.open === 0)).toBe(true);
  }));
});

describe("WPE ILOE", () => {
  it("subscribed or due follows the joining date; none sent anywhere",
    () => each((c) => {
      const rows = iloeRows(c);
      for (const r of rows) {
        const e = c.employees.find((x) => x.id === r.employeeId)!;
        const days = (Date.parse(AS_OF) - Date.parse(e.joiningDate)) /
          86400000;
        expect(r.status === "due").toBe(days < NEW_JOINER_DAYS);
        expect(r.since === null).toBe(r.status === "due");
      }
      expect(rows.some((r) => r.status === "due")).toBe(true);
      expect(rows.some((r) => r.status === "subscribed")).toBe(true);
    }));
});

describe("WPE policies", () => {
  it("counts add up; reads are after the effective date and the joining",
    () => each((c) => {
      const list = policies(c);
      expect(list.length).toBeGreaterThanOrEqual(5);
      for (const p of list) {
        expect(p.read).toBe(p.acks.filter((a) => a.done).length);
        expect(p.total).toBe(c.employees.filter((e) =>
          e.leavingDate === null).length);
        expect(p.read).toBeGreaterThan(0);
        expect(p.read).toBeLessThan(p.total);
        for (const a of p.acks) {
          if (a.doneOn === null) continue;
          const e = c.employees.find((x) => x.id === a.employeeId)!;
          expect(a.doneOn.iso >= e.joiningDate).toBe(true);
          expect(a.doneOn.iso > p.effectiveOn.iso).toBe(true);
          expect(a.doneOn.iso <= AS_OF).toBe(true);
        }
        expect(p.history[0]!.effectiveOn.iso > p.history[1]!.effectiveOn.iso)
          .toBe(true);
      }
    }));
});

describe("WPE wording", () => {
  it("no authority words and no raw ISO dates in display strings", () =>
    each((c) => {
      const all = [insuranceCoverRows(c), incidents(c), incidentsByMonth(c),
        iloeRows(c), policies(c)];
      expect(asText(all)).not.toMatch(BANNED_WORDS);
      const shown: string[] = [];
      for (const r of insuranceCoverRows(c)) {
        shown.push(...Object.values(r.display));
      }
      for (const r of iloeRows(c)) shown.push(...Object.values(r.display));
      for (const i of incidents(c)) shown.push(i.what, i.title,
        ...Object.values(i.display), ...i.actions.map((a) => a.text));
      for (const p of policies(c)) {
        shown.push(p.summary, ...Object.values(p.display),
          ...p.acks.map((a) => a.display.status));
      }
      for (const t of shown) expect(t).not.toMatch(isoRaw);
    }));
});
