import type { Db } from "../../src/db/db";

const AT = "2026-03-01T08:00:00.000Z";

/** A uuid made from a 2-hex-digit slot and the company id. */
const rowId = (c: string, slot: string) => `${slot}${c.slice(2)}`;

/**
 * One row in every Plan 7 tenant table for company `c` (admin handle,
 * past RLS). `emp` is a seeded employee, `user` a seeded user.
 */
export async function seedDocumentRows(admin: Db, c: string, emp: string,
  user: string): Promise<void> {
  const file = rowId(c, "d1");
  await admin.query(
    `INSERT INTO files (id, company_id, name, mime, size, sha256, blob_key,
       uploaded_by, uploaded_at) VALUES ($1, $2, 'f.pdf',
       'application/pdf', 1, $3, $4, $5, $6)`,
    [file, c, "0".repeat(64), `${c}/files/${file}`, user, AT]);
  const doc = rowId(c, "d2");
  await admin.query(
    `INSERT INTO employee_documents (id, company_id, employee_id, type,
       created_at) VALUES ($1, $2, $3, 'contract', $4)`, [doc, c, emp, AT]);
  await admin.query(
    `INSERT INTO employee_document_versions (id, company_id, document_id,
       version, file_id, uploaded_by, uploaded_at)
     VALUES ($1, $2, $3, 1, $4, $5, $6)`,
    [rowId(c, "d3"), c, doc, file, user, AT]);
  await seedLibraryRows(admin, c, emp, user);
  await seedTemplateRows(admin, c, user);
  await seedLetterRows(admin, c, emp, user);
  await admin.query(
    `INSERT INTO emiratisation_flags (company_id, employee_id, skilled,
       updated_at) VALUES ($1, $2, true, $3)`, [c, emp, AT]);
  await admin.query(
    `INSERT INTO emiratisation_settings (company_id, overrides,
       updated_at) VALUES ($1, '{}', $2)`, [c, AT]);
  await admin.query(
    `INSERT INTO document_settings (company_id, lead_days, retention,
       updated_at) VALUES ($1, '{}', '{}', $2)`, [c, AT]);
}

async function seedLibraryRows(admin: Db, c: string, emp: string,
  user: string): Promise<void> {
  const file = rowId(c, "d4");
  await admin.query(
    `INSERT INTO files (id, company_id, name, mime, size, sha256, blob_key,
       uploaded_by, uploaded_at) VALUES ($1, $2, 'l.pdf',
       'application/pdf', 1, $3, $4, $5, $6)`,
    [file, c, "0".repeat(64), `${c}/files/${file}`, user, AT]);
  const lib = rowId(c, "d5");
  await admin.query(
    `INSERT INTO library_documents (id, company_id, title, category,
       audience, created_by, created_at)
     VALUES ($1, $2, 'Policy', 'policy', '{}', $3, $4)`, [lib, c, user, AT]);
  const ver = rowId(c, "d6");
  await admin.query(
    `INSERT INTO library_versions (id, company_id, document_id, version,
       file_id, requires_ack, published_by, published_at)
     VALUES ($1, $2, $3, 1, $4, true, $5, $6)`,
    [ver, c, lib, file, user, AT]);
  await admin.query(
    `INSERT INTO library_receipts (company_id, version_id, user_id,
       employee_id, viewed_at) VALUES ($1, $2, $3, $4, $5)`,
    [c, ver, user, emp, AT]);
}

async function seedTemplateRows(admin: Db, c: string, user: string)
  : Promise<void> {
  const t = rowId(c, "d7");
  await admin.query(
    `INSERT INTO letter_templates (id, company_id, kind, name, lang,
       starter, created_at) VALUES ($1, $2, 'noc', 'N', 'en', false, $3)`,
    [t, c, AT]);
  await admin.query(
    `INSERT INTO letter_template_versions (id, company_id, template_id,
       version, status, body, fields, uses_salary, created_by, created_at,
       published_at) VALUES ($1, $2, $3, 1, 'published',
       '{"title":"N","paragraphs":["x"]}', '{}', false, $4, $5, $5)`,
    [rowId(c, "d8"), c, t, user, AT]);
}

async function seedLetterRows(admin: Db, c: string, emp: string,
  user: string): Promise<void> {
  const file = rowId(c, "d9");
  await admin.query(
    `INSERT INTO files (id, company_id, name, mime, size, sha256, blob_key,
       uploaded_by, uploaded_at) VALUES ($1, $2, 'n.pdf',
       'application/pdf', 1, $3, $4, $5, $6)`,
    [file, c, "0".repeat(64), `${c}/files/${file}`, user, AT]);
  await admin.query(
    `INSERT INTO letters (id, company_id, kind, lang, template_id,
       template_version_id, template_version, employee_id, issued_by,
       issued_at, file_id, file_name, sha256, uses_salary, merge_enc)
     VALUES ($1, $2, 'noc', 'en', $3, $4, 1, $5, $6, $7, $8, 'n.pdf', $9,
       false, 'x')`,
    [rowId(c, "da"), c, rowId(c, "d7"), rowId(c, "d8"), emp, user, AT,
      file, "0".repeat(64)]);
}
