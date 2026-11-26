import type {
  BankDetails,
  EmployeeCreate,
  SalaryComponent,
} from "@payroll/contract";
import type { Db } from "../db/db";
import type { HandlerDeps } from "../deps";
import { ApiError } from "../http/errors";
import { sealerFor, type Sealer } from "./employees";

/** A write: create fields, where null clears an optional field. */
export type EmployeeWrite = {
  [K in keyof EmployeeCreate]?: EmployeeCreate[K] | null | undefined;
};

/** API field to column; sealed fields name their cipher column. */
const COLUMN: Record<keyof EmployeeCreate, [string, boolean]> = {
  number: ["number", false], fullName: ["full_name", false],
  fullNameAr: ["full_name_ar", false], email: ["email", false],
  departmentId: ["department_id", false], managerId: ["manager_id", false],
  jobTitle: ["job_title", false], nationality: ["nationality", false],
  workerClass: ["worker_class", false], joiningDate: ["joining_date", false],
  lastWorkingDate: ["last_working_date", false],
  labourPersonId: ["labour_person_id_enc", true],
  emiratesIdNumber: ["emirates_id_enc", true],
};

async function exists(tx: Db, table: string, companyId: string,
  id: string): Promise<boolean> {
  const rows = await tx.query(
    `SELECT 1 FROM ${table} WHERE company_id = $1 AND id = $2`,
    [companyId, id]);
  return rows.length > 0;
}

/** Department and number checks, as API errors (not 500s). */
export async function checkEmployeeRefs(tx: Db, companyId: string,
  e: EmployeeWrite, selfId: string | null): Promise<void> {
  if (typeof e.departmentId === "string" &&
    !await exists(tx, "departments", companyId, e.departmentId)) {
    throw new ApiError("NOT_FOUND", "No such department",
      { fields: ["body.departmentId"] });
  }
  if (typeof e.managerId === "string") {
    await checkManager(tx, companyId, e.managerId, selfId);
  }
  if (typeof e.number !== "string") return;
  const dup = await tx.query(
    `SELECT 1 FROM employees WHERE company_id = $1 AND number = $2
     AND id IS DISTINCT FROM $3`, [companyId, e.number, selfId]);
  if (dup.length > 0) throw new ApiError("EMPLOYEE_NUMBER_TAKEN");
}

/** The manager exists and is not the employee or below them. */
async function checkManager(tx: Db, companyId: string, managerId: string,
  selfId: string | null): Promise<void> {
  if (!await exists(tx, "employees", companyId, managerId)) {
    throw new ApiError("NOT_FOUND", "No such manager",
      { fields: ["body.managerId"] });
  }
  if (selfId === null) return;
  if (managerId === selfId) throw new ApiError("MANAGER_CYCLE");
  // Walk up from the new manager; meeting the employee is a cycle.
  const chain = await tx.query<{ id: string }>(
    `WITH RECURSIVE up(id, manager_id, depth) AS (
       SELECT id, manager_id, 0 FROM employees
       WHERE company_id = $1 AND id = $2
       UNION ALL
       SELECT e.id, e.manager_id, up.depth + 1 FROM employees e
       JOIN up ON e.id = up.manager_id AND e.company_id = $1
       WHERE up.depth < 1000)
     SELECT id FROM up WHERE id = $3`, [companyId, managerId, selfId]);
  if (chain.length > 0) throw new ApiError("MANAGER_CYCLE");
}

function valueFor(s: Sealer, id: string, k: keyof EmployeeCreate,
  v: unknown): unknown {
  const [, sealed] = COLUMN[k];
  if (v === null || v === undefined) return null;
  return sealed ? s.seal(COLUMN[k][0] as "labour_person_id_enc", id,
    String(v)) : v;
}

export async function insertEmployee(tx: Db, deps: HandlerDeps,
  companyId: string, id: string, e: EmployeeCreate): Promise<void> {
  const s = await sealerFor(tx, deps, companyId);
  const keys = Object.keys(COLUMN) as (keyof EmployeeCreate)[];
  const cols = keys.map((k) => COLUMN[k][0]);
  const vals = keys.map((k) => valueFor(s, id, k, e[k]));
  const marks = vals.map((_, i) => `$${i + 3}`);
  await tx.query(
    `INSERT INTO employees (id, company_id, ${cols.join(", ")}, created_at)
     VALUES ($1, $2, ${marks.join(", ")}, $${vals.length + 3})`,
    [id, companyId, ...vals, deps.now().toISOString()]);
}

/** Writes only the fields present; null clears an optional field. */
export async function updateEmployee(tx: Db, deps: HandlerDeps,
  companyId: string, id: string, e: EmployeeWrite): Promise<void> {
  const keys = (Object.keys(e) as (keyof EmployeeCreate)[])
    .filter((k) => e[k] !== undefined && k in COLUMN);
  if (keys.length === 0) return;
  const s = await sealerFor(tx, deps, companyId);
  const sets = keys.map((k, i) => `${COLUMN[k][0]} = $${i + 3}`);
  await tx.query(
    `UPDATE employees SET ${sets.join(", ")}
     WHERE company_id = $1 AND id = $2`,
    [companyId, id, ...keys.map((k) => valueFor(s, id, k, e[k]))]);
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

/** The next version of a versioned field, with the row locked. */
async function nextVersion(tx: Db, companyId: string, id: string,
  column: "salary_version" | "bank_version"): Promise<number> {
  const [r] = await tx.query<Record<string, number>>(
    `SELECT ${column} AS v FROM employees WHERE company_id = $1
     AND id = $2 FOR UPDATE`, [companyId, id]);
  return Number(r!.v) + 1;
}

/** Saves the components sealed under the new version; returns it. */
export async function saveSalary(tx: Db, deps: HandlerDeps,
  companyId: string, id: string, cs: SalaryComponent[]): Promise<number> {
  const s = await sealerFor(tx, deps, companyId);
  const v = await nextVersion(tx, companyId, id, "salary_version");
  await tx.query(
    `UPDATE employees SET salary_enc = $3, salary_version = $4
     WHERE company_id = $1 AND id = $2`,
    [companyId, id, s.seal("salary_enc", id, JSON.stringify(cs), v), v]);
  return v;
}

/** Routing code and IBAN sealed together, under the new bank version. */
export async function saveBank(tx: Db, deps: HandlerDeps, companyId: string,
  id: string, b: BankDetails): Promise<number> {
  const s = await sealerFor(tx, deps, companyId);
  const v = await nextVersion(tx, companyId, id, "bank_version");
  const plain = JSON.stringify({ routingCode: b.routingCode, iban: b.iban });
  await tx.query(
    `UPDATE employees SET iban_enc = $3, bank_version = $4
     WHERE company_id = $1 AND id = $2`,
    [companyId, id, s.seal("iban_enc", id, plain, v), v]);
  return v;
}
