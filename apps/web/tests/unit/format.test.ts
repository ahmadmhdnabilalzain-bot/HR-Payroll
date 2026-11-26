import { fils } from "@payroll/engine";
import { describe, expect, it } from "vitest";
import {
  dirOf,
  formatDate,
  formatMoney,
  formatNumber,
  formatTime,
} from "../../src/i18n/format";
import { todayInDubai } from "../../src/lib/today";

describe("format", () => {
  it("money-ltr-isolated", () => {
    expect(formatMoney(fils(3833333n), "ar"))
      .toBe("⁦AED 38,333.33⁩");
    expect(formatMoney(fils(3833333n), "en")).toBe("AED 38,333.33");
  });

  it("date-latin-gregorian", () => {
    const ar = formatDate("2026-11-26", "ar");
    expect(ar).toContain("2026");
    expect(ar).not.toMatch(/[٠-٩]/);
    expect(formatDate("2026-11-26", "en")).toContain("2026");
  });

  it("date-does-not-shift-by-zone", () => {
    expect(formatDate("2026-01-01", "en")).toMatch(/\b1\b/);
    expect(formatDate("2026-01-01", "en")).toContain("2026");
  });

  it("time-in-dubai", () => {
    expect(formatTime("2026-11-26T05:15:00Z", "en")).toBe("09:15");
    expect(formatTime("2026-11-26T05:15:00Z", "ar")).toBe("09:15");
  });

  it("today-dubai", () => {
    expect(todayInDubai(new Date("2026-11-25T21:30:00Z")))
      .toBe("2026-11-26");
    expect(todayInDubai(new Date("2026-11-25T19:30:00Z")))
      .toBe("2026-11-25");
  });

  it("numbers-latin", () => {
    expect(formatNumber(1234, "ar")).toBe("1,234");
  });

  it("direction", () => {
    expect(dirOf("ar")).toBe("rtl");
    expect(dirOf("en")).toBe("ltr");
  });
});
