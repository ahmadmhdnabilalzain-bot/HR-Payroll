import { deepFreeze } from "../freeze";
import type { WorkerClass } from "../gratuity";

/** Listed on every payslip: no sourced rule or no input yet. */
export const NOT_COMPUTED: readonly string[] = deepFreeze([
  "personal income tax: n/a (no rule in the rule packs)",
  "ILOE unemployment insurance: not computed (no primary source read)",
  "end-of-service gratuity, notice pay and exit leave pay: see" +
    " calculateSettlement",
  "bonuses, commissions and benefits in kind: no input",
  "GPSSA reduction for unpaid leave (Decree-Law 33/2021 Art 33):" +
    " not computed",
  "GPSSA late-payment additions (Decree-Law 57/2023 Art 11(4)):" +
    " not computed",
  "144 working hours per 3 weeks (Art 19(1)): not checked",
  "Ramadan reduced hours (Executive Regulation Art 15(2)): not applied",
  "alimony and the ranking of court debts (Art 25(1)(g)): not" +
    " computed",
  "3-month limit on sanction deductions (Executive Regulation Art" +
    " 29(2)): not checked",
  "WPS 85% paid test (Resolution 340/2026, text unread): not checked",
  "other paid leave (parental, mourning, companion Art 30(4)):" +
    " treated as paid days",
  "GPSSA for government employers (Decree-Law 57/2023 Art 5(1)): the" +
    " private sector is assumed",
  "a mid-month salary change: one basic and one set of allowances per" +
    " month",
  "GPSSA exclusion of the unpaid maternity extension (Art 30(2)): not" +
    " computed",
  "two consecutive rest days worked at most (Art 19(5)): not checked",
  "a Cabinet decision changing or cancelling the 2.5% GPSSA support:" +
    " not read",
]);

const GPSSA_NOT_APPLICABLE = "GPSSA pension contributions: not " +
  "applicable, they cover UAE nationals only (Decree-Law 57/2023 Art 1)";

export function notApplicableFor(c: WorkerClass): string[] {
  return c === "uae-national" ? [] : [GPSSA_NOT_APPLICABLE];
}
