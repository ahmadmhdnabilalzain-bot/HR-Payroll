import type {
  LetterTemplate,
  LetterTemplateCreate,
  NativeReviewRequest,
  TemplateVersionCreate,
} from "@payroll/contract";
import { appendAudit, type AuditData } from "../audit/audit";
import { Reply, type ReqCtx } from "../http/context";
import { ApiError } from "../http/errors";
import {
  insertTemplate,
  insertTemplateVersion,
  loadTemplate,
  templateVersions,
  templateView,
  type TemplateRow,
  type TVersionRow,
} from "./template-store";

type Id = { id: string };
type TV = { id: string; versionId: string };

async function audit(ctx: ReqCtx, action: string, id: string,
  data: AuditData) {
  await appendAudit(ctx.tx, { companyId: ctx.tenant!.companyId,
    at: ctx.deps.now().toISOString(), actorUserId: ctx.user!.id, action,
    entityType: "letter-template", entityId: id, data });
}

/** Serialises changes to one template's versions until commit. */
async function lockTemplate(ctx: ReqCtx, id: string): Promise<void> {
  await ctx.tx.query(
    "SELECT pg_advisory_xact_lock(hashtextextended($1, 7))",
    [`letter-template:${id}`]);
}

/** POST /v1/letter-templates: version 1 is a draft. */
export async function createTemplate(ctx: ReqCtx<LetterTemplateCreate>)
  : Promise<Reply> {
  const b = ctx.body;
  const c = ctx.tenant!.companyId;
  const at = ctx.deps.now().toISOString();
  const t: TemplateRow = { id: ctx.deps.newId(), kind: b.kind,
    name: b.name, lang: b.lang, starter: false };
  await insertTemplate(ctx.tx, { ...t, companyId: c, at });
  await insertTemplateVersion(ctx.tx, ctx.deps.newId(), { companyId: c,
    templateId: t.id, version: 1, lang: b.lang, body: b.body,
    userId: ctx.user!.id, at, published: false });
  await audit(ctx, "letter.template.created", t.id, { templateId: t.id,
    kind: b.kind, lang: b.lang });
  return new Reply(201, await templateView(ctx, t, true));
}

/** POST /v1/letter-templates/{id}/versions: a new draft. */
export async function addTemplateVersion(ctx: ReqCtx<TemplateVersionCreate,
  unknown, Id>): Promise<Reply> {
  const t = await loadTemplate(ctx, ctx.params.id);
  await lockTemplate(ctx, t.id);
  const n = (await templateVersions(ctx, t.id)).length + 1;
  await insertTemplateVersion(ctx.tx, ctx.deps.newId(), {
    companyId: ctx.tenant!.companyId, templateId: t.id, version: n,
    lang: t.lang, body: ctx.body.body, userId: ctx.user!.id,
    at: ctx.deps.now().toISOString(), published: false });
  await audit(ctx, "letter.template.version.added", t.id,
    { templateId: t.id, version: n });
  return new Reply(201, await templateView(ctx, t, true));
}

async function versionOf(ctx: ReqCtx<unknown, unknown, TV>)
  : Promise<{ t: TemplateRow; v: TVersionRow }> {
  const t = await loadTemplate(ctx, ctx.params.id);
  await lockTemplate(ctx, t.id);
  const v = (await templateVersions(ctx, t.id))
    .find((x) => x.id === ctx.params.versionId);
  if (v === undefined) throw new ApiError("NOT_FOUND");
  return { t, v };
}

/** Publishes a draft; the published one before it is superseded. */
export async function publishVersion(ctx: ReqCtx<unknown, unknown, TV>)
  : Promise<LetterTemplate> {
  const { t, v } = await versionOf(ctx);
  if (v.status !== "draft") throw new ApiError("VERSION_NOT_DRAFT");
  const c = ctx.tenant!.companyId;
  await ctx.tx.query(
    `UPDATE letter_template_versions SET status = 'superseded'
     WHERE company_id = $1 AND template_id = $2 AND status = 'published'`,
    [c, t.id]);
  await ctx.tx.query(
    `UPDATE letter_template_versions SET status = 'published',
       published_at = $3 WHERE company_id = $1 AND id = $2`,
    [c, v.id, ctx.deps.now().toISOString()]);
  await audit(ctx, "letter.template.published", t.id, { templateId: t.id,
    version: v.version });
  return templateView(ctx, t, true);
}

/**
 * Records a native reviewer for one Arabic version (owner only), once:
 * a later call keeps the first record. The name stays on the version
 * row; the audit row carries only ids.
 */
export async function nativeReview(ctx: ReqCtx<NativeReviewRequest,
  unknown, TV>): Promise<LetterTemplate> {
  const { t, v } = await versionOf(ctx);
  if (t.lang !== "ar") throw new ApiError("NOT_ARABIC_TEMPLATE");
  await ctx.tx.query(
    `UPDATE letter_template_versions SET review_status = 'reviewed',
       reviewer_name = $3, reviewed_at = $4
     WHERE company_id = $1 AND id = $2
       AND review_status IS DISTINCT FROM 'reviewed'`,
    [ctx.tenant!.companyId, v.id, ctx.body.reviewerName,
      ctx.deps.now().toISOString()]);
  await audit(ctx, "letter.template.reviewed", t.id, { templateId: t.id,
    version: v.version });
  return templateView(ctx, t, true);
}

export async function listTemplates(ctx: ReqCtx)
  : Promise<{ items: LetterTemplate[] }> {
  const rows = await ctx.tx.query<TemplateRow>(
    `SELECT * FROM letter_templates WHERE company_id = $1
     ORDER BY kind, lang, created_at, id`, [ctx.tenant!.companyId]);
  const items: LetterTemplate[] = [];
  for (const r of rows) items.push(await templateView(ctx, r, false));
  return { items };
}

export async function getTemplate(ctx: ReqCtx<unknown, unknown, Id>)
  : Promise<LetterTemplate> {
  return templateView(ctx, await loadTemplate(ctx, ctx.params.id), true);
}
