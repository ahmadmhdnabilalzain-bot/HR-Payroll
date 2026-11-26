import type {
  BankDetails,
  EmployeeCreate,
  SalaryComponent,
} from "@payroll/contract";
import type { Db } from "../db/db";
import type { HandlerDeps } from "../deps";
import { ApiError } from "../http/errors";
import { columnsOf, sealerFor, type EmployeeRow } from "./employees";

const COLUMNS = `number, full_name, full_name_ar, email, department_id,
  manager_id, job_title, nationality, worker_class, joining_date,
  last_working_date, labour_person_id_enc, emirates_id_enc`;

async function exists(tx: Db, table: string, companyId: string,
  id: string): Promise<boolean> {
  const rows = await tx.query(
    `SELECT 1 FROM ${table} WHERE company_id = $1 AND id = $2`,
    [companyId, id]);
  return rows.length > 0;
}

/** Department, manager and number checks, as API errors (not 500s). */
export async function checkEmployeeRefs(tx: Db, companyId: string,
  e: EmployeeCreate, selfId: string | null): Promise<void> {
  if (e.departmentId !== undefined &&
    !await exists(tx, "departments", companyId, e.departmentId)) {
    throw new ApiError("NOT_FOUND", "No such department",
      { fields: ["body.departmentId"] });
  }
  if (e.managerId !== undefined && (e.managerId === selfId ||
    !await exists(tx, "employees", companyId, e.managerId))) {
    throw new ApiError("NOT_FOUND", "No such manager",
      { fields: ["body.managerId"] });
  }
  const dup = await tx.query(
    `SELECT 1 FROM employees WHERE company_id = $1 AND number = $2
     AND id IS DISTINCT FROM $3`, [companyId, e.number, selfId]);
  if (dup.length > 0) throw new ApiError("EMPLOYEE_NUMBER_TAKEN");
}

export async function insertEmployee(tx: Db, deps: HandlerDeps,
  companyId: string, id: string, e: EmployeeCreate): Promise<void> {
  const s = await sealerFor(tx, deps, companyId);
  await tx.query(
    `INSERT INTO employees (id, company_id, ${COLUMNS}, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
       $15, $16)`,
    [id, companyId, ...columnsOf(s, id, e), deps.now().toISOString()]);
}

export async function updateEmployee(tx: Db, deps: HandlerDeps,
  companyId: string, id: string, e: EmployeeCreate): Promise<void> {
  const s = await sealerFor(tx, deps, companyId);
  await tx.query(
    `UPDATE employees SET (${COLUMNS}) = ($3, $4, $5, $6, $7, $8, $9, $10,
       $11, $12, $13, $14, $15) WHERE company_id = $1 AND id = $2`,
    [companyId, id, ...columnsOf(s, id, e)]);
}

/** Exactly one `basic` in bucket `fixed`; codes unique. */
export function checkSalary(components: SalaryComponent[]): void {
  const basics = components.filter((c) => c.code === "basic");
  if (basics.length > 1) throw new ApiError("DUPLICATE_COMPONENT");
  if (basics.length === 0 || basics[0]!.sifBucket !== "fixed") {
    throw new ApiError("BASIC_COMPONENT_REQUIRED");
  }
  if (new Set(components.map((c) => c.code)).size !== components.length) {
    throw new ApiError("DUPLICATE_COMPONENT");
  }
}

/** Saves the components sealed and returns the new salary version. */
export async function saveSalary(tx: Db, deps: HandlerDeps,
  companyId: string, id: string, cs: SalaryComponent[]): Promise<number> {
  const s = await sealerFor(tx, deps, companyId);
  const [r] = await tx.query<{ salary_version: number }>(
    `UPDATE employees SET salary_enc = $3,
       salary_version = salary_version + 1
     WHERE company_id = $1 AND id = $2 RETURNING salary_version`,
    [companyId, id, s.seal("salary_enc", id, JSON.stringify(cs))]);
  return r!.salary_version;
}

export async function saveBank(tx: Db, deps: HandlerDeps, companyId: string,
  id: string, b: BankDetails): Promise<void> {
  const s = await sealerFor(tx, deps, companyId);
  await tx.query(
    `UPDATE employees SET bank_routing = $3, iban_enc = $4, iban_last4 = $5
     WHERE company_id = $1 AND id = $2`,
    [companyId, id, b.routingCode, s.seal("iban_enc", id, b.iban),
      b.iban.slice(-4)]);
}

/** The create-shaped fields of a row, for merging a PATCH. */
export function asCreate(r: EmployeeRow): EmployeeCreate {
  const opt = <T>(v: T | null) => (v === null ? undefined : v);
  return JSON.parse(JSON.stringify({
    number: r.number, fullName: r.fullName, fullNameAr: opt(r.fullNameAr),
    email: opt(r.email), departmentId: opt(r.departmentId),
    managerId: opt(r.managerId), jobTitle: r.jobTitle,
    nationality: r.nationality, workerClass: r.workerClass,
    joiningDate: r.joiningDate, lastWorkingDate: opt(r.lastWorkingDate),
    labourPersonId: opt(r.labourPersonId),
    emiratesIdNumber: opt(r.emiratesIdNumber),
  })) as EmployeeCreate;
}
