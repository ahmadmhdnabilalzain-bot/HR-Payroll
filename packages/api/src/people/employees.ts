import type {
  EmployeeCreate,
  SalaryComponent,
  SifBucket,
  WorkerClass,
} from "@payroll/contract";
import type { Fils } from "@payroll/engine";
import type { Db } from "../db/db";
import { parseAed } from "../db/money";
import type { HandlerDeps } from "../deps";
import { ApiError } from "../http/errors";

export interface InternalComponent {
  code: string;
  label: string;
  labelAr: string | null;
  amount: Fils;
  sifBucket: SifBucket;
}

/** Decrypted, internal only. Serialise with `toEmployeeView`. */
export interface EmployeeRow {
  id: string;
  companyId: string;
  number: string;
  fullName: string;
  fullNameAr: string | null;
  email: string | null;
  departmentId: string | null;
  managerId: string | null;
  jobTitle: string;
  nationality: string;
  workerClass: WorkerClass;
  joiningDate: string;
  lastWorkingDate: string | null;
  labourPersonId: string | null;
  emiratesIdNumber: string | null;
  salary: InternalComponent[] | null;
  salaryVersion: number;
  bank: { routingCode: string; iban: string; ibanLast4: string } | null;
}

interface DbRow {
  id: string; company_id: string; number: string; full_name: string;
  full_name_ar: string | null; email: string | null;
  department_id: string | null; manager_id: string | null;
  job_title: string; nationality: string; worker_class: WorkerClass;
  joining_date: string; last_working_date: string | null;
  labour_person_id_enc: string | null; emirates_id_enc: string | null;
  salary_enc: string | null; salary_version: number;
  bank_routing: string | null; iban_enc: string | null;
  iban_last4: string | null;
}

export type Column = "salary_enc" | "iban_enc" | "labour_person_id_enc" |
  "emirates_id_enc" | "snapshot_enc" | "body_enc" | "text_enc" |
  "findings_enc" | "content";

/** The field crypto for one company: AAD binds company, column, row. */
export interface Sealer {
  seal(column: Column, rowId: string, plain: string | null): string | null;
  open(column: Column, rowId: string, cipher: string | null): string | null;
}

export async function sealerFor(tx: Db, deps: HandlerDeps,
  companyId: string, table = "employees"): Promise<Sealer> {
  const [c] = await tx.query<{ dek_wrapped: string }>(
    "SELECT dek_wrapped FROM companies WHERE id = $1", [companyId]);
  if (c === undefined) throw new ApiError("NOT_FOUND");
  const aad = (col: Column, id: string) =>
    `${companyId}:${table}:${col}:${id}`;
  return {
    seal: (col, id, plain) => plain === null ? null
      : deps.keyring.encrypt(c.dek_wrapped, aad(col, id), plain),
    open: (col, id, cipher) => cipher === null ? null
      : deps.keyring.decrypt(c.dek_wrapped, aad(col, id), cipher),
  };
}

function salaryFrom(text: string | null): InternalComponent[] | null {
  if (text === null) return null;
  return (JSON.parse(text) as SalaryComponent[]).map((c) => ({
    ...c, amount: parseAed(c.amount) }));
}

function fromDb(s: Sealer, r: DbRow): EmployeeRow {
  const iban = s.open("iban_enc", r.id, r.iban_enc);
  return {
    id: r.id, companyId: r.company_id, number: r.number,
    fullName: r.full_name, fullNameAr: r.full_name_ar, email: r.email,
    departmentId: r.department_id, managerId: r.manager_id,
    jobTitle: r.job_title, nationality: r.nationality,
    workerClass: r.worker_class, joiningDate: r.joining_date,
    lastWorkingDate: r.last_working_date,
    labourPersonId: s.open("labour_person_id_enc", r.id,
      r.labour_person_id_enc),
    emiratesIdNumber: s.open("emirates_id_enc", r.id, r.emirates_id_enc),
    salary: salaryFrom(s.open("salary_enc", r.id, r.salary_enc)),
    salaryVersion: r.salary_version,
    bank: iban === null || r.bank_routing === null ? null
      : { routingCode: r.bank_routing, iban, ibanLast4: r.iban_last4! },
  };
}

/** One employee of the company, decrypted; 404 when absent. */
export async function loadEmployee(tx: Db, deps: HandlerDeps,
  companyId: string, id: string): Promise<EmployeeRow> {
  const [r] = await tx.query<DbRow>(
    "SELECT * FROM employees WHERE company_id = $1 AND id = $2",
    [companyId, id]);
  if (r === undefined) throw new ApiError("NOT_FOUND");
  return fromDb(await sealerFor(tx, deps, companyId), r);
}

export async function listEmployees(tx: Db, deps: HandlerDeps,
  companyId: string): Promise<EmployeeRow[]> {
  const rows = await tx.query<DbRow>(
    "SELECT * FROM employees WHERE company_id = $1 ORDER BY number, id",
    [companyId]);
  const s = await sealerFor(tx, deps, companyId);
  return rows.map((r) => fromDb(s, r));
}

/** The writable clear and sealed columns of a create or merged update. */
export function columnsOf(s: Sealer, id: string,
  e: EmployeeCreate): unknown[] {
  return [e.number, e.fullName, e.fullNameAr ?? null, e.email ?? null,
    e.departmentId ?? null, e.managerId ?? null, e.jobTitle,
    e.nationality, e.workerClass, e.joiningDate,
    e.lastWorkingDate ?? null,
    s.seal("labour_person_id_enc", id, e.labourPersonId ?? null),
    s.seal("emirates_id_enc", id, e.emiratesIdNumber ?? null)];
}
