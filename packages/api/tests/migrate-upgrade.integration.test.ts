import { cpSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { Db } from "../src/db/db";
import { MIGRATIONS_DIR, migrate } from "../src/db/migrate";
import { openPg } from "../src/db/pg";
import { ADMIN_URL } from "./helpers/pg-env";

const C = "00000000-0000-4000-8000-0000000000c1";
const E = "00000000-0000-4000-8000-0000000000e1";
const LT = "00000000-0000-4000-8000-0000000000a1";
const U = "00000000-0000-4000-8000-0000000000b1";
const OWNER = "upg_owner";

function url(user: string | null, schema: string) {
  const u = new URL(ADMIN_URL!);
  if (user !== null) {
    u.username = user;
    u.password = "";
  }
  u.searchParams.set("options", `-csearch_path=${schema}`);
  return u.toString();
}

async function roles(schema: string) {
  const root = await openPg(ADMIN_URL!, { max: 1 });
  await root.exec(`DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${OWNER}')
    THEN CREATE ROLE ${OWNER} LOGIN NOSUPERUSER NOBYPASSRLS; END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'payroll_app')
    THEN CREATE ROLE payroll_app NOLOGIN NOBYPASSRLS; END IF; END $$`);
  const [d] = await root.query<{ d: string }>(
    "SELECT current_database() AS d");
  await root.exec(`GRANT CREATE ON DATABASE ${d!.d} TO ${OWNER}`);
  await root.exec(`CREATE SCHEMA ${schema} AUTHORIZATION ${OWNER}`);
  await root.close();
}

/** Every migration before Plan 9's, applied as the owner role. */
async function migrateBefore900(owner: Db) {
  const pre = mkdtempSync(join(tmpdir(), "upgmig-"));
  for (const f of readdirSync(MIGRATIONS_DIR)) {
    if (f < "900") cpSync(join(MIGRATIONS_DIR, f), join(pre, f));
  }
  await migrate(owner, pre);
  rmSync(pre, { recursive: true, force: true });
}

/** Plan 3 rows in leave_requests and attendance (past RLS). */
async function plan3Rows(admin: Db) {
  await admin.exec(`
    INSERT INTO companies (id, name, dek_wrapped, created_at)
      VALUES ('${C}', 'Co', 'x', now());
    INSERT INTO employees (id, company_id, number, full_name, job_title,
      nationality, worker_class, joining_date, created_at)
      VALUES ('${E}', '${C}', 'E-1', 'One', 'Clerk', 'IN',
        'expat-full-time', '2020-01-01', now());
    INSERT INTO leave_types (id, company_id, name, paid, annual_days,
      created_at) VALUES ('${LT}', '${C}', 'Annual', true, 30, now());
    INSERT INTO attendance (id, company_id, employee_id, date, clock_in,
      clock_out, minutes, source, created_at) VALUES
      ('00000000-0000-4000-8000-0000000020a1', '${C}', '${E}',
       '2026-01-05', '2026-01-05T05:00:00Z', '2026-01-05T13:00:00Z', 480,
       'self', now());`);
  for (const [i, a, b, st] of [["01", "2025-12-30", "2026-01-02",
    "approved"], ["02", "2026-02-27", "2026-03-01", "pending"]]) {
    await admin.query(`INSERT INTO leave_requests (id, company_id,
      employee_id, leave_type_id, start_date, end_date, days, status,
      created_by, created_at) VALUES ($1, $2, $3, $4, $5, $6,
      ($6::date - $5::date) + 1, $7, $8, now())`,
    [`00000000-0000-4000-8000-0000000010${i}`, C, E, LT, a, b, st, U]);
  }
}

/**
 * Review N1: Plan 9's migrations on a database that already has Plan 3
 * rows, run by the deployed owner role (no superuser, no BYPASSRLS,
 * FORCE RLS on its tables).
 */
describe.skipIf(!ADMIN_URL)("upgrade with existing rows, as the owner",
  () => {
    it("901-908 apply and backfill every Plan 3 request", async () => {
      const schema = `upg_${process.pid}_${Date.now() % 100000}`;
      await roles(schema);
      const owner = await openPg(url(OWNER, schema), { max: 1 });
      const admin = await openPg(url(null, schema), { max: 1 });
      try {
        await migrateBefore900(owner);
        await plan3Rows(admin);
        await migrate(owner, MIGRATIONS_DIR);
        const rows = await admin.query<{ units: number; n: string;
          want: number }>(`SELECT r.half_units AS units,
            count(d.date)::text AS n, (r.end_date - r.start_date) + 1 AS want
          FROM leave_requests r LEFT JOIN leave_request_dates d
            ON d.request_id = r.id GROUP BY r.id ORDER BY r.id`);
        expect(rows.map((r) => [r.units, Number(r.n)])).toEqual(
          rows.map((r) => [r.want * 2, r.want]));
        const forced = await admin.query<{ f: boolean }>(
          `SELECT relforcerowsecurity AS f FROM pg_class
           WHERE relname = 'leave_requests' AND relnamespace =
             (SELECT oid FROM pg_namespace WHERE nspname = $1)`, [schema]);
        expect(forced[0]?.f).toBe(true);
      } finally {
        await owner.close();
        await admin.close();
      }
    });
  });
