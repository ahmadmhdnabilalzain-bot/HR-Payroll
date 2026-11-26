import { describe, expect, it } from "vitest";
import { auditFor } from "../../src/demo/audit-actions";
import { INITIAL, reduce, type DemoState } from "../../src/demo/state";
import { buildDemoSource } from "../../src/demo/data/adapter";
import {
  aboutLine,
  askHrDraft,
  lineQuestions,
  type LineRef,
  type Part,
  type Sentence,
} from "../../src/me/ask/line";

const d = buildDemoSource().at({});
const me = d.people.personas().employeeId;
const slip = d.people.payslip(me)!;
const monthName = (m: string): string => `M${m}`;
const refOf = (kind: string): LineRef => {
  const l = slip.lines.find((x) => x.kind === kind)!;
  return { traceId: l.traceId, label: l.engineLabel, kind: l.kind,
    group: l.group, amountFils: l.amountFils };
};
const exOf = (r: LineRef) =>
  d.people.explain(slip.id, r.traceId, r.label, "en");
/** Amounts as marked text, so a test sees which came from data. */
const text = (s: Sentence): string => s.map((p: Part) =>
  typeof p === "string" ? p : `<${p.signed === true ? "+" : ""}${
    String(p.fils)}>`).join("");
const fils = (s: Sentence): bigint[] => s.flatMap((p) =>
  typeof p === "string" ? [] : [p.fils]);

describe("E16 about a payslip line", () => {
  it("builds-the-working-from-explain-data-with-amounts-as-parts", () => {
    const r = refOf("overtime");
    const out = aboutLine(exOf(r), r);
    expect(out.length).toBeGreaterThan(2);
    // Overtime's own figure is in the sheet as an amount part.
    expect(out.some((s) => fils(s).includes(r.amountFils))).toBe(true);
    // No amount is ever spelled out in words ("AED 250.00").
    for (const s of out) {
      for (const p of s) if (typeof p === "string") {
        expect(p).not.toMatch(/AED|\d{1,3},\d{3}/);
      }
    }
  });

  it("asks-why-overtime-from-the-line-not-from-typed-figures", () => {
    const r = refOf("overtime");
    const q = lineQuestions(d, slip, r, exOf(r), monthName);
    const why = q.find((x) => x.id === "why")!;
    expect(text(why.label)).toBe(
      `Why is ${r.label.toLowerCase()} <${String(r.amountFils)}>?`);
    expect(why.answer.length).toBeGreaterThan(0);
    expect(q.some((x) => x.id === "rules")).toBe(true);
  });

  it("explains-the-net-change-from-the-month-before", () => {
    const r: LineRef = { traceId: slip.netTraceId, label: "Net pay",
      kind: "net", group: "net", amountFils: slip.netFils };
    const q = lineQuestions(d, slip, r, exOf(r), monthName);
    const c = q.find((x) => x.id === "net-change")!;
    const prev = d.home.payslips(me).filter((x) => x.month < slip.month)
      .at(-1)!;
    expect(text(c.label)).toBe(`Why did my net change from M${prev.month}?`);
    const all = c.answer.flatMap(fils);
    expect(all).toContain(slip.netFils);
    expect(all).toContain(prev.netFils);
    expect(all).toContain(slip.netFils - prev.netFils);
    // The deduction difference follows from the two nets and grosses.
    expect(all).toContain(slip.deductionsFils -
      (prev.grossFils - prev.netFils));
  });

  it("gross-lists-every-earning-line", () => {
    const r: LineRef = { traceId: slip.grossTraceId, label: "Gross pay",
      kind: "gross", group: "gross", amountFils: slip.grossFils };
    const q = lineQuestions(d, slip, r, exOf(r), monthName)
      .find((x) => x.id === "gross-what")!;
    const earnings = slip.lines.filter((l) => l.group === "earning");
    expect(q.answer).toHaveLength(earnings.length);
    expect(q.answer.flatMap(fils)).toEqual(earnings.map((l) =>
      l.amountFils));
  });

  it("builds-the-request-draft-with-the-line-and-the-amount", () => {
    const r = refOf("overtime");
    const x = askHrDraft(r, "October 2026", "AED 250.00");
    expect(x.category).toBe("Payslip");
    expect(x.subject).toContain(r.label);
    expect(x.text).toContain("AED 250.00");
    expect(d.requests.ticketCategories).toContain(x.category);
  });

  it("has-no-comparison-when-there-is-no-earlier-month", () => {
    const first = { ...slip, month: "2026-01" };
    const r: LineRef = { traceId: slip.netTraceId, label: "Net pay",
      kind: "net", group: "net", amountFils: slip.netFils };
    const q = lineQuestions(d, first, r, exOf(r), monthName);
    expect(q.some((x) => x.id === "net-change")).toBe(false);
  });
});

describe("E16 audit entries", () => {
  const s0: DemoState = { ...INITIAL, role: "employee" };
  const draft = (line: string) => ({ kind: "ticket" as const,
    employeeId: me, raisedOn: d.payCalendar().asOf, by: me,
    role: "employee" as const, values: { subject: "x", text: "y", line } });

  it("writes-one-entry-without-an-amount-and-one-for-the-undo", () => {
    const add = auditFor({ type: "req-new", draft: draft("Overtime pay") },
      s0, d)!;
    expect(add.action).toBe("people.payslip-question-asked");
    expect(add.summary).toContain("Overtime pay");
    expect(add.summary).not.toMatch(/AED|\d{3}/);
    const s1 = reduce(s0, { type: "req-new", draft: draft("Overtime pay") });
    const id = s1.reqMade[0]!.id;
    expect(auditFor({ type: "req-new-undo", id }, s1, d)!.action)
      .toBe("people.payslip-question-withdrawn");
  });

  it("leaves-other-tickets-out-of-the-trail", () => {
    expect(auditFor({ type: "req-new", draft: draft("") }, s0, d))
      .toBeNull();
  });
});
