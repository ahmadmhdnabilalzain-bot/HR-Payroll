import {
  INBOUND_PROCESSING_NOTE,
  type InboundItem,
  type InboundSettings,
} from "./inbound";
import { SSO_NOTE } from "./sso";

const ID = "00000000-0000-4000-8000-000000000e01";
const EMP = "00000000-0000-4000-8000-000000000e02";
const AT = "2026-03-01T08:00:00.000Z";

const settings: InboundSettings = { enabled: true,
  allowlist: ["@vendor.test"], acknowledgedProcessing: true, version: 1,
  address: "in+0000000000004000800000000000000a.abcdefghijklmnop@" +
    "in.example.com", provider: "configured",
  note: INBOUND_PROCESSING_NOTE };

const item: InboundItem = { id: ID, status: "received", receivedAt: AT,
  fromAddress: "sara@acme.test", matchedEmployee: { employeeId: EMP,
    name: "Sara A" }, subject: "Taxi receipt",
  textPreview: "See attached.", auth: { spf: "pass", dkim: "pass",
    dmarc: "pass" }, flags: [], attachments: [{ index: 0,
    fileName: "taxi.png", contentType: "image/png", size: 1024,
    status: "kept", skip: null }], rejectReason: null, decision: null };

const feed = { id: ID, scope: "my", status: "active", createdAt: AT,
  lastFetchedAt: null, urlHint: "…AbCdEf" };

const ep = { id: ID, url: "https://hooks.example.com/payroll",
  description: "", events: ["employee.created"], status: "active",
  pausedReason: null, secretHint: "whsec_…AbCd", consecutiveFailures: 0,
  createdAt: AT };
const del = { id: ID, endpointId: ID, eventId: `evt_${ID}`,
  eventType: "employee.created", status: "succeeded", attempts: [{ n: 1,
    at: AT, statusCode: 200, error: null, durationMs: 120 }],
  nextAttemptAt: null, createdAt: AT };

const key = { id: ID, name: "Accounting sync",
  prefix: "hrk_0123456789abcdef", scopes: ["employees:read"],
  rateLimitPerMinute: 120, status: "active", createdAt: AT,
  expiresAt: null, lastUsedAt: null, rotatedAt: null,
  previousValidUntil: null };

/** Task 5 to 9 examples. */
export const INBOUND_EXAMPLES: Readonly<Record<string, unknown>> = {
  InboundSettings: settings,
  InboundItem: item,
  InboundItemList: { items: [item] },
  InboundAttachmentContent: "raw bytes",
  CalendarFeed: feed,
  CalendarFeedList: { items: [feed] },
  CalendarFeedCreated: { ...feed, url: "https://api.example.com/v1/" +
    "calendar/cal1.<company>.<feed>.<secret>.ics" },
  CalendarFeedCreate: { scope: "my" },
  WebhookEndpoint: ep,
  WebhookEndpointList: { items: [ep] },
  WebhookEndpointCreated: { ...ep, secret: "whsec_EXAMPLE" },
  WebhookDelivery: del,
  WebhookDeliveryList: { items: [del] },
  ApiKey: key,
  OpenApiJson: { openapi: "3.1.0" },
  DeveloperGuide: { baseUrl: "https://api.example.com", sections: [],
    scopes: [], webhookEvents: [] },
  ApiKeyList: { items: [key] },
  ApiKeyCreated: { key, secret: "hrk_0123456789abcdef_" +
    "EXAMPLEEXAMPLEEXAMPLEEXAMPLEEXAMPLEEXAMPLEX" },
  SsoStartResponse: { authorizeUrl: "https://accounts.google.com/o/" +
    "oauth2/v2/auth?state=...", expiresAt: AT },
  SsoIdentityList: { items: [{ id: ID, provider: "google",
    email: "sara@acme.test", linkedAt: AT, lastUsedAt: null }] },
  SsoSettings: { allowedDomains: ["acme.test"],
    googleHostedDomains: ["acme.test"], microsoftTenantIds: [],
    jitEmployees: false, enforceSso: false, version: 1,
    providers: { google: "configured", microsoft: "not-configured" },
    note: SSO_NOTE },
  IcsText: "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nEND:VCALENDAR\r\n",
};
