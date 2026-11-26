import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  computeVat201,
  EMIRATES,
  type Vat201,
  type Vat201Doc,
} from "../src/index";
import { doc, input, purchase } from "./vat201-fixture";

const amount = fc.bigInt({ min: 0n, max: 10n ** 8n });

/** A document that raises no problem. */
const completeDoc: fc.Arbitrary<Vat201Doc> = fc.oneof(
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
);

const docs = fc.array(completeDoc, { maxLength: 30 });

function boxesOf(r: Vat201) {
  return { box1: r.box1, boxes: r.boxes, box12: r.box12,
    box13: r.box13, box14: r.box14, box15: r.box15 };
}

function creditNoteOf(d: Vat201Doc): Vat201Doc {
  return { ...d, id: `${d.id}-cn`, kind: "credit-note" };
}

describe("VAT 201 properties", () => {
  it("box8 VAT is box 1 VAT over emirates plus box 3 VAT", () => {
    fc.assert(fc.property(docs, (ds) => {
      const r = computeVat201(input(ds)).value;
      expect(r.status).toBe("complete");
      const box1 = EMIRATES.reduce((s, e) => s + r.box1[e].vat!, 0n);
      expect(r.boxes["8"].vat).toBe(box1 + r.boxes["3"].vat!);
    }));
  });
  it("box14 is box12 minus box13", () => {
    fc.assert(fc.property(docs, (ds) => {
      const r = computeVat201(input(ds)).value;
      expect(r.box14).toBe(r.box12! - r.box13!);
    }));
  });
  it("a document and its credit note leave every box unchanged", () => {
    fc.assert(fc.property(docs, completeDoc, (ds, extra) => {
      const before = computeVat201(input(ds)).value;
      const after = computeVat201(input([...ds, extra,
        creditNoteOf(extra)])).value;
      expect(boxesOf(after)).toEqual(boxesOf(before));
    }));
  });
  it("computing twice gives deep-equal output", () => {
    fc.assert(fc.property(docs, (ds) => {
      expect(computeVat201(input(ds))).toEqual(computeVat201(input(ds)));
    }));
  });
});
