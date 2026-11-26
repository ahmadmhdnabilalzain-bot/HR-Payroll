import {
  PRODUCT_DEFAULT_LABEL,
  type ChecklistTemplate,
  type TemplateItem,
  type TemplateKind,
  type TemplatePut,
} from "@payroll/contract";
import { auditFor } from "../audit/hr-audit";
import type { Db } from "../db/db";
import type { ReqCtx } from "../http/context";

const item = (title: string, category: TemplateItem["category"],
  assignee: TemplateItem["assignee"], dueOffsetDays: number):
  TemplateItem => ({ title, category, assignee, dueOffsetDays });

/**
 * Product defaults, not law (Ruling 23). Onboarding offsets count from
 * the start date, exit offsets from the last working date. No item
 * carries a legal deadline: none is sourced yet.
 */
export const DEFAULT_TEMPLATES: Readonly<Record<TemplateKind,
  readonly TemplateItem[]>> = {
  onboarding: [
    item("Collect passport, visa and Emirates ID copies", "documents",
      "hr", -7),
    item("Collect the signed offer letter and employment contract",
      "documents", "hr", -7),
    item("Collect bank details for salary", "payroll", "hr", 0),
    item("Create work email and app login", "accounts", "hr", -1),
    item("Invite the new joiner to this app", "accounts", "hr", 0),
    item("Prepare laptop and access card", "equipment", "manager", -3),
    item("First-week plan and introductions", "other", "manager", 0),
    item("Set first goals", "other", "manager", 14),
  ],
  exit: [
    item("Agree a handover plan", "handover", "manager", -14),
    item("Exit interview", "other", "manager", -3),
    item("Return laptop, access card and equipment", "equipment",
      "employee", 0),
    item("Revoke system accounts", "accounts", "hr", 0),
    item("Final settlement review", "payroll", "hr", 0),
    item("Issue experience certificate", "documents", "hr", 0),
    item("Cancel labour card and residence visa (PRO). No deadline is " +
      "sourced yet.", "documents", "hr", 0),
  ],
};

function defaultOf(kind: TemplateKind): ChecklistTemplate {
  return { kind, version: 0, items: [...DEFAULT_TEMPLATES[kind]],
    isDefault: true, label: PRODUCT_DEFAULT_LABEL };
}

/** The stored template, else the product default (version 0). */
export async function getTemplate(tx: Db, companyId: string,
  kind: TemplateKind): Promise<ChecklistTemplate> {
  const [r] = await tx.query<{ version: number; items: TemplateItem[] }>(
    `SELECT version, items FROM checklist_templates
     WHERE company_id = $1 AND kind = $2`, [companyId, kind]);
  if (r === undefined) return defaultOf(kind);
  return { kind, version: r.version, items: r.items, isDefault: false,
    label: null };
}

export async function listTemplates(ctx: ReqCtx) {
  const c = ctx.tenant!.companyId;
  return { items: [await getTemplate(ctx.tx, c, "onboarding"),
    await getTemplate(ctx.tx, c, "exit")] };
}

/** Stores version + 1 (the row is locked by the upsert). */
export async function putTemplate(
  ctx: ReqCtx<TemplatePut, unknown, { kind: TemplateKind }>) {
  const c = ctx.tenant!.companyId;
  const kind = ctx.params.kind;
  const [r] = await ctx.tx.query<{ version: number }>(
    `INSERT INTO checklist_templates (company_id, kind, version, items,
       updated_by, updated_at) VALUES ($1, $2, 1, $3, $4, $5)
     ON CONFLICT (company_id, kind) DO UPDATE SET
       version = checklist_templates.version + 1, items = EXCLUDED.items,
       updated_by = EXCLUDED.updated_by, updated_at = EXCLUDED.updated_at
     RETURNING version`,
    [c, kind, JSON.stringify(ctx.body.items), ctx.user!.id,
      ctx.deps.now().toISOString()]);
  await auditFor(ctx, "checklist-template", "template.updated", c,
    { kind, version: r!.version });
  return getTemplate(ctx.tx, c, kind);
}
