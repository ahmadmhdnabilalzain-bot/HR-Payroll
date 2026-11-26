import { CodedError } from "../coded-error";
import type { Db } from "./db";
import { withTenant } from "./tenant";

interface RoleRow {
  su: boolean;
  bypass: boolean;
  owned: bigint;
}

/**
 * Refuses to serve with an unsafe runtime login role: a superuser or
 * BYPASSRLS role ignores row-level security, and a table owner can
 * TRUNCATE, disable triggers or drop policies. Also proves the role
 * may `SET ROLE payroll_app` (PostgreSQL 16 needs `WITH SET TRUE`).
 */
export async function assertRuntimeRole(db: Db): Promise<void> {
  const [r] = await db.query<RoleRow>(
    `SELECT r.rolsuper AS su, r.rolbypassrls AS bypass,
       (SELECT count(*) FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = current_schema() AND c.relkind IN ('r', 'p')
          AND c.relowner = r.oid) AS owned
     FROM pg_roles r WHERE r.rolname = current_user`);
  const reason = r === undefined ? "role not found"
    : r.su ? "is a superuser"
    : r.bypass ? "has BYPASSRLS"
    : r.owned > 0n ? "owns tables (use a separate migration role)"
    : null;
  if (reason !== null) {
    throw new CodedError("UNSAFE_DB_ROLE", `runtime role ${reason}`);
  }
  await withTenant(db, { companyId: null, userId: null },
    (tx) => tx.query("SELECT 1"));
}
