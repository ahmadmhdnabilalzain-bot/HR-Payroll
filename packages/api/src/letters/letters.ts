import { createHash } from "node:crypto";
import {
  PREVIEW_WATERMARK,
  type Letter,
  type LetterPreview,
  type LetterRequest,
} from "@payroll/contract";
import { appendAudit, type AuditData } from "../audit/audit";
import { canonicalJson } from "../audit/canonical";
import { isPayroll } from "../documents/access";
import {
  retainUntil,
  type RetentionCandidate,
} from "../documents/retention";
import type { ExtraCandidates } from "../documents/reports";
import {
  claimFile,
  companyKey,
  readFile,
  storeFile,
  type FileCtx,
} from "../files/files";
import {
  BinaryReply,
  RenderThen,
  Reply,
  type ReqCtx,
} from "../http/context";
import { rateLimit, type Limit } from "../http/rate-limit";
import { ApiError } from "../http/errors";
import { dubaiDate } from "../time/dubai";
import { prepareLetter, type PreparedLetter } from "./prepare";

interface LetterRow {
  id: string; kind: Letter["kind"]; lang: Letter["lang"];
  template_id: string; template_version: number;
  employee_id: string | null; issued_by: string; issued_at: string;
  file_id: string; file_name: string; sha256: string;
  uses_salary: boolean; merge_enc: string; acknowledged_at: string | null;
}

const toLetter = (r: LetterRow): Letter => ({ id: r.id, kind: r.kind,
  lang: r.lang, templateId: r.template_id,
  templateVersion: r.template_version, employeeId: r.employee_id,
  issuedBy: r.issued_by, issuedAt: r.issued_at, fileName: r.file_name,
  sha256: r.sha256, acknowledgedAt: r.acknowledged_at });

const mergeAad = (c: string, id: string) => `${c}:letters:merge:${id}`;
const attachOf = (id: string) => `letter:${id}`;
const fileNameOf = (p: PreparedLetter) =>
  `${p.template.kind}-${p.letterDate}-${p.template.lang}.pdf`;

async function audit(ctx: ReqCtx, action: string, id: string | null,
  data: AuditData) {
  await appendAudit(ctx.tx, { companyId: ctx.tenant!.companyId,
    at: ctx.deps.now().toISOString(), actorUserId: ctx.user!.id, action,
    entityType: "letter", entityId: id, data });
}

/** Per minute; product defaults, not statutory. */
const RENDER_LIMIT: Limit = { name: "letter-render", perUser: 20,
  perCompany: 120 };

function limitRenders(ctx: ReqCtx): void {
  rateLimit(ctx.deps, ctx.tenant!.companyId, ctx.user!.id, RENDER_LIMIT);
}

/**
 * POST /v1/letters/preview: watermarked, nothing stored. Rendered
 * outside the transaction; the audit names whose letter it was.
 */
export async function previewLetter(ctx: ReqCtx<LetterRequest>)
  : Promise<RenderThen> {
  limitRenders(ctx);
  const p = await prepareLetter(ctx, ctx.body, PREVIEW_WATERMARK);
  return new RenderThen(p.page, async (ctx2, bytes)
    : Promise<LetterPreview> => {
    await audit(ctx2, "letter.previewed", null, { kind: p.template.kind,
      lang: p.template.lang, templateVersion: p.version.version,
      ...(p.employeeId === null ? {} : { employeeId: p.employeeId }) });
    return { fileName: fileNameOf(p),
      contentBase64: Buffer.from(bytes).toString("base64"),
      watermark: PREVIEW_WATERMARK };
  });
}

/**
 * POST /v1/letters. Checked and merged in one transaction, rendered
 * with no transaction open, then stored, claimed and recorded with
 * its hash and encrypted merge values in a second one.
 */
export async function issueLetter(ctx: ReqCtx<LetterRequest>)
  : Promise<RenderThen> {
  limitRenders(ctx);
  const p = await prepareLetter(ctx, ctx.body, null);
  // The gate follows the text: any version holding Arabic is marked.
  if (p.version.review_status === "needs-native-review" ||
    (p.template.lang === "ar" && p.version.review_status !== "reviewed")) {
    throw new ApiError("ARABIC_NOT_REVIEWED");
  }
  return new RenderThen(p.page, (ctx2, bytes) => recordLetter(ctx2, p,
    bytes));
}

async function recordLetter(ctx: ReqCtx, p: PreparedLetter,
  bytes: Uint8Array): Promise<Reply> {
  const c = ctx.tenant!.companyId;
  const ref = await storeFile(ctx, fileNameOf(p), bytes);
  await claimFile(ctx, ref.id, attachOf(p.letterId));
  const sha = createHash("sha256").update(bytes).digest("hex");
  const enc = (await companyKey(ctx)).encrypt(mergeAad(c, p.letterId),
    canonicalJson(p.values));
  const [row] = await ctx.tx.query<LetterRow>(
    `INSERT INTO letters (id, company_id, kind, lang, template_id,
       template_version_id, template_version, employee_id, issued_by,
       issued_at, file_id, file_name, sha256, uses_salary, merge_enc)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
       $15) RETURNING *`,
    [p.letterId, c, p.template.kind, p.template.lang, p.template.id,
      p.version.id, p.version.version, p.employeeId, ctx.user!.id,
      ref.uploadedAt, ref.id, ref.name, sha, p.version.uses_salary, enc]);
  await audit(ctx, "letter.issued", p.letterId, { letterId: p.letterId,
    kind: p.template.kind, lang: p.template.lang,
    templateVersion: p.version.version, sha256: sha });
  return new Reply(201, toLetter(row!));
}

/**
 * Who may read letters, as SQL: owner and hr all; the named employee;
 * the issuer of a salary-free letter only while they could issue it
 * again: still a manager, and still the manager of its employee.
 */
function visible(ctx: ReqCtx, first: number): { sql: string;
  args: unknown[] } {
  const [all, own, user, mgr] = [first, first + 1, first + 2, first + 3];
  return { sql: `($${all} OR employee_id = $${own} OR
    ($${mgr} AND issued_by = $${user} AND NOT uses_salary AND EXISTS (
      SELECT 1 FROM employees m WHERE m.company_id = letters.company_id
        AND m.id = letters.employee_id AND m.manager_id = $${own})))`,
  args: [isPayroll(ctx), ctx.tenant!.employeeId, ctx.user!.id,
    ctx.tenant!.role === "manager"] };
}

async function visibleLetter(ctx: ReqCtx, id: string): Promise<LetterRow> {
  const v = visible(ctx, 3);
  const [r] = await ctx.tx.query<LetterRow>(
    `SELECT * FROM letters WHERE company_id = $1 AND id = $2 AND ${v.sql}`,
    [ctx.tenant!.companyId, id, ...v.args]);
  if (r === undefined) throw new ApiError("NOT_FOUND");
  return r;
}

export async function listLetters(ctx: ReqCtx<unknown,
  { employeeId?: string }>): Promise<{ items: Letter[] }> {
  const v = visible(ctx, 3);
  const rows = await ctx.tx.query<LetterRow>(
    `SELECT * FROM letters WHERE company_id = $1
       AND ($2::uuid IS NULL OR employee_id = $2) AND ${v.sql}
     ORDER BY issued_at DESC, id`,
    [ctx.tenant!.companyId, ctx.query.employeeId ?? null, ...v.args]);
  return { items: rows.map(toLetter) };
}

export async function getLetter(ctx: ReqCtx<unknown, unknown,
  { id: string }>): Promise<Letter> {
  return toLetter(await visibleLetter(ctx, ctx.params.id));
}

export async function downloadLetter(ctx: ReqCtx<unknown, unknown,
  { id: string }>): Promise<BinaryReply> {
  const r = await visibleLetter(ctx, ctx.params.id);
  const { bytes } = await readFile(ctx, r.file_id, attachOf(r.id));
  await audit(ctx, "letter.downloaded", r.id, { letterId: r.id });
  return new BinaryReply(bytes, "application/pdf", r.file_name);
}

/** POST /v1/letters/{id}/acknowledge: the named employee, once. */
export async function acknowledgeLetter(ctx: ReqCtx<unknown, unknown,
  { id: string }>): Promise<Letter> {
  const own = ctx.tenant!.employeeId;
  const [r] = await ctx.tx.query<LetterRow>(
    `UPDATE letters SET acknowledged_at = coalesce(acknowledged_at, $4)
     WHERE company_id = $1 AND id = $2 AND employee_id = $3 RETURNING *`,
    [ctx.tenant!.companyId, ctx.params.id, own,
      ctx.deps.now().toISOString()]);
  if (r === undefined || own === null) throw new ApiError("NOT_FOUND");
  await audit(ctx, "letter.acknowledged", r.id, { letterId: r.id });
  return toLetter(r);
}

/** The decrypted merge values of a letter (internal; tests use it). */
export async function loadLetterValues(ctx: FileCtx, id: string)
  : Promise<Record<string, string>> {
  const c = ctx.tenant!.companyId;
  const [r] = await ctx.tx.query<{ merge_enc: string }>(
    "SELECT merge_enc FROM letters WHERE company_id = $1 AND id = $2",
    [c, id]);
  if (r === undefined) throw new ApiError("NOT_FOUND");
  return JSON.parse((await companyKey(ctx)).decrypt(mergeAad(c, id),
    r.merge_enc)) as Record<string, string>;
}

/** Letters in the retention due list (class `letter`). */
export const letterRetention: ExtraCandidates = async (ctx, rule) => {
  const rows = await ctx.tx.query<{ id: string; employee_id: string | null;
    issued_at: string; last_working_date: string | null }>(
    `SELECT l.id, l.employee_id, l.issued_at, e.last_working_date
     FROM letters l LEFT JOIN employees e ON e.company_id = l.company_id
       AND e.id = l.employee_id WHERE l.company_id = $1`,
    [ctx.tenant!.companyId]);
  return rows.map((r): RetentionCandidate => ({ kind: "letter", id: r.id,
    employeeId: r.employee_id, retentionClass: "letter",
    retainUntil: retainUntil(rule("letter"), {
      employmentEnd: r.last_working_date, expiry: null,
      issue: dubaiDate(new Date(r.issued_at)) }) }));
};
