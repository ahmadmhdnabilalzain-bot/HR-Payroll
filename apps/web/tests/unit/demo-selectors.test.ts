import { describe, expect, it } from "vitest";
import { buildDemoSource } from "../../src/demo/data/adapter";
import {
  approvalBlockedBy,
  confirmations,
  notes,
  openIssues,
  pendingApprovals,
  personOf,
  runApprovalId,
  steps,
} from "../../src/demo/derive";
import { INITIAL, reduce, type DemoState } from "../../src/demo/state";
import { groupIban } from "../../src/home/IbanForm";

const src = buildDemoSource();
const d = src.at({});
const now = (s: DemoState): string | undefined =>
  steps(src.at(s.ibans), s).find((x) => x.state === "now")?.id;

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

  it("counts-reconcile-with-the-rows", () => {
    expect(openIssues(d, INITIAL).length).toBe(d.headline().issuesOpen);
    expect(confirmations(d).length).toBe(d.headline().needsConfirmation);
    expect(notes(d).length).toBe(1);
    const ids = d.issues().map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("missing-and-mistyped-ibans-both-block-approval", () => {
    const blocked = approvalBlockedBy(d, INITIAL);
    expect(blocked).toEqual([...d.heldIds(), ...d.badIbanIds()]);
    expect(d.heldIds().length).toBe(1);
    expect(d.badIbanIds().length).toBe(1);
    const fixed = blocked.reduce((s, id) => reduce(s, { type: "iban",
      employeeId: id, value: src.bankLetterIban(id) }), INITIAL);
    const after = src.at(fixed.ibans);
    expect(approvalBlockedBy(after, fixed)).toEqual([]);
    expect(after.badIbanIds()).toEqual([]);
    expect(now(fixed)).toBe("approve");
    const half = reduce(INITIAL, { type: "iban",
      employeeId: blocked[0] ?? "", value: src.bankLetterIban(
        blocked[0] ?? "") });
    expect(now(half)).toBe("bank");
  });

  it("entering-the-letter-iban-reruns-the-file-check", () => {
    const who = d.heldIds()[0] ?? "";
    expect(now(INITIAL)).toBe("bank");
    const iban = src.bankLetterIban(who);
    expect(src.tryIban({}, who, iban)).toEqual({ ok: true });
    const s = reduce(INITIAL, { type: "iban", employeeId: who,
      value: iban });
    const after = src.at(s.ibans);
    const h = after.headline();
    expect(after.heldIds()).toEqual([]);
    expect(h.heldNetFils).toBe(0n);
    expect(h.sifTotalFils).toBe(h.netTotalFils);
    expect(h.sifPeople).toBe(d.headline().sifPeople + 1);
    expect(openIssues(after, s).length).toBe(openIssues(d, INITIAL)
      .length - 1);
  });

  it("a-mistyped-iban-is-refused-in-plain-words", () => {
    const who = d.heldIds()[0] ?? "";
    const good = src.bankLetterIban(who);
    const bad = good.slice(0, -1) + String((Number(good.at(-1)) + 1) % 10);
    const r = src.tryIban({}, who, bad);
    expect(r.ok).toBe(false);
    expect(src.tryIban({}, who, "AE12").ok).toBe(false);
  });

  it("approval-moves-the-run-to-the-file", () => {
    const s0 = approvalBlockedBy(d, INITIAL).reduce((s, id) =>
      reduce(s, { type: "iban", employeeId: id,
        value: src.bankLetterIban(id) }), INITIAL);
    const run = runApprovalId(d) ?? "";
    expect(now(reduce(s0, { type: "decide", id: run,
      verdict: "approve" }))).toBe("sif");
    expect(now(reduce(s0, { type: "decide", id: run,
      verdict: "decline" }))).toBe("approve");
  });

  it("maker-and-checker-differ", () => {
    const p = d.runPeople();
    expect(p.makerId).not.toBe(p.checkerId);
    expect(personOf(d, "gm")).toBe(p.checkerId);
    const gm = { ...INITIAL, role: "gm" as const };
    expect(pendingApprovals(d, gm)[0]?.kind).toBe("pay-run");
  });

  it("decisions-drop-and-undo-brings-them-back", () => {
    const all = pendingApprovals(d, INITIAL);
    expect(all.length).toBe(d.headline().approvalsPending);
    const first = all[0]?.id ?? "";
    const s1 = reduce(INITIAL, { type: "decide", id: first,
      verdict: "approve" });
    expect(pendingApprovals(d, s1).length).toBe(all.length - 1);
    expect(pendingApprovals(d, reduce(s1, { type: "undecide",
      id: first })).length).toBe(all.length);
  });

  it("groups-an-iban-like-the-letter", () => {
    expect(groupIban("ae070331234567890123456"))
      .toBe("AE07 0331 2345 6789 0123 456");
  });
});
