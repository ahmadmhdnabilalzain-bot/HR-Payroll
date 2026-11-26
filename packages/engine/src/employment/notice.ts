import { addDays, daysBetween, parseIsoDate } from "../dates";
import { EngineError } from "../errors";
import { boolParam, fixedParam, intParam } from "../gratuity-params";
import { selectPack } from "../rules/select";
import type { ParamValue, RulePack } from "../rules/types";
import { TraceBuilder } from "../trace";
import type { Traced, TraceRule } from "../trace-types";
import { addMonthsClamped } from "./calendar";
import {
  EXIT_KINDS,
  PROBATION_KINDS,
  type NoticeFlag,
  type NoticeInput,
  type NoticeResult,
} from "./types";

type Overrides = Record<string, ParamValue> | undefined;

interface Days {
  days: number;
  rules: TraceRule[];
}

function wholeDays(days: number, field: string): void {
  if (!Number.isSafeInteger(days) || days < 0) {
    throw new EngineError("INVALID_NOTICE_DAYS",
      `${field} must be a whole number of at least 0`,
      { field, value: String(days) });
  }
}

function checkContract(pack: RulePack, days: number, ov: Overrides): Days {
  wholeDays(days, "contractNoticeDays");
  const min = intParam(pack, "empNoticeMinDays", ov, 0);
  const max = intParam(pack, "empNoticeMaxDays", ov, 0);
  if (BigInt(days) < min.v || BigInt(days) > max.v) {
    throw new EngineError("NOTICE_OUT_OF_RANGE",
      `contract notice must be ${min.v} to ${max.v} days`,
      { value: String(days), min: String(min.v), max: String(max.v) });
  }
  return { days, rules: [min.rule, max.rule] };
}

/** A contract notice period checked against Article 43(1). */
export function validateContractNotice(
  days: number,
  onDate: string,
  packs: readonly RulePack[],
  ov?: Record<string, ParamValue>,
): Traced<number> {
  const pack = selectPack(packs, onDate);
  const r = checkContract(pack, days, ov);
  const t = new TraceBuilder();
  t.add({ id: "employment.notice.contract", label: "Contract notice",
    formula: "minimum <= contract notice days <= maximum",
    inputs: { contractNoticeDays: String(days), onDate },
    result: String(days), rules: r.rules });
  return { value: days, trace: t.lines() };
}

function addDueLine(pack: RulePack, last: string, ov: Overrides,
  t: TraceBuilder): string {
  const days = intParam(pack, "empSettlementDueDays", ov, 0);
  const trigger = fixedParam(pack, "empSettlementTrigger", ov,
    "last-working-date");
  const due = addDays(last, Number(days.v));
  t.add({ id: "employment.settlement.due", label: "Settlement due date",
    formula: "last working date + settlement days",
    inputs: { lastWorkingDate: last }, result: due,
    rules: [days.rule, trigger.rule] });
  return due;
}

/** Final settlement due date (Article 53), from the last working date. */
export function settlementDueDate(
  lastWorkingDate: string,
  packs: readonly RulePack[],
  ov?: Record<string, ParamValue>,
): Traced<string> {
  parseIsoDate(lastWorkingDate, "lastWorkingDate");
  const pack = selectPack(packs, lastWorkingDate);
  const t = new TraceBuilder();
  const due = addDueLine(pack, lastWorkingDate, ov, t);
  return { value: due, trace: t.lines() };
}

function checkKind(input: NoticeInput, inProbation: boolean): void {
  if (input.noticeGivenDate < input.joiningDate) {
    throw new EngineError("NOTICE_BEFORE_JOINING",
      "notice cannot be given before the joining date",
      { joiningDate: input.joiningDate,
        noticeGivenDate: input.noticeGivenDate });
  }
  const kind = input.kind;
  if (!EXIT_KINDS.includes(kind)) {
    throw new EngineError("UNKNOWN_EXIT_KIND", "unknown exit kind",
      { value: String(kind) });
  }
  if (PROBATION_KINDS.includes(kind) && !inProbation) {
    throw new EngineError("EXIT_KIND_NEEDS_PROBATION",
      `${kind} applies only during probation`, { kind });
  }
  const regular = kind === "resignation" || kind === "termination";
  if (regular && inProbation) {
    throw new EngineError("EXIT_KIND_IN_PROBATION",
      `${kind} is not available during probation`, { kind });
  }
}

function single(pack: RulePack, key: string, ov: Overrides): Days {
  const p = intParam(pack, key, ov, 0);
  return { days: Number(p.v), rules: [p.rule] };
}

function newEmployerDays(pack: RulePack, given: string,
  ov: Overrides): Days {
  const p = intParam(pack, "empProbationNewEmployerNoticeMonths", ov, 0);
  const last = addMonthsClamped(given, Number(p.v));
  return { days: daysBetween(given, last), rules: [p.rule] };
}

function baseDays(pack: RulePack, input: NoticeInput,
  ov: Overrides): Days {
  switch (input.kind) {
    case "resignation":
    case "termination":
      if (input.contractNoticeDays === null) {
        throw new EngineError("CONTRACT_NOTICE_REQUIRED",
          `${input.kind} needs the contract notice days`,
          { kind: input.kind });
      }
      return checkContract(pack, input.contractNoticeDays, ov);
    case "probation-employer-termination":
      return single(pack, "empProbationEmployerNoticeDays", ov);
    case "probation-leave-state":
      return single(pack, "empProbationLeaveStateNoticeDays", ov);
    case "probation-new-employer":
      return newEmployerDays(pack, input.noticeGivenDate, ov);
    case "summary-dismissal":
      return single(pack, "empSummaryDismissalNoticeDays", ov);
    case "worker-exit-without-notice":
      return single(pack, "empWorkerExitWithoutNoticeDays", ov);
  }
}

function applyAgreed(pack: RulePack, input: NoticeInput, base: Days,
  ov: Overrides): Days & { reduced: boolean } {
  const agreed = input.agreedNoticeDays;
  if (agreed === null) return { ...base, reduced: false };
  if (input.kind !== "resignation" && input.kind !== "termination") {
    throw new EngineError("AGREED_NOTICE_NOT_APPLICABLE",
      `an agreed notice does not apply to ${input.kind}`,
      { kind: input.kind });
  }
  wholeDays(agreed, "agreedNoticeDays");
  if (agreed > base.days) {
    throw new EngineError("AGREED_NOTICE_TOO_LONG",
      "agreed notice cannot exceed the base notice",
      { value: String(agreed), max: String(base.days) });
  }
  if (agreed === base.days) return { ...base, reduced: false };
  const rule = boolParam(pack, "empNoticeReducibleByAgreement", ov);
  if (!rule.v) {
    throw new EngineError("AGREED_NOTICE_NOT_APPLICABLE",
      "the pack does not allow a reduction by agreement",
      { kind: input.kind });
  }
  return { days: agreed, rules: [...base.rules, rule.rule],
    reduced: true };
}

function jobSearch(pack: RulePack, input: NoticeInput, days: number,
  ov: Overrides): TraceRule | null {
  if (input.kind !== "termination" || days === 0) return null;
  const rule = boolParam(pack, "empJobSearchDayRight", ov);
  return rule.v ? rule.rule : null;
}

function flagsOf(input: NoticeInput, reduced: boolean,
  search: TraceRule | null): NoticeFlag[] {
  const flags: NoticeFlag[] = [];
  if (reduced) flags.push("reduced-by-agreement");
  if (input.kind === "summary-dismissal" ||
    input.kind === "worker-exit-without-notice") {
    flags.push("counsel-review");
  }
  if (search !== null) flags.push("job-search-day");
  return flags;
}

function parseInput(input: NoticeInput): void {
  parseIsoDate(input.joiningDate, "joiningDate");
  parseIsoDate(input.noticeGivenDate, "noticeGivenDate");
  if (input.probationEndDate !== null) {
    parseIsoDate(input.probationEndDate, "probationEndDate");
  }
}

function addKindLine(t: TraceBuilder, input: NoticeInput,
  inProbation: boolean): void {
  t.add({ id: "employment.notice.kind", label: "Exit kind",
    formula: "in probation = notice date <= probation end date",
    inputs: { kind: input.kind, inProbation: String(inProbation) },
    result: input.kind, rules: [] });
}

function addLastLine(pack: RulePack, given: string, days: number,
  ov: Overrides, t: TraceBuilder): string {
  const start = fixedParam(pack, "empNoticeStartRule", ov,
    "day-after-notice");
  const last = addDays(given, days);
  t.add({ id: "employment.notice.last-day", label: "Last working date",
    formula: "notice date + notice days",
    inputs: { noticeGivenDate: given, noticeDays: String(days) },
    result: last, rules: [start.rule] });
  return last;
}

/** Notice days, last working date and settlement due date of an exit. */
export function calculateNotice(
  input: NoticeInput,
  packs: readonly RulePack[],
  ov?: Record<string, ParamValue>,
): Traced<NoticeResult> {
  parseInput(input);
  const pack = selectPack(packs, input.noticeGivenDate);
  const inProbation = input.probationEndDate !== null &&
    input.noticeGivenDate <= input.probationEndDate;
  checkKind(input, inProbation);
  const t = new TraceBuilder();
  addKindLine(t, input, inProbation);
  const r = applyAgreed(pack, input, baseDays(pack, input, ov), ov);
  const search = jobSearch(pack, input, r.days, ov);
  const rules = search === null ? r.rules : [...r.rules, search];
  t.add({ id: "employment.notice.days", label: "Notice days",
    formula: "base days for the kind, or the agreed shorter days",
    inputs: { kind: input.kind }, result: String(r.days), rules });
  const last = addLastLine(pack, input.noticeGivenDate, r.days, ov, t);
  const due = addDueLine(pack, last, ov, t);
  return { value: { kind: input.kind, inProbation, noticeDays: r.days,
    lastWorkingDate: last, settlementDueDate: due,
    flags: flagsOf(input, r.reduced, search) }, trace: t.lines() };
}
