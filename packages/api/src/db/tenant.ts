import { CodedError } from "../coded-error";
import type { Db } from "./db";

export interface TenantCtx {
  companyId: string | null;
  userId: string | null;
}

/** Tables without company_id and without RLS. Everything else has both. */
export const GLOBAL_TABLES = ["schema_migrations", "users", "sessions"];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function settingFor(name: string, id: string | null): string {
  if (id === null) return "";
  if (!UUID.test(id)) {
    throw new CodedError("TENANT_ID", `${name} is not a uuid`);
  }
  return id;
}

/**
 * The only way application code reaches tenant data: one transaction,
 * as role payroll_app, with app.company_id and app.user_id set for this
 * transaction only (empty string when null, which matches no row).
 */
export async function withTenant<T>(
  db: Db,
  ctx: TenantCtx,
  fn: (tx: Db) => Promise<T>,
): Promise<T> {
  const company = settingFor("companyId", ctx.companyId);
  const user = settingFor("userId", ctx.userId);
  return db.transaction(async (tx) => {
    await tx.query("SET LOCAL ROLE payroll_app");
    await tx.query(
      `SELECT set_config('app.company_id', $1, true),
              set_config('app.user_id', $2, true)`, [company, user]);
    return fn(tx);
  });
}
