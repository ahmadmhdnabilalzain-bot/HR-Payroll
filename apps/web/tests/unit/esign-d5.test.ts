import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildDemoData } from "../../src/demo/data/adapter";
import {
  esignClock,
  liveSigns,
  reduceEsign,
  undoable,
  type EsignDraft,
} from "../../src/demo/esign-state";
import { reduceMore, type NewHireDraft } from "../../src/demo/more-state";
import { INITIAL, reduce, type DemoState } from "../../src/demo/state";
import {
  actorOf,
  esignRows,
  esignWorld,
  fingerprintOf,
  packCount,
  packKeyOf,
  undoSteps,
  waitingFor,
} from "../../src/people/esign/model";

const d = buildDemoData();
const on = d.esign.asOf;

const sign = (docId: string, order: number, by: string,
  role: DemoState["role"] = "employee"): EsignDraft => ({ kind: "sign",
  docId, order, verdict: "signed", method: "typed", typed: by, path: null,
  reason: null, fingerprint: "x", by, name: by, title: "", role, on });

const hire: NewHireDraft = { offerId: null, name: "Noor Al Hashimi",
  nationality: "XX", departmentId: "dept-ops", jobKey: "teller",
  grade: 3, location: "head-office", basic: 900000n as never,
  startOn: "2026-11-16", probationMonths: 6, number: "ZB-0032",
  makerId: "emp-028", checkerId: "emp-001", requestedOn: on };

const withHire = (s: DemoState = INITIAL): DemoState =>
  reduceMore(s, { type: "more-hire", draft: hire });

describe("e-sign log", () => {
  it("only appends; seq and clock come from the reducer", () => {
    const s1 = reduceEsign(INITIAL, { type: "esign",
      entry: sign("a", 1, "p") });
    const s2 = reduceEsign(s1, { type: "esign", entry: sign("b", 1, "p") });
    expect(s2.esignLog.map((e) => e.seq)).toEqual([1, 2]);
    expect(s2.esignLog[0]!.time).toBe(esignClock(1));
    expect(esignClock(1)).toBe("10:02");
  });
  it("the same line is not signed twice", () => {
    const s1 = reduceEsign(INITIAL, { type: "esign",
      entry: sign("a", 1, "p") });
    expect(reduceEsign(s1, { type: "esign", entry: sign("a", 1, "q") }))
      .toBe(s1);
  });
  it("undo: only the latest signature, only by the person who signed",
    () => {
      let s = reduceEsign(INITIAL, { type: "esign",
        entry: sign("a", 1, "p") });
      s = reduceEsign(s, { type: "esign", entry: sign("a", 2, "q") });
      expect(undoable(s.esignLog, "a", "p")).toBeNull();
      expect(undoable(s.esignLog, "a", "q")).toBe(2);
      const refused = reduceEsign(s, { type: "esign", entry: { kind: "undo",
        target: 1, docId: "a", by: "p", name: "p", title: "",
        role: "hr", on } });
      expect(refused).toBe(s);
      const done = reduceEsign(s, { type: "esign", entry: { kind: "undo",
        target: 2, docId: "a", by: "q", name: "q", title: "",
        role: "hr", on } });
      expect(done.esignLog).toHaveLength(3);
      expect(liveSigns(done.esignLog).map((e) => e.seq)).toEqual([1]);
      expect(undoable(done.esignLog, "a", "p")).toBe(1);
    });
});

describe("e-sign world", () => {
  it("a new employee record registers the person with a pack of 7",
    () => {
      const s = withHire();
      const w = esignWorld(d, s);
      const key = packKeyOf(s.newHires[0]!);
      const p = w.profiles.find((x) => x.key === key)!;
      expect(p.name).toBe("Noor Al Hashimi");
      expect(p.email).toMatch(/@zarqan-demo\.test$/);
      expect(p.consentOn.display).toBe("27 October");
      const pack = w.packs.find((x) => x.key === key)!;
      expect(packCount(esignRows(d, s, w), pack))
        .toEqual({ signed: 0, total: 7 });
    });
  it("taking the record back takes the profile away", () => {
    const s0 = withHire();
    const s = reduceMore(s0, { type: "more-hire-withdraw",
      id: s0.newHires[0]!.id });
    const key = packKeyOf(s0.newHires[0]!);
    expect(esignWorld(d, s).profiles.some((p) => p.key === key)).toBe(false);
  });
  it("a declined record closes the pack", () => {
    const s0 = withHire();
    const s = reduce(s0, { type: "decide", id: s0.newHires[0]!.approvalId,
      verdict: "decline" });
    expect(esignWorld(d, s).closed.has(packKeyOf(s0.newHires[0]!)))
      .toBe(true);
  });
  it("an offer accepted in the demo registers the candidate", () => {
    const s = reduce(INITIAL, { type: "move-step", key: "offer:offer-002",
      step: { value: "accepted", from: "sent", by: "emp-028", role: "hr",
        on } });
    const w = esignWorld(d, s);
    expect(w.profiles.some((p) => p.key === "offer-002")).toBe(true);
    const pack = w.packs.find((p) => p.key === "offer-002")!;
    expect(pack.docIds[0]).toBe("offer:offer-002");
    expect(packCount(esignRows(d, s, w), pack).signed).toBe(1);
  });
  it("adding the P04 record from an accepted offer keeps one profile",
    () => {
      const s = withHire(reduceMore(INITIAL, { type: "more-hire",
        draft: { ...hire, offerId: "offer-003", name: "Faisal Chaudhry" } }));
      const keys = esignWorld(d, s).profiles.map((p) => p.key);
      expect(keys.filter((k) => k === "offer-003")).toHaveLength(1);
    });
  it("signing a pack paper moves the count; undo moves it back", () => {
    const s0 = withHire();
    const key = packKeyOf(s0.newHires[0]!);
    const doc = `pack:${key}:confidentiality`;
    const s1 = reduce(s0, { type: "esign", entry: sign(doc, 1, key) });
    const w = esignWorld(d, s1);
    const pack = w.packs.find((x) => x.key === key)!;
    expect(packCount(esignRows(d, s1, w), pack).signed).toBe(1);
    const s2 = reduce(s1, { type: "esign", entry: { kind: "undo",
      target: 1, docId: doc, by: key, name: key, title: "",
      role: "employee", on } });
    expect(packCount(esignRows(d, s2), pack).signed).toBe(0);
  });
  it("the employee and HR each have papers waiting for them", () => {
    const rows = esignRows(d, INITIAL);
    const emp = actorOf(d, { role: "employee" });
    expect(waitingFor(rows, emp).length).toBeGreaterThanOrEqual(2);
    expect(waitingFor(rows, actorOf(d, { role: "hr" })).length)
      .toBeGreaterThanOrEqual(1);
  });
  it("a letter issued on the Letters screen reads signed", () => {
    const s = reduce(INITIAL, { type: "paper-step", id: "lt-2",
      step: { status: "issued", by: "emp-001", role: "gm", on } });
    const r = esignRows(d, s).find((x) => x.doc.id === "letter:lt-2")!;
    expect(r.progress.word).toBe("Signed");
  });
});

describe("fingerprint", () => {
  it("is SHA-256 of the shown text, the same for every signer", () => {
    const doc = d.esign.docs().find((x) => x.signers.length === 2)!;
    const want = createHash("sha256").update(d.esign.text(doc), "utf8")
      .digest("hex");
    expect(fingerprintOf(d, doc)).toBe(want);
    expect(fingerprintOf(d, doc)).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("every paper has a screen that carries the sign option", () => {
  /** Host area to the screen file that renders its SignBlock. */
  const HOSTS: Record<string, string> = {
    letters: "src/people/papers/Letters.tsx",
    offers: "src/people/moves/Offers.tsx",
    warnings: "src/people/papers/Warnings.tsx",
    revisions: "src/pay/Revisions.tsx",
    loans: "src/pay/Loans.tsx",
    encash: "src/time/more/Encash.tsx",
    ending: "src/people/moves/Ending.tsx",
    settlements: "src/pay/Settlements.tsx",
    probation: "src/people/growth/Probation.tsx",
    policies: "src/people/safety/Policies.tsx",
    privacy: "src/me/MyProfile.tsx",
    bank: "src/me/MyProfile.tsx",
    pack: "src/people/more/NewEmployee.tsx",
  };
  it("each kind's host is listed and its screen uses the sign parts",
    async () => {
      const { readWeb } = await import("../helpers/files");
      const kinds = new Set(d.esign.docs().map((x) => x.kind));
      expect([...kinds].sort()).toEqual([...d.esign.kinds].sort());
      for (const doc of d.esign.docs()) {
        const file = HOSTS[doc.host.area];
        expect(file, doc.host.area).toBeDefined();
        expect(readWeb(file!)).toMatch(/signTab|SignBlock|SignLink|PackLine/);
      }
    });
});

describe("bridges to the papers' own screens", () => {
  const me = d.esign.employeeId;
  const pol = esignRows(d, INITIAL).find((r) => r.doc.kind ===
    "policy-ack" && r.doc.subjectId === me &&
    r.progress.word === "Awaiting signature")!;
  it("a read mark on the Policies screen reads as the signature", () => {
    const s = reduce(INITIAL, { type: "safety-mark",
      key: `ack:${pol.doc.host.sourceId}:${me}`,
      mark: { status: "read", by: "emp-028", role: "hr", on } });
    expect(esignRows(d, s).find((r) => r.doc.id === pol.doc.id)!
      .progress.word).toBe("Signed");
  });
  it("undoing a signed acknowledgement takes the read mark back", () => {
    expect(undoSteps(pol, me, true)).toEqual([{ type: "safety-unmark",
      key: `ack:${pol.doc.host.sourceId}:${me}` }]);
  });
  it("undoing a refused letter leaves the letter's steps alone", () => {
    const lt = esignRows(d, INITIAL).find((r) =>
      r.doc.id === "letter:lt-2")!;
    expect(undoSteps(lt, "emp-001", false)).toEqual([]);
    expect(undoSteps(lt, "emp-001", true)).toEqual([{ type: "paper-undo",
      id: "lt-2" }]);
  });
});
