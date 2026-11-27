import { describe, expect, it } from "vitest";
import { buildDemoSource } from "../../src/demo/data/adapter";
import { approvalsShown } from "../../src/demo/approvals";
import { INITIAL, type DemoState } from "../../src/demo/state";
import { approvalHref } from "../../src/home/Approvals";
import { deptHref } from "../../src/home/Departments";
import { issueHref } from "../../src/home/IssueRow";
import { currentStepHref } from "../../src/home/StepTracker";

const src = buildDemoSource();
const d = src.at({});
const as = (role: DemoState["role"]): DemoState => ({ ...INITIAL, role });

/** Home's rows open real records, never a guess (owner, 27 Nov). */
describe("home links", () => {
  it("issues-open-fix-overtime-documents-or-pension", () => {
    const by = new Map(d.issues().map((i) => [i.code, issueHref(i)]));
    expect(by.get("SIF_HELD_NO_IBAN")).toBe("#/pay-run/fix");
    expect(by.get("IBAN_CHECKSUM")).toBe("#/pay-run/fix");
    expect(by.get("OVERTIME_DAILY_CAP_EXCEEDED"))
      .toBe("#/time-off/overtime");
    expect(by.get("PENSION_NOT_COMPUTED")).toBe("#/people/papers/pension");
  });

  it("every-decision-opens-its-record", () => {
    for (const role of ["hr", "gm"] as const) {
      const list = approvalsShown(d, as(role));
      expect(list.length).toBeGreaterThan(0);
      for (const a of list) {
        const href = approvalHref(a);
        if (a.kind === "pay-run") expect(href).toBe("#/pay-run/approve");
        if (a.kind === "leave") expect(href).toBe("#/time-off");
        if (a.kind === "expense") {
          expect(href).toMatch(/^#\/pay-run\/expenses\/\S+$/);
        }
        if (a.kind === "overtime") {
          expect(href).toBe(`#/time-off/overtime/crew/${a.id}`);
        }
      }
    }
  });

  it("expense-rows-name-the-claim-the-pay-area-opens", () => {
    const claims = d.approvalsInbox().filter((a) => a.kind === "expense");
    expect(claims.length).toBeGreaterThan(0);
    for (const a of claims) expect(a.subjectId).toMatch(/\S/);
  });

  it("departments-open-their-report", () => {
    const ids = d.departments().map((x) => x.id);
    expect(ids).toContain("dept-exec");
    expect(deptHref("dept-exec", "gm")).toBe("#/reports/dashboard-exec");
    expect(deptHref("dept-exec", "hr")).toBe("#/reports/departments");
    expect(deptHref(ids.find((x) => x !== "dept-exec") ?? "", "gm"))
      .toBe("#/reports/departments");
  });

  it("the-step-line-opens-the-step-the-run-is-on", () => {
    expect(currentStepHref(d, as("hr"))).toBe("#/pay-run/fix");
  });
});
