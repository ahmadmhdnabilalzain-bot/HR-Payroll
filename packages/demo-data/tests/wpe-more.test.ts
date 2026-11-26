import { describe, expect, it } from "vitest";
import { fils } from "@payroll/engine";
import {
  AS_OF,
  EXPENSE_KINDS,
  EXPENSE_LIMIT,
  buildDemoCompany,
  checkClaim,
  checkCover,
  checkNewHire,
  claimRoute,
  coverRows,
  gradeBands,
  managerIdFor,
  newHireOptions,
  newHirePlan,
  newHireStarts,
  nextEmployeeNumber,
  offerViews,
  type DemoCompany,
} from "../src/index";
import { BANNED_WORDS, SEEDS, asText } from "./wpd-scan";

const each = (fn: (c: DemoCompany) => void) =>
  SEEDS.forEach((s) => fn(buildDemoCompany(s)));

describe("WPE new employee (P04)", () => {
  it("starts are the accepted offers with no employee yet", () => each(
    (c) => {
      const want = offerViews(c, "accepted").filter((o) =>
        o.employeeId === null);
      const got = newHireStarts(c);
      expect(got.map((x) => x.offerId)).toEqual(want.map((o) => o.id));
      expect(got.length).toBeGreaterThan(0);
      for (const g of got) {
        expect(g.startOn.iso > AS_OF).toBe(true);
        expect(c.employees.some((e) => e.fullName === g.name)).toBe(false);
      }
    }));

  it("the number follows the staff list and counts the ones made", () =>
    each((c) => {
      expect(nextEmployeeNumber(c)).toBe(`ZB-00${c.employees.length + 1}`);
      expect(nextEmployeeNumber(c, 1)).toBe(`ZB-00${c.employees.length + 2}`);
    }));

  it("a start passes its own check, and each rule has a plain sentence",
    () => each((c) => {
      const s = newHireStarts(c)[0]!;
      const ok = { name: s.name, departmentId: s.departmentId,
        jobKey: s.jobKey, grade: s.grade, location: s.location,
        basic: s.basic, startOn: s.startOn.iso,
        probationMonths: s.probationMonths };
      expect(checkNewHire(c, ok)).toBeNull();
      expect(checkNewHire(c, { ...ok, name: "Faisal" })).toMatch(/full name/);
      expect(checkNewHire(c, { ...ok, startOn: AS_OF })).toMatch(/after/);
      expect(checkNewHire(c, { ...ok, grade: 1 })).toMatch(/grade/);
      const band = gradeBands(c).find((b) => b.grade === s.grade)!;
      expect(checkNewHire(c, { ...ok, basic: fils(band.basicMax + 1n) }))
        .toMatch(/Basic pay/);
      expect(checkNewHire(c, { ...ok, probationMonths: 7 }))
        .toMatch(/Probation/);
    }));

  it("options list every department, place and grade band", () => each(
    (c) => {
      const o = newHireOptions(c);
      expect(o.departments).toHaveLength(c.departments.length);
      expect(o.places).toHaveLength(3);
      expect(o.bands.map((b) => b.grade)).toEqual(
        gradeBands(c).map((b) => b.grade));
    }));

  it("the plan names HR as maker and the GM as checker, never the same",
    () => each((c) => {
      const p = newHirePlan(c, "AE");
      expect(p.makerId).not.toBe(p.checkerId);
      expect(p.pensionNote).toMatch(/not computed/);
      expect(newHirePlan(c, "IN").pensionNote).toBeNull();
    }));
});

describe("WPE expense claims (E08)", () => {
  it("up to the limit the line manager decides, above it the GM", () =>
    each((c) => {
      const e = c.employees.find((x) => x.cases.includes("overtime"))!;
      const small = claimRoute(c, e.id, fils(EXPENSE_LIMIT));
      expect(small.checkerId).toBe(managerIdFor(c.employees, e));
      const gm = c.employees.find((x) => x.jobKey === "general-manager")!;
      expect(claimRoute(c, e.id, fils(EXPENSE_LIMIT + 1n)).checkerId)
        .toBe(gm.id);
    }));

  it("a person never decides their own claim", () => each((c) => {
    for (const e of c.employees) {
      for (const a of [1000n, EXPENSE_LIMIT + 1n]) {
        expect(claimRoute(c, e.id, fils(a)).checkerId).not.toBe(e.id);
      }
    }
  }));

  it("a claim needs a kind, a date up to today and an amount", () => {
    const ok = { kind: EXPENSE_KINDS[0]!, date: AS_OF, amount: fils(5000n),
      note: "" };
    expect(checkClaim(ok)).toBeNull();
    expect(checkClaim({ ...ok, kind: "x" })).toMatch(/Choose/);
    expect(checkClaim({ ...ok, date: "2026-11-01" })).toMatch(/date/);
    expect(checkClaim({ ...ok, amount: fils(0n) })).toMatch(/amount/);
  });
});

describe("WPE approval cover (H10)", () => {
  it("one row per approver, cover is never the approver or their team",
    () => each((c) => {
      const rows = coverRows(c);
      expect(new Set(rows.map((r) => r.approverId)).size).toBe(rows.length);
      for (const r of rows) {
        expect(r.candidates.some((x) => x.id === r.approverId)).toBe(false);
        const isGm = c.employees.find((e) => e.id === r.approverId)!
          .jobKey === "general-manager";
        for (const x of r.candidates) {
          const lead = managerIdFor(c.employees,
            c.employees.find((e) => e.id === x.id)!);
          // The GM is covered by a head of department; others by a peer.
          expect(lead === r.approverId).toBe(isGm);
        }
        expect(r.suggested.id).not.toBe(r.approverId);
        expect(r.candidates.some((x) => x.id === r.suggested.id)).toBe(true);
      }
    }));

  it("checks the cover and the dates", () => each((c) => {
    const r = coverRows(c)[1]!;
    const to = r.candidates[0]!.id;
    expect(checkCover(c, r.approverId, to, "2026-11-02", "2026-11-06"))
      .toBeNull();
    expect(checkCover(c, r.approverId, r.approverId, "2026-11-02",
      "2026-11-06")).toMatch(/other than/);
    expect(checkCover(c, r.approverId, to, AS_OF, "2026-11-06"))
      .toMatch(/starts after/);
    expect(checkCover(c, r.approverId, to, "2026-11-06", "2026-11-02"))
      .toMatch(/end date/);
  }));
});

describe("WPE words", () => {
  it("no authority wording, no raw ISO dates in display strings", () =>
    each((c) => {
      const text = asText([newHireStarts(c).map((s) => ({ ...s,
        startOn: s.startOn.display })), newHirePlan(c, "AE"),
      coverRows(c).map((r) => ({ ...r, away: r.away === null ? null
        : [r.away.from.display, r.away.to.display] }))]);
      expect(text).not.toMatch(BANNED_WORDS);
      expect(text).not.toMatch(/\b20\d\d-\d\d-\d\d\b/);
    }));
});
