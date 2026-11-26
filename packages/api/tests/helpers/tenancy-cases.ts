import { beforeEach, expect, it } from "vitest";
import type { Db } from "../../src/db/db";
import { withTenant } from "../../src/db/tenant";
import {
  COMPANY_A,
  COMPANY_B,
  USER_A,
  USER_AB,
  seedTwoCompanies,
  tenantTables,
  type DbPair,
} from "./test-db";

const AT = "2026-03-01T08:00:00.000Z";

const companyOf = (t: string) => (t === "companies" ? "id" : "company_id");

/** The tenancy cases, shared by the pglite and real-pg suites. */
export function tenancyCases(open: () => Promise<DbPair>): void {
  let db: Db;
  let admin: Db;
  beforeEach(async () => {
    ({ db, admin } = await open());
    await seedTwoCompanies(admin);
  });

  it("every tenant table is seeded for both companies", async () => {
    for (const t of await tenantTables(admin)) {
      for (const c of [COMPANY_A, COMPANY_B]) {
        const rows = await admin.query(
          `SELECT 1 FROM ${t} WHERE ${companyOf(t)} = $1`, [c]);
        expect(rows.length, `${t} ${c}`).toBeGreaterThan(0);
      }
    }
  });

  it("a tenant sees exactly its own rows in every table", async () => {
    for (const t of await tenantTables(admin)) {
      const rows = await withTenant(db, { companyId: COMPANY_A,
        userId: USER_A }, (tx) => tx.query<{ c: string }>(
        `SELECT ${companyOf(t)} AS c FROM ${t}`));
      expect(rows.length, t).toBeGreaterThan(0);
      expect(rows.every((r) => r.c === COMPANY_A), t).toBe(true);
    }
  });

  it("inside a tenant, other companies of the user stay hidden",
    async () => {
      const ctx = { companyId: COMPANY_A, userId: USER_AB };
      const m = await withTenant(db, ctx, (tx) => tx.query<{
        company_id: string }>("SELECT company_id FROM memberships"));
      expect(new Set(m.map((r) => r.company_id))).toEqual(
        new Set([COMPANY_A]));
      const c = await withTenant(db, ctx, (tx) => tx.query<{ id: string }>(
        "SELECT id FROM companies"));
      expect(c.map((r) => r.id)).toEqual([COMPANY_A]);
    });

  it("with no tenant, a user sees their own memberships", async () => {
    const rows = await withTenant(db, { companyId: null, userId: USER_AB },
      (tx) => tx.query<{ company_id: string }>(
        "SELECT company_id FROM memberships ORDER BY company_id"));
    expect(rows.map((r) => r.company_id)).toEqual([COMPANY_A, COMPANY_B]);
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
    const names = await admin.query<{ name: string }>(
      "SELECT name FROM companies ORDER BY name");
    expect(names.map((r) => r.name)).toEqual(["Company a", "Company b"]);
  });

  it("no tenant set: zero rows from every tenant table", async () => {
    const tables = await tenantTables(admin);
    expect(tables).toContain("audit_events");
    for (const t of tables) {
      const rows = await withTenant(db, { companyId: null, userId: null },
        (tx) => tx.query(`SELECT * FROM ${t}`));
      expect(rows, t).toEqual([]);
    }
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

  it("payroll_app cannot delete or truncate", async () => {
    const del = withTenant(db, { companyId: COMPANY_A, userId: null },
      (tx) => tx.query("DELETE FROM memberships"));
    await expect(del).rejects.toThrow(/permission denied/);
    await expect(admin.query("TRUNCATE audit_events CASCADE"))
      .rejects.toThrow(/append-only/);
  });

  it("refuses a company id that is not a uuid", async () => {
    const attempt = withTenant(db, { companyId: "x' OR 1=1",
      userId: null }, (tx) => tx.query("SELECT 1"));
    await expect(attempt).rejects.toThrow(/TENANT_ID/);
  });
}
