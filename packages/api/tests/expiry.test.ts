import { describe, expect, it } from "vitest";
import { DEFAULT_LEAD_DAYS } from "../src/documents/expiry-defaults";
import { daysBetween, expiryAlerts } from "../src/documents/expiry";

const TODAY = "2026-11-26";
const item = (expiryDate: string | null, name = "A", id = "d1") => ({
  documentId: id, employeeId: "e1", employeeName: name,
  type: "passport" as const, expiryDate });
const one = (expiry: string | null) =>
  expiryAlerts([item(expiry)], DEFAULT_LEAD_DAYS, TODAY);

describe("expiry alerts", () => {
  it("counts calendar days", () => {
    expect(daysBetween("2026-11-26", "2026-12-01")).toBe(5);
    expect(daysBetween("2026-12-01", "2026-11-26")).toBe(-5);
    expect(daysBetween("2024-02-28", "2024-03-01")).toBe(2);
  });
  it("defaults are 60, 30 and 7 days for every type", () => {
    for (const v of Object.values(DEFAULT_LEAD_DAYS)) {
      expect(v).toEqual([60, 30, 7]);
    }
  });
  it("stages: today, expired, 30, 31 and the 60-day edge", () => {
    expect(one("2026-11-26")).toMatchObject([{ status: "due",
      daysLeft: 0, stageDays: 7 }]);
    expect(one("2026-11-25")).toMatchObject([{ status: "expired",
      daysLeft: -1, stageDays: null }]);
    expect(one("2026-12-26")).toMatchObject([{ daysLeft: 30,
      stageDays: 30 }]);
    expect(one("2026-12-27")).toMatchObject([{ stageDays: 60 }]);
    expect(one("2027-01-25")).toMatchObject([{ status: "due",
      daysLeft: 60 }]);
    expect(one("2027-01-26")).toEqual([]);
    expect(one(null)).toEqual([]);
  });
  it("withinDays keeps expired rows and drops later due rows", () => {
    const out = expiryAlerts([item("2026-11-25", "A", "d1"),
      item("2026-11-26", "B", "d2"), item("2026-12-20", "C", "d3")],
    DEFAULT_LEAD_DAYS, TODAY, 7);
    expect(out.map((a) => a.documentId)).toEqual(["d1", "d2"]);
  });
  it("orders by days left, then name, then id", () => {
    const out = expiryAlerts([item("2026-12-01", "Zed", "d1"),
      item("2026-12-01", "Amy", "d3"), item("2026-12-01", "Amy", "d2"),
      item("2026-11-30", "Max", "d4")], DEFAULT_LEAD_DAYS, TODAY);
    expect(out.map((a) => a.documentId)).toEqual(["d4", "d2", "d3", "d1"]);
  });
});
