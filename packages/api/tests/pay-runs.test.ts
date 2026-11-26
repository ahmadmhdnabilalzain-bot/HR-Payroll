import { Payslip } from "@payroll/contract";
import { beforeAll, describe, expect, it } from "vitest";
import { withTenant } from "../src/db/tenant";
import {
  addOwner,
  EMPLOYEE_PAY,
  march,
  postRun,
  SALARY_SENTINEL,
  salaryOf,
  seedCompany,
  type Seeded,
  type SeedUser,
} from "./helpers/seed";
import { call, login, makeApp, PASSWORD } from "./helpers/test-app";

describe("pay runs and payslips", () => {
  let ctx: Awaited<ReturnType<typeof makeApp>>;
  let s: Seeded;
  let owner2: SeedUser;
  let runId: string;
  const as = (u: SeedUser, method: string, path: string, body?: unknown) =>
    call(ctx.app, u.token, s.companyId, method, path, body);
  const rows = (sql: string) => withTenant(ctx.deps.db, {
    companyId: s.companyId, userId: null }, (tx) => tx.query(sql));
  beforeAll(async () => {
    ctx = await makeApp();
    s = await seedCompany(ctx, "pay");
    owner2 = await addOwner(ctx, s);
  });

  it("hr creates; hr cannot approve; MFA and no double approval",
    async () => {
      const r = await postRun(ctx, s.hr, s, "m-1", march);
      expect(r.status, r.text).toBe(201);
      runId = r.body.id;
      expect(r.body).toMatchObject({ status: "draft", employeeCount: 4,
        sifFileId: null });
      expect((await as(s.hr, "POST", `/v1/pay-runs/${runId}/approve`))
        .body.error.code).toBe("FORBIDDEN");
      const plain = await login(ctx.app, s.owner.email, PASSWORD);
      const noMfa = await call(ctx.app, plain.body.token, s.companyId,
        "POST", `/v1/pay-runs/${runId}/approve`);
      expect(noMfa.body.error.code).toBe("MFA_REQUIRED");
      const mine = await as(s.employee, "GET", "/v1/me/payslips");
      expect(mine.body.items).toEqual([]);
      const ok = await as(s.owner, "POST", `/v1/pay-runs/${runId}/approve`);
      expect(ok.status, ok.text).toBe(200);
      expect(ok.body.status).toBe("approved");
      expect((await as(s.owner, "POST", `/v1/pay-runs/${runId}/approve`))
        .body.error.code).toBe("RUN_NOT_DRAFT");
    });

  it("the creator cannot approve their own run", async () => {
    const r = await postRun(ctx, s.owner, s, "a-1",
      { period: { year: 2026, month: 4 }, entries: [] });
    const sod = await as(s.owner, "POST", `/v1/pay-runs/${r.body.id}/approve`);
    expect(sod.body.error.code).toBe("SOD_VIOLATION");
    const ok = await as(owner2, "POST", `/v1/pay-runs/${r.body.id}/approve`);
    expect(ok.status, ok.text).toBe(200);
  });

  it("employee sees own payslips of approved runs only", async () => {
    const mine = await as(s.employee, "GET", "/v1/me/payslips");
    expect(mine.status).toBe(200);
    const slip = mine.body.items.find((p: { payRunId: string }) =>
      p.payRunId === runId);
    expect(Payslip.parse(slip).lines.map((l) => [l.code, l.amount]))
      .toEqual([["basic", EMPLOYEE_PAY], ["housing", "1500.00"]]);
    expect(slip.gross).toBe("3722.22");
    expect((await as(s.employee, "GET", `/v1/payslips/${slip.id}`)).status)
      .toBe(200);
    const all = await as(s.hr, "GET", `/v1/pay-runs/${runId}/payslips`);
    const colleague = all.body.items.find((p: { employeeId: string }) =>
      p.employeeId === s.emp.outsider);
    expect(colleague.gross).toBe("9277.77");
    for (const who of [s.employee, s.manager]) {
      expect((await as(who, "GET", `/v1/payslips/${colleague.id}`)).status)
        .toBe(404);
    }
  });

  it("no amount in audit data or clear payslip columns", async () => {
    const ev = await rows("SELECT data FROM audit_events WHERE action = " +
      "'pay-run.created'");
    expect(ev[0]).toMatchObject({ data: { year: 2026, month: 3,
      employeeCount: 4 } });
    const text = JSON.stringify(ev);
    expect(text).not.toMatch(/\d+\.\d{2}/);
    expect(JSON.stringify(await rows("SELECT * FROM payslips")))
      .not.toContain(SALARY_SENTINEL);
    expect(JSON.stringify(await rows("SELECT snapshot_enc FROM pay_runs")))
      .not.toContain("777777");
  });

  it("payslips only go into drafts; the creator never approves (DB)",
    async () => {
      const ctx2 = { companyId: s.companyId, userId: null };
      const insert = withTenant(ctx.deps.db, ctx2, (tx) => tx.query(
        `INSERT INTO payslips (id, company_id, pay_run_id, employee_id,
           body_enc, created_at) VALUES ($1, $2, $3, $4, 'x', $5)`,
        ["00000000-0000-4000-8000-0000000fffff", s.companyId, runId,
          s.emp.report2, "2026-03-31T00:00:00.000Z"]));
      await expect(insert).rejects.toThrow(/draft pay runs/);
      const r = await postRun(ctx, s.hr, s, "sod-db", { period:
        { year: 2027, month: 1 }, entries: [] });
      const self = withTenant(ctx.deps.db, ctx2, (tx) => tx.query(
        `UPDATE pay_runs SET status = 'approved', approved_by = created_by
         WHERE id = $1`, [r.body.id]));
      await expect(self).rejects.toThrow(/pay_runs_sod/);
      await as(s.hr, "POST", `/v1/pay-runs/${r.body.id}/void`);
    });

  it("a company with nobody in the period gets no run", async () => {
    const r = await postRun(ctx, s.hr, s, "empty-1",
      { period: { year: 2010, month: 1 }, entries: [] });
    expect(r.status).toBe(422);
    expect(r.body.error.code).toBe("RUN_EMPTY");
  });

  it("an amount above the wire cap is a problem, not a 500", async () => {
    const r = await postRun(ctx, s.hr, s, "cap-1", { period:
      { year: 2027, month: 2 }, entries: [{ employeeId: s.emp.report,
        oneOffs: [{ code: "bonus", label: "Bonus", amount: "999999999.99",
          sifBucket: "otherAllowances" }] }] });
    expect(r.status).toBe(422);
    expect(r.body.error.detail.problems).toEqual([{
      employeeId: s.emp.report, code: "VALIDATION_FAILED",
      missing: ["gross"] }]);
  });

  it("a draft whose inputs changed cannot be approved", async () => {
    const r = await postRun(ctx, s.hr, s, "may-1",
      { period: { year: 2026, month: 5 }, entries: [] });
    await as(s.hr, "PUT", `/v1/employees/${s.emp.report}/salary`,
      salaryOf("2300.00"));
    const a = await as(s.owner, "POST", `/v1/pay-runs/${r.body.id}/approve`);
    expect(a.status).toBe(409);
    expect(a.body.error.code).toBe("RUN_INPUTS_CHANGED");
  });

  it("problems list ids and codes, never amounts", async () => {
    const j = await as(s.hr, "POST", "/v1/employees", { number: "J-1",
      fullName: "Joiner", jobTitle: "Clerk", nationality: "IN",
      workerClass: "expat-full-time", joiningDate: "2026-06-10",
      labourPersonId: "00000000000099" });
    await as(s.owner, "PUT", `/v1/employees/${j.body.id}/salary`,
      salaryOf(SALARY_SENTINEL));
    await as(s.owner, "PUT", `/v1/employees/${j.body.id}/bank`,
      { routingCode: "803320101", iban: "AE990000000000000000099" });
    const r = await postRun(ctx, s.hr, s, "jun-1",
      { period: { year: 2026, month: 6 }, entries: [] });
    expect(r.status).toBe(422);
    expect(r.body.error.code).toBe("PAY_RUN_PROBLEMS");
    expect(r.body.error.detail.problems).toEqual([{ employeeId: j.body.id,
      code: "ENTERED_AMOUNTS_REQUIRED", missing: ["basic", "housing"] }]);
    expect(r.text).not.toContain(SALARY_SENTINEL);
  });

  it("a run needs bank details and a labour id for everyone", async () => {
    const e = await as(s.hr, "POST", "/v1/employees", { number: "N-1",
      fullName: "No Bank", jobTitle: "Clerk", nationality: "IN",
      workerClass: "expat-full-time", joiningDate: "2019-01-01" });
    await as(s.owner, "PUT", `/v1/employees/${e.body.id}/salary`,
      salaryOf("1000.00"));
    const r = await postRun(ctx, s.hr, s, "nb-1",
      { period: { year: 2027, month: 3 }, entries: [] });
    expect(r.status).toBe(422);
    expect(r.body.error.detail.problems).toContainEqual({
      employeeId: e.body.id, code: "EMPLOYEE_BANK_MISSING",
      missing: ["bank", "labourPersonId"] });
    await as(s.hr, "PATCH", `/v1/employees/${e.body.id}`,
      { lastWorkingDate: "2026-07-31" });
  });

  it("a run lists who changed since the last approved run", async () => {
    await as(s.owner, "PUT", `/v1/employees/${s.emp.outsider}/bank`,
      { routingCode: "803320101", iban: "AE880000000000000000088" });
    const r = await postRun(ctx, s.hr, s, "aug-1", { period:
      { year: 2026, month: 8 }, entries: [] });
    expect(r.status, r.text).toBe(201);
    const changes = r.body.changedSinceLastRun as { employeeId: string;
      fields: string[] }[];
    expect(changes).toContainEqual({ employeeId: s.emp.outsider,
      fields: ["bank"] });
    expect(changes).toContainEqual({ employeeId: s.emp.report,
      fields: ["salary"] });
    expect(JSON.stringify(changes)).not.toMatch(/AE88|2300/);
  });
});
