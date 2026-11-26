import { z } from "zod";
import { Id, listOf, Timestamp } from "./primitives";

export const WEBHOOK_EVENT_TYPES = ["employee.created", "employee.updated",
  "leave.requested", "leave.decided", "pay-run.approved",
  "expense-claim.decided"] as const;
export const WebhookEventType = z.enum([...WEBHOOK_EVENT_TYPES, "ping"]);

/** Thin events: ids only; consumers fetch details with an API key. */
export const WebhookEvent = z.object({
  id: z.string().regex(/^evt_[0-9a-f-]{36}$/),
  type: WebhookEventType,
  createdAt: Timestamp,
  companyId: Id,
  data: z.object({
    entityType: z.enum(["employee", "leave-request", "pay-run",
      "expense-claim", "endpoint"]),
    entityId: Id,
    outcome: z.enum(["approved", "rejected", "returned"]).optional(),
  }),
});
export type WebhookEvent = z.infer<typeof WebhookEvent>;

export const WEBHOOK_SIGNATURE_NOTE = "Each request carries X-Webhook-Id, " +
  "X-Webhook-Timestamp and X-Webhook-Signature. The signature is " +
  "v1=<hex HMAC-SHA256 of id.timestamp.body with your secret>. Reject " +
  "requests older than 300 seconds and ids you have already seen. " +
  "During a secret rotation two v1 values are sent.";

const Events = z.array(z.enum(WEBHOOK_EVENT_TYPES)).min(1).max(6)
  .refine((l) => new Set(l).size === l.length, "events must be unique");

export const WebhookEndpointCreate = z.object({
  url: z.string().min(1).max(500),
  description: z.string().max(200).optional(),
  events: Events,
});
export type WebhookEndpointCreate = z.infer<typeof WebhookEndpointCreate>;

export const WebhookEndpoint = z.object({
  id: Id,
  url: z.string(),
  description: z.string(),
  events: z.array(z.enum(WEBHOOK_EVENT_TYPES)),
  status: z.enum(["active", "paused"]),
  pausedReason: z.enum(["manual", "failing", "gone"]).nullable(),
  secretHint: z.string().regex(/^whsec_…[A-Za-z0-9_-]{4}$/),
  consecutiveFailures: z.number().int(),
  createdAt: Timestamp,
});
export type WebhookEndpoint = z.infer<typeof WebhookEndpoint>;
export const WebhookEndpointList = listOf(WebhookEndpoint);
export const WebhookEndpointCreated = WebhookEndpoint.extend({
  secret: z.string() });

export const WebhookEndpointUpdate = z.object({
  url: z.string().min(1).max(500).optional(),
  description: z.string().max(200).optional(),
  events: Events.optional(),
  status: z.enum(["active", "paused"]).optional(),
});
export type WebhookEndpointUpdate = z.infer<typeof WebhookEndpointUpdate>;

export const WebhookSecretRotate = z.object({
  graceHours: z.number().int().min(0).max(72) });

export const WebhookErrorCode = z.enum(["TIMEOUT", "NETWORK", "TLS",
  "HOST_NOT_PUBLIC", "URL_NOT_ALLOWED", "REDIRECT_NOT_FOLLOWED",
  "HTTP_STATUS"]);
export type WebhookErrorCode = z.infer<typeof WebhookErrorCode>;

export const WebhookDelivery = z.object({
  id: Id,
  endpointId: Id,
  eventId: z.string(),
  eventType: WebhookEventType,
  status: z.enum(["pending", "succeeded", "failed"]),
  attempts: z.array(z.object({ n: z.number().int(), at: Timestamp,
    statusCode: z.number().int().nullable(),
    error: WebhookErrorCode.nullable(), durationMs: z.number().int() })),
  nextAttemptAt: Timestamp.nullable(),
  createdAt: Timestamp,
});
export type WebhookDelivery = z.infer<typeof WebhookDelivery>;
export const WebhookDeliveryList = listOf(WebhookDelivery);

export const WebhookDeliveryQuery = z.object({
  endpointId: Id.optional(),
  status: z.enum(["pending", "succeeded", "failed"]).optional(),
  before: Timestamp.optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});
