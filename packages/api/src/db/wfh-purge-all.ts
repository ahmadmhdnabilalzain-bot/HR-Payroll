import type { HandlerDeps } from "../deps";
import { purgeExpiredWfh } from "../wfh/retention";
import type { Db } from "./db";
import { withTenant } from "./tenant";

const ROLLBACK = new Error("read only: roll back");

/**
 * Every company id, read on the owner (migration) connection. The
 * owner has no BYPASSRLS and RLS is forced on `companies`, so a plain
 * SELECT sees nothing (review N3). The owner owns the table, so it may
 * lift FORCE inside its own transaction; the change is never
 * committed (other sessions never see it) and only ids are read.
 */
export async function allCompanyIds(ownerDb: Db): Promise<string[]> {
  let ids: string[] = [];
  try {
    await ownerDb.transaction(async (tx) => {
      await tx.query("ALTER TABLE companies NO FORCE ROW LEVEL SECURITY");
      ids = (await tx.query<{ id: string }>(
        "SELECT id FROM companies ORDER BY id")).map((r) => r.id);
      throw ROLLBACK;
    });
  } catch (e) {
    if (e !== ROLLBACK) throw e;
  }
  return ids;
}

/**
 * `main.ts purge-wfh` (no scheduler): lists company ids as the owner,
 * then purges each company in its own tenant transaction on the app
 * connection, so no purge can reach another company's rows. Returns
 * the number of companies.
 */
export async function purgeAllCompanies(ownerDb: Db, appDb: Db,
  deps: Pick<HandlerDeps, "now">): Promise<number> {
  const ids = await allCompanyIds(ownerDb);
  for (const id of ids) {
    await withTenant(appDb, { companyId: id, userId: null }, (tx) =>
      purgeExpiredWfh(tx, deps.now(), id, null));
  }
  return ids.length;
}
