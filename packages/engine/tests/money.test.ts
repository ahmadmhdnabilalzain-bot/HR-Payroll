import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  add,
  fils,
  formatAed,
  mulDiv,
  parseAed,
  sub,
} from "../src/money";

const code = (c: string) => expect.objectContaining({ code: c });

describe("parseAed and formatAed", () => {
  it("parses decimals to fils", () => {
    expect(parseAed("10000.5")).toBe(1000050n);
    expect(parseAed("7")).toBe(700n);
    expect(parseAed("0.05")).toBe(5n);
  });
  it("rejects bad text", () => {
    for (const bad of ["1.234", "abc", "", "-1", "1.", ".5"]) {
      expect(() => parseAed(bad)).toThrowError(code("INVALID_AMOUNT"));
    }
  });
  it("formats with grouping and sign", () => {
    expect(formatAed(fils(1000050n))).toBe("AED 10,000.50");
    expect(formatAed(fils(-550n))).toBe("-AED 5.50");
    expect(formatAed(fils(5n))).toBe("AED 0.05");
  });
});

describe("mulDiv", () => {
  it("rounds a typical ratio", () => {
    const r = mulDiv(fils(1000000n), 105n, 30n, "HALF_UP");
    expect(r).toBe(3500000n);
  });
  it("applies each mode to a positive half", () => {
    const h = (m: "HALF_UP" | "HALF_EVEN" | "DOWN" | "UP") =>
      mulDiv(fils(1n), 1n, 2n, m);
    expect(h("HALF_UP")).toBe(1n);
    expect(h("HALF_EVEN")).toBe(0n);
    expect(h("DOWN")).toBe(0n);
    expect(h("UP")).toBe(1n);
  });
  it("rounds negative halves away from zero under HALF_UP", () => {
    expect(mulDiv(fils(-1n), 1n, 2n, "HALF_UP")).toBe(-1n);
    expect(mulDiv(fils(-3n), 1n, 2n, "HALF_UP")).toBe(-2n);
    expect(mulDiv(fils(-1n), 1n, 2n, "DOWN")).toBe(0n);
    expect(mulDiv(fils(-1n), 1n, 2n, "UP")).toBe(-1n);
    expect(mulDiv(fils(-3n), 1n, 2n, "HALF_EVEN")).toBe(-2n);
  });
  it("HALF_EVEN goes to the even neighbour", () => {
    expect(mulDiv(fils(3n), 1n, 2n, "HALF_EVEN")).toBe(2n);
    expect(mulDiv(fils(5n), 1n, 2n, "HALF_EVEN")).toBe(2n);
  });
  it("rounds non-halves to nearest", () => {
    expect(mulDiv(fils(1n), 1n, 3n, "HALF_UP")).toBe(0n);
    expect(mulDiv(fils(2n), 1n, 3n, "HALF_UP")).toBe(1n);
  });
  it("rejects a non-positive denominator", () => {
    expect(() => mulDiv(fils(5n), 1n, 0n, "DOWN")).toThrowError(
      code("DIVIDE_BY_ZERO"),
    );
    expect(() => mulDiv(fils(5n), 1n, -2n, "DOWN")).toThrowError(
      code("DIVIDE_BY_ZERO"),
    );
  });
  it("stays exact on huge values", () => {
    const r = mulDiv(fils(10n ** 30n), 3n, 2n, "HALF_UP");
    expect(r).toBe(fils(15n * 10n ** 29n));
  });
});

describe("add and sub", () => {
  it("sub undoes add", () => {
    fc.assert(
      fc.property(fc.bigInt(), fc.bigInt(), (x, y) => {
        const a = fils(x);
        const b = fils(y);
        expect(sub(add(a, b), b)).toBe(a);
      }),
    );
  });
});
