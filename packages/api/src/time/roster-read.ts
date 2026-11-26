import type { RosterDay, RosterQuery } from "@payroll/contract";
import type { Tenant } from "../auth/guard";
import type { Db } from "../db/db";
import { assertRange } from "./range";
import { readEntries, toRosterDay } from "./rosters";

type View = "draft" | "published";

interface Emp { id: string; manager_id: string | null;
  department_id: string | null }

/**
 * Owner and hr: everyone with drafts. Manager: direct reports with
 * drafts, self and own department published only. Employee: self and
 * own department, published only (the draft is never shown).
 */
function viewOf(t: Tenant, me: Emp | undefined, e: Emp): View | null {
  if (t.role === "owner" || t.role === "hr") return "draft";
  if (t.role === "manager" && me !== undefined && e.manager_id === me.id) {
    return "draft";
  }
  if (me === undefined) return null;
  if (e.id === me.id) return "published";
  const sameDept = me.department_id !== null &&
    e.department_id === me.department_id;
  return sameDept ? "published" : null;
}

export async function readRoster(tx: Db, t: Tenant, q: RosterQuery)
  : Promise<RosterDay[]> {
  assertRange(q.from, q.to);
  const emps = await tx.query<Emp>(
    `SELECT id, manager_id, department_id FROM employees
     WHERE company_id = $1 AND ($2::uuid IS NULL OR id = $2)
     AND ($3::uuid IS NULL OR department_id = $3) ORDER BY id`,
    [t.companyId, q.employeeId ?? null, q.departmentId ?? null]);
  const [me] = t.employeeId === null ? [] : await tx.query<Emp>(
    "SELECT id, manager_id, department_id FROM employees WHERE " +
    "company_id = $1 AND id = $2", [t.companyId, t.employeeId]);
  const views = new Map<string, View>();
  for (const e of emps) {
    const v = viewOf(t, me, e);
    if (v !== null) views.set(e.id, v);
  }
  const rows = await readEntries(tx, t.companyId, [...views.keys()],
    q.from, q.to);
  return rows.map((r) => toRosterDay(r, views.get(r.employee_id) ===
    "draft")).sort((a, b) => a.date.localeCompare(b.date) ||
    a.employeeId.localeCompare(b.employeeId));
}
