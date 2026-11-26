import { displayDate, plural } from "./display";
import type { DemoEmployee, DemoPayRun } from "./types";

/** Nationals on the run whose pension is not computed. */
export const nationalsOf = (run: DemoPayRun): number =>
  run.payslips.filter((s) => s.pension !== null).length;

/** Shown next to every net pay figure (headline, GM approval). */
export function netNoteOf(run: DemoPayRun): string {
  return "Net pay excludes pension for the " +
    `${plural(nationalsOf(run), "UAE national", "UAE nationals")}; ` +
    "to be set up once the fund is confirmed";
}

/** Shown next to the employer cost figure. */
export function employerCostNoteOf(run: DemoPayRun): string {
  return "Employer pension contributions for the " +
    `${plural(nationalsOf(run), "UAE national", "UAE nationals")} are ` +
    "not computed; to be set up once the fund is confirmed";
}

/**
 * "31 on the October payroll, 30 active on 27 October (1 left on 15
 * October)": the one headcount sentence, used wherever it is shown.
 */
export function headcountTextOf(employees: DemoEmployee[],
  run: DemoPayRun, asOf: string): string {
  const left = employees.filter((e) => e.leavingDate !== null &&
    e.leavingDate < asOf);
  const active = employees.filter((e) => e.joiningDate <= asOf &&
    (e.leavingDate === null || e.leavingDate >= asOf)).length;
  const gone = left.length === 0 ? "" : ` (${left.length} left on ` +
    `${left.map((e) => displayDate(e.leavingDate!)).join(", ")})`;
  return `${run.payslips.length} on the October payroll, ${active} ` +
    `active on ${displayDate(asOf)}${gone}`;
}
