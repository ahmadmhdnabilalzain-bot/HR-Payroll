import { describe, expect, it } from "vitest";
import {
  computeVat201,
  EMIRATES,
  fils,
  VAT201_BOXES,
  type Vat201,
} from "../src/index";
import { doc, input, purchase } from "./vat201-fixture";

function codeOf(fn: () => unknown): string {
  try {
    fn();
  } catch (e) {
    return (e as { code: string }).code;
  }
  return "NONE";
}

const fig = (amount: bigint | null, vat: bigint | null,
  adjustment: bigint | null) => ({ amount, vat, adjustment });

const problemCodes = (r: Vat201) => r.problems.map((p) => p.code);
const negBoxes = (r: Vat201) => r.warnings
  .filter((w) => w.code === "NEGATIVE_BOX").map((w) => w.box);

describe("VAT 201 boxes", () => {
  it("standard_sale_by_emirate", () => {
    const r = computeVat201(input([
      doc({ net: 10000n, vat: 500n }), doc({ net: 10000n, vat: 500n }),
      doc({ emirate: "AZ", net: 20000n, vat: 1000n }),
      purchase(4000n, 200n, 200n),
    ])).value;
    expect(r.box1.DU).toEqual(fig(20000n, 1000n, 0n));
    expect(r.box1.AZ).toEqual(fig(20000n, 1000n, 0n));
    expect(r.box1.SH).toEqual(fig(0n, 0n, 0n));
    expect(r.boxes["9"]).toEqual(fig(4000n, 200n, 0n));
    expect(r.boxes["8"]).toEqual(fig(40000n, 2000n, 0n));
    expect(r.boxes["11"]).toEqual(fig(4000n, 200n, 0n));
    expect([r.box12, r.box13, r.box14]).toEqual([2000n, 200n, 1800n]);
    expect(r.box15).toBeNull();
    expect(r.status).toBe("complete");
    expect(r.problems).toEqual([]);
  });
  it("credit_note_subtracts", () => {
    const r = computeVat201(input([
      doc({ net: 20000n, vat: 1000n }),
      doc({ kind: "credit-note", net: 5000n, vat: 250n }),
    ])).value;
    expect(r.box1.DU).toEqual(fig(15000n, 750n, 0n));
  });
  it("reverse_charge_both_sides", () => {
    const r = computeVat201(input([
      purchase(10000n, 500n, 500n, { treatment: "reverse-charge" }),
    ])).value;
    expect(r.boxes["3"]).toEqual(fig(10000n, 500n, 0n));
    expect(r.boxes["10"]).toEqual(fig(10000n, 500n, 0n));
    expect(r.box14).toBe(0n);
  });
  it("zero_and_exempt_amount_only", () => {
    const r = computeVat201(input([
      doc({ treatment: "zero-rated", net: 7000n }),
      doc({ treatment: "exempt", net: 3000n }),
    ])).value;
    expect(r.boxes["4"]).toEqual(fig(7000n, null, null));
    expect(r.boxes["5"]).toEqual(fig(3000n, null, null));
    expect(r.boxes["8"]).toEqual(fig(10000n, 0n, 0n));
  });
  it("out_of_scope_and_untaxed_purchases_excluded", () => {
    const a = doc({ treatment: "out-of-scope", net: 100n });
    const b = purchase(100n, 0n, null, { treatment: "exempt" });
    const r = computeVat201(input([a, b])).value;
    expect(r.excludedDocIds).toEqual([a.id, b.id]);
    expect(r.status).toBe("complete");
  });
  it("input_tax_undecided_incomplete", () => {
    const p = purchase(4000n, 200n, null);
    const r = computeVat201(input([p])).value;
    expect(r.status).toBe("incomplete");
    expect(r.problems).toEqual([{ code: "INPUT_TAX_UNDECIDED",
      docIds: [p.id], box: "9" }]);
    expect(r.box14).toBeNull();
    expect(r.boxes["9"]).toEqual(fig(4000n, null, 0n));
    expect(r.boxes["8"]).toEqual(fig(null, null, null));
    expect([r.box12, r.box13, r.box15]).toEqual([null, null, null]);
  });
  it("fta_box_not_entered_incomplete", () => {
    const r = computeVat201(input([], { box6: { kind: "not-entered" } }))
      .value;
    expect(r.boxes["6"]).toEqual(fig(null, null, null));
    expect(r.problems).toEqual([{ code: "FTA_BOX_NOT_ENTERED",
      docIds: [], box: "6" }]);
    expect(r.box12).toBeNull();
    expect(r.status).toBe("incomplete");
  });
  it("fta_boxes_entered", () => {
    const r = computeVat201(input([], {
      box2: { kind: "entered", amount: fils(-1000n), vat: fils(-50n) },
      box6: { kind: "entered", amount: fils(4000n), vat: fils(200n) },
    })).value;
    expect(r.boxes["2"]).toEqual(fig(-1000n, -50n, null));
    expect(r.boxes["6"]).toEqual(fig(4000n, 200n, null));
    expect(r.boxes["7"]).toEqual(fig(0n, 0n, null));
    expect(r.box12).toBe(150n);
    expect(negBoxes(r)).toEqual(["2"]);
  });
  it("adjustments_go_to_their_box", () => {
    const r = computeVat201(input([doc({ net: 10000n, vat: 500n })], {
      adjustments: { "1:DU": fils(20n), "9": fils(-5n) },
    })).value;
    expect(r.box1.DU).toEqual(fig(10000n, 500n, 20n));
    expect(r.boxes["9"]).toEqual(fig(0n, 0n, -5n));
    expect([r.box12, r.box13, r.box14]).toEqual([520n, -5n, 525n]);
  });
  it("net_refund_period_signed", () => {
    const docs = [doc({ net: 2000n, vat: 100n }),
      purchase(18000n, 900n, 900n)];
    for (const refundRequested of [true, false]) {
      const r = computeVat201(input(docs, { refundRequested })).value;
      expect(r.box14).toBe(-800n);
      expect(negBoxes(r)).toContain("14");
      expect(r.box15).toBe(refundRequested);
    }
    const pay = computeVat201(input([doc({ net: 2000n, vat: 100n })],
      { refundRequested: true })).value;
    expect(pay.box15).toBeNull();
    expect(pay.warnings.map((w) => w.code))
      .toContain("REFUND_NOT_APPLICABLE");
  });
  it("credit_notes_exceed_sales", () => {
    const r = computeVat201(input([doc({ net: 2000n, vat: 100n }),
      doc({ kind: "credit-note", net: 6000n, vat: 300n })])).value;
    expect(r.box1.DU.vat).toBe(-200n);
    expect(negBoxes(r)).toContain("1");
    expect(r.box14).toBe(-200n);
  });
  it("correction_over_threshold_flags", () => {
    const over = purchase(20000020n, 1000001n, 1000001n, {
      kind: "credit-note", correctsPeriodStart: "2026-01-01" });
    const r = computeVat201(input([over])).value;
    expect(r.corrections).toEqual([{ periodStart: "2026-01-01",
      netVatEffect: 1000001n, overThreshold: true }]);
    expect(r.warnings).toContainEqual({
      code: "VOLUNTARY_DISCLOSURE_MAY_BE_NEEDED", box: null,
      periodStart: "2026-01-01" });
    const at = computeVat201(input([
      purchase(10000000n, 500000n, 500000n, { kind: "credit-note",
        correctsPeriodStart: "2026-01-01" }),
      purchase(10000000n, 500000n, 500000n, { kind: "credit-note",
        correctsPeriodStart: "2026-01-01" }),
    ])).value;
    expect(at.corrections).toEqual([{ periodStart: "2026-01-01",
      netVatEffect: 1000000n, overThreshold: false }]);
    expect(at.warnings.map((w) => w.code))
      .not.toContain("VOLUNTARY_DISCLOSURE_MAY_BE_NEEDED");
  });
  it("correction_effect_formula_as_written", () => {
    // Each document's Box 14 effect: sale +100, reverse charge
    // 500 - 0 = +500, standard purchase -50.
    const r = computeVat201(input([
      doc({ net: 2000n, vat: 100n, correctsPeriodStart: "2026-01-01" }),
      purchase(10000n, 500n, 0n, { treatment: "reverse-charge",
        correctsPeriodStart: "2026-01-01" }),
      purchase(1000n, 50n, 50n, { correctsPeriodStart: "2025-10-01" }),
    ])).value;
    expect(r.corrections).toEqual([
      { periodStart: "2025-10-01", netVatEffect: -50n,
        overThreshold: false },
      { periodStart: "2026-01-01", netVatEffect: 600n,
        overThreshold: false }]);
  });
  it("reverse_charge_correction_over_threshold_warns", () => {
    const r = computeVat201(input([purchase(30000000n, 1500000n, 0n,
      { treatment: "reverse-charge",
        correctsPeriodStart: "2026-01-01" })])).value;
    expect(r.corrections).toEqual([{ periodStart: "2026-01-01",
      netVatEffect: 1500000n, overThreshold: true }]);
    expect(r.warnings.map((w) => w.code))
      .toContain("VOLUNTARY_DISCLOSURE_MAY_BE_NEEDED");
  });
  it("reverse_charge_fully_claimed_correction_no_warning", () => {
    const r = computeVat201(input([purchase(40000000n, 2000000n,
      2000000n, { treatment: "reverse-charge",
        correctsPeriodStart: "2026-01-01" })])).value;
    expect(r.corrections).toEqual([{ periodStart: "2026-01-01",
      netVatEffect: 0n, overThreshold: false }]);
    expect(r.warnings.map((w) => w.code))
      .not.toContain("VOLUNTARY_DISCLOSURE_MAY_BE_NEEDED");
  });
  it("excluded_purchase_correction_has_no_effect", () => {
    const p = purchase(40000000n, 0n, 2000000n, { treatment:
      "zero-rated", correctsPeriodStart: "2026-01-01" });
    const r = computeVat201(input([p])).value;
    expect(r.corrections).toEqual([{ periodStart: "2026-01-01",
      netVatEffect: 0n, overThreshold: false }]);
    expect(r.warnings.map((w) => w.code))
      .not.toContain("VOLUNTARY_DISCLOSURE_MAY_BE_NEEDED");
    expect(r.excludedDocIds).toEqual([p.id]);
  });
  it("claimed_on_untaxed_purchase_problem", () => {
    const p = purchase(1000n, 0n, 5n, { treatment: "exempt" });
    const r = computeVat201(input([p])).value;
    expect(r.problems).toEqual([{ code: "CLAIMED_ON_UNTAXED",
      docIds: [p.id], box: null }]);
    expect(r.status).toBe("incomplete");
    const zero = purchase(1000n, 0n, 0n, { treatment: "out-of-scope" });
    expect(computeVat201(input([zero])).value.problems).toEqual([]);
  });
  it("sale_reverse_charge_invalid", () => {
    const r = computeVat201(input([doc({ treatment: "reverse-charge",
      net: 100n, vat: 5n })])).value;
    expect(problemCodes(r)).toEqual(["TREATMENT_DIRECTION_INVALID"]);
  });
  it("claimed_exceeds_vat", () => {
    const p = purchase(100n, 5n, 6n);
    const r = computeVat201(input([p])).value;
    expect(r.problems).toEqual([{ code: "CLAIMED_EXCEEDS_VAT",
      docIds: [p.id], box: "9" }]);
  });
  it("vat_on_exempt_problem", () => {
    const r = computeVat201(input([doc({ treatment: "exempt", net: 100n,
      vat: 5n })])).value;
    expect(r.problems).toEqual([{ code: "VAT_ON_NON_STANDARD",
      docIds: [r.problems[0]!.docIds[0]!], box: "5" }]);
    expect(r.status).toBe("incomplete");
  });
  it("emirate_required", () => {
    const d = doc({ emirate: null, net: 100n, vat: 5n });
    const r = computeVat201(input([d])).value;
    expect(r.problems).toEqual([{ code: "EMIRATE_REQUIRED",
      docIds: [d.id], box: "1" }]);
  });
  it("problems_group_doc_ids", () => {
    const a = purchase(100n, 5n, null);
    const b = purchase(100n, 5n, null);
    const r = computeVat201(input([a, b])).value;
    expect(r.problems).toEqual([{ code: "INPUT_TAX_UNDECIDED",
      docIds: [a.id, b.id], box: "9" }]);
  });
  it("nil_return", () => {
    const r = computeVat201(input([])).value;
    expect(r.status).toBe("complete");
    expect(r.box14).toBe(0n);
    expect(r.warnings.map((w) => w.code)).toContain("NIL_RETURN");
  });
  it("layout_labels", () => {
    expect(VAT201_BOXES).toHaveLength(15);
    expect(VAT201_BOXES.filter((b) => b.ftaPopulated).map((b) => b.box))
      .toEqual(["2", "6", "7"]);
    expect(VAT201_BOXES.map((b) => b.box)).toEqual(
      Array.from({ length: 15 }, (_, i) => String(i + 1)));
    expect(VAT201_BOXES.find((b) => b.box === "15")!.columns).toEqual([]);
    expect(EMIRATES).toEqual(["AZ", "DU", "SH", "AJ", "UQ", "RK", "FU"]);
    const r = computeVat201(input([doc({ net: 1n })])).value;
    expect(r.warnings[0]).toEqual({ code: "LAYOUT_FROM_2021_GUIDE",
      box: null, periodStart: null });
    expect(r.notComputed).toHaveLength(2);
  });
  it("trace_one_line_per_box", () => {
    const t = computeVat201(input([doc({ net: 100n, vat: 5n })])).trace;
    const ids = t.map((l) => l.id);
    for (let n = 1; n <= 15; n += 1) {
      expect(ids).toContain(`vat201.box.${n}`);
    }
    const box1 = t.find((l) => l.id === "vat201.box.1")!;
    expect(box1.inputs.documents).toBe("1");
    expect(box1.rules.map((x) => x.key)).toEqual(["box201Layout"]);
    expect(box1.rules[0]!.status).toBe("secondary");
  });
  it("refuses bad input", () => {
    expect(codeOf(() => computeVat201(input([doc({ net: -1n })]))))
      .toBe("INVALID_AMOUNT");
    const d = doc({ net: 1n });
    expect(codeOf(() => computeVat201(input([d, d]))))
      .toBe("DUPLICATE_DOCUMENT");
    expect(codeOf(() => computeVat201(input([doc({
      correctsPeriodStart: "2026-04-01" })])))).toBe("INVALID_PERIOD");
    expect(codeOf(() => computeVat201(input([], {
      periodStart: "2026-07-01" })))).toBe("INVALID_PERIOD");
    expect(codeOf(() => computeVat201(input([], {
      periodEnd: "2017-12-31", periodStart: "2017-10-01" }))))
      .toBe("NO_PACK_FOR_DATE");
  });
});
