import { SIF_STATEMENT, SifFile } from "@payroll/contract";
import { generateSif } from "@payroll/wps";
import { beforeAll, describe, expect, it } from "vitest";
import { withTenant } from "../src/db/tenant";
import { loadSifBatch } from "../src/payroll/sif";
import {
  addOwner,
  EMPLOYEE_PAY,
  IBAN_SENTINEL,
  march,
  postRun,
  seedCompany,
  type Seeded,
  type SeedUser,
} from "./helpers/seed";
import { call, login, makeApp, PASSWORD } from "./helpers/test-app";

const WPS = { employerId: "0000000123456", bankRoutingCode: "802420101" };
const AT = "2026-03-31T21:00:00.000Z";
const NEW_IBAN = "AE990000000000000000099";

describe("SIF files", () => {
  let ctx: Awaited<ReturnType<typeof makeApp>>;
  let s: Seeded;
  let owner2: SeedUser;
  let runId: string;
  const as = (u: SeedUser, method: string, path: string, body?: unknown) =>
    call(ctx.app, u.token, s.companyId, method, path, body);
  const sif = () => as(s.hr, "POST", `/v1/pay-runs/${runId}/sif`);

  beforeAll(async () => {
    ctx = await makeApp({ start: "2026-03-31T15:00:00.000Z" });
    s = await seedCompany(ctx, "sif");
    owner2 = await addOwner(ctx, s);
    // A leaver on 31 March: settlement computed, never in the SIF.
    await as(s.hr, "PATCH", `/v1/employees/${s.emp.outsider}`,
      { lastWorkingDate: "2026-03-31" });
    runId = (await postRun(ctx, s.hr, s, "sif-1", { ...march,
      entries: [{ employeeId: s.emp.outsider, unusedLeaveDays: 10,
        serviceUnpaidLeaveDays: 0 }] }))
      .body.id;
  });

  it("a draft run gets 409 RUN_NOT_APPROVED", async () => {
    const r = await sif();
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe("RUN_NOT_APPROVED");
  });

  it("missing WPS settings give 422", async () => {
    await as(owner2, "POST", `/v1/pay-runs/${runId}/approve`);
    const r = await sif();
    expect(r.status).toBe(422);
    expect(r.body.error.code).toBe("COMPANY_WPS_SETTINGS_MISSING");
  });

  it("bank changes after approval do not reach the file", async () => {
    await as(s.owner, "PATCH", "/v1/company", { wps: WPS });
    const put = await as(s.owner, "PUT",
      `/v1/employees/${s.emp.outsider}/bank`,
      { routingCode: "803320101", iban: NEW_IBAN });
    expect(put.status, put.text).toBe(200);
    await withTenant(ctx.deps.db, { companyId: s.companyId, userId: null },
      (tx) => tx.query(`UPDATE employees SET labour_person_id_enc = NULL
        WHERE id = $1`, [s.emp.manager]));
  });

  it("generates the file once, with the statement and no settlement",
    async () => {
      ctx.clock.now = new Date(AT);
      const r = await sif();
      expect(r.status, r.text).toBe(201);
      const f = SifFile.parse(r.body);
      expect(f.statement).toBe(SIF_STATEMENT);
      expect(r.text.toLowerCase()).not.toContain("compliant");
      expect(f.fileName.startsWith("0000000123456260401")).toBe(true);
      expect(f.errorCount).toBe(0);
      // 4 employees: (1111.11, 2222.22, 7777.77, 7777.77) + 4 x 1500.00.
      expect(f.total).toBe("24888.87");
      const again = await sif();
      expect(again.status).toBe(200);
      expect(again.body.id).toBe(f.id);
      const run = await as(s.hr, "GET", `/v1/pay-runs/${runId}`);
      expect(run.body.sifFileId).toBe(f.id);
      expect([...f.bankChangedSinceApproval!].sort()).toEqual(
        [s.emp.manager, s.emp.outsider].sort());
    });

  it("download needs MFA and returns the generator's text", async () => {
    const run = await as(s.hr, "GET", `/v1/pay-runs/${runId}`);
    const path = `/v1/sif-files/${run.body.sifFileId}/download`;
    const plain = await login(ctx.app, s.hr.email, PASSWORD);
    const no = await call(ctx.app, plain.body.token, s.companyId, "GET",
      path);
    expect(no.body.error.code).toBe("MFA_REQUIRED");
    const r = await as(s.hr, "GET", path);
    expect(r.status).toBe(200);
    expect(r.headers.get("content-type")).toContain("text/plain");
    expect(r.headers.get("content-disposition")).toContain(".SIF");
    const expected = await withTenant(ctx.deps.db, { companyId: s.companyId,
      userId: null }, async (tx) => generateSif(await loadSifBatch(tx,
      ctx.deps, s.companyId, runId, new Date(AT))).text);
    expect(r.text).toBe(expected);
    expect(r.text).toContain(IBAN_SENTINEL);
    expect(r.text).not.toContain(NEW_IBAN);
    expect(r.text).toContain("00000000000001");
    expect(r.text).toContain(EMPLOYEE_PAY);
    expect(r.text).toContain("1500.00");
    const meta = await as(s.hr, "GET", `/v1/sif-files/${run.body.sifFileId}`);
    expect(meta.text).not.toContain("AE070331234567890123456");
  });
});
