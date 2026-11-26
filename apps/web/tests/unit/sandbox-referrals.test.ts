import { describe, expect, it } from "vitest";
import { fils } from "@payroll/engine";
import { contractProblems, isSum, type ExplainValue }
  from "../../src/components/explain/types";
import { auditFor } from "../../src/demo/audit-actions";
import { buildDemoSource } from "../../src/demo/data/adapter";
import { buildReferralSource } from "../../src/demo/data/referrals";
import { buildSandboxSource } from "../../src/demo/data/sandbox";
import { markedIds, reduceReferral, REFERRAL_INITIAL }
  from "../../src/demo/referral-state";
import { reduceSandbox, SANDBOX_INITIAL, type SandboxDraftSpec }
  from "../../src/demo/sandbox-state";
import { INITIAL, reduce, type Role } from "../../src/demo/state";
import { ALL_AREAS } from "../../src/nav/areas";
import { mayOpen } from "../../src/nav/registry";
import { outstandingExplain }
  from "../../src/people/referrals/explain";
import { employerExplain, personExplain, totalEmployerExplain, totalExplain }
  from "../../src/pay/sandbox/explain";

const src = buildDemoSource();
const sb = buildSandboxSource();
const refs = buildReferralSource();
const d = src.at({});
const num = (v: ExplainValue): bigint | number | string =>
  v.kind === "money" ? v.fils : v.kind === "count" ? v.n : v.text;

describe("sandbox slice", () => {
  const draft = sb.options.presets[0]!.draft as SandboxDraftSpec;
  it("picks, discards and restores a draft; saves and removes a plan",
    () => {
      let s = reduceSandbox(SANDBOX_INITIAL, { type: "sandbox-pick",
        draft });
      expect(s.sandboxDraft).toEqual(draft);
      s = reduceSandbox(s, { type: "sandbox-discard", draft });
      expect(s.sandboxDraft).toBeNull();
      s = reduceSandbox(s, { type: "sandbox-restore", draft });
      expect(s.sandboxDraft).toEqual(draft);
      s = reduceSandbox(s, { type: "sandbox-save", plan: { title: "t",
        draft, people: 2, net: fils(1n), gross: fils(1n),
        employerCost: fils(1n), by: "x", role: "hr", on: "2026-10-27" } });
      expect(s.sandboxPlans[0]!.id).toBe("sandbox-plan-1");
      s = reduceSandbox(s, { type: "sandbox-unsave",
        id: "sandbox-plan-1" });
      expect(s.sandboxPlans).toEqual([]);
    });
});

describe("referral slice", () => {
  it("marks once and takes the mark back", () => {
    const m = { rowId: "ref-1", label: "A", by: "x", role: "hr" as Role,
      on: "2026-10-27" };
    let s = reduceReferral(REFERRAL_INITIAL, { type: "ref-mark", mark: m });
    s = reduceReferral(s, { type: "ref-mark", mark: m });
    expect(s.referralMarks).toHaveLength(1);
    expect(markedIds(s).has("ref-1")).toBe(true);
    s = reduceReferral(s, { type: "ref-unmark", rowId: "ref-1",
      label: "A" });
    expect(s.referralMarks).toEqual([]);
  });

  it("the store reduces both; the real run is untouched", () => {
    const row = refs.rows.find((r) => r.stage === "payable")!;
    const s = reduce({ ...INITIAL, role: "hr" }, { type: "ref-mark",
      mark: { rowId: row.id, label: "A", by: "x", role: "hr",
        on: "2026-10-27" } });
    expect(s.referralMarks).toHaveLength(1);
    expect(s.decided).toEqual(INITIAL.decided);
    expect(s.salaryHolds).toEqual(INITIAL.salaryHolds);
  });
});

describe("audit entries", () => {
  const draft = sb.options.presets[1]!.draft as SandboxDraftSpec;
  const acts = [
    { type: "sandbox-save", plan: { title: "Add transport top-up, AED 300",
      draft, people: 3, net: fils(100n), gross: fils(100n),
      employerCost: fils(100n), by: "x", role: "hr" as Role,
      on: "2026-10-27" } },
    { type: "sandbox-unsave", id: "sandbox-plan-1" },
    { type: "sandbox-discard", draft },
    { type: "sandbox-restore", draft },
    { type: "ref-mark", mark: { rowId: "ref-1", label: "A B, agency fee",
      by: "x", role: "hr" as Role, on: "2026-10-27" } },
    { type: "ref-unmark", rowId: "ref-1", label: "A B, agency fee" },
  ] as const;
  it("each action writes one line, naming who, with no amount", () => {
    for (const a of acts) {
      const e = auditFor(a, { ...INITIAL, role: "hr" }, d);
      expect(e, a.type).not.toBeNull();
      expect(e!.summary).toContain(d.employee(e!.actorId).name.en);
      expect(e!.summary).not.toMatch(/AED|\d,\d{3}|approved/i);
    }
  });
});

describe("explanations", () => {
  const draft = sb.options.presets[0]!.draft;
  const res = sb.run(draft);
  const title = "Raise housing allowance 5% for grade G4";
  it("each working meets the contract and equals the figure shown", () => {
    for (const r of res.rows) {
      const p = personExplain(r, title);
      expect(contractProblems(p)).toEqual([]);
      expect(isSum(p)).toBe(true);
      expect(num(p.result.value)).toBe(r.difference.net);
      const e = employerExplain(r, title);
      expect(contractProblems(e)).toEqual([]);
      expect(num(e.result.value)).toBe(r.difference.employerCost);
    }
    const t = totalExplain(res, title);
    expect(contractProblems(t)).toEqual([]);
    expect(num(t.result.value)).toBe(res.totals.net);
    expect(num(totalEmployerExplain(res, title).result.value))
      .toBe(res.totals.employerCost);
  });
  it("the allowance and overtime drafts add up too", () => {
    for (const p of sb.options.presets.slice(1)) {
      const r = sb.run(p.draft);
      for (const x of r.rows) {
        const e = personExplain(x, p.title);
        expect(contractProblems(e)).toEqual([]);
      }
      expect(contractProblems(totalExplain(r, p.title))).toEqual([]);
    }
  });
  it("outstanding adds up to the ledger's figure", () => {
    const e = outstandingExplain(refs.rows);
    expect(contractProblems(e)).toEqual([]);
    expect(num(e.result.value)).toBe(refs.summary(new Set()).outstanding);
  });
});

describe("the two rows", () => {
  const rows = ALL_AREAS.filter((a) => ["pay.sandbox", "people.referrals"]
    .includes(a.id));
  it("are live, short-labelled, for HR and the General manager only",
    () => {
      expect(rows).toHaveLength(2);
      for (const a of rows) {
        expect(a.status).toBe("live");
        expect([...(a.roles ?? [])]).toEqual(["hr", "gm"]);
        expect(a.label.en.split(" ").length).toBeLessThanOrEqual(3);
        for (const r of ["hr", "gm"] as const) {
          expect(mayOpen(r, a.route as never)).toBe(true);
        }
        for (const r of ["it", "manager", "employee"] as const) {
          expect([a.id, r, mayOpen(r, a.route as never)])
            .toEqual([a.id, r, false]);
        }
      }
    });
});
