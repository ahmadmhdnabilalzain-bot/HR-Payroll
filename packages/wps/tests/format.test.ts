import { EngineError, fils } from "@payroll/engine";
import { describe, expect, it } from "vitest";
import {
  formatAmount,
  formatMonth,
  isAscii,
  isoDate,
  padId,
} from "../src/format";
import { defaultLayout } from "../src/layout";

const code = (c: string) => expect.objectContaining({ code: c });

describe("formatAmount", () => {
  it("prints plain decimals with two places", () => {
    expect(formatAmount(fils(234587n))).toBe("2345.87");
    expect(formatAmount(fils(2300n))).toBe("23.00");
    expect(formatAmount(fils(0n))).toBe("0.00");
    expect(formatAmount(fils(5n))).toBe("0.05");
  });
  it("rejects negative amounts", () => {
    expect(() => formatAmount(fils(-1n))).toThrowError(
      code("NEGATIVE_AMOUNT"),
    );
    try {
      formatAmount(fils(-1n));
    } catch (e) {
      expect((e as EngineError).detail.value).toBe("-1");
    }
  });
});

describe("padId", () => {
  it("left-pads with zeros", () => {
    expect(padId("915012345663", 14)).toBe("00915012345663");
    expect(padId("12345678901234", 14)).toBe("12345678901234");
  });
  it("rejects ids that are too long", () => {
    expect(() => padId("123456789012345", 14)).toThrowError(
      code("ID_TOO_LONG"),
    );
    try {
      padId("123456789012345", 14);
    } catch (e) {
      expect((e as EngineError).detail.value).toBe("123456789012345");
    }
  });
});

describe("dates and text", () => {
  it("formats the salary month as MMYYYY", () => {
    expect(formatMonth(2016, 1)).toBe("012016");
    expect(formatMonth(2026, 11)).toBe("112026");
  });
  it("formats ISO dates zero-padded", () => {
    expect(isoDate(2026, 3, 7)).toBe("2026-03-07");
    expect(isoDate(2026, 11, 25)).toBe("2026-11-25");
  });
  it("detects ASCII", () => {
    expect(isAscii("abc")).toBe(true);
    expect(isAscii("شركة")).toBe(false);
  });
});

describe("defaultLayout", () => {
  it("records its source", () => {
    expect(defaultLayout.source.length).toBeGreaterThan(0);
  });
  it("holds the strictest common form", () => {
    expect(defaultLayout).toMatchObject({
      personIdLength: 14,
      employerIdLength: 13,
      accountLength: 23,
      routingLength: 9,
      minPayStart: "2010-10-01",
      lineEnding: "\r\n",
      currency: "AED",
      status: "secondary",
    });
  });
});
