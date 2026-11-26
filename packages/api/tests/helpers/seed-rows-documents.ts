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
  void emp;
  const file = rowId(c, "d1");
  await admin.query(
    `INSERT INTO files (id, company_id, name, mime, size, sha256, blob_key,
       uploaded_by, uploaded_at) VALUES ($1, $2, 'f.pdf',
       'application/pdf', 1, $3, $4, $5, $6)`,
    [file, c, "0".repeat(64), `${c}/files/${file}`, user, AT]);
}
