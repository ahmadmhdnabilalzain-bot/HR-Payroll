import {
  shiftSpan,
  type RosterSlot,
  type ShiftTemplate,
  type ShiftTemplateCreate,
  type ShiftTemplateUpdate,
} from "@payroll/contract";
import { parseHhmm, type ShiftSlot } from "@payroll/engine";
import type { Db } from "../db/db";
import { ApiError } from "../http/errors";

export interface TemplateRow { id: string; name: string;
  name_ar: string | null; start_min: number; end_min: number;
  break_minutes: number; status: ShiftTemplate["status"] }

const pad = (n: number) => String(n).padStart(2, "0");
export const hhmm = (m: number): string =>
  `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;

export function toTemplate(r: TemplateRow): ShiftTemplate {
  const start = hhmm(r.start_min);
  const end = hhmm(r.end_min);
  return { id: r.id, name: r.name, nameAr: r.name_ar, start, end,
    breakMinutes: r.break_minutes, crossesMidnight: r.end_min < r.start_min,
    netMinutes: shiftSpan(start, end) - r.break_minutes, status: r.status };
}

/** The slot a template gives (its current times). */
export function templateSlot(r: TemplateRow): RosterSlot {
  const t = toTemplate(r);
  return { kind: "shift", shiftTemplateId: r.id, start: t.start, end: t.end,
    breakMinutes: t.breakMinutes, netMinutes: t.netMinutes };
}

/** A roster slot as the engine's minutes (end past 1440 overnight). */
export function slotToShiftSlot(slot: RosterSlot): ShiftSlot | "rest" {
  if (slot.kind === "rest") return "rest";
  const start = parseHhmm(slot.start);
  const end = start + shiftSpan(slot.start, slot.end);
  return { start, end, breakMinutes: slot.breakMinutes };
}

export async function listTemplates(tx: Db, companyId: string) {
  return tx.query<TemplateRow>("SELECT * FROM shift_templates WHERE " +
    "company_id = $1 ORDER BY name, id", [companyId]);
}

export async function loadTemplate(tx: Db, companyId: string, id: string,
  lock = false): Promise<TemplateRow> {
  const [r] = await tx.query<TemplateRow>(
    `SELECT * FROM shift_templates WHERE company_id = $1 AND id = $2
     ${lock ? "FOR UPDATE" : ""}`, [companyId, id]);
  if (r === undefined) throw new ApiError("NOT_FOUND");
  return r;
}

/** Mirrors the engine's INVALID_SHIFT bound (stricter: net > 0). */
function assertShape(start: string, end: string, breakMinutes: number) {
  if (start === end || breakMinutes >= shiftSpan(start, end)) {
    throw new ApiError("VALIDATION_FAILED", "end must differ from start " +
      "and the break must be shorter than the span",
    { fields: ["body.breakMinutes"] });
  }
}

export async function createTemplate(tx: Db, companyId: string, id: string,
  b: ShiftTemplateCreate): Promise<ShiftTemplate> {
  assertShape(b.start, b.end, b.breakMinutes);
  await tx.query(
    `INSERT INTO shift_templates (id, company_id, name, name_ar, start_min,
       end_min, break_minutes, status) VALUES ($1, $2, $3, $4, $5, $6, $7,
       'active')`, [id, companyId, b.name, b.nameAr ?? null,
      parseHhmm(b.start), parseHhmm(b.end), b.breakMinutes]);
  return toTemplate(await loadTemplate(tx, companyId, id));
}

/** Edits apply to drafts only; published days keep their snapshot. */
export async function updateTemplate(tx: Db, companyId: string, id: string,
  b: ShiftTemplateUpdate): Promise<ShiftTemplate> {
  const cur = toTemplate(await loadTemplate(tx, companyId, id, true));
  const next = { ...cur, ...Object.fromEntries(Object.entries(b)
    .filter(([, v]) => v !== undefined)) } as ShiftTemplate;
  assertShape(next.start, next.end, next.breakMinutes);
  await tx.query(
    `UPDATE shift_templates SET name = $3, name_ar = $4, start_min = $5,
       end_min = $6, break_minutes = $7, status = $8
     WHERE company_id = $1 AND id = $2`,
    [companyId, id, next.name, next.nameAr, parseHhmm(next.start),
      parseHhmm(next.end), next.breakMinutes, next.status]);
  return toTemplate(await loadTemplate(tx, companyId, id));
}
