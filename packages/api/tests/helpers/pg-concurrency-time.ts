import { expect, it } from "vitest";
import { call, makeApp, signup } from "./test-app";
import type { DbPair } from "./test-db";

const statuses = (rs: { status: number }[]) =>
  rs.map((r) => r.status).sort((a, b) => a - b);

/** Plan 9 races that pglite cannot show (it serialises). */
export function pgTimeConcurrencyCases(open: () => Promise<DbPair>): void {
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
