import type { Role } from "@payroll/contract";
import { describe, expect, it } from "vitest";
import { assertDecidable } from "../src/approvals/assert-decidable";
import type { ReqCtx } from "../src/http/context";

const ME = "00000000-0000-4000-8000-0000000000a1";
const OTHER = "00000000-0000-4000-8000-0000000000a2";

function fakeCtx(role: Role): ReqCtx {
  return { tenant: { companyId: OTHER, role, employeeId: null },
    user: { id: ME } } as unknown as ReqCtx;
}

const opts = { pending: "pending-approval",
  roles: ["owner", "hr"] as const };

function codeOf(f: () => void): string | null {
  try {
    f();
    return null;
  } catch (e) {
    return (e as { code: string }).code;
  }
}

describe("assertDecidable", () => {
  it("decide_not_pending_409", () => {
    const e = codeOf(() => assertDecidable(fakeCtx("owner"),
      { status: "open", requestedBy: OTHER }, opts));
    expect(e).toBe("APPROVAL_NOT_PENDING");
  });
  it("decide_requester_sod_403", () => {
    const e = codeOf(() => assertDecidable(fakeCtx("hr"),
      { status: "pending-approval", requestedBy: ME }, opts));
    expect(e).toBe("SOD_VIOLATION");
  });
  it("decide_wrong_role_403", () => {
    const e = codeOf(() => assertDecidable(fakeCtx("manager"),
      { status: "pending-approval", requestedBy: OTHER }, opts));
    expect(e).toBe("FORBIDDEN");
  });
  it("decide_ok_returns_void", () => {
    expect(assertDecidable(fakeCtx("owner"),
      { status: "pending-approval", requestedBy: OTHER }, opts))
      .toBeUndefined();
  });
});
