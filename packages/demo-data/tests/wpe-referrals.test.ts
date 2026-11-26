import { describe, expect, it } from "vitest";
import {
  AGENCY_FEE_BPS,
  agencyFeeOf,
  bonusOf,
  buildDemoCompany,
  referralLedger,
  referralSummary,
  stageOfHire,
  type DemoCompany,
} from "../src/index";
import { BANNED_WORDS, SEEDS, asText } from "./wpd-scan";

const each = (fn: (c: DemoCompany) => void) =>
  SEEDS.forEach((s) => fn(buildDemoCompany(s)));

describe("WPE referral and agency ledger (P22)", () => {
  it("lists the board's referral and agency candidates, same sources",
    () => each((c) => {
      const rows = referralLedger(c);
      const names = rows.map((r) => r.candidateName);
      for (const n of ["Daniel Okafor", "Layla Barakat",
        "Reem Al Blooshi", "Mona Elsayed"]) {
        expect(names).toContain(n);
      }
      const mona = rows.find((r) => r.candidateName === "Mona Elsayed")!;
      expect(mona.stage).toBe("closed");
      expect(mona.kind).toBe("agency");
      const daniel = rows.find((r) => r.candidateName === "Daniel Okafor")!;
      expect(daniel.stage).toBe("open");
      expect(daniel.payableFrom!.display).toBe("1 March 2027");
    }));

  it("the 90-day rule decides probation and payable", () => {
    expect(stageOfHire("2026-10-05", "2026-10-27"))
      .toEqual({ stage: "probation", daysIn: 22, left: 68 });
    expect(stageOfHire("2026-07-29", "2026-10-27").stage).toBe("payable");
    expect(stageOfHire("2026-07-29", "2026-10-26").stage)
      .toBe("probation");
  });

  it("hires are staff who joined from 2025; none is a board record", () =>
    each((c) => {
      const rows = referralLedger(c).filter((r) => r.employeeId !== null);
      expect(rows.length).toBeGreaterThan(0);
      for (const r of rows) {
        const e = c.employees.find((x) => x.id === r.employeeId)!;
        expect(e.joiningDate >= "2025-01-01").toBe(true);
        expect(e.cases).not.toContain("probation");
        expect(r.stage).toBe(stageOfHire(e.joiningDate).stage);
      }
    }));

  it("amounts follow the terms, from whole fils", () => each((c) => {
    for (const r of referralLedger(c)) {
      if (r.kind === "referral") {
        expect([250000n, 500000n]).toContain(r.amount);
      } else {
        expect(r.amount > 0n).toBe(true);
      }
    }
    expect(bonusOf(4)).toBe(250000n);
    expect(bonusOf(8)).toBe(500000n);
    expect(agencyFeeOf(1000000n)).toBe(
      BigInt(1000000 * 12 * AGENCY_FEE_BPS / 10000));
  }));

  it("a referral names a colleague who is not the hire", () => each((c) => {
    for (const r of referralLedger(c).filter((x) => x.kind === "referral")) {
      if (r.referrerId !== null) {
        expect(r.referrerId).not.toBe(r.employeeId);
        expect(c.employees.some((e) => e.id === r.referrerId)).toBe(true);
      }
    }
  }));

  it("totals: outstanding is ready plus marked; not-yet is separate",
    () => each((c) => {
      const rows = referralLedger(c);
      const none = referralSummary(rows, new Set());
      expect(none.marked).toBe(0n);
      expect(none.outstanding).toBe(none.ready);
      const first = rows.find((r) => r.stage === "payable")!;
      const some = referralSummary(rows, new Set([first.id]));
      expect(some.marked).toBe(first.amount);
      expect(some.outstanding).toBe(none.outstanding);
      expect(some.ready).toBe(none.ready - first.amount);
      expect(some.notYet).toBe(none.notYet);
      expect(some.markedCount).toBe(1);
    }));

  it("is deterministic, with no banned or raw-date wording", () =>
    each((c) => {
      const a = asText(referralLedger(c));
      expect(asText(referralLedger(c))).toBe(a);
      const words = asText(referralLedger(c).map((r) => ({ ...r,
        joinedOn: r.joinedOn?.display, payableFrom: r.payableFrom?.display })));
      expect(words).not.toMatch(BANNED_WORDS);
      expect(JSON.stringify(referralLedger(c).map((r) => [r.note,
        r.basisText, r.stageText, r.roleText]))).not
        .toMatch(/\b\d{4}-\d{2}-\d{2}\b/);
    }));
});
