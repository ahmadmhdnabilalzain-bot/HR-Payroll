import type { Period, SubjectType } from "@payroll/contract";
import { notify, type EventCtx } from "./notify";
import { recipientsFor } from "./recipients";

export type Outcome3 = "approved" | "rejected" | "returned";

/** Business events emitted inside the business transaction. */
export type DomainEvent =
  | { type: "approval.pending"; approvalId: string; stepOrder: number;
    subjectType: SubjectType; requesterEmployeeId: string }
  | { type: "approval.closed"; approvalId: string;
    subjectType: SubjectType; subjectId: string; outcome: Outcome3;
    claimantUserId: string | null }
  | { type: "leave.requested"; leaveRequestId: string; employeeId: string;
    start: string; end: string }
  | { type: "leave.decided"; leaveRequestId: string; employeeId: string;
    start: string; end: string; outcome: "approved" | "rejected" }
  | { type: "pay-run.approved"; payRunId: string; period: Period }
  | { type: "inbound.received"; itemId: string }
  | { type: "webhook.paused"; endpointId: string }
  | { type: "sso.linked"; userId: string; provider: "google" | "microsoft" }
  | { type: "employee.created" | "employee.updated"; employeeId: string };

/**
 * Notifies every recipient, in the caller's transaction (an outbox).
 * A recipient with no channel is no error; only database errors throw.
 */
export async function emitEvent(c: EventCtx, e: DomainEvent)
  : Promise<void> {
  for (const r of await recipientsFor(c.tx, c.companyId, e)) {
    await notify(c, r);
  }
}
