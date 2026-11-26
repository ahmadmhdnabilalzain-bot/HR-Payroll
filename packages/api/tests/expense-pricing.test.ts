import type { ExpenseItemInput } from "@payroll/contract";
import { fils } from "@payroll/engine";
import { describe, expect, it } from "vitest";
import {
  limitFor,
  pickRate,
  priceItem,
  type LimitF,
  type PolicyF,
} from "../src/expenses/policy";

const CAT = "00000000-0000-4000-8000-000000000c01";
const policy: PolicyF = {
  version: 1, claimWindowDays: null, limits: [],
  mileageRates: [
    { code: "car", label: "Car", perKm: fils(75n),
      effectiveFrom: "2026-01-01" },
    { code: "car", label: "Car", perKm: fils(80n),
      effectiveFrom: "2026-07-01" }],
  perDiemRates: [{ code: "gcc", label: "GCC", labelAr: null,
    daily: fils(20000n), effectiveFrom: "2026-01-01" }],
};
const common = { categoryId: CAT, description: "trip", receiptIds: [] };
const mileage = (date: string): ExpenseItemInput => ({ ...common,
  kind: "mileage", date, distanceKm: 120, rateCode: "car" });

describe("priceItem", () => {
  it("mileage uses the latest rate in force on the date", () => {
    expect(priceItem(mileage("2026-06-30"), policy)).toEqual({ ok: true,
      amount: 9000n, vatAmount: 0n, rateApplied: 75n });
    expect(priceItem(mileage("2026-07-01"), policy)).toMatchObject({
      ok: true, amount: 9600n, rateApplied: 80n });
    expect(priceItem(mileage("2025-12-31"), policy)).toEqual({ ok: false,
      code: "RATE_NOT_FOUND" });
  });
  it("per diem is days times the daily rate, never with VAT", () => {
    expect(priceItem({ ...common, kind: "per-diem", date: "2026-03-01",
      days: 3, rateCode: "gcc" }, policy)).toEqual({ ok: true,
      amount: 60000n, vatAmount: 0n, rateApplied: 20000n });
    expect(priceItem({ ...common, kind: "per-diem", date: "2026-03-01",
      days: 3, rateCode: "eu" }, policy).ok).toBe(false);
  });
  it("a receipt item keeps its amounts", () => {
    expect(priceItem({ ...common, kind: "receipt", date: "2026-03-01",
      amount: "105.00", vatAmount: "5.00", supplierName: null,
      supplierTrn: null }, policy)).toEqual({ ok: true, amount: 10500n,
      vatAmount: 500n, rateApplied: null });
  });
  it("pickRate ignores other codes", () => {
    expect(pickRate(policy.mileageRates, "bike", "2026-08-01")).toBeNull();
  });
});

describe("limitFor", () => {
  const row = (role: LimitF["role"], max: bigint): LimitF => ({
    categoryId: CAT, role, perItemMax: fils(max), monthlyMax: null,
    receiptRequiredAbove: null, overLimit: "block" });
  const p = { ...policy, limits: [row(null, 100n), row("manager", 500n)] };
  it("a row for the role wins over the default row", () => {
    expect(limitFor(p, CAT, "manager")?.perItemMax).toBe(500n);
    expect(limitFor(p, CAT, "employee")?.perItemMax).toBe(100n);
    expect(limitFor(policy, CAT, "employee")).toBeNull();
  });
});
