import { buildAttendance, buildTimesheets } from "./attendance";
import { AS_OF } from "./calendar";
import { buildNationalities } from "./compliance";
import { FAKE_EMPLOYER_ID, FAKE_ROUTING_CODE } from "./fake-ids";
import {
  buildLeaveBalances,
  buildLeaveRequests,
  LEAVE_TYPES,
  unusedLeaveDays,
} from "./leave";
import { buildPayRun } from "./payroll";
import { seededRng } from "./rng";
import { buildRoster, DEPARTMENTS } from "./roster";
import { buildSif } from "./sif";
import type { DemoCompany } from "./types";
import { buildApprovals, buildDocuments, buildExpenses } from "./workplace";

export const DEFAULT_SEED = 2026;

/** Shown with every figure's source. One place, so it can change. */
export const RULES_SCOPE = "mainland rules; free-zone status unconfirmed";

/** The FICTIONAL bank: invented name and codes; it pays its own staff. */
export const DEMO_BANK = { id: "co-demo-bank", name: "Zarqan Demo Bank",
  nameAr: "بنك زرقان التجريبي", fictional: true as const,
  emirate: "Abu Dhabi" as const, employerId: FAKE_EMPLOYER_ID,
  bankRoutingCode: FAKE_ROUTING_CODE };

/**
 * The whole demo bank from one seed: pure TypeScript for the browser,
 * no clock, network or unseeded randomness. Every payslip, total, SIF
 * line and balance comes from the engine or packages/wps.
 */
export function buildDemoCompany(seed: number = DEFAULT_SEED)
  : DemoCompany {
  const rng = seededRng(seed);
  const employees = buildRoster(rng);
  const leaveRequests = buildLeaveRequests(employees);
  const leaveBalances = buildLeaveBalances(employees, leaveRequests);
  const payRun = buildPayRun(employees, (id) =>
    unusedLeaveDays(leaveBalances, id));
  const company = { ...DEMO_BANK };
  const attendance = buildAttendance(employees, rng, leaveRequests);
  const expenses = buildExpenses();
  return { seed, fake: true, company, asOf: AS_OF,
    rulesScope: RULES_SCOPE, departments: [...DEPARTMENTS], employees,
    payRun, sif: buildSif(company, employees, payRun),
    leaveTypes: [...LEAVE_TYPES], leaveRequests, leaveBalances,
    attendance, timesheets: buildTimesheets(attendance), expenses,
    approvals: buildApprovals(employees, leaveRequests, expenses, payRun),
    documents: buildDocuments(employees),
    nationalities: buildNationalities(employees) };
}
