import { z } from "zod";
import { Id, listOf, Money, Timestamp } from "./primitives";

/**
 * The shared approval spine: chains of amount tiers per subject type,
 * resolved to steps at submit. Expense claims are the first subject.
 */
export const SubjectType = z.enum(["expense-claim"]);
export type SubjectType = z.infer<typeof SubjectType>;

export const ApproverSpec = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("line-manager") }),
  z.object({ kind: z.literal("role"), role: z.enum(["owner", "hr"]) }),
  z.object({ kind: z.literal("user"), userId: Id }),
]);
export type ApproverSpec = z.infer<typeof ApproverSpec>;

export const ApprovalTier = z.object({
  approver: ApproverSpec,
  /** The tier applies when the subject's total is at least this. */
  minTotal: Money,
});
export type ApprovalTier = z.infer<typeof ApprovalTier>;

const OverLimitApprover = z.enum(["owner", "hr"]);

export const ApprovalChain = z.object({
  subjectType: SubjectType,
  version: z.number().int().min(0),
  tiers: z.array(ApprovalTier).min(1).max(5),
  overLimitApprover: OverLimitApprover,
});
export type ApprovalChain = z.infer<typeof ApprovalChain>;

export const ApprovalChainList = listOf(ApprovalChain);

export const ApprovalChainUpdate = z.object({
  tiers: z.array(ApprovalTier).min(1).max(5),
  overLimitApprover: OverLimitApprover,
  expectedVersion: z.number().int().min(0),
});
export type ApprovalChainUpdate = z.infer<typeof ApprovalChainUpdate>;

export const SubjectTypeParams = z.object({ subjectType: SubjectType });

export const StepStatus = z.enum(["waiting", "pending", "approved",
  "rejected", "returned", "cancelled"]);
export type StepStatus = z.infer<typeof StepStatus>;

export const ApprovalStep = z.object({
  order: z.number().int().min(1),
  approver: ApproverSpec,
  status: StepStatus,
  decidedBy: Id.nullable(),
  decidedAt: Timestamp.nullable(),
  note: z.string().nullable(),
});
export type ApprovalStep = z.infer<typeof ApprovalStep>;

export const ApprovalStatus = z.enum(["pending", "approved", "rejected",
  "returned", "cancelled"]);
export type ApprovalStatus = z.infer<typeof ApprovalStatus>;

export const ApprovalView = z.object({
  id: Id,
  subjectType: SubjectType,
  subjectId: Id,
  status: ApprovalStatus,
  currentStep: z.number().int().min(1).nullable(),
  steps: z.array(ApprovalStep),
  createdAt: Timestamp,
});
export type ApprovalView = z.infer<typeof ApprovalView>;

export const ApprovalTask = z.object({
  approvalId: Id,
  subjectType: SubjectType,
  subjectId: Id,
  stepOrder: z.number().int().min(1),
  stepCount: z.number().int().min(1),
  submittedAt: Timestamp,
  ageDays: z.number().int().min(0),
  summary: z.object({
    employeeName: z.string(),
    title: z.string(),
    total: Money,
    flagCodes: z.array(z.string()),
  }),
});
export type ApprovalTask = z.infer<typeof ApprovalTask>;

export const ApprovalTaskList = listOf(ApprovalTask);

/** `stepOrder` is the step the approver saw (a stale one is refused). */
export const ApprovalDecision = z.object({
  stepOrder: z.number().int().min(1),
  note: z.string().trim().min(1).max(500).optional(),
});
export type ApprovalDecision = z.infer<typeof ApprovalDecision>;

export const ApprovalDecisionWithNote = z.object({
  stepOrder: z.number().int().min(1),
  note: z.string().trim().min(3).max(500),
});
export type ApprovalDecisionWithNote = z.infer<
  typeof ApprovalDecisionWithNote>;
