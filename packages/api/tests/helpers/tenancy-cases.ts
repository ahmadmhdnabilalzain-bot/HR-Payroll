import { beforeEach, expect, it } from "vitest";
import type { Db } from "../../src/db/db";
import { withTenant } from "../../src/db/tenant";
import {
  COMPANY_A,
  COMPANY_B,
  USER_A,
  USER_B,
  seedTwoCompanies,
  tenantTables,
} from "./test-db";

const AT = "2026-03-01T08:00:00.000Z";

/** The tenancy cases, shared by the pglite and real-pg suites. */
export function tenancyCases(open: () => Promise<Db>): void {
  let db: Db;
  beforeEach(async () => {
    db = await open();
    await seedTwoCompanies(db);
  });

  it("a tenant sees only its own memberships", async () => {
    const rows = await withTenant(db, { companyId: COMPANY_A,
      userId: null }, (tx) => tx.query<{ company_id: string }>(
      "SELECT company_id FROM memberships"));
    expect(rows.map((r) => r.company_id)).toEqual([COMPANY_A]);
  });

  it("writing another company's row throws and rolls back", async () => {
    const attempt = withTenant(db, { companyId: COMPANY_A, userId: null },
      async (tx) => {
        await tx.query("UPDATE companies SET name = 'changed'");
        await tx.query(
          `INSERT INTO memberships (company_id, user_id, role, created_at)
           VALUES ($1, $2, 'hr', $3)`, [COMPANY_B, USER_A, AT]);
      });
    await expect(attempt).rejects.toThrow(/row-level security/);
    const names = await db.query<{ name: string }>(
      "SELECT name FROM companies ORDER BY name");
    expect(names.map((r) => r.name)).toEqual(["Company a", "Company b"]);
  });

  it("no tenant set: zero rows from every tenant table", async () => {
    const tables = await tenantTables(db);
    expect(tables).toContain("memberships");
    for (const t of tables) {
      const rows = await withTenant(db, { companyId: null, userId: null },
        (tx) => tx.query(`SELECT * FROM ${t}`));
      expect(rows, t).toEqual([]);
    }
  });

  it("a user sees their own memberships across companies", async () => {
    const rows = await withTenant(db, { companyId: null, userId: USER_B },
      (tx) => tx.query<{ company_id: string }>(
        "SELECT company_id FROM memberships"));
    expect(rows.map((r) => r.company_id)).toEqual([COMPANY_B]);
  });

  it("leaves no app.company_id behind", async () => {
    await withTenant(db, { companyId: COMPANY_A, userId: USER_A },
      (tx) => tx.query("SELECT 1"));
    const [row] = await db.query<{ c: string | null; u: string }>(
      `SELECT current_setting('app.company_id', true) AS c,
       current_user AS u`);
    expect(row?.c ?? "").toBe("");
    expect(row?.u).not.toBe("payroll_app");
  });

  it("payroll_app cannot delete memberships", async () => {
    const attempt = withTenant(db, { companyId: COMPANY_A, userId: null },
      (tx) => tx.query("DELETE FROM memberships"));
    await expect(attempt).rejects.toThrow(/permission denied/);
  });

  it("refuses a company id that is not a uuid", async () => {
    const attempt = withTenant(db, { companyId: "x' OR 1=1",
      userId: null }, (tx) => tx.query("SELECT 1"));
    await expect(attempt).rejects.toThrow(/TENANT_ID/);
  });
}
