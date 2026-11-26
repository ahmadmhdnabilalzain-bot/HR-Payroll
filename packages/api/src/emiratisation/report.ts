import type {
  EmiratisationFlags,
  EmiratisationReport,
  EmiratisationSettings,
  EmiratisationSettingsPut,
} from "@payroll/contract";
import {
  computeEmiratisation,
  EMIRATISATION_OVERRIDABLE,
  fils,
  type EmiratisationInput,
} from "@payroll/engine";
import { appendAudit } from "../audit/audit";
import { canonicalJson } from "../audit/canonical";
import type { Db } from "../db/db";
import { toMoney } from "../db/money";
import type { HandlerDeps, ReqCtx } from "../http/context";
import { ApiError } from "../http/errors";
import { listEmployees } from "../people/employees";
import { dubaiDate } from "../time/dubai";

interface FlagRow {
  employee_id: string; skilled: boolean | null;
  work_permit_valid: boolean | null; paid_via_wps: boolean | null;
  gpssa_registered: boolean | null;
}

/**
 * Every employee as the engine needs them: nationality class, dates,
 * HR-entered flags (no row: all null) and the recurring monthly total
 * (null without a salary).
 */
export async function buildEmiratisationInput(tx: Db, deps: HandlerDeps,
  companyId: string, asOf: string, sectorInScope: boolean | null)
  : Promise<EmiratisationInput> {
  const flags = new Map((await tx.query<FlagRow>(
    "SELECT * FROM emiratisation_flags WHERE company_id = $1",
    [companyId])).map((f) => [f.employee_id, f]));
  const rows = await listEmployees(tx, deps, companyId);
  return { asOf, sectorInScope, employees: rows.map((e) => {
    const f = flags.get(e.id);
    return { employeeId: e.id, isUaeNational: e.workerClass ===
      "uae-national", joiningDate: e.joiningDate,
    lastWorkingDate: e.lastWorkingDate, skilled: f?.skilled ?? null,
    workPermitValid: f?.work_permit_valid ?? null,
    paidViaWps: f?.paid_via_wps ?? null,
    gpssaRegistered: f?.gpssa_registered ?? null,
    monthlyWage: e.salary === null ? null
      : fils(e.salary.reduce((n, c) => n + c.amount, 0n)) };
  }) };
}

export async function loadEmiratisationSettings(tx: Db, companyId: string)
  : Promise<EmiratisationSettings> {
  const [r] = await tx.query<{ sector_in_scope: boolean | null;
    overrides: Record<string, number | string>; updated_at: string }>(
    "SELECT * FROM emiratisation_settings WHERE company_id = $1",
    [companyId]);
  return { sectorInScope: r?.sector_in_scope ?? null,
    overrides: r?.overrides ?? {}, updatedAt: r?.updated_at ?? null };
}

export const STATUS_NOTE = "Planning estimate from secondary sources " +
  "and the values shown in the trace; not a compliance finding.";
export const FINE_ESTIMATE_NOTE = "Planning estimate of a yearly fine " +
  "from the values shown in the trace. Not legal advice.";

type Line = EmiratisationReport["trace"][number];
type Source = EmiratisationReport["figureStatus"]["required"][number];

/** Statuses of a trace line's rules; overrides are the company's. */
function sourcesOf(trace: readonly Line[], id: string): Source[] {
  const rules = trace.find((l) => l.id === id)?.rules ?? [];
  return rules.map((r): Source => r.overridden ? "company-entered"
    : r.status);
}

const uniq = (xs: Source[]) => [...new Set(xs)].sort();

/** Labels and notes so no figure or status reads as a bare fact. */
function labelled(r: EmiratisationReport): EmiratisationReport {
  const req = sourcesOf(r.trace, "emiratisation.required");
  const fine = [...sourcesOf(r.trace, "emiratisation.fine"), ...req];
  return { ...r,
    figureStatus: { required: r.required === null ? [] : uniq(req),
      fineExposure: r.fineExposure === null ? [] : uniq(fine) },
    statusNote: r.status === "on-target" || r.status === "below-target"
      ? STATUS_NOTE : null,
    fineNote: r.fineNote ?? (r.fineExposure === null ? null
      : FINE_ESTIMATE_NOTE) };
}

/** GET /v1/emiratisation: the engine's planning estimate, labelled. */
export async function emiratisationReport(ctx: ReqCtx<unknown,
  { asOf?: string }>): Promise<EmiratisationReport> {
  const c = ctx.tenant!.companyId;
  const asOf = ctx.query.asOf ?? dubaiDate(ctx.deps.now());
  const st = await loadEmiratisationSettings(ctx.tx, c);
  const input = await buildEmiratisationInput(ctx.tx, ctx.deps, c, asOf,
    st.sectorInScope);
  const r = computeEmiratisation(input, undefined, st.overrides);
  return labelled({ ...r, fineExposure: r.fineExposure === null ? null
    : toMoney(r.fineExposure), figureStatus: { required: [],
    fineExposure: [] }, statusNote: null });
}

const same = (a: unknown, b: unknown) =>
  canonicalJson(a ?? null) === canonicalJson(b ?? null);

/** PUT /v1/emiratisation/settings (owner): the full settings. */
export async function putEmiratisationSettings(
  ctx: ReqCtx<EmiratisationSettingsPut>): Promise<EmiratisationSettings> {
  const c = ctx.tenant!.companyId;
  const keys = Object.keys(ctx.body.overrides);
  const allowed: readonly string[] = EMIRATISATION_OVERRIDABLE;
  if (!keys.every((k) => allowed.includes(k))) {
    throw new ApiError("OVERRIDE_NOT_ALLOWED");
  }
  const before = await loadEmiratisationSettings(ctx.tx, c);
  const changed = [
    ...allowed.filter((k) => !same(before.overrides[k],
      ctx.body.overrides[k])).map((k) => `overrides.${k}`),
    ...(before.sectorInScope === ctx.body.sectorInScope ? []
      : ["sectorInScope"])].sort();
  const at = ctx.deps.now().toISOString();
  await ctx.tx.query(
    `INSERT INTO emiratisation_settings (company_id, sector_in_scope,
       overrides, updated_at) VALUES ($1, $2, $3, $4)
     ON CONFLICT (company_id) DO UPDATE SET
       sector_in_scope = excluded.sector_in_scope,
       overrides = excluded.overrides, updated_at = excluded.updated_at`,
    [c, ctx.body.sectorInScope, JSON.stringify(ctx.body.overrides), at]);
  await appendAudit(ctx.tx, { companyId: c, at, actorUserId: ctx.user!.id,
    action: "emiratisation.settings.updated", entityType: "company",
    entityId: c, data: { settingsChanged: changed } });
  return loadEmiratisationSettings(ctx.tx, c);
}

const FLAG_COLS = [["skilled", "skilled"],
  ["workPermitValid", "work_permit_valid"], ["paidViaWps", "paid_via_wps"],
  ["gpssaRegistered", "gpssa_registered"]] as const;

/** PUT /v1/employees/{id}/emiratisation (owner, hr). */
export async function putEmployeeFlags(ctx: ReqCtx<EmiratisationFlags,
  unknown, { id: string }>): Promise<EmiratisationFlags> {
  const c = ctx.tenant!.companyId;
  const [e] = await ctx.tx.query("SELECT 1 FROM employees WHERE " +
    "company_id = $1 AND id = $2", [c, ctx.params.id]);
  if (e === undefined) throw new ApiError("NOT_FOUND");
  const [old] = await ctx.tx.query<FlagRow>(
    "SELECT * FROM emiratisation_flags WHERE company_id = $1 AND " +
    "employee_id = $2", [c, ctx.params.id]);
  const at = ctx.deps.now().toISOString();
  await upsertFlags(ctx, at);
  const b = ctx.body;
  const changed = FLAG_COLS.filter(([k, col]) =>
    (old?.[col] ?? null) !== b[k]).map(([k]) => k);
  await appendAudit(ctx.tx, { companyId: c, at, actorUserId: ctx.user!.id,
    action: "employee.emiratisation.updated", entityType: "employee",
    entityId: ctx.params.id, data: { settingsChanged: changed } });
  return b;
}

async function upsertFlags(ctx: ReqCtx<EmiratisationFlags, unknown,
  { id: string }>, at: string): Promise<void> {
  const b = ctx.body;
  await ctx.tx.query(
    `INSERT INTO emiratisation_flags (company_id, employee_id, skilled,
       work_permit_valid, paid_via_wps, gpssa_registered, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (company_id, employee_id) DO UPDATE SET
       skilled = excluded.skilled,
       work_permit_valid = excluded.work_permit_valid,
       paid_via_wps = excluded.paid_via_wps,
       gpssa_registered = excluded.gpssa_registered,
       updated_at = excluded.updated_at`,
    [ctx.tenant!.companyId, ctx.params.id, b.skilled, b.workPermitValid,
      b.paidViaWps, b.gpssaRegistered, at]);
}
