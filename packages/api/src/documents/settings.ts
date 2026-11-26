import {
  DocumentType,
  RetentionClass,
  type DocumentSettings,
} from "@payroll/contract";
import { appendAudit } from "../audit/audit";
import { canonicalJson } from "../audit/canonical";
import type { Db } from "../db/db";
import type { ReqCtx } from "../http/context";
import { DEFAULT_LEAD_DAYS, DEFAULT_RETENTION } from "./expiry-defaults";

interface SettingsRow {
  lead_days: Partial<DocumentSettings["leadDays"]>;
  retention: Partial<DocumentSettings["retention"]>;
}

/** The stored settings merged over the defaults. */
export async function loadSettings(tx: Db, companyId: string)
  : Promise<DocumentSettings> {
  const [r] = await tx.query<SettingsRow>(
    "SELECT lead_days, retention FROM document_settings " +
    "WHERE company_id = $1", [companyId]);
  return {
    leadDays: { ...DEFAULT_LEAD_DAYS, ...(r?.lead_days ?? {}) },
    retention: { ...DEFAULT_RETENTION, ...(r?.retention ?? {}) },
  };
}

const same = (a: unknown, b: unknown) =>
  canonicalJson(a) === canonicalJson(b);

/** Dotted keys that differ, sorted (`leadDays.passport`). */
export function changedKeys(a: DocumentSettings, b: DocumentSettings)
  : string[] {
  const out = [
    ...DocumentType.options.filter((t) =>
      !same(a.leadDays[t], b.leadDays[t])).map((t) => `leadDays.${t}`),
    ...RetentionClass.options.filter((t) =>
      !same(a.retention[t], b.retention[t])).map((t) => `retention.${t}`),
  ];
  return out.sort();
}

/** PUT /v1/document-settings (owner): stores the full object. */
export async function putSettings(ctx: ReqCtx<DocumentSettings>)
  : Promise<DocumentSettings> {
  const c = ctx.tenant!.companyId;
  const before = await loadSettings(ctx.tx, c);
  const at = ctx.deps.now().toISOString();
  await ctx.tx.query(
    `INSERT INTO document_settings (company_id, lead_days, retention,
       updated_at) VALUES ($1, $2, $3, $4)
     ON CONFLICT (company_id) DO UPDATE SET lead_days = excluded.lead_days,
       retention = excluded.retention, updated_at = excluded.updated_at`,
    [c, JSON.stringify(ctx.body.leadDays),
      JSON.stringify(ctx.body.retention), at]);
  await appendAudit(ctx.tx, { companyId: c, at, actorUserId: ctx.user!.id,
    action: "document.settings.updated", entityType: "company",
    entityId: c,
    data: { settingsChanged: changedKeys(before, ctx.body) } });
  return loadSettings(ctx.tx, c);
}
