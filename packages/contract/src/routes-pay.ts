import { AuditEventPage, AuditEventQuery, AuditVerifyResult } from "./audit";
import { PayRunList, PayslipList } from "./lists";
import {
  PayRun,
  PayRunCreate,
  PayRunCreateHeaders,
  Payslip,
} from "./payroll";
import { IdParams } from "./primitives";
import {
  ALL_ROLES,
  OWNER,
  PAYROLL,
  ten,
  type RouteDef,
} from "./route-def";
import { SifFile, SifText } from "./sif";

const one = { params: IdParams };

const PAYSLIPS: readonly RouteDef[] = [
  ten(ALL_ROLES, { id: "listMyPayslips", method: "GET",
    path: "/v1/me/payslips", response: PayslipList }),
  ten(ALL_ROLES, { id: "getPayslip", method: "GET",
    path: "/v1/payslips/{id}", ...one, response: Payslip }),
];

const PAY_RUNS: readonly RouteDef[] = [
  ten(PAYROLL, { id: "createPayRun", method: "POST",
    path: "/v1/pay-runs", headers: PayRunCreateHeaders,
    body: PayRunCreate, response: PayRun, status: 201 }),
  ten(PAYROLL, { id: "listPayRuns", method: "GET", path: "/v1/pay-runs",
    response: PayRunList }),
  ten(PAYROLL, { id: "getPayRun", method: "GET",
    path: "/v1/pay-runs/{id}", ...one, response: PayRun }),
  ten(PAYROLL, { id: "listPayRunPayslips", method: "GET",
    path: "/v1/pay-runs/{id}/payslips", ...one, response: PayslipList }),
  ten(PAYROLL, { id: "voidPayRun", method: "POST",
    path: "/v1/pay-runs/{id}/void", ...one, response: PayRun }),
  ten(OWNER, { id: "approvePayRun", method: "POST",
    path: "/v1/pay-runs/{id}/approve", ...one, response: PayRun,
    mfa: true }),
];

const SIF_AND_AUDIT: readonly RouteDef[] = [
  ten(PAYROLL, { id: "generateSif", method: "POST",
    path: "/v1/pay-runs/{id}/sif", ...one, response: SifFile,
    status: 201 }),
  ten(PAYROLL, { id: "getSifFile", method: "GET",
    path: "/v1/sif-files/{id}", ...one, response: SifFile }),
  ten(PAYROLL, { id: "downloadSifFile", method: "GET",
    path: "/v1/sif-files/{id}/download", ...one, response: SifText,
    contentType: "text/plain", mfa: true }),
  ten(PAYROLL, { id: "listAuditEvents", method: "GET",
    path: "/v1/audit-events", query: AuditEventQuery,
    response: AuditEventPage }),
  ten(PAYROLL, { id: "verifyAuditChain", method: "GET",
    path: "/v1/audit-events/verify", response: AuditVerifyResult }),
];

export const PAY_ROUTES: readonly RouteDef[] = [
  ...PAYSLIPS,
  ...PAY_RUNS,
  ...SIF_AND_AUDIT,
];
