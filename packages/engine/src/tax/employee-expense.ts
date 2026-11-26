import { EngineError } from "../errors";
import { intParam } from "../gratuity-params";
import { EMPLOYEE_EXPENSE_VAT_PACKS } from "../rules/employee-expense-vat-pack";
import { selectPack } from "../rules/select";
import type { RulePack } from "../rules/types";
import { sourceOf } from "../sources";
import type { TraceLine, TraceRule, Traced } from "../trace-types";
import {
  EMPLOYEE_EXPENSE_CASES,
  type CaseDef,
  type ConditionId,
  type EmployeeExpenseCase,
} from "./employee-expense-defs";

export * from "./employee-expense-defs";

export interface EmployeeExpenseInput {
  case: EmployeeExpenseCase;
  expenseDate: string;
  attestations: Partial<Record<ConditionId, boolean | null>>;
  /**
   * new-employee-accommodation only: the length of the stay in
   * calendar days, counting both the first and the last day (arrival
   * 1 Nov and departure 1 Dec is 31 days, not 30 nights). The article
   * says only "no longer than 30 days"; counting inclusively is the
   * cautious reading, a convention, not a quoted rule.
   */
  stayDays?: number;
}

export type EmployeeExpenseOutcome =
  | "conditions-met"
  | "condition-not-met"
  | "not-assessed";

export interface EmployeeExpenseAssessment {
  case: EmployeeExpenseCase;
  outcome: EmployeeExpenseOutcome;
  met: ConditionId[];
  unmet: ConditionId[];
  unknown: ConditionId[];
  policyConditions: ConditionId[];
  packVersion: string | null;
  reason: string | null;
}

const NEW_EMPLOYEE = "new-employee-accommodation";
const MAX_DAYS = "within-max-days";

function caseDef(name: EmployeeExpenseCase): CaseDef {
  const def = EMPLOYEE_EXPENSE_CASES.find((d) => d.case === name);
  if (def === undefined) {
    throw new EngineError("UNKNOWN_CASE",
      `unknown employee-expense case ${String(name)}`,
      { case: String(name) });
  }
  return def;
}

/** Every attested key must be an attestable condition of the case. */
function checkAttestations(def: CaseDef, input: EmployeeExpenseInput) {
  for (const key of Object.keys(input.attestations)) {
    const cond = def.conditions.find((x) => x.id === key);
    if (cond === undefined || cond.computed) {
      throw new EngineError("UNKNOWN_CONDITION",
        `${key} is not an attestable condition of ${def.case}`,
        { case: def.case, condition: key });
    }
  }
}

function checkStayDays(def: CaseDef, stayDays: number | undefined) {
  if (stayDays === undefined) return;
  if (def.case !== NEW_EMPLOYEE) {
    throw new EngineError("INVALID_INPUT",
      `stayDays applies only to ${NEW_EMPLOYEE}`,
      { case: def.case, stayDays: String(stayDays) });
  }
  if (!Number.isSafeInteger(stayDays) || stayDays < 1) {
    throw new EngineError("INVALID_COUNT",
      "stayDays must be a whole number of at least 1",
      { stayDays: String(stayDays) });
  }
}

function notInForceReason(packs: readonly RulePack[], date: string) {
  const starts = packs.map((p) => p.effectiveFrom).sort();
  const first = starts[0];
  if (first !== undefined && date < first) {
    return `before ${first}: Decision 17 not in force`;
  }
  return `no Decision 17 rule pack covers ${date}`;
}

function trySelect(packs: readonly RulePack[], date: string) {
  try {
    return selectPack(packs, date);
  } catch (e) {
    if (e instanceof EngineError && e.code === "NO_PACK_FOR_DATE") {
      return null;
    }
    throw e;
  }
}

type Answers = Map<ConditionId, boolean | null>;

function answers(def: CaseDef, input: EmployeeExpenseInput,
  maxDays: bigint | null): Answers {
  const out: Answers = new Map();
  for (const cond of def.conditions) {
    if (cond.id === MAX_DAYS) {
      const days = input.stayDays;
      out.set(cond.id, days === undefined || maxDays === null ? null
        : BigInt(days) <= maxDays);
    } else {
      out.set(cond.id, input.attestations[cond.id] ?? null);
    }
  }
  return out;
}

function outcomeOf(def: CaseDef, given: Answers,
  packVersion: string): EmployeeExpenseAssessment {
  const ids = def.conditions.map((x) => x.id);
  const met = ids.filter((id) => given.get(id) === true);
  const unmet = ids.filter((id) => given.get(id) === false);
  const unknown = ids.filter((id) => given.get(id) === null);
  const outcome: EmployeeExpenseOutcome = unmet.length > 0
    ? "condition-not-met"
    : unknown.length > 0 ? "not-assessed" : "conditions-met";
  return { case: def.case, outcome, met, unmet, unknown,
    policyConditions: policyIds(def), packVersion, reason: null };
}

function policyIds(def: CaseDef): ConditionId[] {
  return def.conditions.filter((x) => x.policy).map((x) => x.id);
}

function traceLine(def: CaseDef, input: EmployeeExpenseInput,
  result: EmployeeExpenseAssessment, rules: TraceRule[]): TraceLine {
  return {
    id: "vat.employee-expense",
    label: `Employee expense conditions: ${sourceOf(def.sourceId).note}`,
    formula: "not met when any condition is false; not assessed when " +
      "any is unknown; else conditions met" +
      (def.case === NEW_EMPLOYEE
        ? "; within-max-days when stayDays <= max days" : ""),
    inputs: { case: def.case, expenseDate: input.expenseDate,
      stayDays: input.stayDays === undefined ? "not entered"
        : String(input.stayDays) },
    result: result.outcome,
    rules,
  };
}

/**
 * Decision 17 conditions for one employee expense. Shows which
 * conditions the company's attestations meet; it decides no input
 * tax and never changes a claimed amount.
 */
export function assessEmployeeExpense(
  input: EmployeeExpenseInput,
  packs: readonly RulePack[] = EMPLOYEE_EXPENSE_VAT_PACKS,
): Traced<EmployeeExpenseAssessment> {
  const def = caseDef(input.case);
  checkAttestations(def, input);
  checkStayDays(def, input.stayDays);
  const pack = trySelect(packs, input.expenseDate);
  if (pack === null) return notInForce(def, input, packs);
  const rules: TraceRule[] = [];
  let maxDays: bigint | null = null;
  if (def.case === NEW_EMPLOYEE) {
    const p = intParam(pack, "newEmployeeAccommodationMaxDays", {}, 1);
    maxDays = p.v;
    rules.push(p.rule);
  }
  const value = outcomeOf(def, answers(def, input, maxDays),
    pack.version);
  return { value, trace: [traceLine(def, input, value, rules)] };
}

function notInForce(def: CaseDef, input: EmployeeExpenseInput,
  packs: readonly RulePack[]): Traced<EmployeeExpenseAssessment> {
  const value: EmployeeExpenseAssessment = {
    case: def.case, outcome: "not-assessed", met: [], unmet: [],
    unknown: def.conditions.map((x) => x.id),
    policyConditions: policyIds(def), packVersion: null,
    reason: notInForceReason(packs, input.expenseDate),
  };
  return { value, trace: [traceLine(def, input, value, [])] };
}
