import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { ibanChecksumOk } from "../src/iban";
import { defaultLayout as L } from "../src/layout";
import { parseSif } from "../src/parse";
import { validateSif } from "../src/validate";
import { BASE, EI_SAMPLE, text } from "./fixtures";

describe("ibanChecksumOk", () => {
  it("accepts known valid IBANs", () => {
    expect(ibanChecksumOk("GB82WEST12345698765432")).toBe(true);
    expect(ibanChecksumOk("AE400240043520123456701")).toBe(true);
  });
  it("rejects a wrong check digit and malformed text", () => {
    expect(ibanChecksumOk("GB83WEST12345698765432")).toBe(false);
    expect(ibanChecksumOk("AE160240043520123456701")).toBe(false);
    expect(ibanChecksumOk("")).toBe(false);
    expect(ibanChecksumOk("AE")).toBe(false);
    expect(ibanChecksumOk("ae400240043520123456701")).toBe(false);
    expect(ibanChecksumOk("AE40-0240043520123456701")).toBe(false);
  });
});

describe("parseSif", () => {
  it("returns typed records with 1-based lines", () => {
    const { records, findings } = parseSif(text(BASE));
    expect(findings).toEqual([]);
    expect(records.map((r) => [r.line, r.type])).toEqual([
      [1, "EDR"], [2, "EVP"], [3, "EDR"], [4, "SCR"],
    ]);
    expect(records[0]!.fields[1]).toBe("00915012345663");
  });
  it("accepts CRLF and trims spaces with warnings", () => {
    const { records, findings } = parseSif(EI_SAMPLE);
    expect(records).toHaveLength(3);
    expect(records[0]!.fields[1]).toBe("DUMMYEMP000001");
    expect(findings.every((f) => f.code === "FIELD_HAS_SPACES")).toBe(true);
    expect(findings[0]).toMatchObject({ line: 1, field: 2 });
  });
  it("reports an SCR that is not the last line", () => {
    const [a, b, c, d] = BASE as [string, string, string, string];
    const { findings } = parseSif([a, d, b, c].join("\n"));
    expect(findings).toEqual([
      expect.objectContaining({ code: "SCR_NOT_LAST", line: 2 }),
    ]);
  });
  it("reports a NON_ASCII control character", () => {
    const { findings } = parseSif("EDR\t,1\n");
    expect(findings).toContainEqual(
      expect.objectContaining({ code: "NON_ASCII", line: 1, field: 1 }),
    );
  });
});

describe("never throws", () => {
  it("on arbitrary text", () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 400 }), (s) => {
        parseSif(s);
        validateSif(s, L, "2020-01-01");
      }),
    );
  });
  it("on random edits of a valid file", () => {
    const base = text(BASE);
    const edit = fc.record({
      at: fc.nat({ max: base.length }),
      cut: fc.nat({ max: 5 }),
      put: fc.string({ maxLength: 5 }),
    });
    fc.assert(
      fc.property(fc.array(edit, { maxLength: 6 }), (es) => {
        let s = base;
        for (const e of es) {
          const at = Math.min(e.at, s.length);
          s = s.slice(0, at) + e.put + s.slice(at + e.cut);
        }
        validateSif(s, L);
      }),
      { numRuns: 500 },
    );
  });
});
