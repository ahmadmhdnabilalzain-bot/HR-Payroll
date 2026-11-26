import type { HandlerDeps } from "../deps";
import { purgeExpiredWfh } from "../wfh/retention";
import type { Db } from "./db";
import { withTenant } from "./tenant";

/**
 * `main.ts purge-wfh` (no scheduler): lists company ids on the
 * migrate (owner) connection, then purges each company in its own
 * tenant transaction on the app connection, so no purge can reach
 * another company's rows. Returns the number of companies.
 */
export async function purgeAllCompanies(ownerDb: Db, appDb: Db,
  deps: Pick<HandlerDeps, "now">): Promise<number> {
  const rows = await ownerDb.query<{ id: string }>(
    "SELECT id FROM companies ORDER BY id");
  for (const r of rows) {
    await withTenant(appDb, { companyId: r.id, userId: null }, (tx) =>
      purgeExpiredWfh(tx, deps.now(), r.id, null));
  }
  return rows.length;
}
