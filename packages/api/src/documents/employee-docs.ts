import type {
  DocumentVersionCreate,
  EmployeeDocument,
  EmployeeDocumentCreate,
} from "@payroll/contract";
import { appendAudit, type AuditData } from "../audit/audit";
import { claimFile, companyKey, readFile } from "../files/files";
import { BinaryReply, Reply, type ReqCtx } from "../http/context";
import { ApiError } from "../http/errors";
import { accessOf, empBrief, viewAccess, writeAccess } from "./access";
import {
  loadVersions,
  numberAad,
  toDocumentView,
  type DocRow,
} from "./redact";

type Id = { id: string };

const attachOf = (versionId: string) =>
  `employee-document-version:${versionId}`;

async function audit(ctx: ReqCtx, action: string, id: string,
  data: AuditData) {
  await appendAudit(ctx.tx, { companyId: ctx.tenant!.companyId,
    at: ctx.deps.now().toISOString(), actorUserId: ctx.user!.id, action,
    entityType: "employee-document", entityId: id, data });
}

/** Claims the file and inserts version `n` of slot `docId`. */
async function insertVersion(ctx: ReqCtx, docId: string, n: number,
  b: DocumentVersionCreate): Promise<void> {
  const c = ctx.tenant!.companyId;
  const id = ctx.deps.newId();
  await claimFile(ctx, b.fileId, attachOf(id));
  const num = b.documentNumber === undefined ? null
    : (await companyKey(ctx)).encrypt(numberAad(c, id), b.documentNumber);
  await ctx.tx.query(
    `INSERT INTO employee_document_versions (id, company_id, document_id,
       version, file_id, number_enc, issue_date, expiry_date, uploaded_by,
       uploaded_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [id, c, docId, n, b.fileId, num, b.issueDate ?? null,
      b.expiryDate ?? null, ctx.user!.id, ctx.deps.now().toISOString()]);
}

async function loadDoc(ctx: ReqCtx, id: string): Promise<DocRow> {
  const [d] = await ctx.tx.query<DocRow>(
    "SELECT * FROM employee_documents WHERE company_id = $1 AND id = $2",
    [ctx.tenant!.companyId, id]);
  if (d === undefined) throw new ApiError("NOT_FOUND");
  return d;
}

/**
 * Serialises version adds of one slot until commit. A transaction
 * lock keyed on the slot id: the slot table has no update grant, so
 * a row lock (which needs one) is not available.
 */
async function lockSlot(ctx: ReqCtx, id: string): Promise<void> {
  await ctx.tx.query(
    "SELECT pg_advisory_xact_lock(hashtextextended($1, 7))",
    [`employee-document:${id}`]);
}

/** A slot the caller may see, with their access; else 404. */
async function visibleDoc(ctx: ReqCtx, id: string) {
  const d = await loadDoc(ctx, id);
  const emp = await empBrief(ctx, d.employee_id);
  const access = emp === null ? null : accessOf(ctx, emp);
  if (access === null) throw new ApiError("NOT_FOUND");
  return { d, access };
}

/** POST /v1/employees/{id}/documents. */
export async function createDocument(ctx: ReqCtx<EmployeeDocumentCreate,
  unknown, Id>): Promise<Reply> {
  const emp = await writeAccess(ctx, ctx.params.id);
  const id = ctx.deps.newId();
  const [row] = await ctx.tx.query<DocRow>(
    `INSERT INTO employee_documents (id, company_id, employee_id, type,
       label, created_at) VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT DO NOTHING RETURNING *`,
    [id, ctx.tenant!.companyId, emp.id, ctx.body.type,
      ctx.body.label ?? null, ctx.deps.now().toISOString()]);
  if (row === undefined) throw new ApiError("DOCUMENT_SLOT_EXISTS");
  await insertVersion(ctx, id, 1, ctx.body);
  await audit(ctx, "document.created", id, { documentId: id,
    type: ctx.body.type, version: 1 });
  return new Reply(201, await toDocumentView(ctx, row, "full", true));
}

/** POST /v1/employee-documents/{id}/versions (owner, hr or self). */
export async function addVersion(ctx: ReqCtx<DocumentVersionCreate,
  unknown, Id>): Promise<Reply> {
  const { d } = await visibleDoc(ctx, ctx.params.id);
  await writeAccess(ctx, d.employee_id);
  await lockSlot(ctx, d.id);
  const n = (await loadVersions(ctx, d.id)).length + 1;
  await insertVersion(ctx, d.id, n, ctx.body);
  await audit(ctx, "document.version.added", d.id, { documentId: d.id,
    version: n });
  return new Reply(201, await toDocumentView(ctx, d, "full", true));
}

export async function getDocument(ctx: ReqCtx<unknown, unknown, Id>)
  : Promise<EmployeeDocument> {
  const { d, access } = await visibleDoc(ctx, ctx.params.id);
  return toDocumentView(ctx, d, access, access === "full");
}

export async function listDocuments(ctx: ReqCtx<unknown, unknown, Id>)
  : Promise<{ items: EmployeeDocument[] }> {
  const { emp, access } = await viewAccess(ctx, ctx.params.id);
  const rows = await ctx.tx.query<DocRow>(
    `SELECT * FROM employee_documents WHERE company_id = $1
       AND employee_id = $2 ORDER BY created_at, id`,
    [ctx.tenant!.companyId, emp.id]);
  const items: EmployeeDocument[] = [];
  for (const r of rows) items.push(await toDocumentView(ctx, r, access,
    false));
  return { items };
}

/** POST /v1/employee-documents/{id}/verify: stamps the current one. */
export async function verifyDocument(ctx: ReqCtx<unknown, unknown, Id>)
  : Promise<EmployeeDocument> {
  const { d } = await visibleDoc(ctx, ctx.params.id);
  const cur = (await loadVersions(ctx, d.id)).at(-1)!;
  await ctx.tx.query(
    `UPDATE employee_document_versions SET verified_by = $3,
       verified_at = $4 WHERE company_id = $1 AND id = $2
       AND verified_by IS NULL`,
    [ctx.tenant!.companyId, cur.id, ctx.user!.id,
      ctx.deps.now().toISOString()]);
  await audit(ctx, "document.verified", d.id, { documentId: d.id,
    version: cur.version });
  return toDocumentView(ctx, d, "full", true);
}

/** GET .../versions/{versionId}/download: owner, hr and self only. */
export async function downloadDocument(ctx: ReqCtx<unknown, unknown,
  { id: string; versionId: string }>): Promise<BinaryReply> {
  const { d, access } = await visibleDoc(ctx, ctx.params.id);
  if (access !== "full") throw new ApiError("NOT_FOUND");
  const v = (await loadVersions(ctx, d.id))
    .find((x) => x.id === ctx.params.versionId);
  if (v === undefined) throw new ApiError("NOT_FOUND");
  const { ref, bytes } = await readFile(ctx, v.file_id, attachOf(v.id));
  await audit(ctx, "document.downloaded", d.id, { documentId: d.id,
    version: v.version });
  return new BinaryReply(bytes, ref.mime, ref.name);
}
