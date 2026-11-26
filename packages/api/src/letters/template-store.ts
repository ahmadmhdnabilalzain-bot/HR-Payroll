import {
  LetterKind,
  type LetterTemplate,
  type TemplateBody,
  type TemplateVersion,
} from "@payroll/contract";
import type { Db } from "../db/db";
import type { ReqCtx } from "../http/context";
import { ApiError } from "../http/errors";
import { needsNativeReview } from "./arabic";
import { validateTemplateBody } from "./merge";
import { STARTERS_EN } from "./starters";
import { STARTERS_AR } from "./starters-ar";

type Lang = "en" | "ar";

export interface TemplateRow {
  id: string;
  kind: LetterKind;
  name: string;
  lang: Lang;
  starter: boolean;
}

export interface TVersionRow {
  id: string;
  template_id: string;
  version: number;
  status: TemplateVersion["status"];
  body: TemplateBody;
  fields: string[];
  uses_salary: boolean;
  created_by: string;
  created_at: string;
  published_at: string | null;
  review_status: "needs-native-review" | "reviewed" | null;
  reviewer_name: string | null;
  reviewed_at: string | null;
}

interface NewVersion {
  companyId: string;
  templateId: string;
  version: number;
  lang: Lang;
  body: TemplateBody;
  userId: string;
  at: string;
  published: boolean;
}

/**
 * Inserts a version. A version with Arabic text (or of an Arabic
 * template) always starts needing a native review.
 */
export async function insertTemplateVersion(tx: Db, id: string,
  v: NewVersion): Promise<void> {
  const { fields, usesSalary } = validateTemplateBody(v.body);
  await tx.query(
    `INSERT INTO letter_template_versions (id, company_id, template_id,
       version, status, body, fields, uses_salary, created_by, created_at,
       published_at, review_status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
    [id, v.companyId, v.templateId, v.version,
      v.published ? "published" : "draft", JSON.stringify(v.body), fields,
      usesSalary, v.userId, v.at, v.published ? v.at : null,
      needsNativeReview(v.lang, v.body) ? "needs-native-review" : null]);
}

export async function insertTemplate(tx: Db, t: TemplateRow & {
  companyId: string; at: string }): Promise<void> {
  await tx.query(
    `INSERT INTO letter_templates (id, company_id, kind, name, lang,
       starter, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [t.id, t.companyId, t.kind, t.name, t.lang, t.starter, t.at]);
}

/**
 * Ten starter templates (five kinds in English and Arabic), version 1
 * published; the Arabic ones need a native review before issue.
 */
export async function seedStarterTemplates(tx: Db, companyId: string,
  userId: string, at: string, newId: () => string): Promise<void> {
  for (const lang of ["en", "ar"] as const) {
    const set = lang === "en" ? STARTERS_EN : STARTERS_AR;
    for (const kind of LetterKind.options) {
      const id = newId();
      await insertTemplate(tx, { id, companyId, kind, lang, at,
        name: set[kind].name, starter: true });
      await insertTemplateVersion(tx, newId(), { companyId, templateId: id,
        version: 1, lang, body: set[kind].body, userId, at,
        published: true });
    }
  }
}

/** `nativeReview` is shown for every version that has a review state. */
export function toVersion(v: TVersionRow, lang: Lang): TemplateVersion {
  return { id: v.id, version: v.version, status: v.status, body: v.body,
    fields: v.fields, usesSalary: v.uses_salary, createdBy: v.created_by,
    createdAt: v.created_at, publishedAt: v.published_at,
    nativeReview: lang === "en" && v.review_status === null ? null : {
      status: v.review_status ?? "needs-native-review",
      reviewerName: v.reviewer_name, reviewedAt: v.reviewed_at } };
}

export async function loadTemplate(ctx: ReqCtx, id: string)
  : Promise<TemplateRow> {
  const [t] = await ctx.tx.query<TemplateRow>(
    "SELECT * FROM letter_templates WHERE company_id = $1 AND id = $2",
    [ctx.tenant!.companyId, id]);
  if (t === undefined) throw new ApiError("NOT_FOUND");
  return t;
}

export async function templateVersions(ctx: ReqCtx, templateId: string)
  : Promise<TVersionRow[]> {
  return ctx.tx.query<TVersionRow>(
    `SELECT * FROM letter_template_versions WHERE company_id = $1
       AND template_id = $2 ORDER BY version`,
    [ctx.tenant!.companyId, templateId]);
}

/** The published version, if any. */
export const publishedOf = (vs: readonly TVersionRow[]) =>
  vs.find((v) => v.status === "published") ?? null;

export async function templateView(ctx: ReqCtx, t: TemplateRow,
  withVersions: boolean): Promise<LetterTemplate> {
  const vs = await templateVersions(ctx, t.id);
  const cur = publishedOf(vs);
  const view: LetterTemplate = { id: t.id, kind: t.kind, name: t.name,
    lang: t.lang, starter: t.starter,
    current: cur === null ? null : toVersion(cur, t.lang) };
  if (withVersions) view.versions = vs.map((v) => toVersion(v, t.lang));
  return view;
}
