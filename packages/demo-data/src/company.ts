import { ROUTING_CODES } from "@payroll/wps";
import { buildAttendance, buildTimesheets } from "./attendance";
import { AS_OF } from "./calendar";
import { buildEmiratisation, buildGpssa } from "./compliance";
import { FAKE_EMPLOYER_ID } from "./fake-ids";
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
import { buildApprovals, buildDocuments, buildGoals } from "./workplace";

export const DEFAULT_SEED = 2026;

/**
 * The whole demo company from one seed: pure, no clock, network or
 * unseeded randomness. Every payslip, total, SIF line, balance and
 * report comes from the engine or packages/wps.
 */
export function buildDemoCompany(seed: number = DEFAULT_SEED)
  : DemoCompany {
  const rng = seededRng(seed);
  const employees = buildRoster(rng);
  const leaveRequests = buildLeaveRequests(employees, rng);
  const leaveBalances = buildLeaveBalances(employees, leaveRequests);
  const payRun = buildPayRun(employees, (id) =>
    unusedLeaveDays(leaveBalances, id));
  const company = { id: "co-demo", name: "Demo company",
    nameAr: "الشركة التجريبية", employerId: FAKE_EMPLOYER_ID,
    bankRoutingCode: ROUTING_CODES[0]!.code };
  const attendance = buildAttendance(employees, rng, leaveRequests);
  const documents = buildDocuments(employees, rng);
  return { seed, fake: true, company, asOf: AS_OF,
    departments: [...DEPARTMENTS], employees, payRun,
    sif: buildSif(company, employees, payRun),
    leaveTypes: [...LEAVE_TYPES], leaveRequests, leaveBalances,
    attendance, timesheets: buildTimesheets(attendance),
    approvals: buildApprovals(employees, leaveRequests, documents),
    emiratisation: buildEmiratisation(employees, payRun),
    gpssa: buildGpssa(employees, payRun), documents,
    goals: buildGoals(DEPARTMENTS, employees) };
}
