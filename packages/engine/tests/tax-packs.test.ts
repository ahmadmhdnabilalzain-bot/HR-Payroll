import { describe, expect, it } from "vitest";
import {
  CT_PACKS,
  EINVOICING_PACKS,
  EMPLOYEE_EXPENSE_VAT_PACKS,
  packParamsView,
  requireParam,
  selectPack,
  sourceOf,
  VAT_PACKS,
  type ParamValue,
  type RulePack,
} from "../src/index";

type Row = [string, ParamValue | null, string, string | null];

const S = "secondary";
const C = "convention";
const O = "official";
const U = "unsourced";
const EC = "ENGINE_CONVENTION";
const GUIDE = "FTA_VAT_GUIDE21";

const VAT_ROWS: Row[] = [
  ["standardRateBps", 500, S, GUIDE],
  ["vatRounding", "HALF_UP", C, EC],
  ["vatMismatchToleranceFils", 1, C, EC],
  ["returnDueDaysAfterPeriodEnd", 28, S, GUIDE],
  ["returnDueRollsToNextBusinessDay", true, S, GUIDE],
  ["weekendDays", "SAT,SUN", C, EC],
  ["nilReturnRequired", true, S, GUIDE],
  ["errorCorrectionThresholdFils", 1000000, S, GUIDE],
  ["box201Layout", "guide-2021-v4.0", S, GUIDE],
  ["lateFilingFineFils", null, U, null],
  ["lateFilingRepeatFineFils", null, U, null],
  ["latePaymentFirstBps", null, U, null],
  ["latePaymentMonthlyBps", null, U, null],
  ["latePaymentCapBps", null, U, null],
];

const CT_ROWS: Row[] = [
  ["zeroBandUpperFils", 37500000, S, "FTA_CT_SB_BULLETIN"],
  ["zeroBandRateBps", 0, S, "RESEARCH_CT_ZERO_RATE"],
  ["mainRateBps", 900, S, "FTA_CT_SB_BULLETIN"],
  ["taxRounding", "HALF_UP", C, EC],
  ["sbrRevenueThresholdFils", 300000000, S, "FTA_CT_SBR_TOPIC"],
  ["sbrLastPeriodEnd", null, U, null],
  ["returnDueMonthsAfterPeriodEnd", 9, S, "FTA_CT_FILING_NEWS"],
  ["lateFilingFineFils", null, U, null],
];

const ART5 = "MD244_2025_ART5";
const CD = "CD106_2025";
const MOF = "MOF_EINV_GUIDELINES";

const EINV_ROWS: Row[] = [
  ["largeRevenueThresholdFils", 5000000000, O, ART5],
  ["largeAppointBy", "2026-10-30", O, "FTA_NEWS_2026_10_25"],
  ["largeGoLive", "2027-01-01", O, ART5],
  ["smallAppointBy", "2027-03-31", O, ART5],
  ["smallGoLive", "2027-07-01", O, ART5],
  ["voluntaryFrom", "2026-07-01", O, "MD244_2025_ART3_4"],
  ["b2cInScope", false, O, ART5],
  ["issueWindowBusinessDays", 14, S, "MD197_2026"],
  ["weekendDays", "SAT,SUN", C, EC],
  ["participantScheme", "0235", S, MOF],
  ["tinDigits", 10, S, MOF],
  ["notImplementedFinePerMonthFils", 500000, S, CD],
  ["missingInvoiceFineFils", 10000, S, CD],
  ["missingInvoiceMonthlyCapFils", 500000, S, CD],
  ["missingCreditNoteFineFils", 10000, S, CD],
  ["missingCreditNoteMonthlyCapFils", 500000, S, CD],
  ["ftaReportingDeadline", null, U, null],
];

const EMP_ROWS: Row[] = [
  ["newEmployeeAccommodationMaxDays", 30, O, "FTA_DEC17_2026_ART2_4"],
];

function codeOf(fn: () => unknown): string {
  try {
    fn();
  } catch (e) {
    return (e as { code: string }).code;
  }
  return "NONE";
}

function expectTable(packs: readonly RulePack[], rows: Row[]): void {
  expect(packs).toHaveLength(1);
  const pack = packs[0]!;
  expect(Object.keys(pack.params).sort())
    .toEqual(rows.map((r) => r[0]).sort());
  for (const [key, value, status, sourceId] of rows) {
    const p = pack.params[key]!;
    expect({ value: p.value, status: p.status }, key)
      .toEqual({ value, status });
    if (sourceId === null) expect(p.source, key).toBeNull();
    else expect(p.source, key).toBe(sourceOf(sourceId));
  }
}

const ALL = [VAT_PACKS, CT_PACKS, EINVOICING_PACKS,
  EMPLOYEE_EXPENSE_VAT_PACKS];

describe("tax packs", () => {
  it("vat_pack_table", () => {
    expectTable(VAT_PACKS, VAT_ROWS);
    expect(VAT_PACKS[0]).toMatchObject({ id: "ae-vat",
      version: "2026-11-26", effectiveFrom: "2018-01-01",
      effectiveTo: null });
  });
  it("ct_pack_table", () => {
    expectTable(CT_PACKS, CT_ROWS);
    expect(CT_PACKS[0]).toMatchObject({ id: "ae-ct",
      version: "2026-11-26", effectiveFrom: "2026-01-01",
      effectiveTo: null });
  });
  it("einvoicing_pack_table", () => {
    expectTable(EINVOICING_PACKS, EINV_ROWS);
    expect(EINVOICING_PACKS[0]).toMatchObject({ id: "ae-einvoicing",
      version: "2026-11-26", effectiveFrom: "2026-07-01",
      effectiveTo: null });
  });
  it("employee_expense_pack_table", () => {
    expectTable(EMPLOYEE_EXPENSE_VAT_PACKS, EMP_ROWS);
    expect(EMPLOYEE_EXPENSE_VAT_PACKS[0]).toMatchObject({
      id: "ae-vat-employee-expense", version: "2026-10-01",
      effectiveFrom: "2026-10-01", effectiveTo: null });
  });
  it("unsourced_params_are_null", () => {
    let seen = 0;
    for (const packs of ALL) {
      for (const [key, p] of Object.entries(packs[0]!.params)) {
        if (p.status !== "unsourced") continue;
        seen += 1;
        expect(p.value, key).toBeNull();
        expect(p.source, key).toBeNull();
      }
    }
    expect(seen).toBe(8);
    expect(codeOf(() => requireParam(VAT_PACKS[0]!,
      "lateFilingFineFils"))).toBe("UNSOURCED_PARAM");
  });
  it("weekend_days_agree", () => {
    expect(VAT_PACKS[0]!.params.weekendDays!.value)
      .toBe(EINVOICING_PACKS[0]!.params.weekendDays!.value);
  });
  it("packs_frozen", () => {
    for (const packs of ALL) {
      const pack = packs[0]!;
      expect(Object.isFrozen(pack)).toBe(true);
      expect(Object.isFrozen(Object.values(pack.params)[0])).toBe(true);
    }
  });
  it("selection_dates", () => {
    expect(codeOf(() => selectPack(VAT_PACKS, "2017-12-31")))
      .toBe("NO_PACK_FOR_DATE");
    expect(codeOf(() => selectPack(EMPLOYEE_EXPENSE_VAT_PACKS,
      "2026-09-30"))).toBe("NO_PACK_FOR_DATE");
    expect(selectPack(EMPLOYEE_EXPENSE_VAT_PACKS, "2026-10-01"))
      .toBe(EMPLOYEE_EXPENSE_VAT_PACKS[0]);
  });
  it("params_view", () => {
    const rows = packParamsView(VAT_PACKS, "2026-11-26");
    expect(rows).toHaveLength(14);
    expect(rows.map((r) => r.key))
      .toEqual(VAT_ROWS.map((r) => r[0]).sort());
    const rate = rows.find((r) => r.key === "standardRateBps")!;
    expect(rate).toMatchObject({ packId: "ae-vat",
      packVersion: "2026-11-26", value: "500", status: "secondary",
      sourceNote: sourceOf(GUIDE).note, sourceUrl: sourceOf(GUIDE).url });
    const fine = rows.find((r) => r.key === "lateFilingFineFils")!;
    expect(fine).toMatchObject({ value: null, status: "unsourced",
      sourceNote: null, sourceUrl: null });
    const flag = rows.find((r) => r.key === "nilReturnRequired")!;
    expect(flag.value).toBe("true");
  });
});

describe("tax source ids", () => {
  const IDS = ["FTA_VAT_GUIDE21", "FTA_DEC17_2026_ART1",
    "FTA_DEC17_2026_ART2_1", "FTA_DEC17_2026_ART2_2",
    "FTA_DEC17_2026_ART2_3", "FTA_DEC17_2026_ART2_4",
    "FTA_DEC17_2026_ART2_5", "FTA_DEC17_2026_ART2_6", "MD243_2025",
    "MD244_2025_ART5", "MD244_2025_ART3_4", "MD66_2026", "MD197_2026",
    "FTA_NEWS_2026_10_25", "FTA_EINV_FAQ", "MOF_EINV_GUIDELINES",
    "CD106_2025", "FTA_CT_SB_BULLETIN", "FTA_CT_SBR_TOPIC",
    "FTA_CT_FILING_NEWS"];
  it("every id has an https url with no spaces and a note", () => {
    for (const id of IDS) {
      const s = sourceOf(id);
      expect(s.url, id).toMatch(/^https:\/\/\S+$/);
      expect(s.note.length, id).toBeGreaterThan(10);
    }
  });
  it("notes say how each text was read", () => {
    expect(sourceOf("FTA_VAT_GUIDE21").note).toContain("possibly outdated");
    expect(sourceOf("FTA_DEC17_2026_ART2_4").note).toBe(
      "FTA Decision 17 of 2026, Article 2, case 4 " +
      "(unofficial translation)");
    expect(sourceOf("FTA_NEWS_2026_10_25").url).toBe("https://tax.gov.ae");
    expect(sourceOf("MD66_2026").note).toContain("unsigned");
    expect(sourceOf("MOF_EINV_GUIDELINES").note)
      .toContain("link serves V2.1");
  });
  it("the 0% band cites the note that shows 0%", () => {
    const s = sourceOf("RESEARCH_CT_ZERO_RATE");
    expect(s.url).toBe("");
    expect(s.note).toContain(
      "docs/research/2026-11-25-vat-corporate-tax-einvoicing.md");
    expect(s.note).toContain("0% on taxable income up to AED 375,000");
    expect(s.note).toContain("cut off");
  });
});
