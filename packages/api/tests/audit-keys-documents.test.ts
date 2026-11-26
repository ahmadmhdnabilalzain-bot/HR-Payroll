import { describe, expect, it } from "vitest";
import { DOCUMENT_AUDIT_CHECKS } from "../src/audit/allowlist-documents";
import { EXPENSE_AUDIT_CHECKS } from "../src/audit/allowlist-expenses";
import { HR_CHECKS } from "../src/audit/hr-allowlist";

/**
 * The allowlists are spread into one table, so a Plan 7 key that
 * another plan also defines would silently replace its check (a
 * merge once turned Plan 8's `kind` into letter kinds only).
 */
describe("Plan 7 audit keys", () => {
  it("share no key with the expense or HR lists", () => {
    const others = new Set([...Object.keys(EXPENSE_AUDIT_CHECKS),
      ...Object.keys(HR_CHECKS)]);
    expect(Object.keys(DOCUMENT_AUDIT_CHECKS).filter((k) => others.has(k)))
      .toEqual([]);
  });
});
