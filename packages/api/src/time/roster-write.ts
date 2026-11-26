import type { SlotInput } from "@payroll/contract";
import type { Tenant } from "../auth/guard";
import type { Db } from "../db/db";
import { ApiError } from "../http/errors";
import { changedSincePublish, readEntries } from "./rosters";
import { loadTemplate } from "./shifts";

interface EmpRef { id: string; manager_id: string | null;
  department_id: string | null }

export async function employeeRefs(tx: Db, companyId: string,
  ids: readonly string[]): Promise<EmpRef[]> {
  return tx.query<EmpRef>(
    `SELECT id, manager_id, department_id FROM employees
     WHERE company_id = $1 AND id = ANY($2::uuid[]) ORDER BY id`,
    [companyId, [...new Set(ids)]]);
}

/**
 * Owner and hr write anyone's roster; a manager only their direct
 * reports. Any other or unknown employee: 404 for the whole batch.
 */
export async function assertRosterWriter(tx: Db, t: Tenant,
  ids: readonly string[]): Promise<void> {
  const unique = [...new Set(ids)];
  const refs = await employeeRefs(tx, t.companyId, unique);
  if (refs.length !== unique.length) throw new ApiError("NOT_FOUND");
  if (t.role !== "manager") return;
  const ok = refs.every((r) => t.employeeId !== null &&
    r.manager_id === t.employeeId);
  if (!ok) throw new ApiError("NOT_FOUND");
}

/** The template must be active for a new entry (422 SHIFT_RETIRED). */
async function checkSlot(tx: Db, companyId: string, slot: SlotInput |
  null, seen: Set<string>) {
  if (slot === null || slot.kind === "rest") return;
  if (seen.has(slot.shiftTemplateId)) return;
  const tpl = await loadTemplate(tx, companyId, slot.shiftTemplateId);
  if (tpl.status !== "active") throw new ApiError("SHIFT_RETIRED");
  seen.add(tpl.id);
}

export interface DraftEntry { employeeId: string; date: string;
  slot: SlotInput | null }

/** Writes drafts; the published copy never changes here. */
export async function writeDrafts(tx: Db, companyId: string,
  entries: readonly DraftEntry[]): Promise<void> {
  const seen = new Set<string>();
  for (const e of entries) await checkSlot(tx, companyId, e.slot, seen);
  for (const e of entries) {
    const tpl = e.slot?.kind === "shift" ? e.slot.shiftTemplateId : null;
    await tx.query(
      `INSERT INTO roster_entries (company_id, employee_id, date,
         draft_kind, draft_shift_template_id) VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (company_id, employee_id, date) DO UPDATE
       SET draft_kind = $4, draft_shift_template_id = $5`,
      [companyId, e.employeeId, e.date, e.slot?.kind ?? null, tpl]);
  }
}

/**
 * Copies each changed draft to the published snapshot, stamps the
 * time and raises the version. Unchanged days are left alone, so a
 * re-publish does not void pending swaps.
 */
export async function publishDrafts(tx: Db, companyId: string,
  employeeIds: readonly string[], from: string, to: string, at: string)
  : Promise<number> {
  const rows = (await readEntries(tx, companyId, employeeIds, from, to,
    true)).filter(changedSincePublish);
  for (const r of rows) {
    await tx.query(
      `UPDATE roster_entries r SET published_kind = r.draft_kind,
         published_template_id = r.draft_shift_template_id,
         published_start_min = t.start_min, published_end_min = t.end_min,
         published_break_minutes = t.break_minutes, published_at = $4,
         version = r.version + 1
       FROM (SELECT 1) one LEFT JOIN shift_templates t
         ON t.company_id = $1 AND t.id = $5
       WHERE r.company_id = $1 AND r.employee_id = $2 AND r.date = $3`,
      [companyId, r.employee_id, r.date, at, r.draft_shift_template_id]);
  }
  return rows.length;
}
