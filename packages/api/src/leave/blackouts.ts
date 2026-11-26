import type {
  LeaveBlackout,
  LeaveBlackoutCreate,
  LeaveBlackoutUpdate,
} from "@payroll/contract";
import type { Db } from "../db/db";
import { ApiError } from "../http/errors";

interface Row { id: string; name: string; from_date: string;
  to_date: string; leave_type_ids: string[]; department_id: string | null;
  mode: LeaveBlackout["mode"]; status: LeaveBlackout["status"] }

const toBlackout = (r: Row): LeaveBlackout => ({ id: r.id, name: r.name,
  from: r.from_date, to: r.to_date, leaveTypeIds: r.leave_type_ids,
  departmentId: r.department_id, mode: r.mode, status: r.status });

export async function listBlackouts(tx: Db, companyId: string,
  year: number): Promise<LeaveBlackout[]> {
  const rows = await tx.query<Row>(
    `SELECT * FROM leave_blackouts WHERE company_id = $1
     AND extract(year FROM from_date) <= $2
     AND extract(year FROM to_date) >= $2 ORDER BY from_date, id`,
    [companyId, year]);
  return rows.map(toBlackout);
}

async function load(tx: Db, companyId: string, id: string) {
  const [r] = await tx.query<Row>("SELECT * FROM leave_blackouts WHERE " +
    "company_id = $1 AND id = $2 FOR UPDATE", [companyId, id]);
  if (r === undefined) throw new ApiError("NOT_FOUND");
  return r;
}

export async function createBlackout(tx: Db, companyId: string,
  id: string, b: LeaveBlackoutCreate): Promise<LeaveBlackout> {
  if (b.to < b.from) {
    throw new ApiError("VALIDATION_FAILED", "to is before from",
      { fields: ["body.to"] });
  }
  await tx.query(
    `INSERT INTO leave_blackouts (id, company_id, name, from_date, to_date,
       leave_type_ids, department_id, mode, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active')`,
    [id, companyId, b.name, b.from, b.to, [...new Set(b.leaveTypeIds)],
      b.departmentId, b.mode]);
  return toBlackout(await load(tx, companyId, id));
}

export async function updateBlackout(tx: Db, companyId: string,
  id: string, b: LeaveBlackoutUpdate): Promise<LeaveBlackout> {
  const r = await load(tx, companyId, id);
  await tx.query(`UPDATE leave_blackouts SET name = $3, mode = $4,
    status = $5 WHERE company_id = $1 AND id = $2`,
  [companyId, id, b.name ?? r.name, b.mode ?? r.mode,
    b.status ?? r.status]);
  return toBlackout(await load(tx, companyId, id));
}

/** Active blackouts for this type and department, with their dates. */
export async function blackoutHits(tx: Db, companyId: string,
  employeeId: string, leaveTypeId: string, dates: readonly string[])
  : Promise<{ mode: "block" | "warn"; dates: string[] }[]> {
  if (dates.length === 0) return [];
  const rows = await tx.query<Row>(
    `SELECT b.* FROM leave_blackouts b, employees e
     WHERE b.company_id = $1 AND e.company_id = $1 AND e.id = $2
       AND b.status = 'active'
       AND (cardinality(b.leave_type_ids) = 0
         OR $3::uuid = ANY(b.leave_type_ids))
       AND (b.department_id IS NULL OR b.department_id = e.department_id)
     ORDER BY b.from_date, b.id`, [companyId, employeeId, leaveTypeId]);
  return rows.map((r) => ({ mode: r.mode, dates: dates.filter((d) =>
    d >= r.from_date && d <= r.to_date) })).filter((h) => h.dates.length);
}
