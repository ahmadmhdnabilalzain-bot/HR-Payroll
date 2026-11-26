import {
  ACK_STATEMENT,
  type Audience,
  type LibraryCategory,
  type LibraryDocument,
  type MyReceipt,
  type Role,
} from "@payroll/contract";
import { isPayroll } from "../documents/access";
import { fileRefs } from "../files/files";
import type { ReqCtx } from "../http/context";
import { ApiError } from "../http/errors";
import { inAudience, type AudienceMember } from "./audience";

export interface LibRow {
  id: string;
  title: string;
  title_ar: string | null;
  category: LibraryCategory;
  audience: Audience;
}

export interface LibVersionRow {
  id: string;
  document_id: string;
  version: number;
  file_id: string;
  note: string | null;
  requires_ack: boolean;
  published_by: string;
  published_at: string;
}

interface ReceiptDbRow {
  version_id: string;
  viewed_at: string | null;
  acknowledged_at: string | null;
}

export const attachOf = (versionId: string) => `library-version:${versionId}`;

/** The caller as an audience member (their employee's department). */
export async function memberOf(ctx: ReqCtx): Promise<AudienceMember> {
  const own = ctx.tenant!.employeeId;
  const [e] = own === null ? [] : await ctx.tx.query<{
    department_id: string | null }>(
    "SELECT department_id FROM employees WHERE company_id = $1 AND id = $2",
    [ctx.tenant!.companyId, own]);
  return { employeeId: own, departmentId: e?.department_id ?? null,
    role: ctx.tenant!.role as Role };
}

/** Owner and hr see every document; others only inside the audience. */
export async function viewFilter(ctx: ReqCtx)
  : Promise<(d: LibRow) => boolean> {
  if (isPayroll(ctx)) return () => true;
  const m = await memberOf(ctx);
  return (d) => inAudience(d.audience, m);
}

export async function loadLib(ctx: ReqCtx, id: string): Promise<LibRow> {
  const [d] = await ctx.tx.query<LibRow>(
    "SELECT * FROM library_documents WHERE company_id = $1 AND id = $2",
    [ctx.tenant!.companyId, id]);
  if (d === undefined) throw new ApiError("NOT_FOUND");
  return d;
}

/** A document the caller may see, else 404 (never 403). */
export async function visibleLib(ctx: ReqCtx, id: string)
  : Promise<LibRow> {
  const d = await loadLib(ctx, id);
  if (!(await viewFilter(ctx))(d)) throw new ApiError("NOT_FOUND");
  return d;
}

export async function currentVersion(ctx: ReqCtx, documentId: string)
  : Promise<LibVersionRow> {
  const [v] = await ctx.tx.query<LibVersionRow>(
    `SELECT * FROM library_versions WHERE company_id = $1
       AND document_id = $2 ORDER BY version DESC LIMIT 1`,
    [ctx.tenant!.companyId, documentId]);
  return v!;
}

export const toReceipt = (versionId: string, r?: ReceiptDbRow)
  : MyReceipt => ({ versionId, viewedAt: r?.viewed_at ?? null,
  acknowledgedAt: r?.acknowledged_at ?? null, statement: ACK_STATEMENT });

async function myReceipt(ctx: ReqCtx, versionId: string)
  : Promise<MyReceipt | null> {
  const [r] = await ctx.tx.query<ReceiptDbRow>(
    `SELECT * FROM library_receipts WHERE company_id = $1
       AND version_id = $2 AND user_id = $3`,
    [ctx.tenant!.companyId, versionId, ctx.user!.id]);
  return r === undefined ? null : toReceipt(versionId, r);
}

/** The only serialiser: the audience only for owner and hr. */
export async function toLibraryView(ctx: ReqCtx, d: LibRow)
  : Promise<LibraryDocument> {
  const v = await currentVersion(ctx, d.id);
  const refs = await fileRefs(ctx, [v.file_id]);
  return { id: d.id, title: d.title, titleAr: d.title_ar,
    category: d.category, audience: isPayroll(ctx) ? d.audience : null,
    current: { id: v.id, version: v.version, file: refs.get(v.file_id)!,
      note: v.note, requiresAck: v.requires_ack,
      publishedBy: v.published_by, publishedAt: v.published_at },
    myReceipt: await myReceipt(ctx, v.id) };
}
