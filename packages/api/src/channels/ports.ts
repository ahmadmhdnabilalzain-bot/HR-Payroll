/**
 * Every outside service as a port (types only). Tests use fakes; the
 * real adapters report not configured until their environment
 * variables are set (Ruling 2).
 */
export interface HttpRequest {
  method: "GET" | "POST";
  url: string;
  headers: Record<string, string>;
  body?: string;
  timeoutMs: number;
  /** Connect to this address (the host's checked IP), not a new lookup. */
  pinAddress?: string;
}

export interface HttpResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
}

export type HttpFailureCode = "TIMEOUT" | "NETWORK" | "TLS";

/** A request that got no HTTP response. */
export class HttpFailure extends Error {
  constructor(readonly code: HttpFailureCode) {
    super(`http ${code.toLowerCase()}`);
    this.name = "HttpFailure";
  }
}

/** Never follows redirects: a 3xx comes back as a plain response. */
export interface HttpClient {
  send(r: HttpRequest): Promise<HttpResponse>;
}

export type SendOutcome =
  | { status: "sent"; providerMessageId: string }
  | { status: "failed"; retryable: boolean; code: string }
  | { status: "not-configured" };

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  idempotencyKey: string;
}

export interface EmailSender {
  readonly configured: boolean;
  send(m: EmailMessage): Promise<SendOutcome>;
}

export interface WaTemplateMessage {
  toE164: string;
  templateName: string;
  language: "en" | "ar";
  bodyParams: string[];
  buttonPayloads: string[];
  idempotencyKey: string;
}

export interface WaTextMessage {
  toE164: string;
  text: string;
  idempotencyKey: string;
}

export interface WhatsAppSender {
  readonly configured: boolean;
  sendTemplate(m: WaTemplateMessage): Promise<SendOutcome>;
  sendText(m: WaTextMessage): Promise<SendOutcome>;
}

export type WaInboundEvent =
  | { kind: "button"; messageId: string; fromE164: string; payload: string }
  | { kind: "text"; messageId: string; fromE164: string; text: string }
  | { kind: "other"; messageId: string };

export interface WhatsAppInbound {
  readonly configured: boolean;
  verifySignature(rawBody: string, header: string | undefined): boolean;
  challenge(q: Record<string, string>): string | null;
  parse(json: unknown): WaInboundEvent[];
}

export type AuthVerdictT = "pass" | "fail" | "softfail" | "neutral" |
  "none" | "unknown";

export interface InboundAttachment {
  name: string;
  contentType: string;
  bytes: Uint8Array;
}

/** The adapter reads the provider's results; core code judges them. */
export interface InboundEmail {
  messageId: string;
  from: string;
  mailboxHash: string;
  subject: string;
  text: string;
  auth: { spf: AuthVerdictT; dkim: AuthVerdictT; dmarc: AuthVerdictT;
    /** Domains the passing SPF and DKIM results were for, if known. */
    spfDomain?: string | null; dkimDomain?: string | null };
  attachments: InboundAttachment[];
}

export interface InboundEmailAdapter {
  readonly configured: boolean;
  authenticate(authorization: string | undefined): boolean;
  /** Throws ApiError INBOUND_PAYLOAD_INVALID. */
  parse(json: unknown): InboundEmail;
}

export type SsoProvider = "google" | "microsoft";

export interface OidcClient {
  configured(p: SsoProvider): boolean;
  clientId(p: SsoProvider): string;
  authorizeUrl(p: SsoProvider, a: { state: string; nonce: string;
    codeChallenge: string; redirectUri: string }): string;
  exchangeCode(p: SsoProvider, a: { code: string; codeVerifier: string;
    redirectUri: string }): Promise<{ idToken: string }>;
  keys(p: SsoProvider): Promise<JsonWebKey[]>;
}

export interface CalendarPushAdapter {
  readonly provider: SsoProvider;
  readonly configured: boolean;
  upsertEvent(e: { externalId: string; date: string; endExclusive: string;
    title: string }): Promise<SendOutcome>;
  removeEvent(externalId: string): Promise<SendOutcome>;
}

export interface ChannelPorts {
  http: HttpClient;
  email: EmailSender;
  whatsapp: WhatsAppSender;
  whatsappInbound: WhatsAppInbound;
  inboundEmail: InboundEmailAdapter;
  oidc: OidcClient;
  calendarPush: readonly CalendarPushAdapter[];
  resolveHost: (host: string) => Promise<string[]>;
  /** https base URLs without a trailing slash; null when not set. */
  publicApiBaseUrl: string | null;
  publicAppBaseUrl: string | null;
  inboundEmailDomain: string | null;
}
