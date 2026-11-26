import { add, fils, type Fils } from "@payroll/engine";
import { validateSif } from "@payroll/wps";
import { describe, expect, it } from "vitest";
import type { AppPayRunCreate } from "../../src/api/contract";
import { ApiError } from "../../src/api/errors";
import { codeOf, mockApi, TODAY } from "../helpers/mock";

const sum = (xs: Fils[]): Fils => xs.reduce(add, fils(0n));

async function joinerBody(m: ReturnType<typeof mockApi>) {
  const people = await m.api.listEmployees();
  const joiner = people.find((p) => p.joiningDate === "2026-11-10");
  if (joiner === undefined) throw new Error("no joiner in seed");
  const body: AppPayRunCreate = {
    period: { year: 2026, month: 11 },
    entries: [{ employeeId: joiner.id, componentOverrides: [
      { code: "basic", amount: fils(400000n) },
      { code: "housing", amount: fils(150000n) },
    ] }],
  };
  return { joiner, body };
}

describe("mock client: pay runs", () => {
  it("pay-is-sums", async () => {
    const m = mockApi();
    await m.signIn("hr@demo.test");
    const [run] = await m.api.listPayRuns();
    const slips = await m.api.listPayslips(run?.id ?? "");
    expect(slips.length).toBeGreaterThan(0);
    for (const s of slips) {
      const lines = sum(s.lines.map((l) => l.amount));
      expect(s.gross).toBe(lines);
      expect(s.net).toBe(lines);
      expect(s.trace.map((t) => t.id))
        .toEqual(s.lines.map((l) => l.traceId));
    }
    expect(run?.gross).toBe(sum(slips.map((s) => s.gross)));
  });

  it("partial-month-problem", async () => {
    const m = mockApi();
    await m.signIn("hr@demo.test");
    const { joiner } = await joinerBody(m);
    const e = await m.api.createPayRun(
      { period: { year: 2026, month: 11 }, entries: [] }, "k1",
    ).catch((x: unknown) => x);
    expect(e).toBeInstanceOf(ApiError);
    const err = e as ApiError;
    expect(err.code).toBe("PAY_RUN_PROBLEMS");
    expect(err.problems).toEqual([{ employeeId: joiner.id,
      code: "ENTERED_AMOUNTS_REQUIRED", missing: ["basic", "housing"] }]);
  });

  it("idempotent-create", async () => {
    const m = mockApi();
    await m.signIn("hr@demo.test");
    const { body } = await joinerBody(m);
    const a = await m.api.createPayRun(body, "key-1");
    const b = await m.api.createPayRun(body, "key-1");
    expect(b.id).toBe(a.id);
    expect(a.status).toBe("draft");
    const other = { ...body, entries: [] };
    expect(await codeOf(m.api.createPayRun(other, "key-1")))
      .toBe("IDEMPOTENCY_KEY_REUSED");
    expect(await codeOf(m.api.createPayRun(body, "key-2")))
      .toBe("RUN_EXISTS_FOR_PERIOD");
  });

  it("sif-from-wps", async () => {
    const m = mockApi();
    await m.signIn("owner2@demo.test", "123456");
    const [run] = await m.api.listPayRuns();
    const file = await m.api.createSif(run?.id ?? "");
    expect(file.errorCount).toBe(0);
    expect(file.warningCount).toBe(0);
    expect(file.findings.filter((f) => f.severity === "error"))
      .toEqual([]);
    expect(file.statement).toBe(
      "Layout matches two bank guides. Not confirmed by MOHRE or a bank " +
      "test.");
    expect(file.fileName).toMatch(/^\d{25}\.SIF$/);
    const again = await m.api.createSif(run?.id ?? "");
    expect(again.id).toBe(file.id);
    const text = await m.api.downloadSif(file.id);
    expect(text).toContain("\r\n");
    const errors = validateSif(text, undefined, TODAY)
      .filter((f) => f.severity === "error");
    expect(errors).toEqual([]);
  });

  it("draft-run-has-no-sif", async () => {
    const m = mockApi();
    await m.signIn("hr@demo.test");
    const { body } = await joinerBody(m);
    const run = await m.api.createPayRun(body, "k");
    expect(await codeOf(m.api.createSif(run.id))).toBe("RUN_NOT_APPROVED");
  });

  it("audit-chain", async () => {
    const m = mockApi();
    await m.signIn("owner@demo.test");
    const before = await m.api.listAuditEvents();
    await m.api.updateCompany({ name: "Sample Trading LLC (demo) 2" });
    const after = await m.api.listAuditEvents();
    const [top, prev] = after.events;
    expect(top?.seq).toBe((before.events[0]?.seq ?? 0) + 1);
    expect(top?.action).toBe("company.updated");
    expect(top?.prevHash).toBe(prev?.hash);
    const v = await m.api.verifyAudit();
    expect(v).toEqual({ ok: true, checked: top?.seq, firstBadSeq: null });
  });

  it("audit-tamper-detected", async () => {
    const m = mockApi({ seedPatch: (s) => ({ ...s, audit: s.audit.map(
      (e) => e.seq === 3 ? { ...e, entityType: "tampered" } : e) }) });
    await m.signIn("owner@demo.test");
    const v = await m.api.verifyAudit();
    expect(v.ok).toBe(false);
    expect(v.firstBadSeq).toBe(3);
  });
});
