import { describe, expect, it } from "vitest";
import {
  AuditEvent,
  EXAMPLES,
  ERROR_CODES,
  ERROR_STATUS,
  Iban,
  IsoDate,
  Money,
  NOT_COMPUTED_PAY,
  ROUTES,
  SalaryUpdate,
  SCHEMAS,
  Settlement,
  Timestamp,
  WorkerClass,
  Id,
  schemaName,
} from "../src/index";

describe("Money", () => {
  it.each(["0.00", "4000.00", "999999999.99"])("accepts %s", (v) => {
    expect(Money.safeParse(v).success).toBe(true);
  });
  it.each<unknown>(["4000", "4000.5", "-1.00", "1,000.00", 4000,
    "1000000000.00"])("rejects %s", (v) => {
    expect(Money.safeParse(v).success).toBe(false);
  });
});

describe("primitives", () => {
  it("IsoDate checks the calendar", () => {
    expect(IsoDate.safeParse("2026-02-28").success).toBe(true);
    expect(IsoDate.safeParse("2028-02-29").success).toBe(true);
    expect(IsoDate.safeParse("2026-02-30").success).toBe(false);
    expect(IsoDate.safeParse("2026-02-29").success).toBe(false);
  });
  it("Timestamp needs Z", () => {
    expect(Timestamp.safeParse("2026-03-01T20:30:00Z").success).toBe(true);
    expect(Timestamp.safeParse("2026-03-01T20:30:00.123Z").success)
      .toBe(true);
    expect(Timestamp.safeParse("2026-03-01T20:30:00+04:00").success)
      .toBe(false);
  });
  it("Iban is AE plus 21 digits", () => {
    expect(Iban.safeParse("AE070331234567890123456").success).toBe(true);
    expect(Iban.safeParse("AE07033123456789012345").success).toBe(false);
  });
  it("Id accepts the sequential test id shape", () => {
    expect(Id.safeParse("00000000-0000-4000-8000-000000000001").success)
      .toBe(true);
    expect(Id.safeParse("not-a-uuid").success).toBe(false);
  });
});

describe("employee and payroll", () => {
  it("SalaryUpdate rejects an empty list", () => {
    expect(SalaryUpdate.safeParse({ components: [] }).success).toBe(false);
  });
  it("WorkerClass matches the engine's three strings", () => {
    expect(WorkerClass.options).toEqual(
      ["expat-full-time", "uae-national", "gcc-national"]);
  });
  it("NOT_COMPUTED_PAY is the seven strings in order", () => {
    expect(NOT_COMPUTED_PAY).toEqual([
      "proration for partial months",
      "overtime premiums",
      "unpaid leave deductions",
      "deductions and deduction caps",
      "GPSSA pension contributions",
      "ILOE premiums",
      "notice pay",
    ]);
  });
});

describe("Settlement", () => {
  const computed = EXAMPLES.Settlement as Record<string, unknown>;
  it("parses both variants", () => {
    expect(Settlement.safeParse(computed).success).toBe(true);
    expect(Settlement.safeParse({ status: "refused",
      code: "NO_PACK_FOR_DATE", message: "no pack" }).success).toBe(true);
  });
  it("rejects includedInSif: true", () => {
    expect(computed.status).toBe("computed");
    expect(Settlement.safeParse({ ...computed, includedInSif: true })
      .success).toBe(false);
  });
});

describe("AuditEvent.action", () => {
  const PLAN_ACTIONS = ["company.created", "company.updated",
    "user.invited", "invite.accepted", "employee.created",
    "employee.updated", "employee.salary.updated", "employee.bank.updated",
    "employee.bank.revealed", "department.created", "department.updated",
    "leave-type.created", "leave-type.updated", "leave.requested",
    "leave.approved", "leave.rejected", "leave.cancelled", "leave.adjusted",
    "attendance.corrected", "pay-run.created", "pay-run.approved",
    "pay-run.voided", "sif.generated", "sif.downloaded"];
  const action = AuditEvent.shape.action;
  it.each(PLAN_ACTIONS)("accepts %s", (a) => {
    expect(action.safeParse(a).success).toBe(true);
  });
  it.each(["company", "Company.created", "-x.y", "x-.y", "x..y"])(
    "rejects %s", (a) => {
      expect(action.safeParse(a).success).toBe(false);
    });
});

describe("errors", () => {
  it("every code has a status and no internal code leaks in", () => {
    expect(ERROR_CODES.length).toBe(Object.keys(ERROR_STATUS).length);
    for (const c of ["MIGRATION_NAME", "AUDIT_SENSITIVE_DATA",
      "CANONICAL_NUMBER"]) {
      expect(ERROR_CODES).not.toContain(c);
    }
    expect(ERROR_CODES).toContain("ENGINE_REFUSED");
    expect(ERROR_STATUS.ACCOUNT_LOCKED).toBe(423);
  });
});

describe("EXAMPLES", () => {
  it("every example parses against its schema", () => {
    for (const [name, value] of Object.entries(EXAMPLES)) {
      const schema = SCHEMAS[name];
      expect(schema, name).toBeDefined();
      const r = schema!.safeParse(value);
      expect(r.success, `${name}: ${r.error?.message}`).toBe(true);
    }
  });
  it("every route response schema is named and has an example", () => {
    for (const r of ROUTES) {
      const name = schemaName(r.response);
      expect(name, r.id).not.toBeNull();
      expect(EXAMPLES, r.id).toHaveProperty(name!);
    }
  });
  it("uses the leak sentinels", () => {
    const text = JSON.stringify(EXAMPLES);
    expect(text).toContain("7777.77");
    expect(text).toContain("AE070331234567890123456");
  });
});
