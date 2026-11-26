import type { Fils } from "@payroll/engine";

/**
 * The People papers screens' view of the demo company (letters, staff
 * requests, visa cases, warnings, nationality headcount), built in
 * papers.ts (imported only by the adapter). Dates stay ISO for logic;
 * screens format them. The `base` status is the package's; the demo's
 * own decisions sit in the store (papers-state.ts).
 */
export type LetterKind = "salary-certificate" | "noc" | "experience";
export type LetterBase = "issued" | "pending" | "draft";

export interface PaperLetter {
  id: string;
  kind: LetterKind;
  employeeId: string;
  requestedOn: string;
  base: LetterBase;
  purpose: string;
  addressee: string;
  /** The fictional bank's reference, already masked. */
  reference: string;
  /** Basic plus allowances as in the contract; salary certificates. */
  monthlySalary: Fils | null;
}

export type RequestBase = "open" | "in-progress" | "done";

export interface PaperRequest {
  id: string;
  kind: string;
  title: string;
  employeeId: string;
  raisedOn: string;
  base: RequestBase;
  assignedToId: string;
  /** A letter id, or the package's next step ("enter-iban"), or null. */
  linksTo: string | null;
}

export interface PaperStage {
  label: string;
  date: string | null;
  done: boolean;
}

export type VisaBase = "in-progress" | "to-start" | "completed";

export interface PaperVisa {
  id: string;
  employeeId: string;
  kind: string;
  expiresOn: string | null;
  base: VisaBase;
  stages: PaperStage[];
  feesNote: string;
}

export interface PaperWarning {
  id: string;
  employeeId: string;
  level: string;
  reason: string;
  base: "draft" | "closed";
  issuedById: string;
  evidence: string[];
  deductionNote: string;
}

export interface NationalityCount {
  name: string;
  count: number;
}

export interface Nationalities {
  asOf: string;
  label: string;
  headcount: number;
  uaeNationals: number;
  rows: NationalityCount[];
}

export interface PapersData {
  asOf: string;
  letters(): PaperLetter[];
  requests(): PaperRequest[];
  visas(): PaperVisa[];
  warnings(): PaperWarning[];
  nationalities(): Nationalities;
  /** Contract salary (basic plus allowances, a sum) or null. */
  contractSalary(employeeId: string): Fils | null;
  /** The HR officer the queue is assigned to. */
  queueOwnerId: string;
}
