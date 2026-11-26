import { deepFreeze } from "../freeze";

/**
 * FTA Decision 17 of 2026 (unofficial English translation): the six
 * cases of Article 2 and the conditions of each. Texts are short
 * paraphrases, not quotes. `policy` marks a condition met only by a
 * documented policy; `computed` marks one the engine works out.
 */
export type EmployeeExpenseCase =
  | "transport"
  | "food-remote"
  | "accommodation"
  | "new-employee-accommodation"
  | "phone-internet"
  | "parking";

export type ConditionId =
  | "free-to-employee"
  | "contract-or-documented-policy"
  | "business-journeys-only"
  | "no-cash-alternative"
  | "remote-or-isolated-area"
  | "no-food-facilities-nearby"
  | "linked-to-work-or-residence-period"
  | "operational-not-benefit"
  | "near-site-required"
  | "employee-only-or-required-family"
  | "commensurate-no-recreation"
  | "within-max-days"
  | "commensurate-with-job"
  | "necessary-for-duties"
  | "personal-use-incidental"
  | "documented-internal-policy"
  | "monitoring-records-kept"
  | "business-purposes-only"
  | "documented-parking-policy"
  | "receipt-date-time-amount-tax";

export interface ConditionDef {
  id: ConditionId;
  text: string;
  policy: boolean;
  computed: boolean;
}

export interface CaseDef {
  case: EmployeeExpenseCase;
  sourceId: string;
  conditions: readonly ConditionDef[];
  needsDocumentedPolicy: boolean;
}

function c(id: ConditionId, text: string, policy = false,
  computed = false): ConditionDef {
  return { id, text, policy, computed };
}

/** Article 1: applies to every case. */
const ARTICLE_1: ConditionDef[] = [
  c("free-to-employee", "Provided to the employee for no charge"),
  c("contract-or-documented-policy",
    "Provided under a contractual obligation or a documented policy",
    true),
];

const NO_CASH = c("no-cash-alternative",
  "The employee cannot opt for a cash allowance or other " +
  "compensation instead");

const OWN: Record<EmployeeExpenseCase, ConditionDef[]> = {
  "transport": [
    c("business-journeys-only", "Only home to work, to client " +
      "premises or other direct job purposes; not personal travel"),
    NO_CASH,
  ],
  "food-remote": [
    c("remote-or-isolated-area",
      "The employee lives in a remote, distant or isolated area"),
    c("no-food-facilities-nearby",
      "No food preparation facilities or restaurants nearby"),
    c("linked-to-work-or-residence-period",
      "Linked to the work or residence period"),
    NO_CASH,
  ],
  "accommodation": [
    NO_CASH,
    c("operational-not-benefit", "Tied to operational needs and not " +
      "part of the employee's benefits or ordinary pay"),
    c("near-site-required", "The work needs the employee near the site"),
    c("employee-only-or-required-family", "For the employee only, or " +
      "family required to live permanently near the workplace"),
    c("commensurate-no-recreation", "In line with job needs, with no " +
      "significant recreational elements"),
  ],
  "new-employee-accommodation": [
    c("within-max-days", "Temporary, for no longer than the maximum " +
      "number of days", false, true),
    c("commensurate-with-job", "In line with the job requirements"),
  ],
  "phone-internet": [
    c("necessary-for-duties", "Necessary for the employee's job duties"),
    c("personal-use-incidental",
      "Used for work; any personal use is incidental and insignificant"),
    c("documented-internal-policy", "A documented internal policy " +
      "sets the scope and the consequences", true),
    c("monitoring-records-kept",
      "Reasonable monitoring is in place and records are kept"),
  ],
  "parking": [
    c("business-purposes-only",
      "The allocated space is used solely for business purposes"),
    c("documented-parking-policy", "A documented internal policy sets " +
      "when parking is reimbursed and how it is approved", true),
    c("receipt-date-time-amount-tax",
      "Proof is kept, such as a receipt with date, time, fee and tax"),
  ],
};

const ORDER: EmployeeExpenseCase[] = ["transport", "food-remote",
  "accommodation", "new-employee-accommodation", "phone-internet",
  "parking"];

export const EMPLOYEE_EXPENSE_CASES: readonly CaseDef[] = deepFreeze(
  ORDER.map((name, i) => ({
    case: name,
    sourceId: `FTA_DEC17_2026_ART2_${i + 1}`,
    conditions: [...ARTICLE_1, ...OWN[name]],
    needsDocumentedPolicy: name === "phone-internet" || name === "parking",
  })),
);
