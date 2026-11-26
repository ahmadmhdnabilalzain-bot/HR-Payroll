import { beforeAll, describe, expect, it } from "vitest";
import type { Db } from "../src/db/db";
import { GLOBAL_TABLES } from "../src/db/tenant";
import { createTestDb, tenantTables } from "./helpers/test-db";

interface TableRow {
  relname: string;
  relrowsecurity: boolean;
  relforcerowsecurity: boolean;
}

describe("RLS catalog", () => {
  let db: Db;
  let tables: TableRow[];
  let tenant: string[];
  beforeAll(async () => {
    db = await createTestDb();
    tables = await db.query<TableRow>(
      `SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity
       FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = current_schema() AND c.relkind IN ('r', 'p')`);
    tenant = await tenantTables(db);
  });

  it("the global allowlist is exactly the three tables", () => {
    expect(GLOBAL_TABLES).toEqual(["schema_migrations", "users",
      "sessions"]);
  });

  it("every tenant table has RLS enabled, forced and a policy", async () => {
    for (const name of tenant) {
      const t = tables.find((x) => x.relname === name);
      expect(t?.relrowsecurity, name).toBe(true);
      expect(t?.relforcerowsecurity, name).toBe(true);
      const policies = await db.query(
        `SELECT 1 FROM pg_policies WHERE schemaname = current_schema()
         AND tablename = $1`, [name]);
      expect(policies.length, name).toBeGreaterThan(0);
    }
  });

  it("every other table is allowlisted as global", () => {
    const others = tables.map((t) => t.relname)
      .filter((n) => !tenant.includes(n));
    for (const n of others) expect(GLOBAL_TABLES, n).toContain(n);
  });

  it("payroll_app has no BYPASSRLS and owns no table", async () => {
    const [role] = await db.query<{ rolbypassrls: boolean }>(
      "SELECT rolbypassrls FROM pg_roles WHERE rolname = 'payroll_app'");
    expect(role?.rolbypassrls).toBe(false);
    const owned = await db.query(
      `SELECT 1 FROM pg_tables WHERE tableowner = 'payroll_app'`);
    expect(owned).toEqual([]);
  });
});
