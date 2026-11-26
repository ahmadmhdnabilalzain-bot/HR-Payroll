import type { Db } from "../db/db";
import type { BlobStore } from "../storage/blob";

export interface SweepDeps {
  /**
   * A connection that reads every company past row-level security
   * (deployed: `payroll_backup`). The owner role cannot: its tables
   * force RLS, so it sees no company without `app.company_id`.
   */
  list: Db;
  /** The table owner (deployed: `payroll_owner`), which may DELETE. */
  owner: Db;
  blobs: BlobStore;
  now: () => Date;
  olderThanHours: number;
}

/**
 * `main.ts sweep-files` (no scheduler): deletes files nobody claimed
 * within `olderThanHours`, company by company. Each delete runs on
 * the owner connection with `app.company_id` set to that company, so
 * forced RLS confines it to one tenant; the blobs go after commit.
 * Returns the number of files removed.
 */
export async function sweepUnclaimedFiles(d: SweepDeps): Promise<number> {
  const cutoff = new Date(d.now().getTime() - d.olderThanHours * 3600_000)
    .toISOString();
  const companies = await d.list.query<{ id: string }>(
    "SELECT id FROM companies ORDER BY id");
  let removed = 0;
  for (const { id } of companies) {
    const keys = await d.owner.transaction(async (tx) => {
      await tx.query("SELECT set_config('app.company_id', $1, true)", [id]);
      const rows = await tx.query<{ blob_key: string }>(
        `DELETE FROM files WHERE company_id = $1 AND attached_to IS NULL
           AND uploaded_at < $2 RETURNING blob_key`, [id, cutoff]);
      return rows.map((r) => r.blob_key);
    });
    for (const k of keys) await d.blobs.delete(k);
    removed += keys.length;
  }
  return removed;
}
