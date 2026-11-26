import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  addDays,
  daysBetween,
  fromDayNumber,
  toDayNumber,
} from "../src/dates";
import {
  calculateNotice,
  settlementDueDate,
  validateContractNotice,
} from "../src/employment/notice";
import type { ExitKind, NoticeInput } from "../src/employment/types";
import { EMPLOYMENT_PACKS } from "../src/rules/employment-pack";

const P = EMPLOYMENT_PACKS;

function codeOf(fn: () => unknown): string {
  try {
    fn();
  } catch (e) {
    return (e as { code: string }).code;
  }
  return "NONE";
}

/** Base: joined 2024-01-01, probation end 2024-06-30, contract 30. */
function input(kind: ExitKind, given: string,
  patch: Partial<NoticeInput> = {}): NoticeInput {
  return { kind, joiningDate: "2024-01-01", noticeGivenDate: given,
    probationEndDate: "2024-06-30", contractNoticeDays: 30,
    agreedNoticeDays: null, ...patch };
}

const run = (kind: ExitKind, given: string,
  patch: Partial<NoticeInput> = {}, ov?: Record<string, number>) =>
  calculateNotice(input(kind, given, patch), P, ov);

const lineOf = (r: ReturnType<typeof run>, id: string) =>
  r.trace.find((l) => l.id === id)!;

describe("calculateNotice", () => {
  it("notice_resignation_contract_days", () => {
    const r = run("resignation", "2026-03-01");
    expect(r.value).toEqual({ kind: "resignation", inProbation: false,
      noticeDays: 30, lastWorkingDate: "2026-03-31",
      settlementDueDate: "2026-04-14", flags: [] });
    expect(r.trace.map((l) => l.id)).toEqual([
      "employment.notice.kind", "employment.notice.days",
      "employment.notice.last-day", "employment.settlement.due"]);
    expect(r.trace[0]!.inputs).toEqual({ kind: "resignation",
      inProbation: "false" });
  });
  it("notice_on_probation_last_day_is_probation", () => {
    expect(codeOf(() => run("resignation", "2024-06-30")))
      .toBe("EXIT_KIND_IN_PROBATION");
    const r = run("probation-employer-termination", "2024-06-30");
    expect(r.value.inProbation).toBe(true);
    expect(r.value.noticeDays).toBe(14);
    expect(r.value.lastWorkingDate).toBe("2024-07-14");
    expect(codeOf(() => run("probation-employer-termination",
      "2024-07-01"))).toBe("EXIT_KIND_NEEDS_PROBATION");
  });
  it("notice_new_employer_one_month", () => {
    const r = run("probation-new-employer", "2024-01-31");
    expect(r.value.lastWorkingDate).toBe("2024-02-29");
    expect(r.value.noticeDays).toBe(29);
    const rule = lineOf(r, "employment.notice.days").rules
      .find((x) => x.key === "empProbationNewEmployerNoticeMonths");
    expect(rule?.value).toBe("1");
  });
  it("notice_contract_out_of_range", () => {
    for (const days of [29, 91]) {
      expect(codeOf(() => run("resignation", "2026-03-01",
        { contractNoticeDays: days }))).toBe("NOTICE_OUT_OF_RANGE");
    }
    expect(run("resignation", "2026-03-01", { contractNoticeDays: 90 })
      .value.noticeDays).toBe(90);
    expect(codeOf(() => run("termination", "2026-03-01",
      { contractNoticeDays: null }))).toBe("CONTRACT_NOTICE_REQUIRED");
  });
  it("notice_agreed_reduction", () => {
    const r = run("resignation", "2026-03-01",
      { contractNoticeDays: 60, agreedNoticeDays: 10 });
    expect(r.value.noticeDays).toBe(10);
    expect(r.value.flags).toEqual(["reduced-by-agreement"]);
    expect(lineOf(r, "employment.notice.days").rules.map((x) => x.key))
      .toContain("empNoticeReducibleByAgreement");
    expect(codeOf(() => run("resignation", "2026-03-01",
      { contractNoticeDays: 60, agreedNoticeDays: 70 })))
      .toBe("AGREED_NOTICE_TOO_LONG");
    expect(codeOf(() => run("probation-leave-state", "2024-03-01",
      { agreedNoticeDays: 5 }))).toBe("AGREED_NOTICE_NOT_APPLICABLE");
    expect(codeOf(() => run("resignation", "2026-03-01",
      { agreedNoticeDays: 1.5 }))).toBe("INVALID_NOTICE_DAYS");
  });
  it("notice_termination_job_search_flag", () => {
    expect(run("termination", "2026-03-01").value.flags)
      .toContain("job-search-day");
    expect(run("resignation", "2026-03-01").value.flags)
      .not.toContain("job-search-day");
  });
  it("notice_without_notice_kinds", () => {
    for (const kind of ["summary-dismissal",
      "worker-exit-without-notice"] as const) {
      const r = run(kind, "2026-03-01");
      expect(r.value.noticeDays).toBe(0);
      expect(r.value.lastWorkingDate).toBe("2026-03-01");
      expect(r.value.flags).toEqual(["counsel-review"]);
      const rules = lineOf(r, "employment.notice.days").rules;
      expect(rules).toHaveLength(1);
      expect(rules[0]!.status).toBe("convention");
    }
  });
  it("notice_before_joining", () => {
    expect(codeOf(() => run("resignation", "2023-12-31")))
      .toBe("NOTICE_BEFORE_JOINING");
  });
  it("refuses an unknown exit kind", () => {
    expect(codeOf(() => run("retirement" as ExitKind, "2026-03-01")))
      .toBe("UNKNOWN_EXIT_KIND");
  });
  it("settlement_due_rules", () => {
    const r = run("resignation", "2026-03-01");
    const rules = lineOf(r, "employment.settlement.due").rules;
    expect(rules.find((x) => x.key === "empSettlementDueDays")?.status)
      .toBe("official");
    expect(rules.find((x) => x.key === "empSettlementTrigger")?.status)
      .toBe("convention");
    expect(settlementDueDate("2026-03-31", P).value).toBe("2026-04-14");
  });
  it("notice_override_min", () => {
    expect(codeOf(() => run("resignation", "2026-03-01", {},
      { empNoticeMinDays: 45 }))).toBe("NOTICE_OUT_OF_RANGE");
  });
  it("validateContractNotice traces and checks whole days", () => {
    const r = validateContractNotice(45, "2026-03-01", P);
    expect(r.value).toBe(45);
    expect(r.trace.map((l) => l.id)).toEqual(["employment.notice.contract"]);
    expect(codeOf(() => validateContractNotice(30.5, "2026-03-01", P)))
      .toBe("INVALID_NOTICE_DAYS");
  });
  it("notice_dates_consistent", () => {
    const lo = toDayNumber("2024-07-01");
    const hi = toDayNumber("2030-12-31");
    fc.assert(fc.property(
      fc.constantFrom<ExitKind>("resignation", "termination"),
      fc.integer({ min: 30, max: 90 }), fc.integer({ min: lo, max: hi }),
      (kind, days, day) => {
        const given = fromDayNumber(day);
        const v = run(kind, given, { contractNoticeDays: days }).value;
        expect(daysBetween(given, v.lastWorkingDate)).toBe(v.noticeDays);
        expect(v.settlementDueDate).toBe(addDays(v.lastWorkingDate, 14));
      }));
  });
});
