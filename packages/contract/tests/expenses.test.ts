import { describe, expect, it } from "vitest";
import * as contract from "../src/index";
import {
  ApprovalChain,
  ApprovalDecisionWithNote,
  AuditEvent,
  ERROR_STATUS,
  EXAMPLES,
  ExpenseClaim,
  ExpenseItemInput,
  REIMBURSEMENT_WPS_NOTE,
  ReceiptSuggestion,
  ReceiptUpload,
  RECEIPT_QUOTA_DEFAULT,
  VAT_STATEMENT,
} from "../src/index";

const ID = "00000000-0000-4000-8000-000000000001";
const common = { categoryId: ID, date: "2026-03-10",
  description: "Client visit", receiptIds: [] };

describe("expense items", () => {
  it("a mileage item needs no amount; distance is a whole km >= 1", () => {
    const m = { ...common, kind: "mileage", distanceKm: 120,
      rateCode: "car" };
    expect(ExpenseItemInput.safeParse(m).success).toBe(true);
    expect(ExpenseItemInput.safeParse({ ...m, distanceKm: 0 }).success)
      .toBe(false);
    expect(ExpenseItemInput.safeParse({ ...m, distanceKm: 12.5 }).success)
      .toBe(false);
  });
  it("a receipt item takes a 15-digit TRN or null", () => {
    const r = { ...common, kind: "receipt", amount: "105.00",
      vatAmount: "5.00", supplierName: "Cafe", supplierTrn: null };
    expect(ExpenseItemInput.safeParse(r).success).toBe(true);
    expect(ExpenseItemInput.safeParse({ ...r, supplierTrn: "12345" })
      .success).toBe(false);
    expect(ExpenseItemInput.safeParse({ ...r,
      supplierTrn: "100000000000003" }).success).toBe(true);
  });
});

describe("claims, chains and decisions", () => {
  it("vatRecoverability is only not-assessed", () => {
    const claim = EXAMPLES.ExpenseClaim as Record<string, unknown>;
    expect(ExpenseClaim.safeParse(claim).success).toBe(true);
    expect(ExpenseClaim.safeParse({ ...claim,
      vatRecoverability: "recoverable" }).success).toBe(false);
  });
  it("a chain has 1 to 5 tiers", () => {
    const tier = { approver: { kind: "line-manager" }, minTotal: "0.00" };
    const chain = { subjectType: "expense-claim", version: 0,
      overLimitApprover: "owner" };
    expect(ApprovalChain.safeParse({ ...chain, tiers: [tier] }).success)
      .toBe(true);
    expect(ApprovalChain.safeParse({ ...chain, tiers: [] }).success)
      .toBe(false);
    expect(ApprovalChain.safeParse({ ...chain,
      tiers: Array(6).fill(tier) }).success).toBe(false);
  });
  it("reject and return need a note of 3+ characters", () => {
    expect(ApprovalDecisionWithNote.safeParse({ stepOrder: 1, note: "ok" })
      .success).toBe(false);
    expect(ApprovalDecisionWithNote.safeParse({ stepOrder: 1,
      note: "missing receipt" }).success).toBe(true);
  });
  it("a reader suggestion may be empty", () => {
    expect(ReceiptSuggestion.safeParse({ source: "none" }).success)
      .toBe(true);
    expect(ReceiptSuggestion.safeParse({ amount: 12.5 }).success)
      .toBe(false);
  });
});

describe("statements and wording", () => {
  it("VAT_STATEMENT and REIMBURSEMENT_WPS_NOTE are the exact text", () => {
    expect(VAT_STATEMENT).toBe("VAT amounts and supplier TRNs are as " +
      "entered by the claimant. Input VAT recovery is not assessed: FTA " +
      "Decision 17 of 2026 on employee expenses is known only from " +
      "secondary summaries.");
    expect(REIMBURSEMENT_WPS_NOTE).toBe("Reimbursements are not in the " +
      "WPS salary file. Pay them by separate transfer. Whether they must " +
      "go through WPS is not sourced.");
  });
  it("no exported string names a VAT rate or recoverability", () => {
    const strings = Object.values(contract).filter((v) =>
      typeof v === "string") as string[];
    expect(strings.length).toBeGreaterThan(2);
    for (const s of strings) {
      expect(s).not.toContain("5%");
      expect(s.toLowerCase()).not.toContain("recoverable");
      expect(s.toLowerCase()).not.toContain("claimable");
    }
    const text = JSON.stringify(EXAMPLES).toLowerCase();
    for (const w of ["5%", "recoverable\"", "claimable"]) {
      expect(text).not.toContain(w);
    }
  });
  it("the plan's audit actions pass the action pattern", () => {
    const actions = ["approval-chain.updated", "approval.opened",
      "approval.step-approved", "approval.rejected", "approval.returned",
      "approval.cancelled", "receipt.uploaded", "receipt.downloaded",
      "expense-category.created", "expense-category.updated",
      "expense-policy.updated", "expense-claim.created",
      "expense-claim.updated", "expense-claim.submitted",
      "expense-claim.approved", "expense-claim.rejected",
      "expense-claim.returned", "expense-claim.cancelled",
      "expense-claim.scheduled", "expense-claim.reimbursed",
      "expense-claim.released"];
    for (const a of actions) {
      expect(AuditEvent.shape.action.safeParse(a).success, a).toBe(true);
    }
  });
  it("new error codes carry their statuses", () => {
    expect(ERROR_STATUS.NO_ELIGIBLE_APPROVER).toBe(422);
    expect(ERROR_STATUS.NOT_AN_APPROVER).toBe(403);
    expect(ERROR_STATUS.APPROVAL_STEP_CHANGED).toBe(409);
    expect(ERROR_STATUS.RECEIPT_TOO_LARGE).toBe(413);
    expect(ERROR_STATUS.RECEIPT_TYPE_NOT_ALLOWED).toBe(415);
    expect(ERROR_STATUS.RECEIPT_BASE64_INVALID).toBe(400);
    expect(ERROR_STATUS.CLAIM_PROBLEMS).toBe(422);
    expect(ERROR_STATUS.EXCLUDED_CLAIM_INVALID).toBe(422);
  });
});

describe("safe free text (security review I-2)", () => {
  it("refuses control and bidi characters in free text", () => {
    const up = { fileName: "r.png", contentType: "image/png",
      dataBase64: "AAAA" };
    expect(ReceiptUpload.safeParse(up).success).toBe(true);
    for (const bad of ["x\u0000.png", "\u202egnp.exe", "a\u0085b",
      "a\u2066b", "line\nbreak"]) {
      expect(ReceiptUpload.safeParse({ ...up, fileName: bad }).success, bad)
        .toBe(false);
    }
    expect(ReceiptUpload.safeParse({ ...up, fileName: "مطعم.png" })
      .success).toBe(true);
    expect(ApprovalDecisionWithNote.safeParse({ stepOrder: 1,
      note: "no\u0000pe" }).success).toBe(false);
  });
  it("the receipt quota has a product default and a 429 code", () => {
    expect(RECEIPT_QUOTA_DEFAULT).toEqual({ perUserPerDay: 50,
      perCompanyPerDay: 1000 });
    expect(ERROR_STATUS.RECEIPT_QUOTA_EXCEEDED).toBe(429);
  });
});
