import { describe, expect, it } from "vitest";
import { calculateNotice } from "../src/employment/notice";
import { EMPLOYMENT_PACKS } from "../src/rules/employment-pack";

const PACK = EMPLOYMENT_PACKS[0]!;

function codeOf(fn: () => unknown): string {
  try {
    fn();
  } catch (e) {
    return (e as { code: string }).code;
  }
  return "NONE";
}

const TABLE: Record<string, string> = {
  empProbationMaxMonths: "official",
  empProbationEmployerNoticeDays: "official",
  empProbationLeaveStateNoticeDays: "official",
  empProbationNewEmployerNoticeMonths: "official",
  empNoticeMinDays: "official",
  empNoticeMaxDays: "official",
  empNoticeReducibleByAgreement: "official",
  empJobSearchDayRight: "official",
  empSummaryDismissalNoticeDays: "convention",
  empWorkerExitWithoutNoticeDays: "convention",
  empSettlementDueDays: "official",
  empSettlementTrigger: "convention",
  empNoticeStartRule: "convention",
  empProbationEndRule: "convention",
};

describe("ae-employment pack", () => {
  it("pack_frozen", () => {
    expect(Object.isFrozen(PACK.params.empNoticeMinDays)).toBe(true);
    expect(Object.isFrozen(EMPLOYMENT_PACKS)).toBe(true);
  });
  it("official_params_cite_article", () => {
    const official = Object.entries(PACK.params)
      .filter(([, p]) => p.status === "official");
    expect(official.length).toBe(9);
    for (const [key, p] of official) {
      expect(p.source?.note, key).toMatch(/Article \d/);
      expect(p.source?.url.startsWith(
        "https://uaelegislation.gov.ae/en/legislations/"), key).toBe(true);
    }
  });
  it("statuses_match_table", () => {
    const actual = Object.fromEntries(Object.entries(PACK.params)
      .map(([k, p]) => [k, p.status]));
    expect(actual).toEqual(TABLE);
  });
  it("keys_prefixed", () => {
    for (const key of Object.keys(PACK.params)) {
      expect(key.startsWith("emp"), key).toBe(true);
    }
  });
  it("no_pack_before_2022", () => {
    const fn = () => calculateNotice({
      kind: "resignation", joiningDate: "2021-06-01",
      noticeGivenDate: "2022-02-01", probationEndDate: null,
      contractNoticeDays: 30, agreedNoticeDays: null,
    }, EMPLOYMENT_PACKS);
    expect(codeOf(fn)).toBe("NO_PACK_FOR_DATE");
  });
  it("covers dates from 2022-02-02 with no end", () => {
    expect(PACK.id).toBe("ae-employment");
    expect(PACK.version).toBe("2022-02-02");
    expect(PACK.effectiveFrom).toBe("2022-02-02");
    expect(PACK.effectiveTo).toBeNull();
  });
});
