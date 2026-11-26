import { fils, type Fils } from "@payroll/engine";
import { describe, expect, it } from "vitest";
import {
  checkClaim,
  type CheckInput,
  type CheckItem,
} from "../src/expenses/check";
import type { LimitF } from "../src/expenses/policy";

const CAT = "cat-meals";
const item = (over: Partial<CheckItem> = {}, index = 0): CheckItem => ({
  index, categoryId: CAT, kind: "receipt", date: "2026-03-10",
  amount: fils(1000n), vatAmount: fils(0n), supplierTrn: null,
  receiptCount: 1, receiptHashes: [], justification: null,
  originalCurrency: null, priced: true, ...over });

function input(items: CheckItem[], limit: Partial<LimitF> | null = null,
  over: Partial<CheckInput> = {}): CheckInput {
  const l: LimitF | null = limit === null ? null : { categoryId: CAT,
    role: null, perItemMax: null, monthlyMax: null,
    receiptRequiredAbove: null, overLimit: "block", ...limit };
  return { items, role: "employee", today: "2026-03-20",
    joiningDate: "2025-01-01", claimWindowDays: 90,
    categories: new Map([[CAT, { kind: "receipt", active: true }]]),
    limits: () => l, monthToDate: new Map(),
    otherSignatures: new Set(), otherHashes: new Set(), ...over };
}
const f = (n: bigint): Fils => fils(n);

describe("checkClaim", () => {
  it("check_clean_claim", () => {
    expect(checkClaim(input([item()]))).toEqual({ problems: [], flags: [],
      overLimitIndexes: [] });
  });
  it("check_future_and_old", () => {
    const r = checkClaim(input([item({ date: "2026-03-21" }),
      item({ date: "2025-12-19" }, 1), item({ date: "2025-12-20" }, 2)]));
    expect(r.problems).toEqual(["items.0:EXPENSE_DATE_IN_FUTURE",
      "items.1:EXPENSE_TOO_OLD"]);
  });
  it("no window means no age limit", () => {
    const r = checkClaim(input([item({ date: "2025-02-01" })], null,
      { claimWindowDays: null }));
    expect(r.problems).toEqual([]);
  });
  it("check_before_joining", () => {
    const r = checkClaim(input([item({ date: "2024-12-31" })], null,
      { claimWindowDays: null }));
    expect(r.problems).toEqual(["items.0:EXPENSE_BEFORE_JOINING"]);
  });
  it("check_vat_over_amount", () => {
    expect(checkClaim(input([item({ vatAmount: f(1001n),
      supplierTrn: "100000000000003" })])).problems)
      .toEqual(["items.0:VAT_EXCEEDS_AMOUNT"]);
    expect(checkClaim(input([item({ vatAmount: f(1000n),
      supplierTrn: "100000000000003" })])).problems).toEqual([]);
  });
  it("check_receipt_required", () => {
    const lim = { receiptRequiredAbove: f(5000n) };
    expect(checkClaim(input([item({ amount: f(5000n), receiptCount: 0 })],
      lim)).problems).toEqual([]);
    expect(checkClaim(input([item({ amount: f(5001n), receiptCount: 0 })],
      lim)).problems).toEqual(["items.0:RECEIPT_REQUIRED"]);
  });
  it("check_block_limit", () => {
    const r = checkClaim(input([item({ amount: f(10001n) })],
      { perItemMax: f(10000n) }));
    expect(r.problems).toEqual(["items.0:EXPENSE_OVER_LIMIT"]);
    expect(r.flags).toEqual([]);
  });
  it("check_flag_limit_needs_justification", () => {
    const lim = { perItemMax: f(10000n), overLimit: "flag" as const };
    const r = checkClaim(input([item({ amount: f(10001n) })], lim));
    expect(r.flags).toEqual([{ code: "OVER_LIMIT", index: 0 }]);
    expect(r.problems).toEqual(["items.0:JUSTIFICATION_REQUIRED"]);
    const ok = checkClaim(input([item({ amount: f(10001n),
      justification: "client dinner, four guests" })], lim));
    expect(ok).toEqual({ problems: [], overLimitIndexes: [0],
      flags: [{ code: "OVER_LIMIT", index: 0 }] });
  });
  it("check_monthly_cumulative", () => {
    const r = checkClaim(input([item({ amount: f(6000n) }),
      item({ amount: f(6000n), date: "2026-03-11" }, 1),
      item({ amount: f(6000n), date: "2026-04-01" }, 2)],
    { monthlyMax: f(50000n) }, { today: "2026-04-02",
      monthToDate: new Map([[`${CAT}|2026-03`, f(40000n)]]) }));
    expect(r.problems).toEqual(["items.1:EXPENSE_OVER_LIMIT"]);
  });
  it("check_reports_all_problems", () => {
    const r = checkClaim(input([item({ date: "2026-04-01" }),
      item({ categoryId: "nope" }, 1),
      item({ vatAmount: f(2000n), supplierTrn: "100000000000003" }, 2)]));
    expect(r.problems).toEqual(["items.0:EXPENSE_DATE_IN_FUTURE",
      "items.1:CATEGORY_NOT_FOUND", "items.2:VAT_EXCEEDS_AMOUNT"]);
  });
  it("category state and rates", () => {
    const cats = new Map([[CAT, { kind: "receipt" as const,
      active: false }]]);
    const r = checkClaim(input([item({ kind: "mileage", priced: false })],
      null, { categories: cats }));
    expect(r.problems).toEqual(["items.0:CATEGORY_INACTIVE",
      "items.0:CATEGORY_KIND_MISMATCH", "items.0:RATE_NOT_FOUND"]);
  });
  it("check_flags", () => {
    const sig = `${CAT}|2026-03-10|1000`;
    const r = checkClaim(input([
      item({ receiptHashes: ["h1"] }), item({}, 1),
      item({ vatAmount: f(50n), date: "2026-03-12" }, 2),
      item({ originalCurrency: "USD", date: "2026-03-13" }, 3),
      item({ originalCurrency: "AED", date: "2026-03-14" }, 4)],
    null, { otherHashes: new Set(["h1"]) }));
    expect(r.flags).toEqual([
      { code: "DUPLICATE_RECEIPT", index: 0 },
      { code: "POSSIBLE_DUPLICATE", index: 1 },
      { code: "VAT_WITHOUT_TRN", index: 2 },
      { code: "FOREIGN_CURRENCY", index: 3 }]);
    const other = checkClaim(input([item()], null,
      { otherSignatures: new Set([sig]) }));
    expect(other.flags).toEqual([{ code: "POSSIBLE_DUPLICATE", index: 0 }]);
    const twice = checkClaim(input([item({ receiptHashes: ["h2"] }),
      item({ receiptHashes: ["h2"], date: "2026-03-11" }, 1)]));
    expect(twice.flags).toEqual([{ code: "DUPLICATE_RECEIPT", index: 1 }]);
  });
  it("check_empty", () => {
    expect(checkClaim(input([])).problems).toEqual(["claim:CLAIM_EMPTY"]);
  });
});
