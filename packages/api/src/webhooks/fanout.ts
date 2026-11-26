import type { DomainEvent } from "../channels/events";
import type { EventCtx } from "../channels/notify";

export interface WebhookFact {
  type: string;
  entityType: "employee" | "leave-request" | "pay-run" | "expense-claim" |
    "endpoint";
  entityId: string;
  outcome?: string;
}

/** Pure: the thin webhook event for a domain event, or null. */
export function toWebhookEvent(e: DomainEvent): WebhookFact | null {
  switch (e.type) {
    case "employee.created":
    case "employee.updated":
      return { type: e.type, entityType: "employee", entityId: e.employeeId };
    case "leave.requested":
      return { type: e.type, entityType: "leave-request",
        entityId: e.leaveRequestId };
    case "leave.decided":
      return { type: e.type, entityType: "leave-request",
        entityId: e.leaveRequestId, outcome: e.outcome };
    case "pay-run.approved":
      return { type: e.type, entityType: "pay-run", entityId: e.payRunId };
    case "approval.closed":
      return e.subjectType !== "expense-claim" ? null
        : { type: "expense-claim.decided", entityType: "expense-claim",
          entityId: e.subjectId, outcome: e.outcome };
    default: return null;
  }
}

/** Stores one event; returns its id. */
export async function insertWebhookEvent(c: EventCtx, f: WebhookFact)
  : Promise<string> {
  const id = c.deps.newId();
  await c.tx.query(
    `INSERT INTO webhook_events (id, company_id, type, entity_type,
       entity_id, outcome, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [id, c.companyId, f.type, f.entityType, f.entityId, f.outcome ?? null,
      c.deps.now().toISOString()]);
  return id;
}

export async function insertWebhookDelivery(c: EventCtx, endpointId: string,
  eventId: string): Promise<string> {
  const id = c.deps.newId();
  const now = c.deps.now().toISOString();
  await c.tx.query(
    `INSERT INTO webhook_deliveries (id, company_id, endpoint_id, event_id,
       status, next_attempt_at, created_at)
     VALUES ($1, $2, $3, $4, 'pending', $5, $5)`,
    [id, c.companyId, endpointId, eventId, now]);
  return id;
}

/** One event and one pending delivery per subscribed active endpoint. */
export async function webhookFanOut(c: EventCtx, e: DomainEvent)
  : Promise<void> {
  const f = toWebhookEvent(e);
  if (f === null) return;
  const eps = await c.tx.query<{ id: string }>(
    `SELECT id FROM webhook_endpoints WHERE company_id = $1
       AND status = 'active' AND $2 = ANY (events)`, [c.companyId, f.type]);
  if (eps.length === 0) return;
  const eventId = await insertWebhookEvent(c, f);
  for (const ep of eps) await insertWebhookDelivery(c, ep.id, eventId);
}
