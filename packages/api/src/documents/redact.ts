import type {
  DocumentType,
  DocumentVersion,
  EmployeeDocument,
} from "@payroll/contract";
import { companyKey, fileRefs, type FileCtx } from "../files/files";
import type { Access } from "./access";

export interface DocRow {
  id: string;
  employee_id: string;
  type: DocumentType;
  label: string | null;
  created_at: string;
}

export interface VerRow {
  id: string;
  document_id: string;
  version: number;
  file_id: string;
  number_enc: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  uploaded_by: string;
  uploaded_at: string;
  verified_by: string | null;
  verified_at: string | null;
}

export const numberAad = (companyId: string, versionId: string) =>
  `${companyId}:employee_document_versions:number:${versionId}`;

/** Versions of a slot, oldest first. */
export async function loadVersions(ctx: FileCtx, documentId: string)
  : Promise<VerRow[]> {
  return ctx.tx.query<VerRow>(
    `SELECT * FROM employee_document_versions WHERE company_id = $1
       AND document_id = $2 ORDER BY version`,
    [ctx.tenant!.companyId, documentId]);
}

async function fullVersions(ctx: FileCtx, vs: VerRow[])
  : Promise<DocumentVersion[]> {
  const c = ctx.tenant!.companyId;
  const refs = await fileRefs(ctx, vs.map((v) => v.file_id));
  const key = await companyKey(ctx);
  return vs.map((v) => ({ id: v.id, version: v.version,
    file: refs.get(v.file_id)!,
    documentNumber: v.number_enc === null ? null
      : key.decrypt(numberAad(c, v.id), v.number_enc),
    issueDate: v.issue_date, expiryDate: v.expiry_date,
    uploadedBy: v.uploaded_by, uploadedAt: v.uploaded_at,
    verifiedBy: v.verified_by, verifiedAt: v.verified_at }));
}

/**
 * The only function that serialises a document slot. Full access gets
 * the current version (number and file) and, when asked, every
 * version; limited access (the person's manager) gets type, label,
 * expiry, verified state and count, never a number or a file.
 */
export async function toDocumentView(ctx: FileCtx, d: DocRow,
  access: Access, withVersions: boolean): Promise<EmployeeDocument> {
  const vs = await loadVersions(ctx, d.id);
  const cur = vs.at(-1)!;
  const base = { id: d.id, employeeId: d.employee_id, type: d.type,
    label: d.label, expiryDate: cur.expiry_date,
    verified: cur.verified_by !== null, versionCount: vs.length };
  if (access === "limited") return { ...base, current: null };
  const shown = await fullVersions(ctx, withVersions ? vs : [cur]);
  const view: EmployeeDocument = { ...base, current: shown.at(-1)! };
  if (withVersions) view.versions = shown;
  return view;
}
