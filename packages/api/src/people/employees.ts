import type {
  SalaryComponent,
  SifBucket,
  WorkerClass,
} from "@payroll/contract";
import type { Fils } from "@payroll/engine";
import type { Db } from "../db/db";
import { parseAed } from "../db/money";
import type { HandlerDeps } from "../deps";
import { ApiError } from "../http/errors";
import { viewerScope, type Viewer } from "./redact";

export interface InternalComponent {
  code: string;
  label: string;
  labelAr: string | null;
  amount: Fils;
  sifBucket: SifBucket;
}

/** A protected field, as named in `EmployeeView.unreadable`. */
export type Field = "salary" | "bank" | "labourPersonId" |
  "emiratesIdNumber";

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
  bankVersion: number;
  /** Protected fields whose cipher text failed to open (never values). */
  unreadable: Field[];
}

export interface DbRow {
  id: string; company_id: string; number: string; full_name: string;
  full_name_ar: string | null; email: string | null;
  department_id: string | null; manager_id: string | null;
  job_title: string; nationality: string; worker_class: WorkerClass;
  joining_date: string; last_working_date: string | null;
  labour_person_id_enc: string | null; emirates_id_enc: string | null;
  salary_enc: string | null; salary_version: number;
  iban_enc: string | null; bank_version: number;
}

export type Column = "salary_enc" | "iban_enc" | "labour_person_id_enc" |
  "emirates_id_enc" | "snapshot_enc" | "body_enc" | "text_enc" |
  "findings_enc" | "reason_enc" | "decision_note_enc";

/**
 * One company's field crypto (the data key is unwrapped once). AAD is
 * `<company>:<table>:<column>:<row>`, plus `:v<n>` for versioned
 * values (salary, bank), so an older cipher cannot be written back.
 */
export interface Sealer {
  seal(column: Column, rowId: string, plain: string | null,
    version?: number): string | null;
  open(column: Column, rowId: string, cipher: string | null,
    version?: number): string | null;
  mac(label: string, data: string): string;
}

export async function sealerFor(tx: Db, deps: HandlerDeps,
  companyId: string, table = "employees"): Promise<Sealer> {
  const [c] = await tx.query<{ dek_wrapped: string }>(
    "SELECT dek_wrapped FROM companies WHERE id = $1", [companyId]);
  if (c === undefined) throw new ApiError("NOT_FOUND");
  const key = deps.keyring.companyKey(c.dek_wrapped, companyId);
  const aad = (col: Column, id: string, v?: number) =>
    `${companyId}:${table}:${col}:${id}${v === undefined ? "" : `:v${v}`}`;
  return {
    seal: (col, id, plain, v) => plain === null ? null
      : key.encrypt(aad(col, id, v), plain),
    open: (col, id, cipher, v) => cipher === null ? null
      : key.decrypt(aad(col, id, v), cipher),
    mac: (label, data) => key.mac(label, data),
  };
}

/** Which protected fields to open for one row. */
export interface Want {
  money: boolean;
  ids: boolean;
}
export const ALL_FIELDS: Want = { money: true, ids: true };

/** owner/hr: all; the person: salary and bank; others: nothing. */
export function wantFor(v: Viewer | null, rowId: string): Want {
  if (v === null || v.role === "owner" || v.role === "hr") return ALL_FIELDS;
  const self = v.employeeId !== null && v.employeeId === rowId;
  return { money: self, ids: false };
}

const clear = (r: DbRow) => ({
  id: r.id, companyId: r.company_id, number: r.number,
  fullName: r.full_name, fullNameAr: r.full_name_ar, email: r.email,
  departmentId: r.department_id, managerId: r.manager_id,
  jobTitle: r.job_title, nationality: r.nationality,
  workerClass: r.worker_class, joiningDate: r.joining_date,
  lastWorkingDate: r.last_working_date, salaryVersion: r.salary_version,
  bankVersion: r.bank_version,
});

function salaryFrom(text: string | null): InternalComponent[] | null {
  if (text === null) return null;
  return (JSON.parse(text) as SalaryComponent[]).map((c) => ({
    ...c, amount: parseAed(c.amount) }));
}

function bankFrom(text: string | null): EmployeeRow["bank"] {
  if (text === null) return null;
  const b = JSON.parse(text) as { routingCode: string; iban: string };
  return { ...b, ibanLast4: b.iban.slice(-4) };
}

type Fail = (column: Column, rowId: string) => void;

/** Opens the wanted fields; a failure is recorded, never thrown. */
function fromDb(s: Sealer, r: DbRow, want: Want, fail: Fail): EmployeeRow {
  const unreadable: Field[] = [];
  const open = <T>(field: Field, col: Column, cipher: string | null,
    parse: (t: string | null) => T, v?: number): T | null => {
    try {
      return parse(s.open(col, r.id, cipher, v));
    } catch {
      unreadable.push(field);
      fail(col, r.id);
      return null;
    }
  };
  const str = (t: string | null) => t;
  return { ...clear(r),
    salary: want.money ? open("salary", "salary_enc", r.salary_enc,
      salaryFrom, r.salary_version) : null,
    bank: want.money ? open("bank", "iban_enc", r.iban_enc, bankFrom,
      r.bank_version) : null,
    labourPersonId: want.ids ? open("labourPersonId",
      "labour_person_id_enc", r.labour_person_id_enc, str) : null,
    emiratesIdNumber: want.ids ? open("emiratesIdNumber",
      "emirates_id_enc", r.emirates_id_enc, str) : null,
    unreadable };
}

const failLog = (deps: HandlerDeps): Fail => (column, rowId) =>
  deps.log({ event: "decrypt.failed", table: "employees", column, rowId });

/** The viewer's scope as SQL (owner/hr: all rows). */
function scopeSql(v: Viewer | null): { where: string; args: unknown[] } {
  const s = v === null ? { kind: "all" as const } : viewerScope(v);
  if (s.kind === "all") return { where: "", args: [] };
  if (s.kind === "reports") {
    return { where: " AND (id = $2 OR manager_id = $2)",
      args: [s.managerId] };
  }
  return { where: " AND id = $2", args: [s.employeeId] };
}

/**
 * Employees of the company the viewer may see (null viewer: internal,
 * every row and field), each opening only the fields the viewer may
 * see. A row that fails to decrypt is returned with `unreadable`.
 */
export async function listEmployees(tx: Db, deps: HandlerDeps,
  companyId: string, viewer: Viewer | null = null)
  : Promise<EmployeeRow[]> {
  const q = scopeSql(viewer);
  const rows = q.args[0] === null ? [] : await tx.query<DbRow>(
    `SELECT * FROM employees WHERE company_id = $1${q.where}
     ORDER BY number, id`, [companyId, ...q.args]);
  const s = await sealerFor(tx, deps, companyId);
  return rows.map((r) => fromDb(s, r, wantFor(viewer, r.id),
    failLog(deps)));
}

/** One employee, decrypted for the viewer; out of scope is 404. */
export async function loadEmployee(tx: Db, deps: HandlerDeps,
  companyId: string, id: string, viewer: Viewer | null = null)
  : Promise<EmployeeRow> {
  const q = scopeSql(viewer);
  const [r] = q.args[0] === null ? [] : await tx.query<DbRow>(
    `SELECT * FROM employees WHERE company_id = $1${q.where}
     AND id = $${q.args.length + 2}`, [companyId, ...q.args, id]);
  if (r === undefined) throw new ApiError("NOT_FOUND");
  return fromDb(await sealerFor(tx, deps, companyId), r,
    wantFor(viewer, r.id), failLog(deps));
}
