import type { Fils } from "@payroll/engine";
import type { Explanation } from "../components/explain";

/**
 * WP6's view of the pay records (built in demo/data/pay.ts, a lazy
 * chunk). Money stays in fils so every amount goes through <Money/>
 * and "hide amounts"; dates are the data's display strings.
 */

export interface LedgerLine {
  month: string;
  taken: Fils;
  balance: Fils;
}

export type LoanStatus = "active" | "closed" | "starts";

export interface LoanView {
  ref: string;
  employeeId: string;
  name: string;
  kind: "loan" | "advance";
  status: LoanStatus;
  principal: Fils;
  instalment: Fils;
  balance: Fils;
  firstDeduction: string;
  note: string;
  ledger: LedgerLine[];
  /** The explanation of a capped instalment, when there is one. */
  explainId: string | null;
}

export interface RevisionView {
  id: string;
  employeeId: string;
  name: string;
  from: Fils;
  to: Fils;
  effective: string;
  entered: string;
  reason: string;
  /** Back pay for months paid on the old basic (0 when none). */
  arrears: Fils;
  note: string;
  explainId: string;
}

export interface CorrectionView {
  id: string;
  employeeId: string;
  name: string;
  month: string;
  reason: string;
  paidNet: Fils;
  correctNet: Fils;
  amount: Fils;
  payIn: string;
  explanation: Explanation;
}

export interface FineView {
  id: string;
  employeeId: string;
  name: string;
  date: string;
  amount: Fils;
  offence: string;
  /** Masked reference (a fake DEMO number). */
  number: string;
  numberNote: string;
  recoveryNote: string;
}

export interface SettlementView {
  employeeId: string;
  name: string;
  lastDay: string;
  due: string;
  unusedLeave: string;
  gratuity: Fils;
  leavePay: Fils;
  total: Fils;
  notComputed: string[];
  explainId: string;
  /** Why the settlement is due by that date (our reading). */
  dueExplanation: Explanation;
}

export interface RunSlip {
  employeeId: string;
  name: string;
  gross: Fils;
  deductions: Fils;
  net: Fils;
}

export interface RunChangeView {
  employeeId: string;
  name: string;
  change: bigint;
  reasons: string[];
}

export interface PastRunView {
  id: string;
  /** "june" ... "october": the route segment. */
  key: string;
  label: string;
  paidOn: string;
  /** False for October: prepared, not yet paid. */
  paid: boolean;
  headcount: number;
  gross: Fils;
  deductions: Fils;
  net: Fils;
  /** Net against the month before; null for the first month. */
  change: bigint | null;
  slips: RunSlip[];
  changes: RunChangeView[];
  explanation: Explanation;
  grossExplanation: Explanation;
  /** Null for the first month shown. */
  changeExplanation: Explanation | null;
}

export interface PayGroupView {
  id: string;
  label: string;
  names: string[];
  payday: string;
}

export interface PayElementView {
  code: string;
  label: string;
  type: "earning" | "deduction";
  howSet: string;
  salaryFile: string;
}

export interface PayPerson {
  id: string;
  name: string;
  basic: Fils;
}

export interface DeductionLine {
  id: string;
  month: string;
  employeeId: string;
  name: string;
  /** "Loan repayment LN-2041". */
  label: string;
  amount: Fils;
  /** The loan the line repays, when it is one ("LN-2041"). */
  ref: string | null;
}

export interface ExpenseView {
  id: string;
  employeeId: string;
  name: string;
  title: string;
  date: string;
  amount: Fils;
  vat: Fils;
  receipt: string;
  /** Decided before the demo (the package's own record). */
  settled: boolean;
}

export interface PayView {
  expenses: ExpenseView[];
  /** Every deduction line in the pay runs, June to October. */
  deductions: DeductionLine[];
  loans: LoanView[];
  revisions: RevisionView[];
  corrections: CorrectionView[];
  fines: FineView[];
  settlements: SettlementView[];
  runs: PastRunView[];
  groups: PayGroupView[];
  elements: PayElementView[];
  /** Everyone on this month's payroll, by name (for the forms). */
  people: PayPerson[];
  scope: string;
  /** "October 2026": the run being prepared, not yet paid. */
  thisRun: string;
  /** "November 2026": the next run, where corrections are paid. */
  nextRun: string;
  /** Months a new loan's first deduction can fall in. */
  firstMonths: string[];
}
