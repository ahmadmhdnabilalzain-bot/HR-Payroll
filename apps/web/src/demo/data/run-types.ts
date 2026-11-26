import type { Fils } from "@payroll/engine";
import type { Explanation } from "../../components/explain/types";

/**
 * The pay run in detail, for the Pay run and Reports screens: per
 * person, against last month, the salary file line by line and the
 * explanations. Built in run-detail.ts (lazy, with the engine) from
 * the same company state as `useDemo().data`. English only: the
 * package's Arabic is not written yet, and Arabic stays hidden.
 */

export interface RunTotals {
  gross: Fils;
  deductions: Fils;
  net: Fils;
  employerCost: Fils;
  headcount: number;
}

/** One person on the run, with the change against last month. */
export interface PersonRow {
  id: string;
  name: string;
  department: string;
  gross: Fils;
  deductions: Fils;
  net: Fils;
  /** Last month's net, or null when the person was not paid then. */
  prevNet: Fils | null;
  /** This month minus last month (the whole net when new). */
  change: Fils;
  /** True when the change is large enough to say why. */
  significant: boolean;
  /** Why the pay moved, in plain words (empty when it did not). */
  reasons: string[];
  /** In the salary file, or held out (no IBAN). */
  inFile: boolean;
  /** UAE national: pension not computed (shown, never a silent 0). */
  national: boolean;
  /** Explanation id of this person's net pay. */
  explainId: string;
}

/** One line of the salary file, readable. */
export interface FileRecord {
  /** Line number in the file (every line counts). */
  line: number;
  name: string;
  /** "AE07 9990 …", grouped as on a bank letter. */
  account: string;
  days: number;
  fixed: Fils;
  variable: Fils;
  total: Fils;
  /** Unpaid leave days the file reports for the month. */
  leaveDays: number;
}

/** What the file check found, in plain words. */
export interface FileFinding {
  id: string;
  title: string;
  text: string;
  /** "issue" needs fixing; "note" is context only. */
  kind: "issue" | "note";
  person: string | null;
  line: number | null;
}

export interface SalaryFile {
  fileName: string;
  /** The paying bank (fictional), as named in the file summary. */
  bank: string;
  /** When the file was written, readable ("27 October 2026"). */
  dated: string;
  time: string;
  people: number;
  total: Fils;
  heldOut: number;
  lines: { total: number; salary: number; allowance: number;
    control: number };
  linesNote: string;
  records: FileRecord[];
  findings: FileFinding[];
  /** The file as the bank receives it. */
  text: string;
}

/** A person the month-on-month change is mostly about. */
export interface ChangeLine {
  personId: string;
  name: string;
  change: Fils;
  reason: string;
}

export interface NationalityRow {
  /** Country name in English ("United Arab Emirates"). */
  name: string;
  count: number;
}

export interface FileRegisterRow {
  fileName: string;
  month: string;
  people: number;
  total: Fils;
  dated: string;
  heldOut: number;
}

export interface RunDetail {
  /** `YYYY-MM` of this run and of the month compared with. */
  month: string;
  prevMonth: string;
  totals: RunTotals;
  prev: RunTotals;
  /** The largest changes against last month, biggest first. */
  changes: ChangeLine[];
  people: PersonRow[];
  file: SalaryFile;
  /** Explanation by id: "run:net", "person:emp-001", "gratuity:…". */
  explain: Record<string, Explanation>;
  /** Explanation ids for the side panel, in showing order. */
  featured: string[];
  /** The leaver's settlement, paid outside the run and the file. */
  settlements: { personId: string; name: string; total: Fils;
    explainId: string; lastDay: string }[];
  nationalities: { label: string; asOf: string; total: number;
    rows: NationalityRow[] };
  register: FileRegisterRow[];
  scope: string;
  pensionNote: string;
  /** When the run was prepared (the draft file's time). */
  preparedOn: string;
  preparedAt: string;
}

export interface RunSource {
  at(ibans: Readonly<Record<string, string>>): RunDetail;
}
