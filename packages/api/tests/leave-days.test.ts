import fc from "fast-check";
import { addDays } from "@payroll/engine";
import { describe, expect, it } from "vitest";
import { daysInPeriod, leaveDays } from "../src/leave/days";
import { dubaiDate, dubaiTime } from "../src/time/dubai";

describe("leave days (calendar days inclusive)", () => {
  it("counts inclusive calendar days", () => {
    expect(leaveDays("2026-03-01", "2026-03-01")).toBe(1);
    expect(leaveDays("2026-02-27", "2026-03-02")).toBe(4);
    expect(leaveDays("2028-02-28", "2028-03-01")).toBe(3);
  });
  it("counts the part inside one month", () => {
    expect(daysInPeriod("2026-01-30", "2026-02-02",
      { year: 2026, month: 2 })).toBe(2);
    expect(daysInPeriod("2026-01-30", "2026-02-02",
      { year: 2026, month: 1 })).toBe(2);
    expect(daysInPeriod("2026-01-30", "2026-02-02",
      { year: 2026, month: 3 })).toBe(0);
  });
  it("the months' parts add up to the whole", () => {
    fc.assert(fc.property(fc.integer({ min: 0, max: 3000 }),
      fc.integer({ min: 0, max: 400 }), (offset, len) => {
        const start = addDays("2024-01-01", offset);
        const end = addDays(start, len);
        let sum = 0;
        for (let y = 2024; y <= 2033; y++) {
          for (let m = 1; m <= 12; m++) {
            sum += daysInPeriod(start, end, { year: y, month: m });
          }
        }
        expect(sum).toBe(leaveDays(start, end));
      }));
  });
});

describe("Asia/Dubai (fixed UTC+4)", () => {
  it("dates and times shift by four hours", () => {
    expect(dubaiDate(new Date("2026-03-01T20:30:00Z"))).toBe("2026-03-02");
    expect(dubaiDate(new Date("2026-03-01T19:59:59Z"))).toBe("2026-03-01");
    expect(dubaiTime(new Date("2026-03-31T21:00:00Z")).hhmmss)
      .toBe("010000");
  });
});
