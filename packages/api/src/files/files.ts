import { createHash } from "node:crypto";
import {
  MAX_UPLOAD_BYTES,
  type AllowedMime,
  type FileRef,
  type FileUpload,
} from "@payroll/contract";
import { appendAudit } from "../audit/audit";
import { CodedError } from "../coded-error";
import type { CompanyKey } from "../crypto/keyring";
import type { ReqCtx } from "../http/context";
import { ApiError } from "../http/errors";
import {
  decodedLength,
  decodeStrict,
  isStrictBase64,
} from "../receipts/base64";
import { sniffContentType } from "../receipts/sniff";
import { safeFileName } from "./names";

/** What file storage needs from a request. */
export type FileCtx = Pick<ReqCtx, "tx" | "deps" | "tenant" | "user" |
  "onFailure">;

interface FileRow {
  id: string;
  name: string;
  mime: AllowedMime;
  size: number;
  sha256: string;
  blob_key: string;
  uploaded_by: string;
  uploaded_at: string;
  attached_to: string | null;
}

export const toFileRef = (r: FileRow): FileRef => ({ id: r.id,
  name: r.name, mime: r.mime, size: r.size, sha256: r.sha256,
  uploadedAt: r.uploaded_at });

const aadOf = (companyId: string, id: string) =>
  `${companyId}:files:blob:${id}`;
const sha256 = (b: Uint8Array) =>
  createHash("sha256").update(b).digest("hex");

/** The company data key, unwrapped for this request. */
export async function companyKey(ctx: FileCtx): Promise<CompanyKey> {
  const c = ctx.tenant!.companyId;
  const [row] = await ctx.tx.query<{ dek_wrapped: string }>(
    "SELECT dek_wrapped FROM companies WHERE id = $1", [c]);
  if (row === undefined) throw new ApiError("NOT_FOUND");
  return ctx.deps.keyring.companyKey(row.dek_wrapped, c);
}

/**
 * Strict base64 to bytes. Every refusal happens before decoding the
 * whole text: empty (400), not canonical base64 (400), more than the
 * maximum from the text length alone (413).
 */
export function decodeUpload(text: string): Uint8Array {
  if (text === "") throw new ApiError("FILE_EMPTY");
  if (!isStrictBase64(text)) throw new ApiError("FILE_BASE64_INVALID");
  if (decodedLength(text) > MAX_UPLOAD_BYTES) {
    throw new ApiError("FILE_TOO_LARGE");
  }
  const bytes = decodeStrict(text);
  if (bytes === null) throw new ApiError("FILE_BASE64_INVALID");
  if (bytes.length === 0) throw new ApiError("FILE_EMPTY");
  return bytes;
}

/**
 * Sniffs the bytes (415 unless PDF, PNG or JPEG), inserts the row,
 * then stores the encrypted bytes under `<companyId>/files/<fileId>`.
 */
export async function storeFile(ctx: FileCtx, name: string,
  bytes: Uint8Array): Promise<FileRef> {
  const mime = sniffContentType(bytes);
  if (mime === null) throw new ApiError("FILE_TYPE_NOT_ALLOWED");
  const c = ctx.tenant!.companyId;
  const id = ctx.deps.newId();
  const key = `${c}/files/${id}`;
  const [row] = await ctx.tx.query<FileRow>(
    `INSERT INTO files (id, company_id, name, mime, size, sha256,
       blob_key, uploaded_by, uploaded_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
    [id, c, safeFileName(name), mime, bytes.length, sha256(bytes), key,
      ctx.user!.id, ctx.deps.now().toISOString()]);
  const sealed = (await companyKey(ctx)).encryptBytes(aadOf(c, id), bytes);
  // A failed request (rolled back) removes the blob it wrote.
  ctx.onFailure(() => ctx.deps.blobs.delete(key));
  await ctx.deps.blobs.put(key, sealed);
  return toFileRef(row!);
}

/** POST /v1/files. Audit holds the id, type and size, never the name. */
export async function uploadFile(ctx: ReqCtx<FileUpload>)
  : Promise<FileRef> {
  const bytes = decodeUpload(ctx.body.contentBase64);
  const ref = await storeFile(ctx, ctx.body.name, bytes);
  await appendAudit(ctx.tx, { companyId: ctx.tenant!.companyId,
    at: ref.uploadedAt, actorUserId: ctx.user!.id,
    action: "file.uploaded", entityType: "file", entityId: ref.id,
    data: { fileId: ref.id, mime: ref.mime, size: ref.size } });
  return ref;
}

/**
 * Attaches an unclaimed file to `attachTo` ("<kind>:<id>") in one
 * conditional update: only the uploader, only once (the database also
 * keeps attached_to write-once). Not visible: 404; else 409.
 */
export async function claimFile(ctx: FileCtx, fileId: string,
  attachTo: string): Promise<FileRef> {
  const c = ctx.tenant!.companyId;
  const [row] = await ctx.tx.query<FileRow>(
    `UPDATE files SET attached_to = $3 WHERE company_id = $1 AND id = $2
       AND attached_to IS NULL AND uploaded_by = $4 RETURNING *`,
    [c, fileId, attachTo, ctx.user!.id]);
  if (row !== undefined) return toFileRef(row);
  const seen = await ctx.tx.query(
    "SELECT 1 FROM files WHERE company_id = $1 AND id = $2", [c, fileId]);
  throw new ApiError(seen.length === 0 ? "NOT_FOUND" : "FILE_NOT_AVAILABLE");
}

/** The references of attached files, by id. */
export async function fileRefs(ctx: FileCtx, ids: readonly string[])
  : Promise<Map<string, FileRef>> {
  if (ids.length === 0) return new Map();
  const rows = await ctx.tx.query<FileRow>(
    "SELECT * FROM files WHERE company_id = $1 AND id = ANY($2::uuid[])",
    [ctx.tenant!.companyId, [...ids]]);
  return new Map(rows.map((r) => [r.id, toFileRef(r)]));
}

/**
 * The decrypted bytes of a file attached to `attachedTo`. The blob key
 * comes only from the row seen through RLS; the stored sha256 is
 * checked after decrypting. A missing blob is an internal error.
 */
export async function readFile(ctx: FileCtx, fileId: string,
  attachedTo: string): Promise<{ ref: FileRef; bytes: Uint8Array }> {
  const c = ctx.tenant!.companyId;
  const [row] = await ctx.tx.query<FileRow>(
    `SELECT * FROM files WHERE company_id = $1 AND id = $2
       AND attached_to = $3`, [c, fileId, attachedTo]);
  if (row === undefined) throw new ApiError("NOT_FOUND");
  const stored = await ctx.deps.blobs.get(row.blob_key);
  if (stored === null) {
    throw new CodedError("FILE_BLOB_MISSING", "stored file is missing");
  }
  const bytes = (await companyKey(ctx)).decryptBytes(aadOf(c, row.id),
    stored);
  if (sha256(bytes) !== row.sha256) {
    throw new CodedError("FILE_HASH_MISMATCH", "stored file changed");
  }
  return { ref: toFileRef(row), bytes };
}
