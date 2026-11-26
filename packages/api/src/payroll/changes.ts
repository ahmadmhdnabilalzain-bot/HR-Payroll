import { canonicalJson } from "../audit/canonical";
import type { Db } from "../db/db";
import type { HandlerDeps } from "../deps";
import type { RunSnapshot, SnapshotEmployee } from "./compute";
import { openSnapshot } from "./snapshot";

export type ChangedField = "new" | "salary" | "bank" | "labourPersonId";

/** Field names only: never amounts, IBANs or ids. */
export interface Change {
  employeeId: string;
  fields: ChangedField[];
}

function changedFields(a: SnapshotEmployee | undefined,
  b: SnapshotEmployee): ChangedField[] {
  if (a === undefined) return ["new"];
  const same = (x: unknown, y: unknown) =>
    canonicalJson(x) === canonicalJson(y);
  const out: ChangedField[] = [];
  if (!same(a.components, b.components)) out.push("salary");
  if (!same(a.bank, b.bank)) out.push("bank");
  if (a.labourPersonId !== b.labourPersonId) out.push("labourPersonId");
  return out;
}

/** Who is new, or whose salary, bank or labour id changed. */
export function diffSnapshots(prev: RunSnapshot | null,
  cur: RunSnapshot): Change[] {
  if (prev === null) return [];
  const before = new Map(prev.employees.map((e) => [e.employeeId, e]));
  return cur.employees.map((e) => ({ employeeId: e.employeeId,
    fields: changedFields(before.get(e.employeeId), e) }))
    .filter((c) => c.fields.length > 0);
}

/** The snapshot of the company's most recently approved run, if any. */
export async function lastApproved(tx: Db, deps: HandlerDeps,
  companyId: string): Promise<RunSnapshot | null> {
  const [r] = await tx.query<{ id: string; snapshot_enc: string }>(
    `SELECT id, snapshot_enc FROM pay_runs WHERE company_id = $1
     AND status = 'approved' ORDER BY approved_at DESC, id LIMIT 1`,
    [companyId]);
  if (r === undefined) return null;
  return openSnapshot(tx, deps, companyId, r.id, r.snapshot_enc);
}
