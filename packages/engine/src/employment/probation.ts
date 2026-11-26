import { addDays, parseIsoDate } from "../dates";
import { EngineError } from "../errors";
import { fixedParam, intParam } from "../gratuity-params";
import { selectPack } from "../rules/select";
import type { ParamValue, RulePack } from "../rules/types";
import { TraceBuilder } from "../trace";
import type { Traced } from "../trace-types";
import { addMonthsClamped } from "./calendar";
import type { ProbationInput, ProbationResult } from "./types";

type Overrides = Record<string, ParamValue> | undefined;

function checkMonths(months: number, max: bigint): void {
  if (!Number.isSafeInteger(months) || months < 0) {
    throw new EngineError("INVALID_PROBATION_MONTHS",
      "probation months must be a whole number of at least 0",
      { value: String(months) });
  }
  if (BigInt(months) > max) {
    throw new EngineError("PROBATION_TOO_LONG",
      `probation may not exceed ${max} months`,
      { value: String(months), max: String(max) });
  }
}

function traceNone(t: TraceBuilder, input: ProbationInput): void {
  t.add({ id: "employment.probation.none", label: "No probation",
    formula: "probation months = 0",
    inputs: { joiningDate: input.joiningDate, probationMonths: "0" },
    result: "none", rules: [] });
}

function endDate(pack: RulePack, input: ProbationInput, ov: Overrides,
  t: TraceBuilder): string {
  const max = intParam(pack, "empProbationMaxMonths", ov, 0);
  const rule = fixedParam(pack, "empProbationEndRule", ov,
    "clamped-months-minus-1-day");
  checkMonths(input.probationMonths, max.v);
  const end = addDays(
    addMonthsClamped(input.joiningDate, input.probationMonths), -1);
  t.add({ id: "employment.probation.end", label: "Probation end date",
    formula: "joining date + months (clamped to month end) - 1 day",
    inputs: { joiningDate: input.joiningDate,
      probationMonths: String(input.probationMonths) },
    result: end, rules: [max.rule, rule.rule] });
  return end;
}

function deadline(pack: RulePack, joining: string, end: string,
  ov: Overrides, t: TraceBuilder): string {
  const days = intParam(pack, "empProbationEmployerNoticeDays", ov, 0);
  const start = fixedParam(pack, "empNoticeStartRule", ov,
    "day-after-notice");
  const latest = addDays(end, -Number(days.v));
  const result = latest < joining ? joining : latest;
  t.add({ id: "employment.probation.notice-deadline",
    label: "Last day for the employer's probation notice",
    formula: "max(joining date, probation end - notice days)",
    inputs: { joiningDate: joining, probationEndDate: end },
    result, rules: [days.rule, start.rule] });
  return result;
}

/** Probation end and the employer's last notice day (Article 9(1)). */
export function calculateProbation(
  input: ProbationInput,
  packs: readonly RulePack[],
  ov?: Record<string, ParamValue>,
): Traced<ProbationResult> {
  parseIsoDate(input.joiningDate, "joiningDate");
  const pack = selectPack(packs, input.joiningDate);
  const t = new TraceBuilder();
  if (input.probationMonths === 0) {
    traceNone(t, input);
    return { value: { probationEndDate: null,
      employerNoticeDeadline: null }, trace: t.lines() };
  }
  const end = endDate(pack, input, ov, t);
  const notice = deadline(pack, input.joiningDate, end, ov, t);
  return { value: { probationEndDate: end, employerNoticeDeadline: notice },
    trace: t.lines() };
}
