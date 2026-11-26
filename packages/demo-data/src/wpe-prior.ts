import { daysBetween } from "@payroll/engine";
import { AS_OF } from "./calendar";
import { departmentText, jobTitleText, shortDateText } from "./wp3";
import type { DemoCompany } from "./types";

/**
 * WPE prior-employment pay data (R25): a record, kept per recent
 * joiner, of what they were paid at the employer before. The demo
 * holds none and invents none: the screen lists the joiners of the
 * last twelve months and lets HR enter what the person's papers say.
 */

export interface PriorEmploymentRow {
  employeeId: string;
  name: string;
  jobText: string;
  departmentText: string;
  joined: string;
  tenureText: string;
}

export const PRIOR_USE_NOTE = "A record of what a new joiner was paid at " +
  "the employer before, from their own papers. It helps compare an offer " +
  "with earlier pay. It does not change pay, probation or gratuity.";

export const PRIOR_EVIDENCE: readonly { value: string; label: string }[] = [
  { value: "certificate", label: "Salary certificate from the employer" },
  { value: "payslip", label: "A recent payslip" },
  { value: "letter", label: "Letter of offer or contract" },
  { value: "stated", label: "Told to HR, no paper yet" },
];

/** Joiners of the last twelve months, newest first. */
export function priorEmploymentRows(c: DemoCompany): PriorEmploymentRow[] {
  return c.employees.filter((e) => e.leavingDate === null &&
    daysBetween(e.joiningDate, AS_OF) <= 365)
    .sort((a, b) => a.joiningDate < b.joiningDate ? 1 : -1)
    .map((e) => {
      const d = daysBetween(e.joiningDate, AS_OF);
      const months = Math.floor(d / 30);
      return { employeeId: e.id, name: e.fullName,
        jobText: jobTitleText(e.jobKey),
        departmentText: departmentText(e.departmentId),
        joined: shortDateText(e.joiningDate),
        tenureText: d < 31 ? `${d} ${d === 1 ? "day" : "days"} in the bank`
          : `${months} ${months === 1 ? "month" : "months"} in the bank` };
    });
}
