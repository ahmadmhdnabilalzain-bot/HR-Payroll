import { fils } from "@payroll/engine";
import { describe, expect, it } from "vitest";
import { contractProblems } from "../../src/components/explain";
import { buildDemoData } from "../../src/demo/data/adapter";
import { buildPayView, reword } from "../../src/demo/data/pay";
import { buildRunSource } from "../../src/demo/data/run-detail";
import { INITIAL, reduce } from "../../src/demo/state";
import { AREAS } from "../../src/nav/areas/pay";
import {
  finesToDecide,
  requestState,
  settlementsToSend,
  waitingOf,
} from "../../src/pay/derive";
import { isPayArea } from "../../src/pay/PayArea";
import type { PayDraft } from "../../src/pay/pay-state";

const BANNED = /\b(compliant|approved|certified|guaranteed)\b/i;
const view = buildPayView();

/** Every string in the view model (what the WP6 screens show). */
function strings(v: unknown): string[] {
  if (typeof v === "string") return [v];
  if (v === null || typeof v !== "object") return [];
  return Object.values(v).flatMap(strings);
}

const draft = (over: Partial<PayDraft> = {}): PayDraft => ({
  kind: "loan", employeeId: "emp-001", amount: fils(500000n), months: 5,
  month: "November 2026", effective: null, reason: "", requestedOn:
    "2026-10-27", makerId: "emp-002", checkerId: "emp-001", ...over });

describe("WP6 pay view", () => {
  it("shows-no-banned-word", () => {
    expect(strings(view).filter((x) => BANNED.test(x))).toEqual([]);
    expect(reword("were approved but not paid")).not.toMatch(BANNED);
  });

  it("explanations-meet-the-contract", () => {
    const all = [...view.corrections.map((c) => c.explanation),
      ...view.runs.map((r) => r.explanation)];
    expect(all.flatMap(contractProblems)).toEqual([]);
  });

  it("correction-is-correct-less-paid", () => {
    for (const c of view.corrections) {
      expect(c.amount).toBe(c.correctNet - c.paidNet);
      expect(c.amount > 0n).toBe(true);
    }
  });

  it("one-september-across-review-and-pay-runs", () => {
    const detail = buildRunSource().at({});
    const sep = view.runs.find((r) => r.key === "2026-09");
    expect(sep?.net).toBe(detail.prev.net);
    expect(sep?.headcount).toBe(detail.prev.headcount);
  });

  it("october-row-is-the-run-being-prepared", () => {
    const oct = view.runs.find((r) => r.key === "2026-10");
    expect(oct?.paid).toBe(false);
    expect(oct?.net).toBe(buildDemoData().headline().netTotalFils);
  });

  it("trend-changes-chain", () => {
    view.runs.forEach((r, i) => {
      const before = view.runs[i - 1];
      expect(r.change).toBe(before === undefined ? null
        : r.net - before.net);
    });
  });

  it("run-net-is-the-sum-of-payslips", () => {
    for (const r of view.runs) {
      expect(r.slips.reduce((n, s) => n + s.net, 0n)).toBe(r.net);
    }
  });

  it("loan-balances-follow-the-ledger", () => {
    for (const l of view.loans) {
      const last = l.ledger.at(-1);
      expect(last === undefined ? l.principal : last.balance)
        .toBe(l.balance);
    }
  });
});

describe("WP6 store slice", () => {
  it("requests-get-ids-and-decide-through-the-shared-map", () => {
    let s = reduce(INITIAL, { type: "pay-request", draft: draft() });
    const r = s.payRequests[0]!;
    expect([r.id, r.approvalId]).toEqual(["pay-new-1", "pay-ap-1"]);
    expect(requestState(s, r)).toBe("waiting");
    expect(waitingOf(s, ["loan"])).toBe(1);
    s = reduce(s, { type: "decide", id: r.approvalId, verdict: "approve" });
    expect(requestState(s, s.payRequests[0]!)).toBe("agreed");
    s = reduce(s, { type: "undecide", id: r.approvalId });
    s = reduce(s, { type: "pay-withdraw", id: r.id });
    expect(requestState(s, s.payRequests[0]!)).toBe("withdrawn");
    s = reduce(s, { type: "pay-restore", id: r.id });
    expect(waitingOf(s, ["loan", "advance"])).toBe(1);
  });

  it("fines-and-settlements-count-what-waits", () => {
    expect(finesToDecide(view, INITIAL)).toBe(view.fines.length);
    let s = reduce(INITIAL, { type: "fine-decide", id: view.fines[0]!.id,
      decision: { choice: "bank", by: "emp-002", on: "2026-10-27" } });
    expect(finesToDecide(view, s)).toBe(view.fines.length - 1);
    s = reduce(s, { type: "fine-undo", id: view.fines[0]!.id });
    expect(finesToDecide(view, s)).toBe(view.fines.length);
    const leaver = view.settlements[0]!.employeeId;
    s = reduce(s, { type: "pay-request", draft: draft({ kind: "settlement",
      employeeId: leaver }) });
    expect(settlementsToSend(view, s)).toBe(view.settlements.length - 1);
  });
});

describe("WP6 registry", () => {
  it("every-area-routes-to-a-pay-screen", () => {
    for (const a of AREAS) {
      expect(a.status).toBe("live");
      const r = typeof a.route === "function" ? null : a.route;
      expect(r?.section).toBe("pay-run");
      expect(isPayArea(r?.rest?.[0])).toBe(true);
    }
  });
});
