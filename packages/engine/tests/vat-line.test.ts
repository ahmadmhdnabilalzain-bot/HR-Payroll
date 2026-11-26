import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { checkDocumentVat, fils, vatOnNet } from "../src/index";

const DAY = "2026-11-26";

function codeOf(fn: () => unknown): string {
  try {
    fn();
  } catch (e) {
    return (e as { code: string }).code;
  }
  return "NONE";
}

describe("VAT on a net amount", () => {
  it("vat_on_net_rounds_half_up", () => {
    const r = vatOnNet(fils(10000n), DAY);
    expect(r.value).toBe(500n);
    expect(vatOnNet(fils(10n), DAY).value).toBe(1n);
    expect(vatOnNet(fils(9n), DAY).value).toBe(0n);
    const line = r.trace[0]!;
    expect(line.id).toBe("vat.line");
    const rate = line.rules.find((x) => x.key === "standardRateBps")!;
    expect(rate).toMatchObject({ value: "500", status: "secondary" });
  });
  it("refuses a date before the VAT pack", () => {
    expect(codeOf(() => vatOnNet(fils(1n), "2017-12-31")))
      .toBe("NO_PACK_FOR_DATE");
  });
});

describe("document VAT checks", () => {
  const doc = (treatment: "standard" | "zero-rated" | "exempt" |
    "out-of-scope" | "reverse-charge", net: bigint, vat: bigint) =>
    ({ treatment, net: fils(net), vat: fils(vat) });
  it("mismatch_warning", () => {
    expect(checkDocumentVat(doc("standard", 10000n, 502n), DAY)).toEqual(
      [{ code: "VAT_NOT_AT_STANDARD_RATE", severity: "warning",
        expected: 500n }]);
    expect(checkDocumentVat(doc("standard", 10000n, 501n), DAY))
      .toEqual([]);
    expect(checkDocumentVat(doc("reverse-charge", 10000n, 498n), DAY))
      .toHaveLength(1);
  });
  it("vat_on_zero_rated_error", () => {
    expect(checkDocumentVat(doc("zero-rated", 7000n, 1n), DAY)).toEqual(
      [{ code: "VAT_ON_NON_STANDARD", severity: "error",
        expected: 0n }]);
    expect(checkDocumentVat(doc("zero-rated", 7000n, 0n), DAY))
      .toEqual([]);
    expect(checkDocumentVat(doc("exempt", 1n, 5n), DAY)).toHaveLength(1);
    expect(checkDocumentVat(doc("out-of-scope", 1n, 5n), DAY))
      .toHaveLength(1);
  });
  it("refuses negative amounts", () => {
    expect(codeOf(() => checkDocumentVat(doc("standard", -1n, 0n), DAY)))
      .toBe("INVALID_AMOUNT");
    expect(codeOf(() => checkDocumentVat(doc("exempt", 1n, -1n), DAY)))
      .toBe("INVALID_AMOUNT");
  });
  it("vat_check_property", () => {
    fc.assert(fc.property(fc.bigInt({ min: 0n, max: 10n ** 9n }),
      (net) => {
        const vat = vatOnNet(fils(net), DAY).value;
        expect(checkDocumentVat(doc("standard", net, vat), DAY))
          .toEqual([]);
      }));
  });
});
