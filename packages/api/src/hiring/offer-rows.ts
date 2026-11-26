import type {
  Offer,
  OfferStatus,
  Role,
  SalaryComponent,
  TraceLine,
} from "@payroll/contract";
import type { Db } from "../db/db";
import { parseAed, toMoney } from "../db/money";
import type { HandlerDeps } from "../deps";
import { ApiError } from "../http/errors";
import { sealerFor, type InternalComponent } from "../people/employees";

/** Decrypted, internal only. Serialise with `toOfferView`. */
export interface OfferRow {
  id: string;
  applicationId: string;
  candidateName: string;
  candidateEmail: string | null;
  hiringManagerUserId: string | null;
  requisitionId: string;
  jobTitle: string;
  departmentId: string | null;
  managerId: string | null;
  startDate: string;
  salary: InternalComponent[];
  probationMonths: number;
  probationEndDate: string | null;
  contractNoticeDays: number;
  termsTrace: TraceLine[];
  expiresOn: string | null;
  status: OfferStatus;
  createdBy: string;
  decidedBy: string | null;
  decidedAt: string | null;
  respondedOn: string | null;
  employeeId: string | null;
  createdAt: string;
}

interface DbRow {
  id: string; application_id: string; full_name: string;
  email: string | null; hiring_manager_user_id: string | null;
  requisition_id: string; job_title: string; department_id: string | null;
  manager_id: string | null; start_date: string; salary_enc: string;
  probation_months: number; probation_end_date: string | null;
  contract_notice_days: number; terms_trace: TraceLine[];
  expires_on: string | null; status: OfferStatus; created_by: string;
  decided_by: string | null; decided_at: string | null;
  responded_on: string | null; employee_id: string | null;
  created_at: string;
}

const SELECT = `SELECT o.*, c.full_name, c.email, r.hiring_manager_user_id,
    a.requisition_id
  FROM offers o
  JOIN applications a ON a.company_id = o.company_id
    AND a.id = o.application_id
  JOIN candidates c ON c.company_id = a.company_id
    AND c.id = a.candidate_id
  JOIN requisitions r ON r.company_id = a.company_id
    AND r.id = a.requisition_id
  WHERE o.company_id = $1`;

function salaryFrom(text: string): InternalComponent[] {
  return (JSON.parse(text) as SalaryComponent[]).map((c) => ({ ...c,
    amount: parseAed(c.amount) }));
}

function fromDb(r: DbRow, salaryText: string): OfferRow {
  return { id: r.id, applicationId: r.application_id,
    candidateName: r.full_name, candidateEmail: r.email,
    hiringManagerUserId: r.hiring_manager_user_id,
    requisitionId: r.requisition_id, jobTitle: r.job_title,
    departmentId: r.department_id, managerId: r.manager_id,
    startDate: r.start_date, salary: salaryFrom(salaryText),
    probationMonths: r.probation_months,
    probationEndDate: r.probation_end_date,
    contractNoticeDays: r.contract_notice_days,
    termsTrace: r.terms_trace, expiresOn: r.expires_on, status: r.status,
    createdBy: r.created_by, decidedBy: r.decided_by,
    decidedAt: r.decided_at, respondedOn: r.responded_on,
    employeeId: r.employee_id, createdAt: r.created_at };
}

async function decrypt(tx: Db, deps: HandlerDeps, companyId: string,
  rows: DbRow[]): Promise<OfferRow[]> {
  const s = await sealerFor(tx, deps, companyId, "offers");
  return rows.map((r) => fromDb(r, s.open("salary_enc", r.id,
    r.salary_enc)!));
}

/** One offer, decrypted (amounts in fils); 404 when absent. */
export async function loadOffer(tx: Db, deps: HandlerDeps,
  companyId: string, id: string, lock = false): Promise<OfferRow> {
  const rows = await tx.query<DbRow>(
    `${SELECT} AND o.id = $2${lock ? " FOR UPDATE OF o" : ""}`,
    [companyId, id]);
  if (rows[0] === undefined) throw new ApiError("NOT_FOUND");
  return (await decrypt(tx, deps, companyId, rows))[0]!;
}

export async function listOfferRows(tx: Db, deps: HandlerDeps,
  companyId: string): Promise<OfferRow[]> {
  const rows = await tx.query<DbRow>(
    `${SELECT} ORDER BY o.created_at DESC, o.id`, [companyId]);
  return decrypt(tx, deps, companyId, rows);
}

/** Owner and hr all; a manager the offers of requisitions they hire for. */
export function canSeeOffer(v: { role: Role; userId: string },
  o: OfferRow): boolean {
  return v.role === "owner" || v.role === "hr" ||
    o.hiringManagerUserId === v.userId;
}

/** The only serializer. Salary for owner and hr only. */
export function toOfferView(o: OfferRow, viewer: { role: Role }): Offer {
  const pay = viewer.role === "owner" || viewer.role === "hr";
  return { id: o.id, applicationId: o.applicationId,
    candidateName: o.candidateName, jobTitle: o.jobTitle,
    departmentId: o.departmentId, managerId: o.managerId,
    startDate: o.startDate,
    salary: pay ? o.salary.map((c) => ({ code: c.code, label: c.label,
      labelAr: c.labelAr, amount: toMoney(c.amount),
      sifBucket: c.sifBucket })) : null,
    probationMonths: o.probationMonths,
    probationEndDate: o.probationEndDate,
    contractNoticeDays: o.contractNoticeDays, termsTrace: o.termsTrace,
    expiresOn: o.expiresOn, status: o.status, createdBy: o.createdBy,
    decidedBy: o.decidedBy, decidedAt: o.decidedAt,
    respondedOn: o.respondedOn, employeeId: o.employeeId,
    createdAt: o.createdAt };
}
