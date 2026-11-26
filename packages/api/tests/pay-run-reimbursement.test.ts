import { REIMBURSEMENT_WPS_NOTE } from "@payroll/contract";
import { beforeAll, describe, expect, it } from "vitest";
import { claimAction } from "./helpers/expense-fixtures";
import {
  APRIL,
  as,
  claim,
  claimOf,
  MARCH,
  slipOf,
  world,
  type World,
} from "./helpers/reimb-world";
import { postRun } from "./helpers/seed";

describe("reimbursement into payroll", () => {
  let w: World;
  let claimId: string;
  let runId: string;
  beforeAll(async () => {
    w = await world("reimb");
    claimId = await claimOf(w, "250.00", "11.90");
  });

  it("run_carries_claim", async () => {
    const r = await postRun(w.ctx, w.s.hr, w.s, "m-1", MARCH);
    expect(r.status, r.text).toBe(201);
    runId = r.body.id;
    expect(r.body).toMatchObject({ reimbursementTotal: "250.00",
      claimCount: 1, pendingClaimCount: 0 });
    const p = await slipOf(w, runId, w.s.emp.report);
    expect(p).toMatchObject({ gross: "5500.00", salaryNet: "5500.00",
      net: "5750.00", reimbursementTotal: "250.00",
      reimbursementNote: REIMBURSEMENT_WPS_NOTE });
    expect(p.reimbursements).toEqual([{ claimId, label: "Trip",
      amount: "250.00", traceId: `reimb.claim#${claimId}` }]);
    expect(p.lines.map((l: { code: string }) => l.code))
      .toEqual(["basic", "housing"]);
    const other = await slipOf(w, runId, w.s.emp.report2);
    expect(other.reimbursements).toEqual([]);
    expect(other.reimbursementNote).toBeNull();
    expect((await claim(w, claimId)).body.payRunId).toBe(runId);
  });

  it("approved_in_run_not_cancellable", async () => {
    const r = await claimAction(w.ctx, w.s.hr, w.s, claimId, "cancel",
      { note: "paid already" });
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe("CLAIM_NOT_CANCELLABLE");
  });

  it("approve_marks_reimbursed; the SIF has salary only", async () => {
    const a = await as(w, w.o2, "POST", `/v1/pay-runs/${runId}/approve`);
    expect(a.status, a.text).toBe(200);
    expect((await claim(w, claimId)).body.status).toBe("reimbursed");
    const log = await as(w, w.s.owner, "GET", "/v1/audit-events?limit=50");
    const e = log.body.items.find((x: { action: string }) =>
      x.action === "expense-claim.reimbursed");
    expect(e).toMatchObject({ entityId: claimId, data: { payRunId: runId } });
    await as(w, w.s.owner, "PATCH", "/v1/company", { wps: {
      employerId: "0000000123456", bankRoutingCode: "802420101" } });
    const sif = await as(w, w.s.hr, "POST", `/v1/pay-runs/${runId}/sif`);
    expect(sif.status, sif.text).toBe(201);
    expect(sif.body.total).toBe(a.body.gross);
    const text = await as(w, w.s.owner, "GET",
      `/v1/sif-files/${sif.body.id}/download`);
    expect(text.status).toBe(200);
    expect(text.text).not.toContain("250.00");
    expect(text.text).not.toContain("5750");
  });

  it("employee_sees_own_reimbursement", async () => {
    const mine = await as(w, w.s.employee, "GET", "/v1/me/payslips");
    expect(mine.body.items[0].reimbursementTotal).toBe("250.00");
    const theirs = await slipOf(w, runId, w.s.emp.report2);
    const r = await as(w, w.s.employee, "GET", `/v1/payslips/${theirs.id}`);
    expect(r.status).toBe(404);
  });

  it("the next month's run has no claim", async () => {
    const r = await postRun(w.ctx, w.s.hr, w.s, "a-1", APRIL);
    expect(r.status, r.text).toBe(201);
    expect(r.body).toMatchObject({ claimCount: 0,
      reimbursementTotal: "0.00" });
  });
});
