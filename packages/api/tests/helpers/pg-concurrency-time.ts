import { expect, it } from "vitest";
import { seedCompany } from "./seed";
import { asUser, seedTime } from "./seed-time";
import { enableWfh, minutes, nextMinute } from "./seed-wfh";
import { call, makeApp, signup } from "./test-app";
import { purgeAllCompanies } from "../../src/db/wfh-purge-all";
import {
  COMPANY_A,
  COMPANY_B,
  seedTwoCompanies,
  type DbPair,
} from "./test-db";
import type { Db } from "../../src/db/db";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Tracking on, consent given, a remote record clocked in. */
async function wfhSetup(db: Db, admin: Db) {
  const app = await makeApp({ db });
  // Seed helpers extend sessions through deps.db: give them admin.
  const ctx = { ...app, deps: { ...app.deps, db: admin } };
  const s = await seedCompany(ctx, `wr${Math.random().toString(36)
    .slice(2, 7)}`);
  await seedTime(ctx, s);
  await enableWfh(ctx, s);
  const as = asUser(ctx, s);
  await as(s.employee, "POST", "/v1/wfh/consent", { noticeVersion: 1,
    decision: "granted" });
  const rec = (await as(s.employee, "POST", "/v1/attendance/clock-in",
    { method: "web", workLocation: "remote" })).body;
  const first = nextMinute(new Date(Date.parse(rec.clockIn)));
  ctx.clock.now = new Date(first.getTime() + 239 * 60_000);
  return { s, as, rec, first };
}

const statuses = (rs: { status: number }[]) =>
  rs.map((r) => r.status).sort((a, b) => a - b);

/** Plan 9 races that pglite cannot show (it serialises). */
export function pgTimeConcurrencyCases(
  open: () => Promise<DbPair & { owner: Db }>): void {
  it("two prepares of one timesheet at once: one row", async () => {
    const { db, admin } = await open();
    const ctx = await makeApp({ db });
    const a = await signup(ctx.app, "sheetrace");
    const e = await call(ctx.app, a.token, a.companyId, "POST",
      "/v1/employees", { number: "E-1", fullName: "Person One",
        jobTitle: "Clerk", nationality: "IN",
        workerClass: "expat-full-time", joiningDate: "2019-01-01" });
    const body = { employeeId: e.body.id, year: 2026, month: 2 };
    const rs = await Promise.all([1, 2, 3].map(() => call(ctx.app, a.token,
      a.companyId, "POST", "/v1/time/timesheets", body)));
    expect(statuses(rs)).toEqual([200, 200, 201]);
    const n = await admin.query<{ n: bigint }>(
      "SELECT count(*) AS n FROM timesheets WHERE employee_id = $1",
      [e.body.id]);
    expect(Number(n[0]!.n)).toBe(1);
  });

  // Review N4: a fixed order, not a timing guess. A third session holds
  // an uncommitted row with the upload's first key, so the upload is
  // stuck on its first insert; withdraw-and-erase runs meanwhile.
  // Without the shared employee lock the upload, having already read
  // consent, commits its rows after the erase (red).
  it("withdraw with erase during a stuck upload leaves no rows",
    async () => {
      const { db, admin } = await open();
      const w = await wfhSetup(db, admin);
      let release!: () => void;
      const gate = new Promise<void>((r) => { release = r; });
      let held!: () => void;
      const holding = new Promise<void>((r) => { held = r; });
      const blocker = admin.transaction(async (tx) => {
        await tx.query(
          `INSERT INTO wfh_activity_minutes (company_id, employee_id,
             attendance_id, at, active, category)
           VALUES ($1, $2, $3, $4, true, NULL)`,
          [w.s.companyId, w.s.emp.report, w.rec.id,
            w.first.toISOString()]);
        held();
        await gate;
        throw new Error("rollback");
      }).catch(() => undefined);
      await holding;
      const up = w.as(w.s.employee, "POST", "/v1/wfh/activity", {
        attendanceId: w.rec.id, minutes: minutes(w.first, 240) });
      await sleep(300);
      const wd = w.as(w.s.employee, "POST", "/v1/wfh/consent/withdraw",
        { erase: true });
      await sleep(300);
      release();
      await blocker;
      const [u, x] = await Promise.all([up, wd]);
      expect([200, 422]).toContain(u.status);
      expect(x.status, x.text).toBe(200);
      const n = await admin.query("SELECT 1 FROM wfh_activity_minutes");
      expect(n.length).toBe(0);
    });

  it("purge-wfh as the deployed roles purges every company (N3)",
    async () => {
      const { db, admin, owner } = await open();
      await seedTwoCompanies(admin);
      for (const c of [COMPANY_A, COMPANY_B]) {
        await admin.query(`UPDATE wfh_settings SET retention_days = 30
          WHERE company_id = $1`, [c]);
      }
      const n = await purgeAllCompanies(owner, db,
        { now: () => new Date("2026-06-01T00:00:00Z") });
      expect(n).toBeGreaterThanOrEqual(2);
      const left = await admin.query("SELECT 1 FROM wfh_activity_minutes");
      expect(left).toEqual([]);
      const forced = await admin.query<{ f: boolean }>(`SELECT
        relforcerowsecurity AS f FROM pg_class WHERE relname = 'companies'
        AND relnamespace = (SELECT oid FROM pg_namespace
          WHERE nspname = current_schema())`);
      expect(forced[0]?.f).toBe(true);
    });

  it("two carry-over runs at once store one set of rows", async () => {
    const { db, admin } = await open();
    const ctx = await makeApp({ db });
    const a = await signup(ctx.app, "carryrace");
    const go = (m: string, p: string, b?: unknown) => call(ctx.app, a.token,
      a.companyId, m, p, b);
    await go("POST", "/v1/employees", { number: "E-1", fullName: "One",
      jobTitle: "Clerk", nationality: "IN", workerClass: "expat-full-time",
      joiningDate: "2019-01-01" });
    const t = await go("POST", "/v1/leave-types", { name: "Type C",
      paid: true, annualDays: 30 });
    await go("PUT", `/v1/leave-types/${t.body.id}/policy`, {
      payrollKind: "annual", accrual: "upfront", joiningYearProRata: false,
      dayCount: "calendar", halfDays: false, carryOverMaxDays: 5,
      carryOverExpiresMonths: null, minNoticeDays: 0,
      maxConsecutiveDays: null, allowNegative: false });
    const rs = await Promise.all([1, 2, 3].map(() => go("POST",
      "/v1/leave-carry-over", { fromYear: 2025 })));
    expect(statuses(rs)).toEqual([200, 200, 200]);
    expect(rs.filter((r) => r.body.alreadyRun === false).length).toBe(1);
    const n = await admin.query("SELECT 1 FROM leave_carryovers");
    expect(n.length).toBe(1);
  });
}
