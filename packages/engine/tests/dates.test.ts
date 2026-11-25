import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  addDays,
  anniversary,
  daysBetween,
  parseIsoDate,
} from "../src/dates";

const code = (c: string) => expect.objectContaining({ code: c });

describe("parseIsoDate", () => {
  it("accepts a leap day", () => {
    expect(parseIsoDate("2024-02-29")).toEqual({ y: 2024, m: 2, d: 29 });
  });
  it("rejects impossible and non-ISO text with INVALID_DATE", () => {
    const bad = ["2023-02-29", "2024-02-30", "2024-2-3", "", "2024-13-01",
      "2024-00-10", "2024-01-00", " 2024-01-01", "2024-01-01T00:00"];
    for (const text of bad) {
      expect(() => parseIsoDate(text)).toThrowError(code("INVALID_DATE"));
    }
  });
  it("puts the offending value in detail", () => {
    expect(() => parseIsoDate("2024-02-30")).toThrowError(
      expect.objectContaining({ detail: { value: "2024-02-30" } }),
    );
  });
});

describe("daysBetween and addDays", () => {
  it("counts across a leap day", () => {
    expect(daysBetween("2024-02-28", "2024-03-01")).toBe(2);
    expect(daysBetween("2023-02-28", "2023-03-01")).toBe(1);
  });
  it("is negative when to is before from", () => {
    expect(daysBetween("2024-03-01", "2024-02-28")).toBe(-2);
  });
  it("adds across month, year and leap boundaries", () => {
    expect(addDays("2023-12-31", 1)).toBe("2024-01-01");
    expect(addDays("2024-02-28", 1)).toBe("2024-02-29");
    expect(addDays("2024-03-01", -1)).toBe("2024-02-29");
    expect(addDays("1900-02-28", 1)).toBe("1900-03-01");
    expect(addDays("2000-02-28", 1)).toBe("2000-02-29");
  });
  it("counts a whole leap year as 366 days", () => {
    expect(daysBetween("2024-01-01", "2025-01-01")).toBe(366);
    expect(daysBetween("2019-01-01", "2024-01-01")).toBe(1826);
  });
  it("rejects bad dates", () => {
    expect(() => addDays("2024-02-30", 1)).toThrowError(
      code("INVALID_DATE"),
    );
    expect(() => daysBetween("x", "2024-01-01")).toThrowError(
      code("INVALID_DATE"),
    );
  });
  it("round-trips: daysBetween(d, addDays(d, n)) is n", () => {
    const day = fc.integer({ min: 0, max: 200 * 366 });
    fc.assert(
      fc.property(day, fc.integer({ min: -40000, max: 40000 }), (s, n) => {
        const d = addDays("1900-01-01", s);
        expect(daysBetween(d, addDays(d, n))).toBe(n);
        expect(parseIsoDate(addDays(d, n))).toBeDefined();
      }),
    );
  });
});

describe("anniversary", () => {
  const CLAMP = "clamp-to-last-day-of-month";
  it("clamps 29 February to 28 February in a non-leap year", () => {
    expect(anniversary("2024-02-29", 1, CLAMP)).toBe("2025-02-28");
    expect(anniversary("2024-02-29", 4, CLAMP)).toBe("2028-02-29");
  });
  it("keeps an ordinary date and handles zero years", () => {
    expect(anniversary("2019-01-01", 5, CLAMP)).toBe("2024-01-01");
    expect(anniversary("2019-07-15", 0, CLAMP)).toBe("2019-07-15");
  });
});
