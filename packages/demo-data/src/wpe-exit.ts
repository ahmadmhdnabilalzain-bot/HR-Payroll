import { addDays, daysBetween } from "@payroll/engine";
import { AS_OF, SETTLEMENT_DUE_BASIS, SETTLEMENT_DUE_DAYS } from "./calendar";
import { plural } from "./display";
import { loans, finalSettlements } from "./pay";
import { LEAVE_BASIS } from "./settlement";
import type { DemoCompany } from "./types";
import {
  employmentEndView,
  jobTitleText,
  leaverChecklistView,
  shortDateText,
} from "./wp3";

/**
 * WPE exit flow (R34): one page per leaver that puts the resignation,
 * the people steps, the final settlement and the legal dates together,
 * with flags for what to check. FICTIONAL sample data. It adds no
 * figure: the settlement is the run's own (finalSettlements), the
 * steps are the leaver checklist's, and every legal sentence is worded
 * "as we read it". Nothing here says an authority has decided.
 */

export type ExitFlagWord = "Check" | "Note";

export interface ExitFlag {
  id: string;
  word: ExitFlagWord;
  title: string;
  text: string;
  /** Where the reading comes from, shown quietly under the flag. */
  basis: string | null;
}

export interface ExitFlow {
  employeeId: string;
  name: string;
  jobText: string;
  reason: string;
  lastDay: string;
  payBy: string;
  /** Whole days from the demo day to the pay-by day (negative: past). */
  daysToPay: number;
  noticeText: string;
  flags: ExitFlag[];
}

const flag = (id: string, word: ExitFlagWord, title: string, text: string,
  basis: string | null = null): ExitFlag => ({ id, word, title, text,
  basis });

/** The exit flow for each person with a leaver checklist. */
export function exitFlows(c: DemoCompany): ExitFlow[] {
  return finalSettlements(c).flatMap((s) => {
    const l = leaverChecklistView(c, s.employeeId);
    const e = c.employees.find((x) => x.id === s.employeeId);
    if (l === null || e === undefined) return [];
    const end = employmentEndView(c, s.employeeId);
    const payBy = addDays(s.lastDay, SETTLEMENT_DUE_DAYS);
    const days = daysBetween(AS_OF, payBy);
    const owed = loans(c).filter((x) => x.employeeId === e.id &&
      x.status !== "closed");
    const inRun = c.payRun.payslips.some((p) => p.employeeId === e.id);
    const flags: ExitFlag[] = [
      flag("pay-by", days <= 7 ? "Check" : "Note", "Pay all dues in time",
        `As we read it, the final dues are paid within ` +
        `${plural(SETTLEMENT_DUE_DAYS, "day", "days")} of the last day, ` +
        `so by ${shortDateText(payBy)}. ` + (days < 0
          ? `That was ${plural(-days, "day", "days")} ago.`
          : `That is ${plural(days, "day", "days")} from today.`),
        SETTLEMENT_DUE_BASIS),
      flag("not-worked-out", "Check", "Add what is not worked out",
        `The settlement so far has gratuity and unused leave. ` +
        `${s.notComputed.join(", ")} are not worked out here and must ` +
        "be added before it is paid."),
      flag("leave", "Note", "Unused leave is paid out",
        `${s.display.unusedLeave} of unused annual leave are in the ` +
        "settlement.", LEAVE_BASIS),
      ...(inRun ? [flag("run", "Note", "Salary to the last day",
        "Salary up to the last day is in the October pay run. The " +
        "settlement is paid on its own, outside the run and the salary " +
        "file.")] : []),
      ...(owed.length === 0 ? [] : [flag("loan", "Check",
        "A loan or advance is still open",
        `${owed.map((x) => x.display.name + " owes " +
          x.display.balance).join("; ")}. It may come out of the final ` +
        "dues, within the deduction limit.")]),
      ...(e.workerClass === "uae-national" ? [flag("pension", "Check",
        "Pension: Not computed", "Pension for UAE nationals: Not " +
        "computed. It is not in the settlement.")] : []),
    ];
    return [{ employeeId: e.id, name: e.fullName,
      jobText: jobTitleText(e.jobKey), reason: end?.reason ?? "",
      lastDay: shortDateText(s.lastDay), payBy: shortDateText(payBy),
      daysToPay: days, noticeText: end?.noticeText ?? "", flags }];
  });
}

export const exitFlowOf = (c: DemoCompany, employeeId: string)
  : ExitFlow | null => exitFlows(c).find((x) => x.employeeId ===
  employeeId) ?? null;
