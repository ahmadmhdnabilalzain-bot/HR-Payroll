import type { RosterDay, RosterSlot } from "@payroll/contract";
import type { Db } from "../db/db";
import { hhmm, templateSlot, type TemplateRow } from "./shifts";

export interface EntryRow {
  employee_id: string;
  date: string;
  draft_kind: "shift" | "rest" | null;
  draft_shift_template_id: string | null;
  published_kind: "shift" | "rest" | null;
  published_template_id: string | null;
  published_start_min: number | null;
  published_end_min: number | null;
  published_break_minutes: number | null;
  published_at: string | null;
  version: number;
  t_name: string | null;
  t_start: number | null;
  t_end: number | null;
  t_break: number | null;
  t_status: TemplateRow["status"] | null;
}

const SELECT = `SELECT r.*, t.name AS t_name, t.start_min AS t_start,
  t.end_min AS t_end, t.break_minutes AS t_break, t.status AS t_status
  FROM roster_entries r LEFT JOIN shift_templates t
  ON t.company_id = r.company_id AND t.id = r.draft_shift_template_id`;

/** Entries of `employeeIds` in [from, to], by employee and date. */
export async function readEntries(tx: Db, companyId: string,
  employeeIds: readonly string[], from: string, to: string, lock = false)
  : Promise<EntryRow[]> {
  return tx.query<EntryRow>(`${SELECT} WHERE r.company_id = $1
    AND r.employee_id = ANY($2::uuid[]) AND r.date BETWEEN $3 AND $4
    ORDER BY r.employee_id, r.date ${lock ? "FOR UPDATE OF r" : ""}`,
  [companyId, employeeIds, from, to]);
}

export function draftSlot(r: EntryRow): RosterSlot | null {
  if (r.draft_kind === null) return null;
  if (r.draft_kind === "rest") return { kind: "rest" };
  return templateSlot({ id: r.draft_shift_template_id!, name: r.t_name!,
    name_ar: null, start_min: r.t_start!, end_min: r.t_end!,
    break_minutes: r.t_break!, status: r.t_status! });
}

export function publishedSlot(r: EntryRow): RosterSlot | null {
  if (r.published_kind === null) return null;
  if (r.published_kind === "rest") return { kind: "rest" };
  const start = r.published_start_min!;
  const end = r.published_end_min!;
  const span = (end - start + 1440) % 1440;
  return { kind: "shift", shiftTemplateId: r.published_template_id!,
    start: hhmm(start), end: hhmm(end),
    breakMinutes: r.published_break_minutes!,
    netMinutes: span - r.published_break_minutes! };
}

export const sameSlot = (a: RosterSlot | null, b: RosterSlot | null) =>
  JSON.stringify(a) === JSON.stringify(b);

/** Draft and published differ, or the day was never published. */
export const changedSincePublish = (r: EntryRow) =>
  !sameSlot(draftSlot(r), publishedSlot(r)) ||
  (r.published_at === null && r.draft_kind !== null);

/** The working slot: the draft when set, else the published one. */
export const workingSlot = (r: EntryRow) =>
  r.draft_kind !== null ? draftSlot(r) : publishedSlot(r);

export function toRosterDay(r: EntryRow, showDraft: boolean): RosterDay {
  return { employeeId: r.employee_id, date: r.date,
    draft: showDraft ? draftSlot(r) : null, published: publishedSlot(r),
    publishedAt: r.published_at,
    changedSincePublish: showDraft ? changedSincePublish(r) : false,
    version: r.version };
}

/** The published slot of one day and its version (0 when no row). */
export async function publishedSlotOn(tx: Db, companyId: string,
  employeeId: string, date: string)
  : Promise<{ slot: RosterSlot | null; version: number }> {
  const [r] = await readEntries(tx, companyId, [employeeId], date, date);
  return r === undefined ? { slot: null, version: 0 }
    : { slot: publishedSlot(r), version: r.version };
}
