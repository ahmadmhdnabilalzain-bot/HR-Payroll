import { describe, expect, it } from "vitest";
import {
  AS_OF,
  AUDITOR_MAX_DAYS,
  NOT_A_FILING,
  REMEDY_NOTE,
  auditorSample,
  auditorStatus,
  auditorWindowProblem,
  buildDemoCompany,
  errorRemedies,
  inspectionMonths,
  inspectionPack,
  payCorrections,
  payrollHistory,
  signOffReport,
  verifyAuditChain,
  auditEvents,
  type DemoCompany,
} from "../src/index";
import { BANNED_WORDS, SEEDS, asText } from "./wpd-scan";

const each = (fn: (c: DemoCompany) => void) =>
  SEEDS.forEach((s) => fn(buildDemoCompany(s)));

const ISO = /\b\d{4}-\d{2}-\d{2}\b/;

describe("WPE audit: auditor access (S25)", () => {
  it("is one external person on the read-only role, not an employee",
    () => each((c) => {
      const a = auditorSample(c);
      expect(a.roleId).toBe("auditor");
      expect(c.employees.some((e) => e.email === a.email)).toBe(false);
      expect(a.email).toMatch(/\.test$/);
      expect(a.cannot.length).toBeGreaterThan(2);
      expect(a.can).not.toContain("Approve a pay run");
    }));

  it("has a window that starts today and ends on a date", () => {
    const a = auditorSample(buildDemoCompany());
    expect(a.fromIso).toBe(AS_OF);
    expect(a.toIso > a.fromIso).toBe(true);
    expect(auditorWindowProblem(a.fromIso, a.toIso)).toBeNull();
  });

  it("refuses a missing, past, reversed or too long end day", () => {
    expect(auditorWindowProblem(AS_OF, "")).toMatch(/end on a date/);
    expect(auditorWindowProblem(AS_OF, "2026-10-01")).toMatch(/passed/);
    expect(auditorWindowProblem("2026-11-10", "2026-11-05"))
      .toMatch(/before/);
    expect(auditorWindowProblem(AS_OF, "2027-06-01"))
      .toMatch(String(AUDITOR_MAX_DAYS));
  });

  it("is scheduled, active or expired against the demo's date", () => {
    expect(auditorStatus("2026-11-01", "2026-11-30")).toBe("scheduled");
    expect(auditorStatus("2026-10-01", "2026-11-30")).toBe("active");
    expect(auditorStatus("2026-09-01", "2026-10-26")).toBe("expired");
  });
});

describe("WPE audit: inspection pack (X33)", () => {
  it("has one page per month of the history", () => each((c) => {
    expect(inspectionMonths(c).map((m) => m.key))
      .toEqual(payrollHistory(c).map((m) => m.month));
    expect(inspectionPack(c, "2027-01")).toBeNull();
  }));

  it("register lines add up to the month's totals", () => each((c) => {
    for (const m of inspectionMonths(c)) {
      const p = inspectionPack(c, m.key)!;
      const sum = (f: (l: (typeof p.register.lines)[number]) => bigint) =>
        p.register.lines.reduce((n, l) => n + f(l), 0n);
      expect(sum((l) => l.gross)).toBe(p.register.gross);
      expect(sum((l) => l.net)).toBe(p.register.net);
      expect(p.register.lines.length).toBe(p.register.headcount);
    }
  }));

  it("matches the pay history and the audit chain", () => each((c) => {
    const oct = inspectionPack(c, "2026-10")!;
    expect(oct.register.net).toBe(c.payRun.totals.net);
    const chain = verifyAuditChain(auditEvents(c));
    expect(oct.chain.ok).toBe(chain.ok);
    expect(oct.chain.checked).toBe(chain.checked);
    expect(oct.chain.text).toMatch(/all \d+ entries fit/);
  }));

  it("names who signed off each paid month, and when", () => each((c) => {
    for (const m of inspectionMonths(c).slice(0, 9)) {
      const p = inspectionPack(c, m.key)!;
      const run = p.signOffs.find((s) => s.kindText === "Pay run")!;
      expect(run.outcomeText).toBe("Signed off");
      expect(run.decider).not.toBe("");
      expect(run.decidedOn).toMatch(/^\d{1,2} \w{3} 2026, \d\d:\d\d$/);
      expect(p.files.length).toBe(1);
    }
    const oct = inspectionPack(c, "2026-10")!;
    expect(oct.signOffs.some((s) => s.outcomeText === "Waiting")).toBe(true);
    expect(oct.files[0]!.what).toBe("Salary file created");
  }));

  it("lists the open issues in October and the corrections in their " +
    "own month", () => each((c) => {
    const oct = inspectionPack(c, "2026-10")!;
    expect(oct.exceptions.some((e) => e.severityText === "Stops pay"))
      .toBe(true);
    for (const k of payCorrections(c)) {
      const p = inspectionPack(c, `2026-${String(k.month)
        .padStart(2, "0")}`)!;
      expect(p.exceptions.map((e) => e.id)).toContain(`exc-${k.id}`);
    }
    expect(inspectionPack(c, "2026-03")!.exceptions).toEqual([]);
  }));

  it("shows the policy version in force that month", () => each((c) => {
    const jan = inspectionPack(c, "2026-01")!.policies;
    const oct = inspectionPack(c, "2026-10")!.policies;
    const leave = (x: typeof jan) => x.find((p) => p.id === "pol-leave")!;
    expect(leave(jan).version).toBe("Version 3.0");
    expect(leave(oct).version).toBe("Version 3.1");
  }));

  it("says it is not a filing, and never uses authority words", () =>
    each((c) => {
      const all = inspectionMonths(c).map((m) => inspectionPack(c, m.key)!);
      expect(all[0]!.note).toBe(NOT_A_FILING);
      expect(NOT_A_FILING).toMatch(/not a filing/);
      const text = asText(all.map((p) => ({ ...p, register: {
        ...p.register, lines: [] } })));
      expect(text).not.toMatch(BANNED_WORDS);
      expect(text)
        .not.toMatch(/\b(compliant|compliance with|complies|certif)/i);
      expect(text).not.toMatch(ISO);
      const lines = asText(all.map((p) => p.register.lines
        .map((l) => l.display)));
      expect(lines).not.toMatch(/\d{5,}/);
    }));
});

describe("WPE audit: error-remedy record (X37)", () => {
  it("lists every pay correction with who found it, the fix and the run",
    () => each((c) => {
      const rows = errorRemedies(c);
      for (const k of payCorrections(c)) {
        const r = rows.find((x) => x.id === k.id)!;
        expect(r.amount).toBe(k.amount);
        expect(r.foundBy).not.toBe("");
        expect(r.paidIn).toMatch(/November run, not yet paid/);
      }
      expect(rows.some((r) => r.source === "Salary file check")).toBe(true);
      expect(rows.some((r) => r.source === "Raise entered late")).toBe(true);
    }));

  it("never says paid for a correction that is still to be paid",
    () => each((c) => {
      const text = asText(errorRemedies(c).filter((r) =>
        r.source === "Pay correction"));
      expect(text).not.toMatch(/was paid|has been paid/i);
      expect(text).not.toMatch(BANNED_WORDS);
      expect(text).not.toMatch(ISO);
      expect(REMEDY_NOTE).not.toMatch(BANNED_WORDS);
      expect(signOffReport(c).length).toBeGreaterThan(0);
    }));
});
