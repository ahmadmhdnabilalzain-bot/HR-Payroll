import { describe, expect, it } from "vitest";
import { buildDemoData } from "../../src/demo/data/adapter";
import {
  actionable,
  openIssueCount,
  pendingApprovals,
  personOf,
  runApprovalId,
  steps,
  waitingApprovals,
} from "../../src/demo/derive";
import { INITIAL, reduce, type DemoState } from "../../src/demo/state";
import { groupIban, isUaeIban } from "../../src/home/IbanForm";

const d = buildDemoData();
const now = (s: DemoState): string | undefined =>
  steps(d, s).find((x) => x.state === "now")?.id;

describe("demo selectors", () => {
  it("headline-matches-its-parts", () => {
    const h = d.headline();
    expect(h.grossTotalFils - h.deductionsFils).toBe(h.netTotalFils);
    expect(h.sifTotalFils + h.heldNetFils).toBe(h.netTotalFils);
    const depts = d.departments();
    expect(depts.reduce((n, x) => n + x.headcount, 0)).toBe(h.headcount);
    expect(depts.reduce((n, x) => n + x.costFils, 0n))
      .toBe(h.grossTotalFils);
  });

  it("open-issues-start-at-the-package-count", () => {
    expect(openIssueCount(d, INITIAL)).toBe(d.headline().issuesOpen);
    expect(d.issues().filter((i) => !actionable(i)).length)
      .toBe(d.headline().needsConfirmation);
  });

  it("issue-ids-are-unique", () => {
    const ids = d.issues().map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("tracker-advances-with-the-state", () => {
    expect(now(INITIAL)).toBe("review");
    const all = d.issues().filter(actionable).reduce((s, i) =>
      reduce(s, { type: "resolve", id: i.id, how: "reviewed" }), INITIAL);
    expect(openIssueCount(d, all)).toBe(0);
    expect(now(all)).toBe("approve");
    const run = runApprovalId(d) ?? "";
    expect(now(reduce(all, { type: "decide", id: run,
      verdict: "approve" }))).toBe("sif");
    expect(now(reduce(all, { type: "decide", id: run,
      verdict: "decline" }))).toBe("approve");
  });

  it("approving-with-open-issues-keeps-review-open", () => {
    const run = runApprovalId(d) ?? "";
    const s = reduce(INITIAL, { type: "decide", id: run,
      verdict: "approve" });
    const review = steps(d, s).find((x) => x.id === "review");
    expect(review?.state).toBe("open");
    expect(now(s)).toBe("sif");
  });

  it("maker-and-checker-differ", () => {
    const p = d.runPeople();
    expect(p.makerId).not.toBe(p.checkerId);
    const gm = { ...INITIAL, role: "gm" as const };
    expect(waitingApprovals(d, gm).map((a) => a.kind)).toContain("pay-run");
    expect(waitingApprovals(d, INITIAL).some((a) => a.kind === "pay-run"))
      .toBe(false);
    expect(personOf(d, "gm")).toBe(p.checkerId);
  });

  it("pending-approvals-drop-when-decided-and-come-back-on-undo", () => {
    const all = pendingApprovals(d, INITIAL);
    expect(all.length).toBe(d.headline().approvalsPending);
    const first = all[0]?.id ?? "";
    const s1 = reduce(INITIAL, { type: "decide", id: first,
      verdict: "approve" });
    expect(pendingApprovals(d, s1).length).toBe(all.length - 1);
    const s2 = reduce(s1, { type: "undecide", id: first });
    expect(pendingApprovals(d, s2).length).toBe(all.length);
  });

  it("uae-iban-shape", () => {
    expect(isUaeIban("AE07 0331 2345 6789 0123 456")).toBe(true);
    expect(isUaeIban("AE07033123456789012345")).toBe(false);
    expect(isUaeIban("GB07033123456789012345 6")).toBe(false);
    expect(groupIban("ae070331234567890123456"))
      .toBe("AE07 0331 2345 6789 0123 456");
  });
});
