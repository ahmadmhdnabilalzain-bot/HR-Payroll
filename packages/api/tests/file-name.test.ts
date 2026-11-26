import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { contentDisposition, safeFileName } from "../src/files/names";

/** Review Focus 3: names can never break or inject a header. */
describe("safeFileName", () => {
  it("cleans paths, quotes and control characters", () => {
    expect(safeFileName("../../etc/passwd")).toBe("_.._etc_passwd");
    expect(safeFileName('a"b\r\nc.pdf')).toBe("a_bc.pdf");
    expect(safeFileName("  ...  ")).toBe("file");
    expect(safeFileName("a\\b\u0000\u007f.pdf")).toBe("a_b.pdf");
  });
  it("cuts to 200 code points", () => {
    expect([...safeFileName("ج".repeat(300))].length).toBe(200);
  });
});

describe("contentDisposition", () => {
  it("gives an ASCII name and a UTF-8 name", () => {
    expect(contentDisposition("جواز.pdf")).toBe(
      "attachment; filename=\"____.pdf\"; " +
      "filename*=UTF-8''%D8%AC%D9%88%D8%A7%D8%B2.pdf");
    expect(contentDisposition("it's (1).pdf"))
      .toContain("%27s%20%281%29.pdf");
  });
  it("a plain name has no extended form", () => {
    expect(contentDisposition("receipt-1.png"))
      .toBe("attachment; filename=\"receipt-1.png\"");
  });
  it("no output has CR, LF, a quote inside the name or a semicolon",
    () => {
      fc.assert(fc.property(fc.string({ unit: "binary" }), (s) => {
        const h = contentDisposition(safeFileName(s));
        expect(h).not.toMatch(/[\r\n]/);
        const ascii = /^attachment; filename="([^"]*)"/.exec(h);
        expect(ascii).not.toBeNull();
        expect(ascii![1]).toMatch(/^[A-Za-z0-9._ -]*$/);
        expect(h.split(";").length).toBeLessThanOrEqual(3);
        new Headers({ "content-disposition": h });
      }), { numRuns: 300 });
    });
});
