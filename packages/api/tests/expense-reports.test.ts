import {
  IBAN_SENTINEL,
  UNPAID_NOTE,
  REIMBURSEMENT_WPS_NOTE,
  VAT_STATEMENT,
} from "@payroll/contract";
import { beforeAll, describe, expect, it } from "vitest";
import {
  approvedClaim,
  createClaim,
  drive,
  meal,
  submitted,
} from "./helpers/expense-fixtures";
import {
  as,
  claimFor,
  claimOf,
  MARCH,
  world,
  type World,
} from "./helpers/reimb-world";
import { postRun } from "./helpers/seed";

const Q = "from=2026-03-01&to=2026-03-31";
const EVIL = '=HYPERLINK("http://x","y")';
const REPORTS = [`/v1/expense-reports/summary?${Q}&groupBy=category`,
  `/v1/expense-reports/vat-register?${Q}`, "/v1/expense-reports/aging",
  "/v1/expense-reports/unpaid", "/v1/expense-reports/payouts?payRunId="];

describe("expense reports", () => {
  let w: World;
  let mealsClaim: string;
  let runId: string;
  const get = (path: string) => as(w, w.s.hr, "GET", path);
  beforeAll(async () => {
    w = await world("reports");
    mealsClaim = await approvedClaim(w.ctx, w.s.employee, w.s.manager, w.s,
      [meal(w.cats, "150.00", { vatAmount: "7.14", supplierName: EVIL,
        supplierTrn: "100000000000003" })]);
    await approvedClaim(w.ctx, w.s.employee, w.s.manager, w.s,
      [drive(w.cats, 120)]);
    await createClaim(w.ctx, w.s.employee, w.s, [meal(w.cats, "999.00")]);
  });

  it("summary_by_category", async () => {
    const r = await get(`/v1/expense-reports/summary?${Q}&groupBy=category`);
    expect(r.status, r.text).toBe(200);
    expect(r.body.rows.map((x: { label: string; total: string }) =>
      [x.label, x.total])).toEqual([["meals", "150.00"],
      ["mileage", "90.00"]]);
    expect(r.body).toMatchObject({ total: "240.00", vatTotal: "7.14",
      statement: VAT_STATEMENT });
    const byEmp = await get(`/v1/expense-reports/summary?${Q}` +
      "&groupBy=employee");
    expect(byEmp.body.rows).toEqual([{ key: w.s.emp.report,
      label: "Person 2", claimCount: 2, itemCount: 2, total: "240.00",
      vatTotal: "7.14" }]);
  });

  it("vat_register (JSON and CSV)", async () => {
    const r = await get(`/v1/expense-reports/vat-register?${Q}`);
    expect(r.status, r.text).toBe(200);
    expect(r.body.vatRecoverability).toBe("not-assessed");
    expect(r.body.rows).toHaveLength(1);
    expect(r.body.rows[0]).toMatchObject({ claimId: mealsClaim,
      amount: "150.00", vatAmount: "7.14", netOfVat: "142.86",
      employeeNumber: "E-2", categoryCode: "meals", receiptCount: 0,
      status: "approved" });
    const csv = await get(`/v1/expense-reports/vat-register?${Q}&format=csv`);
    expect(csv.status).toBe(200);
    expect(csv.headers.get("content-type")).toMatch(/^text\/csv/);
    expect(csv.headers.get("content-disposition")).toMatch(/^attachment;/);
    const lines = csv.text.replace(/^﻿/, "").split("\r\n");
    expect(lines[0]).toBe(`"${VAT_STATEMENT}"`);
    expect(csv.text).toContain(`"'=HYPERLINK(""http://x"",""y"")"`);
  });

  it("summary_by_pay_run and payouts_for_run", async () => {
    const run = await postRun(w.ctx, w.s.hr, w.s, "rep-1", MARCH);
    expect(run.status, run.text).toBe(201);
    runId = run.body.id;
    const r = await get(`/v1/expense-reports/summary?${Q}&groupBy=status` +
      `&payRunId=${runId}`);
    expect(r.body.total).toBe("240.00");
    const p = await get(`/v1/expense-reports/payouts?payRunId=${runId}`);
    expect(p.status, p.text).toBe(200);
    expect(p.body).toMatchObject({ payRunId: runId, runStatus: "draft",
      total: "240.00", note: REIMBURSEMENT_WPS_NOTE });
    expect(p.body.rows).toEqual([{ employeeId: w.s.emp.report,
      employeeName: "Person 2", employeeNumber: "E-2",
      claimIds: expect.any(Array), total: "240.00" }]);
    expect(p.text).not.toMatch(/AE\d{21}/);
    expect(p.text).not.toContain(IBAN_SENTINEL);
    const csv = await get(`/v1/expense-reports/payouts?payRunId=${runId}` +
      "&format=csv");
    expect(csv.text.replace(/^﻿/, "").split("\r\n")[0])
      .toBe(`"${REIMBURSEMENT_WPS_NOTE}"`);
    const none = await get("/v1/expense-reports/payouts?payRunId=" +
      "00000000-0000-4000-8000-0000000000ff");
    expect(none.status).toBe(404);
  });

  it("unpaid_lists_leaver_claim (Review Focus 5)", async () => {
    const waiting = await claimOf(w, "12.00");
    await as(w, w.s.hr, "PATCH", `/v1/employees/${w.s.emp.outsider}`,
      { lastWorkingDate: "2026-03-15" });
    const left = await claimFor(w, w.s.emp.outsider, "13.00", "2026-03-12");
    const r = await get("/v1/expense-reports/unpaid");
    expect(r.status, r.text).toBe(200);
    const reason = (id: string) => r.body.items.find(
      (x: { claimId: string }) => x.claimId === id)?.reason;
    expect(reason(mealsClaim)).toBe("in-draft-run");
    expect(reason(waiting)).toBe("awaiting-pay-run");
    // No March run is approved yet: the leaver's final run still pays
    // it, so HR must not pay it by hand (review I-1).
    expect(reason(left)).toBe("final-run-pending");
    expect(r.body.note).toBe(UNPAID_NOTE);
  });

  it("aging_report", async () => {
    const c = await submitted(w.ctx, w.s.employee, w.s, [meal(w.cats,
      "14.00")]);
    await w.ctx.deps.db.query("UPDATE approval_requests SET created_at = " +
      "'2026-03-10T08:00:00Z' WHERE id = $1", [c.approval.id]);
    const r = await get("/v1/expense-reports/aging");
    expect(r.status, r.text).toBe(200);
    expect(r.body.items.find((x: { claimId: string }) =>
      x.claimId === c.id)).toMatchObject({ ageDays: 10, stepOrder: 1,
      approver: { kind: "line-manager" }, total: "14.00" });
  });

  it("reports_forbidden_to_manager", async () => {
    for (const u of [w.s.manager, w.s.employee]) {
      for (const path of REPORTS) {
        const r = await as(w, u, "GET", path + (path.endsWith("=")
          ? runId : ""));
        expect(r.status, path).toBe(403);
        expect(r.body.error.code).toBe("FORBIDDEN");
      }
    }
  });

  it("reports_no_vat_rate", async () => {
    for (const path of REPORTS) {
      for (const fmt of path.includes("?") ? ["", "&format=csv"] : [""]) {
        const r = await get(path + (path.endsWith("=") ? runId : "") + fmt);
        const text = r.text.toLowerCase();
        expect(text).not.toContain("5%");
        expect(text).not.toContain("recoverable");
        expect(text).not.toContain("claimable");
      }
    }
  });
});

describe("unpaid report after the leaver's final run", () => {
  it("employee-left only when no run can still pay the claim", async () => {
    const w = await world("left");
    const out = w.s.emp.outsider;
    await as(w, w.s.hr, "PATCH", `/v1/employees/${out}`,
      { lastWorkingDate: "2026-02-28" });
    const feb = await postRun(w.ctx, w.s.hr, w.s, "feb", { period:
      { year: 2026, month: 2 }, entries: [{ employeeId: out,
        unusedLeaveDays: 0, serviceUnpaidLeaveDays: 0 }] });
    expect(feb.status, feb.text).toBe(201);
    const ok = await as(w, w.o2, "POST",
      `/v1/pay-runs/${feb.body.id}/approve`);
    expect(ok.status, ok.text).toBe(200);
    const late = await claimFor(w, out, "21.00", "2026-02-10");
    const stillPaid = await claimOf(w, "22.00");
    const r = await as(w, w.s.hr, "GET", "/v1/expense-reports/unpaid");
    const reason = (id: string) => r.body.items.find(
      (x: { claimId: string }) => x.claimId === id)?.reason;
    expect(reason(late)).toBe("employee-left");
    expect(reason(stillPaid)).toBe("awaiting-pay-run");
    const march = await postRun(w.ctx, w.s.hr, w.s, "mar", MARCH);
    expect(march.status, march.text).toBe(201);
    expect(march.body.claimCount).toBe(1);
  });
});
