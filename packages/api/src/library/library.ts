import type {
  AckRequest,
  Audience,
  LibraryCreate,
  LibraryDocument,
  LibraryVersionCreate,
  MyReceipt,
} from "@payroll/contract";
import { appendAudit, type AuditData } from "../audit/audit";
import { claimFile, readFile } from "../files/files";
import { BinaryReply, Reply, type ReqCtx } from "../http/context";
import { ApiError } from "../http/errors";
import {
  attachOf,
  currentVersion,
  loadLib,
  toLibraryView,
  toReceipt,
  viewFilter,
  visibleLib,
  type LibRow,
} from "./view";

type Id = { id: string };

async function audit(ctx: ReqCtx, action: string, id: string,
  data: AuditData) {
  await appendAudit(ctx.tx, { companyId: ctx.tenant!.companyId,
    at: ctx.deps.now().toISOString(), actorUserId: ctx.user!.id, action,
    entityType: "library-document", entityId: id, data });
}

/** Claims the file and inserts version `n`. */
async function insertVersion(ctx: ReqCtx, docId: string, n: number,
  b: { fileId: string; note?: string | undefined; requiresAck: boolean }) {
  const id = ctx.deps.newId();
  await claimFile(ctx, b.fileId, attachOf(id));
  await ctx.tx.query(
    `INSERT INTO library_versions (id, company_id, document_id, version,
       file_id, note, requires_ack, published_by, published_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [id, ctx.tenant!.companyId, docId, n, b.fileId, b.note ?? null,
      b.requiresAck, ctx.user!.id, ctx.deps.now().toISOString()]);
}

const audienceData = (a: Audience): AuditData => ({
  allStaff: a.allStaff, departmentCount: a.departmentIds.length,
  employeeCount: a.employeeIds.length, roles: [...a.roles] });

/** POST /v1/library (owner, hr). */
export async function createLibrary(ctx: ReqCtx<LibraryCreate>)
  : Promise<Reply> {
  const b = ctx.body;
  const id = ctx.deps.newId();
  await ctx.tx.query(
    `INSERT INTO library_documents (id, company_id, title, title_ar,
       category, audience, created_by, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [id, ctx.tenant!.companyId, b.title, b.titleAr ?? null, b.category,
      JSON.stringify(b.audience), ctx.user!.id,
      ctx.deps.now().toISOString()]);
  await insertVersion(ctx, id, 1, b);
  await audit(ctx, "library.created", id, { documentId: id, version: 1,
    ...audienceData(b.audience) });
  return new Reply(201, await toLibraryView(ctx, await loadLib(ctx, id)));
}

/** POST /v1/library/{id}/versions (owner, hr). */
export async function addLibraryVersion(ctx: ReqCtx<LibraryVersionCreate,
  unknown, Id>): Promise<Reply> {
  const d = await loadLib(ctx, ctx.params.id);
  await ctx.tx.query(
    "SELECT pg_advisory_xact_lock(hashtextextended($1, 7))",
    [`library-document:${d.id}`]);
  const n = (await currentVersion(ctx, d.id)).version + 1;
  await insertVersion(ctx, d.id, n, ctx.body);
  await audit(ctx, "library.version.added", d.id, { documentId: d.id,
    version: n });
  return new Reply(201, await toLibraryView(ctx, d));
}

/** PUT /v1/library/{id}/audience: old receipts are kept. */
export async function putAudience(ctx: ReqCtx<Audience, unknown, Id>)
  : Promise<LibraryDocument> {
  const d = await loadLib(ctx, ctx.params.id);
  await ctx.tx.query(
    "UPDATE library_documents SET audience = $3 WHERE company_id = $1 " +
    "AND id = $2", [ctx.tenant!.companyId, d.id,
      JSON.stringify(ctx.body)]);
  await audit(ctx, "library.audience.updated", d.id,
    audienceData(ctx.body));
  return toLibraryView(ctx, { ...d, audience: ctx.body });
}

export async function listLibrary(ctx: ReqCtx)
  : Promise<{ items: LibraryDocument[] }> {
  const rows = await ctx.tx.query<LibRow>(
    "SELECT * FROM library_documents WHERE company_id = $1 " +
    "ORDER BY title, id", [ctx.tenant!.companyId]);
  const seen = await viewFilter(ctx);
  const items: LibraryDocument[] = [];
  for (const r of rows.filter(seen)) items.push(await toLibraryView(ctx, r));
  return { items };
}

export async function getLibrary(ctx: ReqCtx<unknown, unknown, Id>)
  : Promise<LibraryDocument> {
  return toLibraryView(ctx, await visibleLib(ctx, ctx.params.id));
}

/** Sets this user's times for a version once (concurrent calls agree). */
async function stamp(ctx: ReqCtx, versionId: string, ack: boolean)
  : Promise<MyReceipt> {
  const at = ctx.deps.now().toISOString();
  const [r] = await ctx.tx.query<{ version_id: string;
    viewed_at: string | null; acknowledged_at: string | null }>(
    `INSERT INTO library_receipts AS r (company_id, version_id, user_id,
       employee_id, viewed_at, acknowledged_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (version_id, user_id) DO UPDATE SET
       viewed_at = coalesce(r.viewed_at, excluded.viewed_at),
       acknowledged_at = coalesce(r.acknowledged_at,
         excluded.acknowledged_at)
     RETURNING version_id, viewed_at, acknowledged_at`,
    [ctx.tenant!.companyId, versionId, ctx.user!.id,
      ctx.tenant!.employeeId, at, ack ? at : null]);
  return toReceipt(versionId, r);
}

/** GET /v1/library/{id}/download: the current version; marks viewed. */
export async function downloadLibrary(ctx: ReqCtx<unknown, unknown, Id>)
  : Promise<BinaryReply> {
  const d = await visibleLib(ctx, ctx.params.id);
  const v = await currentVersion(ctx, d.id);
  const { ref, bytes } = await readFile(ctx, v.file_id, attachOf(v.id));
  await stamp(ctx, v.id, false);
  await audit(ctx, "library.downloaded", d.id, { documentId: d.id,
    version: v.version });
  return new BinaryReply(bytes, ref.mime, ref.name);
}

/** POST /v1/library/{id}/acknowledge: the current version only. */
export async function acknowledgeLibrary(ctx: ReqCtx<AckRequest, unknown,
  Id>): Promise<MyReceipt> {
  const d = await visibleLib(ctx, ctx.params.id);
  const v = await currentVersion(ctx, d.id);
  if (v.id !== ctx.body.versionId) throw new ApiError("VERSION_NOT_CURRENT");
  const r = await stamp(ctx, v.id, true);
  await audit(ctx, "library.acknowledged", d.id, { documentId: d.id,
    version: v.version });
  return r;
}
