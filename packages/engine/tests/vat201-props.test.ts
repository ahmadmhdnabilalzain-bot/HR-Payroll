import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  computeVat201,
  EMIRATES,
  fils,
  type AdjustmentKey,
  type FtaBoxInput,
  type Vat201,
  type Vat201Doc,
  type Vat201Input,
} from "../src/index";
import { doc, input, purchase } from "./vat201-fixture";

const amount = fc.bigInt({ min: 0n, max: 10n ** 8n });
const signed = fc.bigInt({ min: -(10n ** 8n), max: 10n ** 8n });
const kind = fc.constantFrom("tax-invoice" as const,
  "credit-note" as const);
const corrects = fc.constantFrom(null, "2025-10-01", "2026-01-01");

/** A document that raises no problem; base credit notes included. */
const completeDoc: fc.Arbitrary<Vat201Doc> = fc.record({
  body: fc.oneof(
    fc.record({ em: fc.constantFrom(...EMIRATES), net: amount,
      vat: amount }).map(({ em, net, vat }) =>
      doc({ emirate: em, net, vat })),
    fc.record({ t: fc.constantFrom("zero-rated" as const,
      "exempt" as const, "out-of-scope" as const), net: amount })
      .map(({ t, net }) => doc({ treatment: t, net })),
    fc.record({ rc: fc.boolean(), net: amount, vat: amount,
      share: fc.bigInt({ min: 0n, max: 100n }) })
      .map(({ rc, net, vat, share }) => purchase(net, vat,
        vat * share / 100n,
        { treatment: rc ? "reverse-charge" : "standard" })),
  ),
  kind,
  corrects,
}).map(({ body, kind: k, corrects: c }) =>
  ({ ...body, kind: k, correctsPeriodStart: c }));

const docs = fc.array(completeDoc, { maxLength: 30 });

const ftaBox: fc.Arbitrary<FtaBoxInput> = fc.oneof(
  fc.constant({ kind: "none" as const }),
  fc.record({ amount: signed, vat: signed }).map(({ amount: a, vat }) =>
    ({ kind: "entered" as const, amount: fils(a), vat: fils(vat) })),
);

const ADJ_KEYS: AdjustmentKey[] = [...EMIRATES.map((e) =>
  `1:${e}` as AdjustmentKey), "3", "9", "10"];

const adjustments = fc.dictionary(fc.constantFrom(...ADJ_KEYS),
  signed.map(fils)) as fc.Arbitrary<Vat201Input["adjustments"]>;

/** Everything a period can hold beside its documents. */
const extras = fc.record({ box2: ftaBox, box6: ftaBox, box7: ftaBox,
  adjustments, refundRequested: fc.boolean() });

function boxesOf(r: Vat201) {
  return { box1: r.box1, boxes: r.boxes, box12: r.box12,
    box13: r.box13, box14: r.box14, box15: r.box15 };
}

/** The opposite document: an invoice becomes a credit note. */
function reverseOf(d: Vat201Doc): Vat201Doc {
  return { ...d, id: `${d.id}-rev`,
    kind: d.kind === "credit-note" ? "tax-invoice" : "credit-note" };
}

const fta = (b: FtaBoxInput) => (b.kind === "entered" ? b.vat : 0n);

describe("VAT 201 properties", () => {
  it("box8 VAT is box 1 VAT plus boxes 2, 3, 6 and 7 VAT", () => {
    fc.assert(fc.property(docs, extras, (ds, ex) => {
      const r = computeVat201(input(ds, ex)).value;
      expect(r.status).toBe("complete");
      const box1 = EMIRATES.reduce((s, e) => s + r.box1[e].vat!, 0n);
      expect(r.boxes["8"].vat).toBe(box1 + r.boxes["3"].vat! +
        fta(ex.box2) + fta(ex.box6) + fta(ex.box7));
    }));
  });
  it("box14 is box12 minus box13, never clamped", () => {
    fc.assert(fc.property(docs, extras, (ds, ex) => {
      const r = computeVat201(input(ds, ex)).value;
      expect(r.box14).toBe(r.box12! - r.box13!);
      expect(r.box15).toBe(r.box14! < 0n ? ex.refundRequested : null);
    }));
  });
  it("a document and its reverse leave every box unchanged", () => {
    fc.assert(fc.property(docs, completeDoc, extras, (ds, extra, ex) => {
      const before = computeVat201(input(ds, ex)).value;
      const after = computeVat201(input([...ds, extra,
        reverseOf(extra)], ex)).value;
      expect(boxesOf(after)).toEqual(boxesOf(before));
    }));
  });
  it("corrections total equals the Box 14 change they cause", () => {
    fc.assert(fc.property(docs, extras, (ds, ex) => {
      const all = computeVat201(input(ds, ex)).value;
      const base = computeVat201(input(ds.filter((d) =>
        d.correctsPeriodStart === null), ex)).value;
      const total = all.corrections.reduce((s, c) =>
        s + c.netVatEffect, 0n);
      expect(total).toBe(all.box14! - base.box14!);
    }));
  });
  it("one corrected period's effect equals box14 alone", () => {
    fc.assert(fc.property(docs, (ds) => {
      const same = ds.map((d) => ({ ...d,
        correctsPeriodStart: "2026-01-01" }));
      const r = computeVat201(input(same)).value;
      const effect = r.corrections[0]?.netVatEffect ?? 0n;
      expect(effect).toBe(r.box14);
    }));
  });
  it("computing twice gives deep-equal output", () => {
    fc.assert(fc.property(docs, extras, (ds, ex) => {
      expect(computeVat201(input(ds, ex)))
        .toEqual(computeVat201(input(ds, ex)));
    }));
  });
});
