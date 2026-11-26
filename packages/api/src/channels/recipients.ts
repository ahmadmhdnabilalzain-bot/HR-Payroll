import type { Db } from "../db/db";
import type { DomainEvent } from "./events";
import type { Recipient } from "./notify";

const SUBJECT = "subject.expense-claim";

/** Human members of the company among `ids` (Ruling 29, Task 9). */
async function members(tx: Db, c: string, ids: string[]): Promise<string[]> {
  if (ids.length === 0) return [];
  const rows = await tx.query<{ user_id: string }>(
    `SELECT m.user_id FROM memberships m JOIN users u ON u.id = m.user_id
     WHERE m.company_id = $1 AND u.kind = 'human'
       AND m.revoked_at IS NULL
       AND m.user_id = ANY ($2::uuid[])
     ORDER BY m.user_id`, [c, `{${ids.join(",")}}`]);
  return rows.map((r) => r.user_id);
}

async function usersWhere(tx: Db, c: string, cond: string,
  args: unknown[]): Promise<string[]> {
  const rows = await tx.query<{ user_id: string }>(
    `SELECT m.user_id FROM memberships m JOIN users u ON u.id = m.user_id
     WHERE m.company_id = $1 AND u.kind = 'human'
       AND m.revoked_at IS NULL
       AND ${cond} ORDER BY m.user_id`, [c, ...args]);
  return rows.map((r) => r.user_id);
}

const ofRoles = (tx: Db, c: string, roles: string[]) =>
  usersWhere(tx, c, "m.role = ANY ($2::text[])", [`{${roles.join(",")}}`]);

const ofEmployee = (tx: Db, c: string, employeeId: string) =>
  usersWhere(tx, c, "m.employee_id = $2", [employeeId]);

async function employee(tx: Db, c: string, id: string) {
  const [e] = await tx.query<{ full_name: string;
    manager_id: string | null }>(
    "SELECT full_name, manager_id FROM employees WHERE company_id = $1 " +
    "AND id = $2", [c, id]);
  return e ?? { full_name: "", manager_id: null };
}

async function stepEligible(tx: Db, c: string, approvalId: string,
  step: number): Promise<string[]> {
  const [s] = await tx.query<{ eligible: string[] }>(
    `SELECT array_to_json(eligible) AS eligible FROM approval_steps
     WHERE company_id = $1 AND request_id = $2 AND step_order = $3`,
    [c, approvalId, step]);
  return members(tx, c, s?.eligible ?? []);
}

async function payRunUsers(tx: Db, c: string, runId: string) {
  return usersWhere(tx, c, `m.employee_id IN (SELECT p.employee_id
    FROM payslips p WHERE p.company_id = $1 AND p.pay_run_id = $2)`,
  [runId]);
}

type Build = Omit<Recipient, "userId">;
const to = (users: string[], b: Build): Recipient[] =>
  users.map((userId) => ({ userId, ...b }));

async function leaveRecipients(tx: Db, c: string, e: Extract<DomainEvent,
  { type: "leave.requested" | "leave.decided" }>): Promise<Recipient[]> {
  const emp = await employee(tx, c, e.employeeId);
  const link = { routeId: "listLeaveRequests", id: null };
  if (e.type === "leave.decided") {
    return to(await ofEmployee(tx, c, e.employeeId), { kind: "leave-decided",
      vars: { start: e.start, end: e.end, outcome: `outcome.${e.outcome}` },
      link });
  }
  const mgr = emp.manager_id === null ? []
    : await ofEmployee(tx, c, emp.manager_id);
  const users = mgr.length > 0 ? mgr : await ofRoles(tx, c, ["hr"]);
  return to(users, { kind: "leave-requested", link,
    vars: { requester: emp.full_name, start: e.start, end: e.end } });
}

async function approvalRecipients(tx: Db, c: string, e: Extract<
  DomainEvent, { type: "approval.pending" | "approval.closed" }>)
  : Promise<Recipient[]> {
  if (e.type === "approval.closed") {
    return to(await members(tx, c, e.claimantUserId === null ? []
      : [e.claimantUserId]), { kind: "approval-closed",
      link: { routeId: "getExpenseClaim", id: e.subjectId },
      vars: { subject: SUBJECT, outcome: `outcome.${e.outcome}` } });
  }
  const requester = (await employee(tx, c, e.requesterEmployeeId))
    .full_name;
  return to(await stepEligible(tx, c, e.approvalId, e.stepOrder),
    { kind: "approval-pending", link: { routeId: "approvalInbox",
      id: null }, vars: { requester, subject: SUBJECT },
    meta: { approvalId: e.approvalId, stepOrder: String(e.stepOrder) } });
}

const period = (p: { year: number; month: number }) =>
  `${p.year}-${String(p.month).padStart(2, "0")}`;

/** Who hears about an event, with the template variables. */
export async function recipientsFor(tx: Db, c: string, e: DomainEvent)
  : Promise<Recipient[]> {
  switch (e.type) {
    case "approval.pending":
    case "approval.closed": return approvalRecipients(tx, c, e);
    case "leave.requested":
    case "leave.decided": return leaveRecipients(tx, c, e);
    case "pay-run.approved": return to(await payRunUsers(tx, c, e.payRunId),
      { kind: "payslip-available", vars: { period: period(e.period) },
        link: { routeId: "listMyPayslips", id: null } });
    case "inbound.received": return to(await ofRoles(tx, c, ["owner", "hr"]),
      { kind: "inbound-received", vars: {},
        link: { routeId: "getInboundItem", id: e.itemId } });
    case "webhook.paused": return to(await ofRoles(tx, c, ["owner"]),
      { kind: "webhook-paused", vars: {},
        link: { routeId: "listWebhookEndpoints", id: null } });
    case "sso.linked": return to(await members(tx, c, [e.userId]),
      { kind: "security-sso-linked", link: null,
        vars: { provider: `provider.${e.provider}` } });
    default: return [];
  }
}
