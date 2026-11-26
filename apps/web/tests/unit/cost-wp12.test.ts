import { describe, expect, it } from "vitest";
import { contractProblems } from "../../src/components/explain/types";
import { ALL_AREAS } from "../../src/nav/areas";
import { BLURB } from "../../src/reports/catalogue";
import { buildCostSource } from "../../src/reports/cost/source";

const BANNED = /\b(compliant|approved|certified|guaranteed)\b/i;
const src = buildCostSource();
const g = src.gratuity;

describe("gratuity provision data", () => {
  it("counts only paid rows and keeps the leaver out", () => {
    const sum = g.rows.reduce((n, r) => n + (r.amount ?? 0n), 0n);
    expect(g.total).toBe(sum);
    for (const s of g.settlement) {
      expect(g.rows.some((r) => r.employeeId === s.employeeId))
        .toBe(false);
    }
  });

  it("says why nothing is counted, never a silent AED 0.00", () => {
    for (const r of g.rows) {
      if (r.outcome === "not-applicable") {
        expect(r.display.amount).toBe("Not applicable (UAE national)");
      }
      if (r.outcome === "not-eligible") {
        expect(r.display.amount).toBe("Not yet eligible");
      }
      if (r.amount === null) expect(src.explain[r.employeeId])
        .toBeUndefined();
    }
  });

  it("each counted person opens a sound explanation", () => {
    for (const r of g.rows.filter((x) => x.amount !== null)) {
      const e = src.explain[r.employeeId]!;
      expect(contractProblems(e)).toEqual([]);
      expect(e.result.value).toEqual({ kind: "money", fils: r.amount });
    }
    expect(contractProblems(src.totalExplain)).toEqual([]);
  });

  it("departments add up to the total", () => {
    const sum = g.byDepartment.reduce((n, d) => n + d.amount, 0n);
    expect(sum).toBe(g.total);
  });
});

describe("employer cost data", () => {
  it("is labelled partial and says what is not computed", () => {
    const k = src.cost;
    expect(k.display.headline).toMatch(/partial/);
    expect(k.caveat).toMatch(/ILOE, insurance and other employer costs/);
    expect(k.rows.some((r) => r.employer.status === "not-computed"))
      .toBe(true);
    expect(k.partialTotal).toBe(k.gross + k.employerComputed);
  });
});

describe("registry and wording", () => {
  it("registers three live areas for HR and the GM", () => {
    const ids = ["pay.gratuity-provision", "reports.gratuity-liability",
      "reports.employer-cost"];
    for (const id of ids) {
      const a = ALL_AREAS.find((x) => x.id === id)!;
      expect(a.status).toBe("live");
      expect(a.roles).toEqual(["hr", "gm"]);
      expect(BLURB[id]).toBeTruthy();
    }
  });

  it("makes no claim the demo may not make", () => {
    const all = JSON.stringify([g.basis, src.cost.caveat, src.explain,
      src.totalExplain], (_k, v) => typeof v === "bigint" ? String(v) : v);
    expect(BANNED.test(all)).toBe(false);
  });
});
