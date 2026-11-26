import { createHash } from "node:crypto";
import {
  RECEIPT_MAX_BYTES,
  type Receipt,
  type ReceiptContentType,
  type ReceiptSuggestion,
  type ReceiptUpload,
} from "@payroll/contract";
import { appendAudit } from "../audit/audit";
import { CodedError } from "../coded-error";
import { BinaryReply, type ReqCtx } from "../http/context";
import { ApiError } from "../http/errors";
import { loadEmployee, sealerFor } from "../people/employees";
import {
  decodedLength,
  decodeStrict,
  encodeBase64,
  isStrictBase64,
} from "./base64";
import { checkQuota } from "./quota";
import { readSuggestion } from "./reader";
import { sniffContentType } from "./sniff";

export interface ReceiptRow {
  id: string;
  employee_id: string;
  uploaded_by: string;
  file_name: string;
  content_type: ReceiptContentType;
  size: number;
  sha256: string;
  blob_key: string;
  suggestion: ReceiptSuggestion;
  uploaded_at: string;
}

const EXT: Record<ReceiptContentType, string> = { "image/jpeg": "jpg",
  "image/png": "png", "application/pdf": "pdf" };

const isPayroll = (ctx: ReqCtx) =>
  ctx.tenant!.role === "owner" || ctx.tenant!.role === "hr";

/** Extra viewers of a receipt (approvers of a claim that uses it). */
export type ReceiptViewerCheck = (ctx: ReqCtx, receiptId: string) =>
  Promise<boolean>;

/** Owner and hr; the receipt's employee; the uploader; then `extra`. */
export async function receiptVisible(ctx: ReqCtx, row: ReceiptRow,
  extra?: ReceiptViewerCheck): Promise<boolean> {
  if (isPayroll(ctx)) return true;
  if (row.employee_id === ctx.tenant!.employeeId) return true;
  if (row.uploaded_by === ctx.user!.id) return true;
  return extra === undefined ? false : extra(ctx, row.id);
}

/** Whose receipt: the caller's own employee unless owner or hr. */
async function targetEmployee(ctx: ReqCtx, asked: string | undefined)
  : Promise<string> {
  const own = ctx.tenant!.employeeId;
  const id = asked ?? own;
  if (id === null) throw new ApiError("NO_EMPLOYEE_LINK");
  if (id !== own && !isPayroll(ctx)) throw new ApiError("FORBIDDEN");
  await loadEmployee(ctx.tx, ctx.deps, ctx.tenant!.companyId, id);
  return id;
}

/**
 * The decoded, sniffed file. Every refusal happens before anything is
 * stored: strict base64 (400), size from the text length before
 * decoding (413), magic bytes (415), declared type (422).
 */
export function checkedFile(body: ReceiptUpload)
  : { bytes: Uint8Array; type: ReceiptContentType } {
  const text = body.dataBase64;
  if (!isStrictBase64(text)) throw new ApiError("RECEIPT_BASE64_INVALID");
  if (decodedLength(text) > RECEIPT_MAX_BYTES) {
    throw new ApiError("RECEIPT_TOO_LARGE");
  }
  const bytes = decodeStrict(text);
  if (bytes === null) throw new ApiError("RECEIPT_BASE64_INVALID");
  const type = sniffContentType(bytes);
  if (type === null) throw new ApiError("RECEIPT_TYPE_NOT_ALLOWED");
  if (type !== body.contentType) throw new ApiError("RECEIPT_TYPE_MISMATCH");
  return { bytes, type };
}

const aadOf = (companyId: string, id: string) =>
  ({ table: "receipts", column: "content" as const, companyId, id });

async function storeBytes(ctx: ReqCtx, id: string, key: string,
  bytes: Uint8Array): Promise<void> {
  const a = aadOf(ctx.tenant!.companyId, id);
  const sealer = await sealerFor(ctx.tx, ctx.deps, a.companyId, a.table);
  const cipher = sealer.seal(a.column, id, encodeBase64(bytes))!;
  await ctx.deps.blobs.put(key, new TextEncoder().encode(cipher));
}

const INSERT = `INSERT INTO receipts (id, company_id, employee_id,
    uploaded_by, file_name, content_type, size, sha256, blob_key,
    suggestion, uploaded_at)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`;

/**
 * POST /v1/receipts. The row is inserted before the blob is written,
 * so a refused row never leaves a file; a blob written by a request
 * that then fails is deleted again (`onFailure`).
 */
export async function uploadReceipt(ctx: ReqCtx<ReceiptUpload>)
  : Promise<Receipt> {
  const c = ctx.tenant!.companyId;
  const employeeId = await targetEmployee(ctx, ctx.body.employeeId);
  const { bytes, type } = checkedFile(ctx.body);
  await checkQuota(ctx);
  const id = ctx.deps.newId();
  const key = `${c}/receipts/${id}`;
  const suggestion = await readSuggestion(ctx.deps.receiptReader, bytes,
    type, ctx.deps.log, ctx.requestId);
  const at = ctx.deps.now().toISOString();
  await ctx.tx.query(INSERT, [id, c, employeeId, ctx.user!.id,
    ctx.body.fileName, type, bytes.length,
    createHash("sha256").update(bytes).digest("hex"), key,
    JSON.stringify(suggestion), at]);
  ctx.onFailure(() => ctx.deps.blobs.delete(key));
  await storeBytes(ctx, id, key, bytes);
  await appendAudit(ctx.tx, { companyId: c, at, actorUserId: ctx.user!.id,
    action: "receipt.uploaded", entityType: "receipt", entityId: id,
    data: { contentType: type, size: bytes.length } });
  return receiptView(ctx, await loadReceipt(ctx, id));
}

export async function loadReceipt(ctx: ReqCtx, id: string)
  : Promise<ReceiptRow> {
  const [r] = await ctx.tx.query<ReceiptRow>(
    "SELECT * FROM receipts WHERE company_id = $1 AND id = $2",
    [ctx.tenant!.companyId, id]);
  if (r === undefined) throw new ApiError("NOT_FOUND");
  return r;
}

/** Other receipts with the same bytes; non-payroll: same employee. */
async function duplicatesOf(ctx: ReqCtx, r: ReceiptRow): Promise<string[]> {
  const rows = await ctx.tx.query<{ id: string }>(
    `SELECT id FROM receipts WHERE company_id = $1 AND sha256 = $2
       AND id <> $3 AND ($4 OR employee_id = $5)
     ORDER BY uploaded_at, id`,
    [ctx.tenant!.companyId, r.sha256, r.id, isPayroll(ctx), r.employee_id]);
  return rows.map((x) => x.id);
}

async function receiptView(ctx: ReqCtx, r: ReceiptRow): Promise<Receipt> {
  return { id: r.id, employeeId: r.employee_id, fileName: r.file_name,
    contentType: r.content_type, size: r.size, sha256: r.sha256,
    uploadedAt: r.uploaded_at, suggestion: r.suggestion,
    duplicateOf: await duplicatesOf(ctx, r) };
}

/** A receipt the caller may see, else 404 (never 403). */
export async function visibleReceipt(ctx: ReqCtx, id: string,
  extra?: ReceiptViewerCheck): Promise<ReceiptRow> {
  const r = await loadReceipt(ctx, id);
  if (!(await receiptVisible(ctx, r, extra))) {
    throw new ApiError("NOT_FOUND");
  }
  return r;
}

export async function getReceipt(ctx: ReqCtx, id: string,
  extra?: ReceiptViewerCheck): Promise<Receipt> {
  return receiptView(ctx, await visibleReceipt(ctx, id, extra));
}

/** The decrypted bytes as an attachment named by id, never by upload. */
export async function downloadReceipt(ctx: ReqCtx, id: string,
  extra?: ReceiptViewerCheck): Promise<BinaryReply> {
  const r = await visibleReceipt(ctx, id, extra);
  const stored = await ctx.deps.blobs.get(r.blob_key);
  if (stored === null) {
    throw new CodedError("RECEIPT_BLOB_MISSING", "receipt file is missing");
  }
  const a = aadOf(ctx.tenant!.companyId, r.id);
  const sealer = await sealerFor(ctx.tx, ctx.deps, a.companyId, a.table);
  const plain = sealer.open(a.column, r.id,
    new TextDecoder().decode(stored))!;
  const bytes = new Uint8Array(Buffer.from(plain, "base64"));
  await appendAudit(ctx.tx, { companyId: a.companyId,
    at: ctx.deps.now().toISOString(), actorUserId: ctx.user!.id,
    action: "receipt.downloaded", entityType: "receipt", entityId: r.id,
    data: { contentType: r.content_type, size: r.size } });
  return new BinaryReply(bytes, r.content_type,
    `receipt-${r.id}.${EXT[r.content_type]}`);
}
