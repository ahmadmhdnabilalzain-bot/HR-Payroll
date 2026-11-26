# Plan 13: Channels and Integrations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps
> use checkbox (`- [ ]`) syntax for tracking.

**Features delivered (10; count progress by these names):**

1. N1 Notification service: in-app inbox, email and WhatsApp channels
   behind provider ports, with a delivery log (Tasks 2, 3).
2. N2 Per-user notification preferences and quiet hours (Task 2).
3. N3 Message templates in English and Arabic (Arabic marked NEEDS
   NATIVE REVIEW and never sent until reviewed) (Task 2).
4. W1 WhatsApp approvals: verified opt-in, signed one-time action
   tokens, approve and reject mapped to the approval spine, rate limits,
   fallback to email (Tasks 3, 4).
5. E1 Email-in: one address per company with a plus token, sender
   allow-list, SPF and DKIM handling, attachments kept, and a human
   review inbox before anything reaches claims or payroll (Task 5).
6. C1 Calendar feed: secret-URL ICS feed for leave, holidays and
   deadlines; Google and Microsoft push adapters as interfaces only
   (Task 6).
7. S1 SSO with OpenID Connect (Google, Microsoft Entra multitenant),
   with account linking rules and no automatic owner accounts (Task 7).
8. H1 Outbound signed webhooks with retries, replay protection and a
   delivery log (Task 8).
9. K1 API keys with scopes, rotation and per-key rate limits (Task 9).
10. D1 Developer surface: OpenAPI served, developer guide with example
    calls, and the developer page spec for the web app (Task 10).

**Goal:** Let people act and be told where they already are (WhatsApp,
email, their calendar), let companies sign in with their own identity
provider, and let other systems integrate through scoped API keys and
signed webhooks, without moving a single approval, payroll or ledger
decision out of the audited spine.

**Architecture:** Plan 13 extends Plan 3's `packages/contract` and
`packages/api`; it adds no package. Every outside service is a port in
`AppDeps.channels` (`ChannelPorts`, Task 1) with a fake for tests and a
real adapter that reports `not-configured` until its environment
variables are set, so `pnpm check` never touches the network. Business
code emits domain events inside its own transaction (`emitEvent`); the
events become in-app notifications, queued deliveries and webhook
deliveries in the same transaction (an outbox), and a job
(`main.ts jobs`) sends them later with leases and retries. Decisions
that arrive from WhatsApp go through Plan 6's `decide` as the opted-in
user, so separation of duties, audit and the step lock are unchanged.
Pure modules decide everything testable on its own: quiet hours,
template rendering, token signing, ID token checks, URL safety,
signatures, retry schedules, ICS text and rate windows.

**Tech Stack:** As Plan 3: Node 22, TypeScript 7.0.2, zod 4.6.7, Hono
4.13.17, @electric-sql/pglite 0.5.16 (tests), pg 8.23.1, Vitest 5.1.2,
fast-check 4.11.0, tsx 4.23.15. Node built-ins only for crypto
(`createHmac`, `hkdfSync`, `createPublicKey`, `verify`,
`generateKeyPairSync` in tests, `timingSafeEqual`) and HTTP
(`node:https` with a pinned `lookup`, `node:dns/promises`). No new
dependency (Ruling 6).

**Spec:** `docs/superpowers/specs/2026-11-25-master-feature-list.md`
(capability 8 "Channels: WhatsApp, email-in, calendar"; UQ21 WhatsApp
approvals with the same audit trail; UQ22 email-in to records; UQ7's
calendar feed), `docs/superpowers/specs/2026-11-25-advisor-proof.md`
(F21 "Open REST API and signed webhooks on every plan", F22 "SSO
(Google, Microsoft, Okta) and MFA"),
`docs/superpowers/specs/2026-11-25-combined-feature-list.md` (rows "SSO
(Google, Microsoft, Okta) and MFA", "API and webhooks"),
`docs/research/2026-11-26-channels-feasibility.md` (READ, EXCERPT and
NOT FOUND labels used as stated there),
`docs/research/2026-11-26-pdpl-primary.md` (Art 4, 6, 13, 22, 23),
`docs/engineering-standards.md`, `LEDGER.md` sections 1 to 3 (speed
ruling, autonomous mode). Extends
`docs/superpowers/plans/2026-11-26-plan-3-backend.md` (contract, API,
tenancy, audit, roles, sessions). Uses
`docs/superpowers/plans/2026-11-26-plan-6-expenses.md` (approval spine,
receipts, draft claims), `2026-11-26-plan-9-time-attendance.md`
(holidays), `2026-11-26-plan-10-performance-learning.md` (`ROUTE_GROUPS`
and 4-digit migrations) and `2026-11-26-plan-11-owner-view-evidence.md`
(`main.ts jobs`, `JobCtx`, the ICS writer, deadlines).

**Not claimed (stated so progress is not over-counted):** UQ21's "show
the engine's effect and the cited rule" in WhatsApp (messages carry no
amounts or rules, Ruling 11); UQ22's resignation and visa-copy intake
and the owner digest (only receipts and draft claims, Ruling 19); SAML
and Okta (Ruling 24); two-way calendar sync (Ruling 21); WhatsApp
self-service beyond approvals; any statement about TDRA rules (the
research found none for WhatsApp; Ruling 27). The master list's UQ8 is
the cost and budget view, not channels; this plan follows capability 8
and records the mix-up as Ruling 1.

**Prerequisites (per task).** Where this plan consumes a function of
another plan that its own Interfaces blocks do not name exactly, the
executor exports it from the named file under the name given here,
renaming only at the export (the pattern of Plan 10).

Tasks run in order, 1 to 10, each on the previous one's commit.

| Task | Needs merged first (besides the earlier tasks) |
|---|---|
| 1 | Plan 3 Tasks 1 to 8 |
| 2 to 5, 7 to 10 | Plan 6 Tasks 2, 3 and 5 (spine, receipts, claims) |
| 6 | Plan 9 Task 3 (holidays); Plan 11 Task 5 (deadlines) |

Signatures consumed from other plans (exact; exported as named):

- Plan 3 `src/http/context.ts`: `ReqCtx { deps: AppDeps; tx: Db; user:
  { id: string; email: string; displayName: string }; session: { mfa:
  boolean; expiresAt: string }; tenant: { companyId: string; role:
  Role; employeeId: string | null } | null; params; query; body;
  headers }` (Plan 13 adds `session.via` and `session.authMethod`,
  Tasks 1 and 7, and `apiKey`, Task 9).
- Plan 3 `src/leave/requests.ts`: `listLeaveInRange(tx: Db, companyId:
  string, employeeIds: string[] | "all", from: string, to: string):
  Promise<{ id: string; employeeId: string; leaveTypeId: string;
  startDate: string; endDate: string; status: "pending" | "approved"
  }[]>` (pending and approved only).
- Plan 3 `src/routes/auth.ts`: `consumeInvite(tx: Db, deps: AppDeps,
  setupToken: string, user: { email: string; displayName: string;
  passwordHash: string | null }): Promise<{ userId: string; companyId:
  string; role: Role }>` (the accept-invite logic: create or link the
  user, add the membership, mark the invite used).
- Plan 6 `src/approvals/requests.ts` and `decide.ts`: `openRequest`,
  `viewFor(tx: Db, approvalId: string): Promise<ApprovalView>`,
  `decide(ctx: ReqCtx, handlers: SubjectHandlers, approvalId: string,
  action: "approve" | "reject" | "return", body: { stepOrder: number;
  note?: string }): Promise<ApprovalView>`, `type SubjectHandlers`.
- Plan 6 `src/receipts/receipts.ts`: `storeReceiptBytes(ctx: ReqCtx,
  employeeId: string, fileName: string, bytes: Uint8Array):
  Promise<Receipt>` (the body of `uploadReceipt` after base64 decoding:
  size, sniff, hash, encrypt, store, audit; `uploadReceipt` calls it).
- Plan 6 `src/expenses/claims.ts`: `createClaim(ctx: ReqCtx, body:
  ExpenseClaimCreate): Promise<ExpenseClaim>` (the create route's
  logic; status `draft`; never submits).
- Plan 6 `src/storage/fs-blob.ts`: the key pattern becomes
  `^[0-9a-f-]{36}/(receipts|inbound)/[0-9a-f-]{36}$` (Task 5).
- Plan 9 `src/time/holidays.ts`: `listHolidays(tx: Db, companyId:
  string, from: string, to: string): Promise<Holiday[]>` (active
  only).
- Plan 11 `src/deadlines/service.ts`: `deadlinesBetween(c: ReqCtx |
  JobCtx, from: string, to: string): Promise<Deadline[]>` (the
  `listDeadlines` logic); `src/export/ics.ts`: `escapeIcsText(s:
  string): string` and `foldIcsLine(line: string): string` (exported;
  Task 6 creates them there if Plan 11's file lacks them).
- Plan 11 `src/reports/jobs.ts`: `JobCtx { tx: Db; deps: AppDeps;
  companyId: string; userId: string }`; `src/main.ts jobs` runs each
  registered job once and exits (Plan 13 registers its runners; if
  Plan 11 is absent, Task 3 creates `main.ts jobs` and `JobCtx` in
  `src/jobs/job-ctx.ts`).
- Plan 10 Task 1 / Plan 11 Task 1: `migrate` accepts
  `^(\d{3,4})_[a-z0-9_]+\.sql$` in numeric order. If neither is merged,
  Task 1 makes that change and adds Plan 10's `migrate_numeric_order`
  test.

## Global Constraints

- Plan 3's Global Constraints apply unchanged: 80-character lines,
  files under about 300 lines, functions under 30, `Fils` inside and
  `Money` on the wire, RLS forced on every tenant table, all queries
  through `withTenant`, injected time, ids and randomness (`AppDeps`),
  `/v1`, `X-Company-Id`, tests offline (no network, Docker or hosted
  database).
- No network in tests. Only `src/channels/http-node.ts` imports
  `node:https`, and only `src/channels/dns.ts` imports
  `node:dns/promises`; `fetch(` appears nowhere in `packages/api/src`
  (a source scan in Task 1 enforces it).
- Every real provider adapter returns `{ status: "not-configured" }`
  (or `configured: false`) until all its environment variables are set;
  a partly set group throws at start-up with the missing names.
- No message, notification, webhook body, ICS feed or delivery log
  holds a salary amount, IBAN, labour person id, Emirates ID number,
  password, TOTP, API key, webhook secret or action token in visible
  text. Templates take only declared variables; a value that looks like
  money (`^\d[\d,]*\.\d{2}$`), an IBAN (`AE\d{2}`), a 14-digit id or an
  Emirates ID (`784\d{12}`) is refused (`TEMPLATE_VAR_FORBIDDEN`).
- Arabic copy is drafted here and marked `NEEDS NATIVE REVIEW`
  (`arReviewed: false`). Arabic is never sent to an employee while
  `arReviewed` is false: the English copy goes out and the delivery
  records `languageFallback: true` (HANDOVER rule; Ruling 12).
- Provider facts the research did not READ are labelled in code with
  `// UNVERIFIED: <what>` and kept inside one adapter file each: Meta
  Cloud API send and webhook shapes, the Postmark send endpoint, the
  Postmark inbound field names beyond those READ, its SPF and DKIM
  header formats and Basic credentials on its hook, and the Google
  and Entra issuer formats and discovery URLs. Tests assert the port with
  fakes, never a provider's wire format as fact.
- No WhatsApp price, verification lead time, messaging tier or TDRA
  rule appears in code, constants, defaults or copy. Every limit here is
  labelled "product default, not a provider limit".
- Nothing from a channel reaches payroll or the ledger without a person
  in the app: WhatsApp decides only approval-spine steps of subject
  types in `CHANNEL_APPROVABLE_SUBJECTS` (`["expense-claim"]`); email-in
  creates only receipts and `draft` claims after a human accepts.
- Audit actions match `^[a-z]+(\.[a-z-]+)+$` with no hyphen in the first
  segment (`apikey.created`, `webhook.endpoint-created`). Every Plan 13
  service audits through `channelAudit` (Task 1), which refuses
  `CHANNEL_SENSITIVE_KEYS` at any depth.
- API keys are default-deny: a route is callable with a key only when
  its id is in `API_KEY_SCOPES` (Task 9); a route with `mfa: true`, any
  route in `CHANNEL_ROUTES`, any `public` or `user` route and any
  approval-spine route is never callable with a key.
- No DELETE route or grant; removal is a status (`revoked`, `paused`,
  `withdrawn`, `dismissed`).
- Migrations are numbered `1301_` to `1309_` (Plan 13's range).
- Tables keyed by user rather than company (`sso_states`,
  `sso_identities`) are global and added by name to `GLOBAL_TABLES` in
  `tests/rls-catalog.test.ts`; every other new table has `company_id`,
  forced RLS and select, insert, update grants only.
- "Now" is `deps.now()`; civil times (quiet hours, feed ranges) use
  Asia/Dubai, fixed UTC+4 (Plan 3 `dubaiDate`, `dubaiTime`).
- Each task ends with `pnpm check` green and one commit, adds one
  happy-path row per new route to `tests/conformance.test.ts` and its
  ids to the `tests/leak.test.ts` id map. Review: fresh per-task review
  after Tasks 4, 5, 7, 8 and 9 (security); one whole-branch review at
  the end (speed ruling, 2026-11-26).

## Review Focus

1. A WhatsApp action token replayed, tapped twice at once, tapped by
   the claimant, tapped after the step moved on, or tapped after the
   approver withdrew the opt-in: at most one decision and never a
   decision the in-app path would refuse (Task 4
   `wa_action_once_and_spine_rules`).
2. An unlinked Google or Microsoft identity whose email equals an
   owner's email: no session, no link and no new account; just-in-time
   accounts are only ever `employee` (Task 7
   `sso_unlinked_owner_email_refused`).
3. An API key used on an MFA route, a channel route, with another
   company's `X-Company-Id`, after revoke, or with the old secret after
   the rotation grace: 401 or 403, never a 200 (Task 9
   `apikey_cannot_escape`).
4. Leaks outside GET bodies: sentinel amounts and IBANs never appear in
   fake provider outboxes, webhook bodies or ICS text, and no webhook
   reaches a private address or follows a redirect (Task 8
   `webhook_no_leak_no_ssrf`, Task 3 `outbox_has_no_sentinels`, Task 6
   `feed_no_sentinels`).
5. Email-in from a spoofed allow-listed sender (SPF fail, DKIM fail), an
   attachment declared PDF whose bytes are HTML, and the same message
   posted twice by the provider: one item at most, nothing stored for
   the spoof, nothing reaching a claim without a human accept (Task 5
   `email_in_spoof_retry_and_review`).

## File Structure

```
packages/contract/src/route-def.ts        + rawBody, contentType kinds
packages/contract/src/routes-channels.ts  CHANNEL_ROUTES (Tasks 1-10)
packages/contract/src/routes.ts           join CHANNEL_ROUTES (Task 1)
packages/contract/src/channel-settings.ts settings, provider status
packages/contract/src/notifications.ts    kinds, prefs, inbox, log
packages/contract/src/templates.ts        TEMPLATES, TEMPLATE_TERMS
packages/contract/src/whatsapp.ts         opt-in, channel status
packages/contract/src/inbound.ts          email-in settings, items
packages/contract/src/calendar.ts         feeds
packages/contract/src/sso.ts              start, callback, identities
packages/contract/src/webhooks.ts         endpoints, events, deliveries
packages/contract/src/api-keys.ts         keys, ApiScope
packages/contract/src/api-scopes.ts       API_KEY_SCOPES (default deny)
packages/contract/src/developer-guide.ts  buildDeveloperGuide (pure)
packages/api/migrations/1301_channels_platform.sql ... 1309_api_keys.sql
packages/api/src/channels/                ports, audit, actor, rate,
                                          settings, events, notify,
                                          quiet (pure), render (pure),
                                          dispatch, adapters
packages/api/src/whatsapp/                opt-in, token (pure), actions,
                                          inbound
packages/api/src/inbound/                 auth-decision (pure), mailbox,
                                          intake, review
packages/api/src/calendar/                feed-token, feed (pure), push
packages/api/src/sso/                     pkce, id-token, identity,
                                          link (pure), service
packages/api/src/webhooks/                url-guard (pure), sign (pure),
                                          schedule (pure), endpoints,
                                          deliver
packages/api/src/apikeys/                 format (pure), keys, auth
packages/api/src/routes/channels-*.ts     route files per task
HANDOVER.md, LEDGER.md                    updated in Task 10
```

---

### Task 1: Channel platform: routes, ports, audit, actor, rate limits

**Files:**
- Modify: `packages/contract/src/route-def.ts` (`rawBody?: boolean`;
  `contentType` gains `"text/calendar"` and `"binary"` when absent;
  `bodyLimit?: number` when absent), `src/routes.ts` (join
  `CHANNEL_ROUTES`), `src/errors.ts`, `src/registry.ts`,
  `src/examples.ts`, `src/index.ts`, `tests/routes.test.ts` (whole-list
  counts become membership checks: see Step 1)
- Create: `packages/contract/src/routes-channels.ts`,
  `src/channel-settings.ts`
- Modify: `packages/api/src/deps.ts` (`AppDeps.channels: ChannelPorts`),
  `src/crypto/keyring.ts` (`derive`), `src/config.ts` (channel groups),
  `src/http/context.ts` (`session.via`), `src/app.ts` (`rawBody`),
  `tests/helpers/test-app.ts` (`makeApp({ channels })`, default
  `fakeChannels()`), `tests/main.test.ts`
- Create: `packages/api/migrations/1301_channels_platform.sql`,
  `src/channels/ports.ts`, `src/channels/not-configured.ts`,
  `src/channels/audit.ts`, `src/channels/actor.ts`,
  `src/channels/rate.ts`, `src/channels/seen.ts`,
  `src/channels/settings.ts`, `src/channels/wire.ts`,
  `src/routes/channels-settings.ts`,
  `tests/helpers/fake-channels.ts`
- Test: `packages/contract/tests/routes-channels.test.ts`,
  `packages/api/tests/channels-platform.test.ts`,
  `tests/channels-network-scan.test.ts`

**Interfaces:**
- Consumes: Plan 3 `RouteDef`, `ten`, `usr`, `pub`, `ALL_ROLES`,
  `PAYROLL`, `OWNER`, `ROUTES`, `listOf`, `SCHEMAS`, `register`,
  `ReqCtx`, `ApiError`, `appendAudit`, `AuditInput`, `AuditEvent`,
  `Keyring`, `withTenant`, `loadConfig`, `makeApp`, `seedCompany`,
  `call`.
- Produces (contract):
  - `CHANNEL_ROUTES: readonly RouteDef[]`. `routes.ts`: if
    `ROUTE_GROUPS` exists, append `CHANNEL_ROUTES` as its last group;
    otherwise append `...CHANNEL_ROUTES` last to the `ROUTES` join.
  - `RouteDef.rawBody?: boolean`: the handler gets the request text as
    `ctx.rawBody: string`; the `body` schema (if any) is applied to
    `JSON.parse(rawBody)`.
  - `ProviderState = z.enum(["configured","not-configured"])`;
    `ProviderStatus { email; whatsapp; inboundEmail; googleSso;
    microsoftSso }` (each `ProviderState`).
  - `ChannelSettingsBody { whatsappEnabled: boolean;
    whatsappApprovals: boolean; whatsappDailyCap: int 0..100000;
    whatsappHourlyPerUser: int 1..200; emailEnabled: boolean }`;
    `CHANNEL_DEFAULTS = { whatsappEnabled: false, whatsappApprovals:
    false, whatsappDailyCap: 200, whatsappHourlyPerUser: 20,
    emailEnabled: true }`; `CHANNEL_DEFAULTS_NOTE = "Product defaults,
    not provider limits or law. Change them to suit your company."`;
    `ChannelSettings = ChannelSettingsBody & { version: int >= 0;
    providers: ProviderStatus; note: typeof CHANNEL_DEFAULTS_NOTE }`;
    `ChannelSettingsUpdate = ChannelSettingsBody & { expectedVersion:
    int >= 0 }`.
  - Routes (this task): `getChannelSettings GET /v1/channel-settings`
    (owner, hr) to `ChannelSettings`; `putChannelSettings PUT
    /v1/channel-settings` (owner, mfa) to `ChannelSettings`.
  - Errors (status): `SETTINGS_VERSION_CONFLICT` 409 (if absent),
    `CHANNEL_NOT_CONFIGURED` 409, `RATE_LIMITED` 429.
- Produces (api):
  - Migration 1301: `channel_settings(company_id pk, version int, body
    jsonb, updated_by, updated_at)`; `rate_counters(company_id, scope
    text, key text, window_start bigint, count int, pk(company_id,
    scope, key, window_start))`; `inbound_seen(company_id, provider
    text, message_id text, seen_at, pk(company_id, provider,
    message_id))`. RLS as Plan 3; grants select, insert, update.
  - `ports.ts` (types only; later tasks implement):
    - `HttpRequest { method: "GET" | "POST"; url: string; headers:
      Record<string, string>; body?: string; timeoutMs: number;
      pinAddress?: string }`; `HttpResponse { status: number; headers:
      Record<string, string>; body: string }`; `interface HttpClient {
      send(r: HttpRequest): Promise<HttpResponse> }` (throws
      `HttpFailure { code: "TIMEOUT" | "NETWORK" | "TLS" }`; never
      follows redirects).
    - `SendOutcome = { status: "sent"; providerMessageId: string } |
      { status: "failed"; retryable: boolean; code: string } |
      { status: "not-configured" }`.
    - `interface EmailSender { readonly configured: boolean; send(m: {
      to: string; subject: string; text: string; idempotencyKey:
      string }): Promise<SendOutcome> }`.
    - `interface WhatsAppSender { readonly configured: boolean;
      sendTemplate(m: { toE164: string; templateName: string;
      language: "en" | "ar"; bodyParams: string[]; buttonPayloads:
      string[]; idempotencyKey: string }): Promise<SendOutcome>;
      sendText(m: { toE164: string; text: string; idempotencyKey:
      string }): Promise<SendOutcome> }`.
    - `WaInboundEvent = { kind: "button"; messageId: string; fromE164:
      string; payload: string } | { kind: "text"; messageId: string;
      fromE164: string; text: string } | { kind: "other"; messageId:
      string }`; `interface WhatsAppInbound { readonly configured:
      boolean; verifySignature(rawBody: string, header: string |
      undefined): boolean; challenge(q: Record<string, string>): string
      | null; parse(json: unknown): WaInboundEvent[] }`.
    - `AuthVerdictT = "pass" | "fail" | "softfail" | "neutral" |
      "none" | "unknown"`; `InboundEmail { messageId: string; from:
      string; mailboxHash: string; subject: string; text: string;
      auth: { spf: AuthVerdictT; dkim: AuthVerdictT; dmarc:
      AuthVerdictT }; attachments: { name: string; contentType:
      string; bytes: Uint8Array }[] }` (the adapter reads the
      provider's SPF, DKIM and DMARC results; core code only judges
      them); `interface InboundEmailAdapter
      { readonly configured: boolean; authenticate(authorization:
      string | undefined): boolean; parse(json: unknown): InboundEmail
      }` (parse throws `INBOUND_PAYLOAD_INVALID`).
    - `SsoProvider = "google" | "microsoft"`; `interface OidcClient {
      configured(p: SsoProvider): boolean; clientId(p): string;
      authorizeUrl(p, a: { state: string; nonce: string;
      codeChallenge: string; redirectUri: string }): string;
      exchangeCode(p, a: { code: string; codeVerifier: string;
      redirectUri: string }): Promise<{ idToken: string }>; keys(p):
      Promise<JsonWebKey[]> }`.
    - `interface CalendarPushAdapter { readonly provider: SsoProvider;
      readonly configured: boolean; upsertEvent(e: { externalId:
      string; date: string; endExclusive: string; title: string }):
      Promise<SendOutcome>; removeEvent(externalId: string):
      Promise<SendOutcome> }`.
    - `ChannelPorts { http: HttpClient; email: EmailSender; whatsapp:
      WhatsAppSender; whatsappInbound: WhatsAppInbound; inboundEmail:
      InboundEmailAdapter; oidc: OidcClient; calendarPush: readonly
      CalendarPushAdapter[]; resolveHost: (host: string) =>
      Promise<string[]>; publicApiBaseUrl: string; publicAppBaseUrl:
      string; inboundEmailDomain: string | null }`.
  - `not-configured.ts`: `notConfiguredPorts(base: { publicApiBaseUrl;
    publicAppBaseUrl }): ChannelPorts`: every `configured` is false,
    every send returns `{ status: "not-configured" }`,
    `verifySignature` and `authenticate` return false, `challenge`
    returns null, `parse` throws `INBOUND_PAYLOAD_INVALID`, `oidc`
    methods other than `configured` throw `SSO_NOT_CONFIGURED`,
    `http.send` throws `HttpFailure("NETWORK")`, `resolveHost` returns
    `[]`, `inboundEmailDomain` null.
  - `audit.ts`: `CHANNEL_SENSITIVE_KEYS = ["phone","email","address",
    "to","from","token","secret","code","signature","body","text",
    "subject","url","note","reason","payload","amount","iban"]`;
    `channelAudit(tx: Db, e: AuditInput): Promise<AuditEvent>` throws
    `AUDIT_SENSITIVE_DATA` when any key at any depth is in the list,
    then calls `appendAudit`.
  - `actor.ts`: `actorCtx(tx: Db, deps: AppDeps, companyId: string,
    userId: string, via: "whatsapp" | "email-in" | "job"):
    Promise<ReqCtx>`: loads the user and membership (none: throws
    `ApiError(403, "TENANT_FORBIDDEN")`); `session = { mfa: false,
    expiresAt: deps.now().toISOString(), via }`; `tenant = { companyId,
    role, employeeId }`; empty params, query, body, headers. Used by
    Tasks 4 and 5; it never satisfies an MFA route.
  - `ReqCtx.session.via?: "web" | "whatsapp" | "email-in" | "job" |
    "api-key"` (absent means `web`).
  - `Keyring.derive(info: string): Uint8Array`: HKDF-SHA256 over the
    master key, empty salt, 32 bytes. Infos used: `"payroll/wa-action/
    v1"` (Task 4), `"payroll/phone-hash/v1"` (Task 3).
  - `rate.ts`: `windowStart(nowMs: number, windowSec: number): number`
    (pure, `floor(nowMs / 1000 / windowSec) * windowSec`);
    `consumeRate(tx: Db, companyId: string, scope: string, key: string,
    limit: number, windowSec: number, now: Date): Promise<{ allowed:
    boolean; remaining: number; resetAt: Date }>` via `INSERT ... ON
    CONFLICT DO UPDATE SET count = rate_counters.count + 1 RETURNING
    count`; `allowed = count <= limit`.
  - `seen.ts`: `markSeen(tx: Db, companyId: string, provider: string,
    messageId: string, now: Date): Promise<boolean>` (true the first
    time; `ON CONFLICT DO NOTHING RETURNING`).
  - `settings.ts`: `getChannelSettings(tx: Db, deps: AppDeps,
    companyId: string): Promise<ChannelSettings>` (no row: version 0,
    `CHANNEL_DEFAULTS`; `providers` from the ports' `configured`);
    `putChannelSettings(ctx, body)`: version mismatch 409
    `SETTINGS_VERSION_CONFLICT`; `whatsappEnabled: true` while the
    WhatsApp sender is not configured gives 409
    `CHANNEL_NOT_CONFIGURED`; audit `channel.settings-updated` (`data:
    { changed: string[] }`).
  - `config.ts`: `loadConfig` reads these optional groups, each all or
    nothing (a partial group throws `<GROUP> settings are incomplete:
    <names>`): `EMAIL` = `POSTMARK_SERVER_TOKEN`, `EMAIL_FROM`;
    `WHATSAPP` = `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`,
    `WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN`,
    `WHATSAPP_GRAPH_VERSION`; `INBOUND` = `INBOUND_EMAIL_DOMAIN`,
    `INBOUND_EMAIL_BASIC_AUTH`; `GOOGLE_SSO` = `GOOGLE_OIDC_CLIENT_ID`,
    `GOOGLE_OIDC_CLIENT_SECRET`; `ENTRA_SSO` = `ENTRA_CLIENT_ID`,
    `ENTRA_CLIENT_SECRET`. Required: `PUBLIC_API_BASE_URL` and
    `PUBLIC_APP_BASE_URL` (`https://` only; else throws
    `PUBLIC_API_BASE_URL must be an https URL`).
  - `wire.ts`: `buildChannelPorts(cfg: Config): ChannelPorts` starts
    from `notConfiguredPorts` and swaps in each configured adapter
    (each later task adds its line). Called only by `main.ts`.
  - `tests/helpers/fake-channels.ts`: `fakeChannels(opts?:
    Partial<FakeOpts>): FakeChannels` returning `ports: ChannelPorts`
    plus `outbox: { email: EmailSent[]; whatsapp: WaSent[] }`,
    `failNext(channel, outcome)`, `http: FakeHttp` (records requests,
    answers from a script), `dns: Map<string, string[]>`; every fake
    is `configured: true` unless `opts` says otherwise. Later tasks
    extend it (WhatsApp inbound signer, email payload builder, OIDC
    issuer with a generated RSA key).

- [ ] **Step 1: Write the failing tests**

`routes-channels.test.ts` (contract):
- `CHANNEL_ROUTES.map((r) => r.id)` deep-equals the literal
  `CHANNEL_ROUTE_IDS` in the test (this task: `getChannelSettings`,
  `putChannelSettings`; each later task appends its ids in the order
  its Interfaces block lists them).
- Every `CHANNEL_ROUTES` entry is in `ROUTES`; `ROUTES` ends with the
  channel routes (or `ROUTE_GROUPS.at(-1)` is `CHANNEL_ROUTES` when
  groups exist); no `(method, path)` pair repeats in `ROUTES`; no route
  has method `DELETE`.
- `CHANNEL_DEFAULTS` parses with `ChannelSettingsBody`;
  `whatsappDailyCap: -1` fails; the note text contains "not provider
  limits".
- In `tests/routes.test.ts`: `"has 49 routes"` becomes "the Plan 3
  ids are all present" (the 49 Plan 3 ids as a literal list, each
  found in `ROUTES`); `"public routes are exactly the four"` becomes
  "public routes are the four plus the listed channel ids"
  (`PUBLIC_CHANNEL_IDS` literal, empty in this task, appended by Tasks
  4 to 10; other plans' public ids such as `verifyPayslip` stay in the
  allowed list when present); `"mfa routes are tenant routes"` keeps
  its first check and its exact list becomes a subset check (the
  three Plan 3 ids present; every channel `mfa` route is `tenant`);
  `"owner-only routes are the four"` and
  `"only the SIF download is text/plain"` keep their Plan 3 ids as a
  subset check.

`channels-platform.test.ts` (api):
- `channel_settings_defaults`: hr GET gives version 0, the defaults,
  `providers.email "configured"` with `fakeChannels()` and
  `"not-configured"` with `fakeChannels({ email: false })`.
- `channel_settings_owner_mfa`: hr PUT gives 403 `FORBIDDEN`; owner
  without MFA 403 `MFA_REQUIRED`; with MFA and `expectedVersion: 0`
  gives version 1; again with 0 gives 409 `SETTINGS_VERSION_CONFLICT`;
  `whatsappEnabled: true` with `fakeChannels({ whatsapp: false })`
  gives 409 `CHANNEL_NOT_CONFIGURED`.
- `channel_audit_refuses_sensitive`: `channelAudit` with `data: {
  phone: "x" }` and with `data: { nested: { token: "x" } }` throws
  `AUDIT_SENSITIVE_DATA`; `data: { changed: ["emailEnabled"] }`
  appends; the PUT above wrote `channel.settings-updated` with `data`
  deep-equal to `{ changed: ["whatsappEnabled"] }` (or the field set).
- `rate_window_counts`: limit 2, window 60: three `consumeRate` calls
  at `2026-03-01T10:00:05Z` give `allowed` true, true, false and
  `remaining` 1, 0, 0; a call at `10:01:00Z` is allowed again;
  `resetAt` of the first is `10:01:00Z`; company B's counter for the
  same scope and key is separate.
- `mark_seen_once`: `markSeen` twice gives true then false; two
  concurrent calls give exactly one true.
- `actor_ctx_requires_membership`: a user without membership in the
  company gives 403 `TENANT_FORBIDDEN`; a member gets `session.mfa`
  false and `via` as passed.
- `keyring_derive_stable`: the same info gives the same 32 bytes; two
  infos differ; a different master key differs.
- `not_configured_ports`: every sender returns `{ status:
  "not-configured" }`; `verifySignature("{}", "sha256=00")` is false.

`channels-network-scan.test.ts`: under `packages/api/src`, `fetch(`
appears in no file; `node:https` and `node:http` are imported only by
`src/channels/http-node.ts`; `node:dns` only by `src/channels/dns.ts`
(both files are allowed to be absent until Task 3).

`main.test.ts` (add): a valid env without channel variables gives
`not-configured` for every provider; `POSTMARK_SERVER_TOKEN` alone
throws a message containing `EMAIL_FROM`; `PUBLIC_API_BASE_URL=
"http://x"` throws the https message.

- [ ] **Step 2: Run** `pnpm --filter @payroll/contract test` and
  `pnpm --filter @payroll/api test channels-platform
  channels-network-scan main`. Expected: FAIL.
- [ ] **Step 3: Implement** the files above. `register` reads the raw
  text once for `rawBody` routes and passes it on `ReqCtx.rawBody`.
- [ ] **Step 4: Run** `pnpm check`. Expected: PASS, including the RLS
  catalog test over the three new tables.
- [ ] **Step 5: Commit** `feat(api): channel platform, ports, settings`.

### Task 2: Notifications: events, templates, preferences, quiet hours

**Files:**
- Create: `packages/contract/src/notifications.ts`,
  `src/templates.ts`
- Modify: `packages/contract/src/routes-channels.ts`, `src/errors.ts`,
  `src/registry.ts`, `src/examples.ts`, `src/index.ts`
- Create: `packages/api/migrations/1302_notifications.sql`,
  `src/channels/events.ts`, `src/channels/recipients.ts`,
  `src/channels/render.ts` (pure), `src/channels/quiet.ts` (pure),
  `src/channels/prefs.ts`, `src/channels/notify.ts`,
  `src/channels/inbox.ts`, `src/routes/channels-notifications.ts`
- Modify: Plan 3 leave request service (`src/leave/requests.ts`:
  create, approve, reject call `emitEvent`), Plan 3
  `src/payroll/pay-runs.ts` (approve calls `emitEvent`), Plan 6
  `src/approvals/requests.ts` (`openRequest` emits) and
  `src/approvals/decide.ts` (step moved or request closed emits)
- Test: `packages/contract/tests/templates.test.ts`,
  `packages/api/tests/quiet-hours.test.ts`,
  `tests/render.test.ts`, `tests/notifications.test.ts`

**Interfaces:**
- Consumes: Task 1 `channelAudit`, `getChannelSettings`, `ChannelPorts`;
  Plan 3 `dubaiDate`, `dubaiTime`, `viewerScope`; Plan 6
  `ApprovalView`; Plan 11 `JobCtx` (type only).
- Produces (contract):
  - `NotificationKind = z.enum(["approval-pending","approval-closed",
    "leave-requested","leave-decided","payslip-available",
    "inbound-received","webhook-paused","security-sso-linked",
    "channel-verify-code"])`.
  - `Channel = z.enum(["in-app","email","whatsapp"])`.
  - `TermKey`: the keys of `TEMPLATE_TERMS`.
  - `TEMPLATE_TERMS: Record<string, { en: string; ar: string }>` with
    exactly: `subject.expense-claim` ("expense claim", "مطالبة
    مصروفات"), `outcome.approved` ("approved", "تمت الموافقة عليها"),
    `outcome.rejected` ("rejected", "تم رفضها"), `outcome.returned`
    ("returned for changes", "أعيدت للتعديل"), `provider.google`
    ("Google", "Google"), `provider.microsoft` ("Microsoft",
    "Microsoft").
  - `TemplateVar = { kind: "text" } | { kind: "date" } | { kind:
    "term"; prefix: string } | { kind: "code" }`.
  - `TEMPLATES: Record<NotificationKind, { vars: Record<string,
    TemplateVar>; en: { subject: string; body: string }; ar: {
    subject: string; body: string }; arReviewed: false;
    whatsappTemplate: string | null }>` with this exact English copy
    (`{name}` marks a variable; Arabic drafts below, NEEDS NATIVE
    REVIEW):
    - `approval-pending` vars `requester` text, `subject` term
      `subject.`: subject "Approval waiting: {subject}", body
      "{requester} asked you to approve: {subject}. Open the app to
      review it."; whatsapp `approval_pending_v1`.
    - `approval-closed` vars `subject`, `outcome` term `outcome.`:
      subject "Your {subject} was {outcome}", body "Your {subject} was
      {outcome}. Open the app for the details."; whatsapp
      `approval_closed_v1`.
    - `leave-requested` vars `requester` text, `start` date, `end`
      date: subject "Leave request from {requester}", body
      "{requester} asked for leave from {start} to {end}. Open the app
      to review it."; whatsapp `leave_requested_v1`.
    - `leave-decided` vars `start`, `end`, `outcome`: subject "Your
      leave was {outcome}", body "Your leave from {start} to {end} was
      {outcome}."; whatsapp `leave_decided_v1`.
    - `payslip-available` var `period` text (`YYYY-MM`): subject "Your
      payslip is ready", body "Your payslip for {period} is ready in
      the app."; whatsapp `payslip_available_v1`.
    - `inbound-received` no vars: subject "Forwarded email to review",
      body "A forwarded email is waiting in the review inbox."; whatsapp
      null.
    - `webhook-paused` no vars: subject "A webhook was paused", body "A
      webhook endpoint was paused after repeated failed deliveries.
      Open the developer settings to check it."; whatsapp null.
    - `security-sso-linked` var `provider` term `provider.`: subject
      "New sign-in method added", body "A {provider} sign-in was linked
      to your account. If this was not you, tell your administrator
      now."; whatsapp null.
    - `channel-verify-code` var `code` code: subject "Your
      verification code", body "Your verification code is {code}. It
      expires in 10 minutes. Do not share it."; whatsapp
      `verify_code_v1`.
    Arabic drafts (NEEDS NATIVE REVIEW), same order, subject then body:
    "موافقة بانتظارك: {subject}" / "طلب منك {requester} الموافقة على:
    {subject}. افتح التطبيق لمراجعتها."; "{subject} الخاصة بك
    {outcome}" / "{subject} الخاصة بك {outcome}. افتح التطبيق للتفاصيل.";
    "طلب إجازة من {requester}" / "طلب {requester} إجازة من {start} إلى
    {end}. افتح التطبيق لمراجعته."; "تم البت في إجازتك" / "إجازتك من
    {start} إلى {end} {outcome}."; "قسيمة راتبك جاهزة" / "قسيمة راتبك
    لشهر {period} جاهزة في التطبيق."; "بريد محوّل للمراجعة" / "يوجد بريد
    محوّل بانتظار المراجعة في صندوق الوارد."; "تم إيقاف ويب هوك" / "تم
    إيقاف نقطة ويب هوك بعد تكرار فشل الإرسال. افتح إعدادات المطورين
    للتحقق."; "تمت إضافة طريقة دخول جديدة" / "تم ربط تسجيل دخول
    {provider} بحسابك. إن لم تكن أنت، أبلغ المسؤول فورًا."; "رمز التحقق
    الخاص بك" / "رمز التحقق هو {code}. ينتهي خلال 10 دقائق. لا تشاركه
    مع أحد."
  - `QuietHours { enabled: boolean; start: ^([01]\d|2[0-3]):[0-5]\d$;
    end: same }` refined `start !== end` (path `["end"]`).
  - `NotificationPrefs { language: Lang; quietHours: QuietHours;
    kinds: Record<Exclude<NotificationKind, "channel-verify-code">, {
    email: boolean; whatsapp: boolean }> }`; `PREF_DEFAULTS`: language
    `"en"`, quiet hours enabled `"22:00"` to `"07:00"`, every kind
    `{ email: true, whatsapp: false }`; `PREFS_NOTE = "Quiet hours use
    UAE time. In-app notices are always kept. Product defaults."`.
  - `Notification { id; kind; title: string; body: string; link: {
    routeId: string; id: Id | null } | null; createdAt; readAt:
    Timestamp | null; deliveries: { channel; status:
    DeliveryStatus }[] }`; `NotificationPage { items; nextBefore:
    Timestamp | null }`; `NotificationQuery { unreadOnly?: boolean;
    before?: Timestamp; limit?: int 1..100 }`; `MarkRead = { ids: Id[]
    1..100 } | { all: true }` to `{ updated: int }`.
  - `DeliveryStatus = z.enum(["queued","held","sending","sent",
    "failed","skipped","not-configured"])`; `DeliverySkipReason =
    z.enum(["channel-off","no-address","no-opt-in","not-configured",
    "rate-limited","company-disabled","fallback-not-needed"])`;
    `DeliveryRow { id; notificationId; userId; channel; kind; status;
    reason: DeliverySkipReason | string | null; attempts: int;
    notBefore: Timestamp | null; sentAt: Timestamp | null;
    languageFallback: boolean; provider: string | null }` (no rendered
    text, no address).
  - Routes appended: `listNotifications GET /v1/me/notifications`
    (all roles, query `NotificationQuery`) to `NotificationPage`;
    `markNotificationsRead POST /v1/me/notifications/read` (all) to
    `{ updated }`; `getNotificationPrefs GET
    /v1/me/notification-prefs` (all) to `NotificationPrefs & { note
    }`; `putNotificationPrefs PUT /v1/me/notification-prefs` (all) to
    the same; `listNotificationDeliveries GET
    /v1/notification-deliveries` (owner, hr; query `{ status?;
    channel?; userId?: Id; before?: Timestamp; limit? }`) to
    `listOf(DeliveryRow)`; `listNotificationTemplates GET
    /v1/notification-templates` (owner, hr) to `listOf({ kind;
    en; ar; arReviewed; whatsappTemplate })`.
  - Errors: `TEMPLATE_VAR_MISSING`, `TEMPLATE_VAR_FORBIDDEN` (internal,
    never sent: a 500 with the request id only).
- Produces (api):
  - Migration 1302: `notifications(id, company_id, user_id, kind,
    title, body, link jsonb, created_at, read_at)` index `(company_id,
    user_id, created_at desc)`; `notification_prefs(company_id,
    user_id, body jsonb, updated_at, pk(company_id, user_id))`;
    `notification_deliveries(id, company_id, notification_id, user_id,
    channel, kind, status, reason, attempts int, not_before,
    lease_until, last_attempt_at, sent_at, provider,
    provider_message_id, language_fallback bool, payload_enc text,
    fallback_of uuid null)` index `(status, not_before)`.
    `payload_enc` holds the rendered message (and the WhatsApp
    template parameters) encrypted with the company DEK, AAD
    `"<companyId>:notification_deliveries:payload:<id>"`.
  - `DomainEvent` (union on `type`): `{ type: "approval.pending";
    approvalId; stepOrder; subjectType; requesterEmployeeId }`, `{
    type: "approval.closed"; approvalId; subjectType; outcome:
    "approved" | "rejected" | "returned"; claimantUserId: string |
    null }`, `{ type: "leave.requested"; leaveRequestId; employeeId;
    start; end }`, `{ type: "leave.decided"; leaveRequestId;
    employeeId; start; end; outcome: "approved" | "rejected" }`, `{
    type: "pay-run.approved"; payRunId; period: Period }`, `{ type:
    "inbound.received"; itemId }`, `{ type: "webhook.paused";
    endpointId }`, `{ type: "sso.linked"; userId; provider }`, `{
    type: "employee.created" | "employee.updated"; employeeId }`.
  - `emitEvent(c: ReqCtx | JobCtx, e: DomainEvent): Promise<void>`
    (`events.ts`): in the caller's transaction, resolves recipients
    and calls `notify` per recipient; Task 8 adds the webhook fan-out
    in the same function. Never throws for a recipient without
    channels; throws only on database errors.
  - `recipients.ts`: `recipientsFor(tx, companyId, e): Promise<{
    userId: string; kind: NotificationKind; vars: Record<string,
    string>; link }[]>`: `approval.pending` gives every user in the
    current step's `eligible`; `approval.closed` the claimant's user;
    `leave.requested` the requester's line manager's user (else every
    hr member); `leave.decided` the requester's user;
    `pay-run.approved` the user of each employee in the run;
    `inbound.received` every owner and hr member; `webhook.paused`
    every owner; `sso.linked` that user; `employee.*` nobody (webhooks
    only). Users without membership are skipped.
  - `render.ts` (pure): `renderTemplate(kind: NotificationKind, lang:
    Lang, vars: Record<string, string>): { subject: string; body:
    string; language: Lang; languageFallback: boolean }`: `ar` with
    `arReviewed: false` renders `en` and sets `languageFallback:
    true`; a declared var missing throws `TEMPLATE_VAR_MISSING`, an
    undeclared var throws `TEMPLATE_VAR_FORBIDDEN`; `term` values must
    be a `TEMPLATE_TERMS` key with the declared prefix and render the
    term in the output language; `date` must be `IsoDate`; `code` must
    be `^\d{6}$` and is allowed only in `channel-verify-code`; `text`
    values have control characters removed, are cut to 80 characters
    and are refused (`TEMPLATE_VAR_FORBIDDEN`) when they match money
    `^\d[\d,]*\.\d{2}$`, contain `AE\d{2}`, a run of 14 digits or
    `784\d{12}`. `whatsappParams(kind, lang, vars): string[]`: the
    rendered var values in declaration order.
  - `quiet.ts` (pure): `quietUntil(now: Date, q: QuietHours): Date |
    null`: null when disabled or the Dubai time of `now` is outside
    `[start, end)`; otherwise the next UTC instant whose Dubai time is
    `end` (windows may cross midnight).
  - `prefs.ts`: `getPrefs(tx, companyId, userId):
    Promise<NotificationPrefs>` (row or `PREF_DEFAULTS`); `putPrefs`
    (no audit: a user's own setting).
  - `notify.ts`: `notify(c: ReqCtx | JobCtx, r: { userId; kind; vars;
    link }): Promise<string>` inserts the in-app `notifications` row
    (title and body rendered in the user's language, with the same
    fallback), then one `notification_deliveries` row per external
    channel: `email` when the kind's `email` pref is true and the
    company's `emailEnabled` (else `skipped` `channel-off` or
    `company-disabled`); `whatsapp` when the kind's pref is true,
    company `whatsappEnabled`, and the kind has a `whatsappTemplate`
    (else `skipped` with the reason). A queued row gets `not_before =
    quietUntil(now, prefs.quietHours)` and status `held` when that is
    not null, except `security-sso-linked` and `channel-verify-code`,
    which are never held. `channel-verify-code` creates no in-app row
    and only a WhatsApp delivery. Returns the notification id (or the
    delivery id for verify codes). No audit row per notification.
  - `inbox.ts`: list (own, newest first, `before` cursor), mark read
    (own only; others' ids are ignored, not errors).

- [ ] **Step 1: Write the failing tests**

`templates.test.ts` (contract): every `TEMPLATES` entry's `{name}`
placeholders in `en.subject`, `en.body`, `ar.subject`, `ar.body` equal
its `vars` keys exactly; every `arReviewed` is `false`; every term key
used by a `term` var prefix exists in `TEMPLATE_TERMS`; no English
copy contains a digit except `channel-verify-code`'s "10"; `QuietHours`
with `start` equal to `end` fails at path `["end"]`; `PREF_DEFAULTS`
parses.

`quiet-hours.test.ts`:
- `quiet_crosses_midnight`: 22:00 to 07:00, now
  `2026-03-01T19:30:00Z` (23:30 Dubai) gives `2026-03-02T03:00:00Z`;
  now `2026-03-02T02:59:00Z` (06:59) gives `2026-03-02T03:00:00Z`; now
  `2026-03-02T03:00:00Z` (07:00) gives null; now
  `2026-03-01T17:59:00Z` (21:59) gives null.
- `quiet_same_day_window`: 13:00 to 14:00, now 13:30 Dubai gives
  14:00 Dubai of the same day; disabled gives null.
- fast-check: for any `now` and window, the result is null or strictly
  after `now`, at most 24 hours later, and its Dubai time equals `end`.

`render.test.ts`:
- `render_english`: `approval-pending` with `requester "Sara A"`,
  `subject "subject.expense-claim"` gives subject "Approval waiting:
  expense claim" and body "Sara A asked you to approve: expense claim.
  Open the app to review it."
- `render_arabic_falls_back`: same with `lang "ar"`: the English text
  and `languageFallback: true`.
- `render_refuses_money_and_ids`: `requester "4000.00"`, `"AE07 0331"`,
  `"12345678901234"`, `"784199012345678"` each throw
  `TEMPLATE_VAR_FORBIDDEN`; a missing `requester` throws
  `TEMPLATE_VAR_MISSING`; an extra `amount` var throws
  `TEMPLATE_VAR_FORBIDDEN`; `code "123456"` on `approval-pending` is an
  undeclared var and throws.
- `render_strips_controls`: `requester "A\u0000B\nC"` renders `"ABC"`;
  a 200-character name is cut to 80.

`notifications.test.ts` (uses `makeApp`, `seedCompany` and Plan 6's
test subject or an expense claim):
- `approval_opened_notifies_eligible`: opening a one-step request whose
  eligible is the manager creates one in-app notification for the
  manager (kind `approval-pending`) and one `email` delivery `queued`;
  the claimant gets nothing.
- `closed_notifies_claimant`: approving it gives the claimant an
  `approval-closed` notification with `outcome` "approved".
- `quiet_hours_hold`: the manager's prefs quiet 22:00 to 07:00 and
  `now = 2026-03-01T19:30:00Z`: the email delivery is `held` with
  `notBefore 2026-03-02T03:00:00Z`; a `security-sso-linked` emitted at
  the same time is `queued`, not held.
- `prefs_channel_off`: email pref false for `approval-pending`: the
  delivery is `skipped` `channel-off`; the in-app row still exists.
- `company_email_disabled`: `emailEnabled: false`: `skipped`
  `company-disabled`.
- `leave_events`: an employee's leave request notifies their manager;
  approving it notifies the employee with `leave-decided`.
- `pay_run_approved_notifies_employees`: approving a run gives each
  employee in it a `payslip-available` notice with `period` "2026-03"
  and no amount in title or body.
- `inbox_own_only`: the employee lists only their notifications;
  marking another user's id read returns `updated: 0`.
- `deliveries_log_owner_hr`: hr lists deliveries; employee gets 403;
  the response text contains no email address and no rendered body.
- `payload_encrypted`: the `notification_deliveries.payload_enc`
  column text does not contain the requester's name.

- [ ] **Step 2: Run** `pnpm --filter @payroll/contract test templates`
  and `pnpm --filter @payroll/api test quiet-hours render
  notifications`. Expected: FAIL.
- [ ] **Step 3: Implement** the files above; add the six routes,
  conformance rows and `mayView` entries (own notifications: self;
  deliveries and templates: owner and hr).
- [ ] **Step 4: Run** `pnpm check`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(api): notifications, templates, quiet
  hours`.

### Task 3: Delivery dispatcher, email and WhatsApp senders, opt-in

**Files:**
- Create: `packages/contract/src/whatsapp.ts`
- Modify: `packages/contract/src/routes-channels.ts`, `src/errors.ts`,
  `src/registry.ts`, `src/examples.ts`, `src/index.ts`
- Create: `packages/api/migrations/1303_dispatch_opt_in.sql`,
  `src/channels/retry.ts` (pure), `src/channels/dispatch.ts`,
  `src/channels/http-node.ts`, `src/channels/dns.ts`,
  `src/channels/postmark-email.ts`, `src/channels/meta-whatsapp.ts`,
  `src/whatsapp/phone.ts`, `src/whatsapp/opt-in.ts`,
  `src/routes/channels-whatsapp.ts`
- Modify: `src/channels/wire.ts` (email and WhatsApp senders, real
  HTTP client and resolver), `src/main.ts` (`jobs` runs
  `dispatchDue`; create `main.ts jobs` and `src/jobs/job-ctx.ts` if
  Plan 11 is absent), `tests/helpers/fake-channels.ts`
- Test: `packages/api/tests/retry.test.ts`, `tests/dispatch.test.ts`,
  `tests/provider-adapters.test.ts`, `tests/whatsapp-opt-in.test.ts`

**Interfaces:**
- Consumes: Task 1 ports, `consumeRate`, `channelAudit`,
  `getChannelSettings`, `Keyring.derive`; Task 2 `notify`,
  `renderTemplate`, `whatsappParams`, `TEMPLATES`; Plan 3 users
  (email), company name, `Keyring`; Plan 11 `JobCtx`.
- Produces (contract):
  - `E164 = ^\+[1-9]\d{7,14}$`.
  - `WHATSAPP_CONSENT_VERSION = 1`; `WHATSAPP_CONSENT_TEXT = { en: "I
    agree that {company} may send me work messages on WhatsApp, such
    as approval requests and notices, at the number below. Messages
    pass through Meta's WhatsApp service. I can stop at any time in
    the app or by replying STOP.", ar: "أوافق على أن ترسل لي {company}
    رسائل عمل عبر واتساب، مثل طلبات الموافقة والإشعارات، على الرقم
    أدناه. تمر الرسائل عبر خدمة واتساب التابعة لشركة Meta. يمكنني
    الإيقاف في أي وقت من التطبيق أو بالرد بكلمة STOP.", arReviewed:
    false }` (Arabic NEEDS NATIVE REVIEW).
  - `WhatsAppOptInStart { phone: E164; consentVersion: z.literal(1);
    agreed: z.literal(true) }`; `WhatsAppVerify { code: ^\d{6}$ }`.
  - `MyChannels { email: { address: string }; whatsapp: { status:
    "none" | "pending" | "active" | "withdrawn"; phoneLast4: ^\d{4}$ |
    null; consentVersion: int | null; consentedAt: Timestamp | null };
    providers: { email: ProviderState; whatsapp: ProviderState };
    consentText: string }` (`consentText` in the caller's language with
    the company name filled; English while `arReviewed` is false).
  - Routes appended: `getMyChannels GET /v1/me/channels` (all roles) to
    `MyChannels`; `startWhatsAppOptIn POST
    /v1/me/channels/whatsapp/opt-in` (all) to `MyChannels`;
    `verifyWhatsAppOptIn POST /v1/me/channels/whatsapp/verify` (all)
    to `MyChannels`; `withdrawWhatsAppOptIn POST
    /v1/me/channels/whatsapp/withdraw` (all) to `MyChannels`.
  - Errors: `CHANNEL_DISABLED` 409, `VERIFY_CODE_INVALID` 400,
    `VERIFY_CODE_EXPIRED` 410, `OPT_IN_NOT_PENDING` 409.
- Produces (api):
  - Migration 1303: `channel_opt_ins(id, company_id, user_id, channel
    text check (channel = 'whatsapp'), phone_enc, phone_hash, status
    text check (status in ('pending','active','withdrawn')),
    consent_version int, consented_at, verified_at, withdrawn_at,
    withdrawn_via text)`, partial unique `(company_id, user_id,
    channel) WHERE status <> 'withdrawn'`, index `(phone_hash)`;
    `channel_verify_codes(company_id, opt_in_id pk, code_hash,
    expires_at, attempts int, used_at)`; `SECURITY DEFINER` functions
    owned by the migration role with `SET search_path = public` and
    `GRANT EXECUTE` to `payroll_app`:
    `due_notification_deliveries(p_now timestamptz, p_limit int)
    RETURNS TABLE(company_id uuid, delivery_id uuid)` (status `queued`
    or `held` with `coalesce(not_before, '-infinity') <= p_now`, or
    `sending` with `lease_until < p_now`; oldest first) and
    `withdraw_whatsapp_by_phone(p_hash text, p_now timestamptz)
    RETURNS int` (sets every non-withdrawn row with that hash to
    `withdrawn`, `withdrawn_via 'whatsapp-stop'`; used by Task 4).
  - `phone.ts`: `phoneHash(keyring: Keyring, e164: string): string`
    (hex HMAC-SHA256 with `keyring.derive("payroll/phone-hash/v1")`);
    phones stored with the company DEK, AAD
    `"<companyId>:channel_opt_ins:phone:<id>"`.
  - `retry.ts` (pure): `DELIVERY_RETRY_MINUTES = { email: [1, 5, 30],
    whatsapp: [1, 5] }` (product defaults); `nextDeliveryAttempt(
    channel: "email" | "whatsapp", attemptsMade: number, now: Date):
    Date | null` (null when `attemptsMade > list length`);
    `needsEmailFallback(outcome: "failed" | "not-configured" |
    "skipped", kind: NotificationKind, emailDeliveryExists: boolean):
    boolean` (false for `channel-verify-code` or when an email
    delivery already exists for the notification).
  - `dispatch.ts`: `dispatchDue(db: Db, deps: AppDeps, limit = 100):
    Promise<{ sent: number; failed: number; skipped: number; retried:
    number; fellBack: number }>`. Per row from
    `due_notification_deliveries(now, limit)`:
    1. Claim (one `withTenant`): lock `FOR UPDATE SKIP LOCKED`
       (skipped when gone); re-check due; set `sending`, `lease_until
       = now + 120 s`, `attempts + 1`; decrypt the payload; resolve the
       address (email: the user's email; WhatsApp: the active opt-in
       phone, or the pending one for `channel-verify-code`); missing:
       `skipped` `no-address` / `no-opt-in`. For WhatsApp, also
       `consumeRate(scope "wa-user", userId, whatsappHourlyPerUser,
       3600)` and `consumeRate("wa-company", "all", whatsappDailyCap,
       86400)`; refused: `skipped` `rate-limited`. Task 4 adds its
       `prepareWhatsApp` hook here.
    2. Send outside any transaction through the port, `idempotencyKey`
       = the delivery id.
    3. Record (second `withTenant`): `sent` with `sent_at` and
       `provider_message_id`; retryable failure with a next attempt:
       back to `queued` with `not_before`; else `failed`;
       `not-configured` as its own status. For WhatsApp outcomes
       `failed`, `not-configured` or `skipped`, when
       `needsEmailFallback` holds, insert an `email` delivery with
       `fallback_of` = this id (queued, not held).
    A crash between steps leaves `sending` until the lease ends; the
    row is then picked again (at least once; Ruling 4).
  - `http-node.ts`: `nodeHttpClient(): HttpClient` over `node:https`:
    `https:` URLs only, `lookup` pinned to `pinAddress` when given,
    timeout from the request, redirects returned as plain responses,
    response body read up to 65,536 bytes (the rest dropped).
    `dns.ts`: `nodeResolveHost(host): Promise<string[]>` with
    `lookup(host, { all: true })`.
  - `postmark-email.ts`: `postmarkEmailSender(http: HttpClient, cfg: {
    token: string; from: string }): EmailSender` (`// UNVERIFIED:
    Postmark send API shape; research READ only the inbound webhook`):
    `POST https://api.postmarkapp.com/email`, headers `Accept` and
    `Content-Type` `application/json`, `X-Postmark-Server-Token`; body
    `{ From, To, Subject, TextBody, MessageStream: "outbound" }`; 200
    with `MessageID` gives `sent`; 401, 403 and 422 give non-retryable
    `failed` with code `HTTP_<status>`; 429, 5xx and `HttpFailure`
    give retryable `failed`.
  - `meta-whatsapp.ts`: `metaWhatsAppSender(http, cfg: { graphVersion:
    string; phoneNumberId: string; accessToken: string }):
    WhatsAppSender` (`// UNVERIFIED: Meta Cloud API message shape; the
    research READ pricing and template rules only`): `POST
    https://graph.facebook.com/<graphVersion>/<phoneNumberId>/messages`
    with `Authorization: Bearer <token>`; template body `{
    messaging_product: "whatsapp", to, type: "template", template: {
    name, language: { code }, components } }` with one `body`
    component of text parameters and one `button` component per
    payload (`sub_type: "quick_reply"`, `index`, payload parameter);
    text body `{ messaging_product, to, type: "text", text: { body }
    }`; `messages[0].id` gives `sent`; the same status mapping as
    Postmark. `graphVersion` has no default (configuration only).
  - `opt-in.ts`: `startOptIn(ctx, body)`: provider not configured 409
    `CHANNEL_NOT_CONFIGURED`; company `whatsappEnabled` false 409
    `CHANNEL_DISABLED`; `consumeRate("wa-optin", userId, 5, 86400)`
    else 429 `RATE_LIMITED`; any existing non-withdrawn row becomes
    `withdrawn` (`withdrawn_via 'replaced'`); inserts `pending`; a
    6-digit code from `deps.randomBytes` by rejection sampling (values
    of a 32-bit integer at or above 4,294,000,000 are redrawn), stored
    as `sha256Hex(optInId + ":" + code)`, expiring in 10 minutes;
    `notify(ctx, { kind: "channel-verify-code", vars: { code } })`.
    `verifyOptIn(ctx, body)`: no pending row 409 `OPT_IN_NOT_PENDING`;
    expired 410 `VERIFY_CODE_EXPIRED`; wrong code increments
    `attempts` and gives 400 `VERIFY_CODE_INVALID` (the fifth wrong
    code withdraws the row); right code sets `active`, `verified_at`,
    `consented_at = now`; audit `whatsapp.opted-in` (`data: {
    consentVersion }`). `withdrawOptIn(ctx)`: sets `withdrawn`,
    `withdrawn_via 'app'`; queued or held WhatsApp deliveries of the
    user become `skipped` `no-opt-in` (fallback applies at dispatch);
    audit `whatsapp.opted-out` (`data: { via: "app" }`).
  - `tests/helpers/fake-channels.ts` gains `fakeEmail` and
    `fakeWhatsApp` outboxes (`{ to, subject, text }` and `{ toE164,
    templateName, language, bodyParams, buttonPayloads }`) and
    `failNext("email" | "whatsapp", outcome)`.

- [ ] **Step 1: Write the failing tests**

`retry.test.ts`: email after 1, 2, 3 attempts gives now plus 1, 5, 30
minutes, after 4 gives null; WhatsApp after 3 gives null;
`needsEmailFallback("failed", "approval-pending", false)` true, with
`true` false, for `channel-verify-code` false.

`provider-adapters.test.ts` (fake HTTP only):
- `postmark_request_shape`: one send records one `POST` to
  `https://api.postmarkapp.com/email` with the token header and a JSON
  body whose `To`, `Subject`, `TextBody` equal the message; a scripted
  200 `{ "MessageID": "m-1" }` gives `{ status: "sent",
  providerMessageId: "m-1" }`; 422 gives `retryable: false`; 503 and a
  timeout give `retryable: true`.
- `meta_request_shape`: `sendTemplate` with two button payloads posts
  to `.../v99.0/123/messages` (config `graphVersion "v99.0"`,
  `phoneNumberId "123"`; fake values) with bearer auth, `type
  "template"` and two `quick_reply` components; `{ "messages": [{
  "id": "w-1" }] }` gives `sent`.
- `wire_not_configured`: `buildChannelPorts` with no channel env gives
  `email.configured` and `whatsapp.configured` false.

`dispatch.test.ts`:
- `dispatch_sends_email`: an `approval-pending` delivery is sent once;
  the fake outbox holds one email to the manager's address with the
  rendered subject; the row is `sent` with the provider id; a second
  `dispatchDue` sends nothing.
- `dispatch_retries_then_fails`: `failNext("email", { status:
  "failed", retryable: true, code: "HTTP_503" })` four times: statuses
  go `queued` (not before +1 min), then +5, +30, then `failed` after
  the fourth attempt with the clock advanced past each `not_before`.
- `held_until_quiet_end`: a held delivery is not sent at
  `2026-03-01T20:00:00Z` and is sent at `2026-03-02T03:00:00Z`.
- `whatsapp_without_opt_in_falls_back`: WhatsApp pref on, no opt-in:
  the WhatsApp row ends `skipped` `no-opt-in` and one `email`
  delivery with `fallback_of` set is created and sent.
- `whatsapp_rate_limited_falls_back`: `whatsappHourlyPerUser: 1`, two
  notices in one hour: the second WhatsApp row is `skipped`
  `rate-limited` and its email fallback is sent.
- `lease_expiry_redelivers`: a row left `sending` with `lease_until`
  in the past is picked again and sent (attempts 2).
- `not_configured_recorded`: with `fakeChannels({ email: false })` the
  row ends `not-configured`, nothing is thrown.
- `outbox_has_no_sentinels` (Review Focus 4): after a seeded company's
  claim approval, leave decision and pay-run approval (with
  `seedPayroll`) are dispatched by email and WhatsApp (an opted-in
  employee), `JSON.stringify(outbox)` contains no value of
  `SENTINELS` (amounts or IBANs) and no 14-digit run.
- `dispatch_crosses_tenants`: deliveries in companies A and B are both
  sent, and each outbox entry's address belongs to its own company's
  user.

`whatsapp-opt-in.test.ts`:
- `opt_in_flow`: company `whatsappEnabled`; start with `+971500000001`
  queues a `channel-verify-code` WhatsApp delivery to that number
  (dispatch sends template `verify_code_v1` with a 6-digit parameter);
  verify with that code gives `status "active"`, `phoneLast4 "0001"`,
  audit `whatsapp.opted-in` with `data` `{ consentVersion: 1 }`.
- `opt_in_wrong_code_five_times`: four wrong codes give 400; the fifth
  gives 400 and the status is `withdrawn`.
- `opt_in_expired`: verify 11 minutes later gives 410.
- `opt_in_requires_company_switch`: `whatsappEnabled: false` gives 409
  `CHANNEL_DISABLED`; unconfigured provider gives 409
  `CHANNEL_NOT_CONFIGURED`.
- `opt_in_rate_limit`: the sixth start in one day gives 429.
- `withdraw_skips_queued`: after withdraw, a queued WhatsApp delivery
  becomes `skipped` `no-opt-in`; audit `whatsapp.opted-out`.
- `phone_never_in_clear`: the `channel_opt_ins` table text contains
  no `+971500000001`; no audit `data` contains it; `getMyChannels`
  shows only the last four digits.
- `consent_text_has_company`: `consentText` contains the company name
  and "STOP".

- [ ] **Step 2: Run** `pnpm --filter @payroll/api test retry
  provider-adapters dispatch whatsapp-opt-in`. Expected: FAIL.
- [ ] **Step 3: Implement** the files above; register `dispatchDue` in
  `main.ts jobs`; add the four routes, conformance rows and `mayView`
  (self only).
- [ ] **Step 4: Run** `pnpm check`. Expected: PASS, including the
  network scan (only `http-node.ts` and `dns.ts` import network
  modules).
- [ ] **Step 5: Commit** `feat(api): delivery dispatcher, senders,
  WhatsApp opt-in`.

### Task 4: WhatsApp approvals (signed one-time actions)

Security task: fresh per-task review.

**Files:**
- Modify: `packages/contract/src/whatsapp.ts`, `src/routes-channels.ts`,
  `src/errors.ts`, `src/index.ts`
- Create: `packages/api/migrations/1304_whatsapp_actions.sql`,
  `src/whatsapp/token.ts` (pure), `src/whatsapp/actions.ts`,
  `src/whatsapp/meta-inbound.ts`, `src/whatsapp/inbound.ts`,
  `src/routes/channels-whatsapp-hook.ts`
- Modify: `src/channels/dispatch.ts` (`prepareWhatsApp` hook),
  `src/channels/wire.ts` (Meta inbound adapter), `src/app.ts` (pass
  the approval `SubjectHandlers` to the hook route),
  `tests/helpers/fake-channels.ts` (signed inbound payload builder)
- Test: `packages/api/tests/wa-token.test.ts`,
  `tests/wa-approvals.test.ts`, `tests/wa-reject-reason.test.ts`

**Interfaces:**
- Consumes: Task 1 `actorCtx`, `markSeen`, `consumeRate`,
  `channelAudit`, `Keyring.derive`; Task 3 `phoneHash`, dispatcher,
  opt-ins; Plan 6 `decide`, `viewFor`, `mayDecide` (pure),
  `SubjectHandlers`, `ApprovalView`.
- Produces (contract):
  - `CHANNEL_APPROVABLE_SUBJECTS = ["expense-claim"] as const`
    (subject types WhatsApp may decide; a product rule).
  - `WHATSAPP_ACTION_TEMPLATE = "approval_pending_actions_v1"` (body
    as `approval-pending`, two quick-reply buttons "Approve" and
    "Reject"; the Arabic template is drafted, NEEDS NATIVE REVIEW, and
    unused while `arReviewed` is false).
  - `REPLY_TEXTS` (exact English; Arabic drafts NEEDS NATIVE REVIEW
    and unused): `approved` "Approved. Thank you.", `reasonPrompt`
    "Reply with the reason for rejecting (3 to 500 characters) within
    10 minutes, or open the app.", `rejected` "Rejected. Your reason
    was saved with the decision.", `stale` "This request has changed
    or was already decided. Open the app to see it.", `refused` "This
    decision cannot be made from WhatsApp. Open the app.", `stopped`
    "You will get no more WhatsApp messages from this service. You can
    turn them on again in the app."
  - Routes appended (public, `rawBody: true`): `whatsAppHookVerify GET
    /v1/hooks/whatsapp` (query `hub.mode`, `hub.verify_token`,
    `hub.challenge` as optional strings; `contentType "text/plain"`)
    and `whatsAppHook POST /v1/hooks/whatsapp` to `{ ok: true }`.
  - Errors: `HOOK_NOT_CONFIGURED` 503, `HOOK_SIGNATURE_INVALID` 401.
- Produces (api):
  - Migration 1304: `channel_actions(id, company_id, approval_id,
    step_order int, recipient_user_id, phone_hash, delivery_id,
    status text check (status in ('open','used','awaiting-reason',
    'expired','void')), expires_at, reason_until, created_at,
    decided_at, decided_message_id)`; `SECURITY DEFINER`
    `find_awaiting_reason(p_hash text, p_now timestamptz) RETURNS
    TABLE(company_id uuid, action_id uuid)` (status
    `awaiting-reason`, `reason_until > p_now`, newest first, limit 1).
  - `token.ts` (pure, node:crypto HMAC only): `ACTION_TTL_HOURS = 48`
    (product default); `signAction(key: Uint8Array, a: { companyId:
    string; actionId: string; decision: "a" | "r"; expiresAt: number
    }): string` = `wa1.<companyId>.<actionId>.<decision>.<expiresAt>
    .<base64url HMAC-SHA256 of "wa1\n" + companyId + "\n" + actionId +
    "\n" + decision + "\n" + expiresAt>` (`expiresAt` in Unix
    seconds); `verifyAction(key, token: string, nowSec: number): {
    companyId; actionId; decision } | "malformed" | "bad-signature" |
    "expired"` (strict regex, `timingSafeEqual`, expiry checked after
    the signature). The key is `keyring.derive("payroll/wa-action/
    v1")`. A token is at most 200 characters.
  - `actions.ts`: `prepareWhatsApp(tx, deps, delivery): Promise<{
    templateName: string; bodyParams: string[]; buttonPayloads:
    string[] }>`: for `approval-pending` when the company's
    `whatsappApprovals` is true, the subject type is in
    `CHANNEL_APPROVABLE_SUBJECTS` and the step is still pending,
    inserts an `open` action (recipient, current `phone_hash`,
    `expires_at = now + 48 h`) and returns
    `WHATSAPP_ACTION_TEMPLATE` with the two signed tokens; otherwise
    the kind's own template and no buttons.
  - `meta-inbound.ts`: `metaWhatsAppInbound(cfg: { appSecret: string;
    verifyToken: string }): WhatsAppInbound` (`// UNVERIFIED: Meta
    webhook signature header and payload shape`): `verifySignature`
    checks `X-Hub-Signature-256: sha256=<hex HMAC-SHA256(appSecret,
    rawBody)>` in constant time; `challenge` returns `hub.challenge`
    when `hub.mode` is `subscribe` and `hub.verify_token` matches,
    else null; `parse` maps `entry[].changes[].value.messages[]` to
    `WaInboundEvent` (`button.payload` or
    `interactive.button_reply.id` to `button`, `text.body` to `text`,
    anything else `other`; `from` gets a leading `+`).
  - `inbound.ts`: `handleWhatsAppHook(deps, handlers, rawBody,
    signatureHeader): Promise<void>`; not configured 503
    `HOOK_NOT_CONFIGURED`; bad signature 401 `HOOK_SIGNATURE_INVALID`;
    otherwise every event is handled on its own and the route answers
    200 `{ ok: true }` (errors are logged with the request id, never
    returned). Per event:
    - `button`: `verifyAction`; anything but a valid result is ignored
      without a reply. Valid: in one `enterTenant(companyId)`:
      `markSeen("whatsapp", messageId)` false: stop; refused by
      `consumeRate("wa-bad", phoneHash(from), 10, 3600)` after a
      failure: ignored. Lock the action `FOR UPDATE`; not `open`,
      expired, `phone_hash` different from `phoneHash(from)`, or the
      recipient's opt-in not `active` with that hash: record nothing
      but the seen mark and the bad-rate count, reply `stale` only
      when the phone matches. Load `viewFor(approvalId)`; status not
      pending or `currentStep !== step_order`: action `void`, reply
      `stale`. Pre-check with Plan 6's pure `mayDecide` for the
      recipient; not `"ok"`: action `void`, audit
      `whatsapp.action-refused` (`data: { errorCode }`), reply `refused`.
      Decision `a`: `decide(actorCtx(recipient, "whatsapp"), handlers,
      approvalId, "approve", { stepOrder })`, action `used`, audit
      `whatsapp.action-used` (`data: { decision: "approve",
      approvalId }`), reply `approved`. Decision `r`: action
      `awaiting-reason`, `reason_until = now + 10 min` (product
      default), reply `reasonPrompt`.
      If `decide` throws, the transaction rolls back (nothing is
      caught inside it); a second `enterTenant` then marks the message
      seen, the action `void`, audits `whatsapp.action-refused` with
      `data: { errorCode }`, and replies `refused` or `stale`.
    - `text`: trimmed upper case `STOP`:
      `withdraw_whatsapp_by_phone(hash, now)`, actions of that phone
      in `awaiting-reason` become `expired`, reply `stopped`.
      Otherwise `find_awaiting_reason(hash, now)`; none: no reply.
      Found: in that tenant, `markSeen`; text of 3 to 500 characters
      after trimming: `decide(..., "reject", { stepOrder, note: text
      })`, action `used`, audit `whatsapp.action-used` (`data: {
      decision: "reject", approvalId }`), reply `rejected`; other
      lengths: reply `reasonPrompt` again (the window is not
      extended). The same pre-checks as for a button apply.
    - `other`: ignored.
    Replies go through `whatsapp.sendText` with `idempotencyKey` =
    `<messageId>:reply`, inside the 24-hour window the approver just
    opened; their outcome is logged, never retried.
  - `whatsAppHookVerify` returns the challenge as `text/plain`, or 403
    `FORBIDDEN` when `challenge` returns null.

- [ ] **Step 1: Write the failing tests**

`wa-token.test.ts`:
- `token_round_trip`: sign then verify returns the three fields; a
  token is at most 200 characters.
- `token_tamper`: changing the decision letter, one character of the
  signature, or the company id gives `"bad-signature"`; a token of
  another key gives `"bad-signature"`; `"wa1.x"` gives
  `"malformed"`; `nowSec` one second after `expiresAt` gives
  `"expired"`.
- fast-check: for random ids and expiries, `verifyAction(signAction
  (x))` at `expiresAt - 1` returns `x`'s fields.

`wa-approvals.test.ts` (fake inbound adapter signing with a test app
secret; an expense claim of E awaiting manager M, M opted in with
`+971500000002`, company `whatsappApprovals: true`):
- `wa_message_has_buttons`: dispatching M's delivery sends
  `approval_pending_actions_v1` with two payloads that verify as `a`
  and `r`; body parameters contain E's name and "expense claim" and no
  amount.
- `wa_approve_once`: posting the approve button event decides step 1
  as M (`decided_by` = M, approval `approved`), writes Plan 6's
  `approval.step-approved` and `whatsapp.action-used`, and the fake
  outbox gets the `approved` reply.
- `wa_action_once_and_spine_rules` (Review Focus 1):
  1. The same event posted twice: one decision, the second makes no
     change and no reply.
  2. Two events with different message ids and the same approve
     token sent with `Promise.all`: exactly one decision; the step has
     one `decided_by`.
  3. The approve token posted from E's number (`from` different from
     the action's phone): no decision, no reply.
  4. M approves in the app first, then taps: no second decision, the
     action becomes `void`, reply `stale`.
  5. M withdraws the opt-in, then taps: no decision.
  6. A two-step chain where M is eligible for steps 1 and 2 and no
     one else is for step 2: tapping approve gives
     `APPROVER_NEEDED_LATER` from `mayDecide`, action `void`, audit
     `whatsapp.action-refused` with `data.errorCode`, approval
     unchanged.
  7. A forged token (signed with another key) and an expired token:
     ignored, no reply, no change.
- `wa_not_approvable_subject_has_no_buttons`: an approval of a subject
  type not in `CHANNEL_APPROVABLE_SUBJECTS` (the test subject type of
  Plan 6's helper) sends `approval_pending_v1` with no payloads.
- `wa_approvals_switch_off`: `whatsappApprovals: false` sends no
  buttons.
- `wa_bad_signature`: a body signed with another secret gives 401
  `HOOK_SIGNATURE_INVALID` and no change; unconfigured inbound gives
  503.
- `wa_verify_challenge`: `hub.mode=subscribe` with the right verify
  token returns the challenge text; a wrong token gives 403.
- `wa_stop_withdraws_everywhere`: M opted in at companies A and B
  with the same number; text `"stop"` withdraws both and replies
  `stopped`.
- `wa_audit_has_no_phone_or_token`: no audit `data` of the flow
  contains the phone number or any part of a token.

`wa-reject-reason.test.ts`:
- `reject_needs_reason`: tapping reject sets `awaiting-reason`; text
  `"ok"` replies `reasonPrompt` and rejects nothing; text `"missing
  receipt"` rejects with note `"missing receipt"` (Plan 6 step note)
  and replies `rejected`.
- `reject_window_expires`: text sent 10 minutes and 1 second after
  the tap: nothing rejected, no reply.
- `reject_after_reject_tap_approve_dead`: after the reject tap, the
  approve token of the same message changes nothing.
- `text_without_pending_reason_ignored`: random text from an opted-in
  number gets no reply and changes nothing.

- [ ] **Step 2: Run** `pnpm --filter @payroll/api test wa-`. Expected:
  FAIL.
- [ ] **Step 3: Implement** `token.ts` first, then the rest; add the
  two public routes (append both ids to `PUBLIC_CHANNEL_IDS`) and
  conformance rows.
- [ ] **Step 4: Run** `pnpm check`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(api): WhatsApp approvals with signed
  one-time actions`.

### Task 5: Email-in with a human review inbox

Untrusted input task: fresh per-task review.

**Files:**
- Create: `packages/contract/src/inbound.ts`
- Modify: `packages/contract/src/routes-channels.ts`, `src/errors.ts`,
  `src/registry.ts`, `src/examples.ts`, `src/index.ts`
- Create: `packages/api/migrations/1305_email_in.sql`,
  `src/inbound/auth-decision.ts` (pure), `src/inbound/sender.ts`
  (pure), `src/inbound/mailbox.ts`, `src/inbound/postmark-inbound.ts`,
  `src/inbound/intake.ts`, `src/inbound/review.ts`,
  `src/routes/channels-inbound.ts`
- Modify: Plan 6 `src/storage/fs-blob.ts` (key pattern with
  `inbound`), `src/receipts/receipts.ts` (export `storeReceiptBytes`),
  `src/expenses/claims.ts` (export `createClaim`);
  `src/channels/wire.ts`; `tests/helpers/fake-channels.ts`
  (`postmarkPayload(...)` builder); Plan 6 `tests/fs-blob.test.ts`
  (an `inbound` key is accepted, `other` still refused)
- Test: `packages/api/tests/auth-decision.test.ts`,
  `tests/postmark-inbound.test.ts`, `tests/inbound-sender.test.ts`,
  `tests/email-in.test.ts`,
  `tests/email-in-review.test.ts`

**Interfaces:**
- Consumes: Task 1 ports, `markSeen`, `consumeRate`, `channelAudit`;
  Task 2 `emitEvent` (`inbound.received`); Plan 6 `sniffContentType`,
  `RECEIPT_MAX_BYTES`, `ReceiptContentType`, `BlobStore`,
  `storeReceiptBytes`, `createClaim`; Plan 3 `Keyring`,
  `ctx.enterTenant`, employees.
- Produces (contract):
  - `INBOUND_PROCESSING_NOTE = "Forwarded emails pass through the email
    provider set up for this service before they reach this system.
    Where that provider stores mail was not verified. Turn this on only
    if your company accepts that."`
  - `AllowEntry = ^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$ |
    ^@[a-z0-9.-]+\.[a-z]{2,}$` (lower case; `@domain` means exactly
    that domain, not its subdomains).
  - `InboundSettingsBody { enabled: boolean; allowlist: AllowEntry[]
    0..200 unique; acknowledgedProcessing: boolean }` refined: `enabled`
    requires `acknowledgedProcessing` (path `["acknowledgedProcessing"]`).
  - `InboundSettings = InboundSettingsBody & { version: int >= 0;
    address: string | null; provider: ProviderState; note: typeof
    INBOUND_PROCESSING_NOTE }`; `InboundSettingsUpdate = Body & {
    expectedVersion }`.
  - `AuthVerdict = z.enum(["pass","fail","softfail","neutral","none",
    "unknown"])`; `SenderAuth { spf; dkim; dmarc }` (each `AuthVerdict`).
  - `InboundStatus = z.enum(["received","accepted","dismissed",
    "rejected"])`; `InboundRejectReason = z.enum(["DISABLED",
    "RATE_LIMITED","SENDER_NOT_ALLOWED","SENDER_AUTH_FAILED"])`;
    `AttachmentSkip = z.enum(["TYPE_NOT_ALLOWED","TOO_LARGE",
    "TYPE_MISMATCH","TOO_MANY"])`.
  - `InboundItem { id; status; receivedAt; fromAddress: string | null;
    matchedEmployee: { employeeId; name } | null; subject: string;
    textPreview: string; auth: SenderAuth; flags:
    ("SENDER_UNVERIFIED" | "ATTACHMENT_SKIPPED")[]; attachments: {
    index: int; fileName: string; contentType: ReceiptContentType |
    null; size: int; status: "kept" | "skipped"; skip: AttachmentSkip
    | null }[]; rejectReason: InboundRejectReason | null; decision: {
    by: Id; at; as: "receipt" | "claim-draft" | "dismissed";
    receiptIds: Id[]; claimId: Id | null } | null }` (`fromAddress`,
    `subject`, `textPreview` are null or empty for `rejected` items;
    `subject` cut to 200, `textPreview` to 1,000 characters).
  - `InboundQuery { status?: InboundStatus; before?: Timestamp;
    limit?: int 1..100 }`; `InboundAccept { as: "receipt" |
    "claim-draft"; employeeId: Id; attachmentIndexes: int[] 1..10
    unique; title?: string 1..120 }` refined: `claim-draft` requires
    `title`; `InboundDismiss { reason: "spam" | "duplicate" |
    "not-relevant" | "other" }`.
  - Routes appended: `getInboundSettings GET /v1/inbound/settings`
    (owner, hr); `putInboundSettings PUT /v1/inbound/settings` (owner,
    mfa); `rotateInboundAddress POST /v1/inbound/address/rotate`
    (owner, mfa) to `InboundSettings`; `inboundEmailHook POST
    /v1/hooks/email/{provider}` (public, `provider` enum
    `["postmark"]`, `rawBody: true`, `bodyLimit` 36_000_000) to `{ ok:
    true }`; `listInboundItems GET /v1/inbound/items` (owner, hr) to
    `listOf(InboundItem)`; `getInboundItem GET /v1/inbound/items/{id}`
    (owner, hr); `downloadInboundAttachment GET
    /v1/inbound/items/{id}/attachments/{index}` (owner, hr, binary);
    `acceptInboundItem POST /v1/inbound/items/{id}/accept` (owner, hr)
    and `dismissInboundItem POST /v1/inbound/items/{id}/dismiss`
    (owner, hr) to `InboundItem`.
  - Errors: `INBOUND_REFUSED` 403, `INBOUND_PAYLOAD_INVALID` 403,
    `INBOUND_NOT_PENDING` 409, `INBOUND_ATTACHMENT_NOT_KEPT` 422.
- Produces (api):
  - Migration 1305: `inbound_mailboxes(company_id pk, secret_hash,
    secret_enc, version int, rotated_at)`; `inbound_settings(company_id
    pk, version int, body jsonb, updated_by, updated_at)`;
    `inbound_items(id, company_id, status, received_at, message_id,
    from_enc, matched_employee_id, content_enc, auth jsonb, flags
    text[], reject_reason, decided_by, decided_at, decision jsonb)`;
    `inbound_attachments(id, company_id, item_id, idx int, file_name,
    content_type, size, sha256, blob_key, status, skip)`. Encrypted
    columns use the company DEK with AAD
    `"<companyId>:inbound_items:<column>:<id>"`; attachment bytes use
    `"<companyId>:inbound:content:<attachmentId>"` and the blob key
    `"<companyId>/inbound/<attachmentId>"`.
  - Address: `in+<companyId without dashes>.<secret>@<domain>` where
    the secret is 16 characters of lower-case base32 (`a-z2-7`, 80
    bits) from `deps.randomBytes(10)`. Created on first read of the
    settings when the inbound adapter is configured; `address` is null
    when not configured. Rotation replaces the secret at once (the old
    address is refused from then on) and audits
    `inbound.address-rotated`.
  - `auth-decision.ts` (pure): `senderAuthDecision(a: SenderAuth):
    "reject" | "flag" | "pass"`:
    `reject` when `spf` is `fail`, `dmarc` is `fail`, or `dkim` is
    `fail` while `spf` is not `pass`; `pass` when `dmarc` is `pass`, or
    both `spf` and `dkim` are `pass`; else `flag`.
  - `sender.ts` (pure): `matchSender(from: string, employees: { id;
    email: string | null }[], allowlist: string[]): { allowed: boolean;
    employeeId: string | null }`: lower-cased exact match on an active
    employee's email gives the employee; else an exact allow-list
    address or an `@domain` entry equal to the address's domain gives
    `allowed` with no employee; else not allowed.
  - `postmark-inbound.ts`: `postmarkInbound(cfg: { basicAuth: string
    }): InboundEmailAdapter`. The research READ that the payload has
    `From`, `Subject`, `TextBody`, `HtmlBody`, base64 attachments,
    headers with SPF, DKIM and spam results, and `MailboxHash`. These
    are `// UNVERIFIED` and labelled so in the file: the exact names
    `FromFull.Email`, `MessageID`, `Headers[{Name, Value}]`,
    `Attachments[{Name, Content, ContentType, ContentLength}]`, the
    `Authentication-Results` and `Received-SPF` header formats, and
    Basic credentials on the hook URL. `authenticate` compares
    `Authorization: Basic <base64(user:pass)>` in constant time;
    `parse` validates with a zod schema, decodes base64 attachments
    and fills `auth` with `readAuthHeaders(headers)` (exported for
    tests: from every `Authentication-Results` header the tokens
    `spf=<v>`, `dkim=<v>`, `dmarc=<v>`, case-insensitive, the first of
    each kind wins; else `Received-SPF: <Verdict>` for spf; missing
    gives `none`; unrecognised words give `unknown`); any mismatch
    throws `INBOUND_PAYLOAD_INVALID`.
  - `intake.ts`: `intakeEmail(deps, provider, rawBody, authorization):
    Promise<200>`. Status codes follow the research's READ retry rule
    (non-200 is retried for hours; 403 stops retries): adapter not
    configured 503 `HOOK_NOT_CONFIGURED`; bad credentials 401
    `HOOK_SIGNATURE_INVALID`; unparseable payload 403
    `INBOUND_PAYLOAD_INVALID`; `MailboxHash` not matching
    `^([0-9a-f]{32})\.([a-z2-7]{16})$`, or no mailbox with that secret
    in that company, 403 `INBOUND_REFUSED` (nothing stored); database
    errors 500 (retried). In one `enterTenant(companyId)`:
    1. `markSeen("email", MessageID)` false: 200, nothing new.
    2. Settings `enabled` false: item `rejected` `DISABLED`.
    3. `consumeRate("inbound", "all", 200, 86400)` refused (product
       default): `rejected` `RATE_LIMITED`.
    4. `senderAuthDecision(email.auth)` `reject`:
       `rejected` `SENDER_AUTH_FAILED`.
    5. `matchSender` not allowed: `rejected` `SENDER_NOT_ALLOWED`.
       Rejected items store only status, reason, `auth` and
       `received_at` (no sender, subject, text or attachments).
    6. Else attachments one by one: index over 10 `TOO_MANY`; over
       `RECEIPT_MAX_BYTES` `TOO_LARGE`; `sniffContentType` null
       `TYPE_NOT_ALLOWED`; sniffed type different from the declared
       `ContentType` (lower case, parameters removed)
       `TYPE_MISMATCH`; kept attachments are encrypted and put in the
       blob store. Item `received` with `flags` (`SENDER_UNVERIFIED`
       when the decision was `flag`, `ATTACHMENT_SKIPPED` when any was
       skipped), `emitEvent({ type: "inbound.received", itemId })`,
       audit `inbound.received` (`data: { attachmentCount, keptCount,
       flags }`).
    Every path that reaches the tenant answers 200. No reply email is
    ever sent (no backscatter).
  - `review.ts`: `acceptItem(ctx, id, body)`: status not `received` 409
    `INBOUND_NOT_PENDING`; the employee must be in the company (404);
    every index must be a kept attachment (422
    `INBOUND_ATTACHMENT_NOT_KEPT`); each becomes a receipt through
    `storeReceiptBytes(ctx, employeeId, fileName, bytes)` (Plan 6's
    checks run again); `claim-draft` also calls `createClaim(ctx, {
    employeeId, title, items: [] })` (a `draft`; the claimant adds
    items and submits; nothing is submitted or approved here); status
    `accepted`; audit `inbound.accepted` (`data: { as, receiptCount
    }`). `dismissItem(ctx, id, body)`: same status rule; audit
    `inbound.dismissed` (`data: { dismissReason }`, an enum value;
    the key `reason` itself is refused by `channelAudit`).
  - Download: decrypted bytes, `Content-Type` the sniffed type,
    `Content-Disposition: attachment; filename="inbound-<id>-<index>.
    <ext>"`, `X-Content-Type-Options: nosniff`, `Cache-Control:
    no-store`; skipped attachments 404.

- [ ] **Step 1: Write the failing tests**

`auth-decision.test.ts`: all `pass` gives `pass`; `spf fail` alone
gives `reject`; `dkim fail` with `spf pass` gives `flag`; `dkim fail`
with `spf none` gives `reject`; `dmarc fail` with both others `pass`
gives `reject`; `dmarc pass` with the others `none` gives `pass`; all
`none` gives `flag`; fast-check: any input with `spf "fail"` gives
`reject`.

`postmark-inbound.test.ts` (adapter only): `Authentication-Results:
mx.example; spf=pass smtp.mailfrom=a.test; dkim=pass header.d=a.test;
dmarc=pass` gives all `pass`; no headers give all `none`;
`Received-SPF: Pass (...)` gives `spf "pass"`; `spf=weird` gives
`unknown`; wrong Basic credentials make `authenticate` false; a
payload missing `MailboxHash` throws `INBOUND_PAYLOAD_INVALID`.

`inbound-sender.test.ts`: `Sara@Acme.test` matches employee email
`sara@acme.test`; `ap@vendor.test` matches allow-list entry
`@vendor.test`; `ap@mail.vendor.test` does not; an unknown address
is not allowed; an employee with `email: null` never matches.

`email-in.test.ts` (fake inbound adapter with Basic credentials; the
company has inbound enabled and an employee `sara@acme.test`):
- `email_in_happy_path`: a payload to the company's address from Sara
  with `auth.dkim` and `auth.spf` `"pass"` and a PNG attachment gives
  200, one `received` item with `matchedEmployee` Sara, one kept attachment, an
  `inbound-received` notification for owner and hr, and audit
  `inbound.received` without any address or subject.
- `email_in_spoof_retry_and_review` (Review Focus 5):
  1. From Sara with `auth.spf "fail"`: 200, item `rejected`
     `SENDER_AUTH_FAILED`, no attachment row, no blob written.
  2. An attachment declared `application/pdf` whose bytes are
     `<html><script>`: kept count 0, skip `TYPE_NOT_ALLOWED`; an
     attachment declared `image/png` whose bytes are a PDF: skip
     `TYPE_MISMATCH`.
  3. The same `MessageID` posted twice: one item.
  4. No expense claim and no receipt exists after intake.
- `email_in_unknown_sender`: from `x@else.test`: `rejected`
  `SENDER_NOT_ALLOWED`; the item's `fromAddress`, `subject` and
  `textPreview` are null or empty.
- `email_in_refusals`: wrong Basic credentials 401; a `MailboxHash`
  with the right company and a wrong secret 403 `INBOUND_REFUSED` and
  no item; after `rotateInboundAddress`, the old address gives 403;
  malformed JSON 403 `INBOUND_PAYLOAD_INVALID`; unconfigured adapter
  503.
- `email_in_disabled`: settings `enabled: false`: 200 and a `rejected`
  `DISABLED` item; enabling without `acknowledgedProcessing` gives 400
  `VALIDATION_FAILED` at that path.
- `email_in_rate_limit`: the 201st message in one Dubai day gives a
  `rejected` `RATE_LIMITED` item.
- `email_in_eleven_attachments`: the eleventh is skipped `TOO_MANY`.
- `email_in_cross_tenant`: company B's mailbox hash with company A's
  secret gives 403; company B's owner reading A's item id gets 404.

`email-in-review.test.ts`:
- `accept_as_receipt`: hr accepts index 0 for Sara: one Plan 6 receipt
  owned by Sara, `decision.as "receipt"`, status `accepted`, audit
  `inbound.accepted`; accepting again gives 409.
- `accept_as_claim_draft`: creates a `draft` claim for Sara with the
  given title and no items; its status stays `draft` (not submitted)
  and no approval request exists.
- `accept_skipped_attachment_refused`: a skipped index gives 422.
- `dismiss`: dismiss with `spam` gives `dismissed`; accept after that
  gives 409.
- `review_roles`: manager and employee get 403 on every inbound route;
  `downloadInboundAttachment` as hr returns the bytes with
  `attachment` disposition and `nosniff`.
- `inbound_at_rest_encrypted`: the `inbound_items` table text contains
  neither the sender address nor the subject.

- [ ] **Step 2: Run** `pnpm --filter @payroll/api test auth-decision
  postmark-inbound inbound-sender email-in`. Expected: FAIL.
- [ ] **Step 3: Implement** the files above; append the public id to
  `PUBLIC_CHANNEL_IDS`; conformance rows; `mayView` owner and hr.
- [ ] **Step 4: Run** `pnpm check`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(api): email-in with review inbox`.

### Task 6: Calendar feed (secret-URL ICS)

**Files:**
- Create: `packages/contract/src/calendar.ts`
- Modify: `packages/contract/src/routes-channels.ts`, `src/errors.ts`,
  `src/registry.ts`, `src/examples.ts`, `src/index.ts`
- Create: `packages/api/migrations/1306_calendar_feeds.sql`,
  `src/calendar/feed-token.ts` (pure), `src/calendar/feed.ts` (pure),
  `src/calendar/feeds.ts`, `src/calendar/push.ts`,
  `src/routes/channels-calendar.ts`
- Modify: Plan 11 `src/export/ics.ts` (export `escapeIcsText` and
  `foldIcsLine`; create the file with only these two if absent)
- Test: `packages/api/tests/feed-token.test.ts`,
  `tests/calendar-feed-text.test.ts`, `tests/calendar-feeds.test.ts`

**Interfaces:**
- Consumes: Task 1 ports (`publicApiBaseUrl`, `calendarPush`),
  `channelAudit`; Plan 3 `listLeaveInRange`, `viewerScope`,
  `dubaiDate`, leave types, `ctx.enterTenant`; Plan 9 `listHolidays`;
  Plan 11 `deadlinesBetween`, `Deadline`, `escapeIcsText`,
  `foldIcsLine`.
- Produces (contract):
  - `FeedScope = z.enum(["my","team","company-deadlines"])`.
  - `CalendarFeed { id; scope; status: "active" | "revoked";
    createdAt; lastFetchedAt: Timestamp | null; urlHint: string }`
    (`urlHint` = `"…" + last 6 characters of the token`);
    `CalendarFeedCreated = CalendarFeed & { url: string }` (shown
    once); `CalendarFeedCreate { scope }`.
  - `CALENDAR_FEED_NOTE = "Anyone with this link can see these events.
    Keep it private. Revoke it here if it leaks."`
  - Routes appended: `listCalendarFeeds GET /v1/me/calendar-feeds`
    (all roles) to `listOf(CalendarFeed)`; `createCalendarFeed POST
    /v1/me/calendar-feeds` (all; 201) to `CalendarFeedCreated`;
    `revokeCalendarFeed POST /v1/me/calendar-feeds/{id}/revoke` (all)
    to `CalendarFeed`; `getCalendarFeed GET /v1/calendar/{token}`
    (public, `contentType "text/calendar"`, `token` matching
    `FEED_TOKEN_RE`).
  - Errors: `FEED_LIMIT` 409.
- Produces (api):
  - Migration 1306: `calendar_feeds(id, company_id, user_id, scope,
    secret_hash, status, created_at, revoked_at, last_fetched_at)`.
  - `feed-token.ts` (pure): `FEED_TOKEN_RE =
    ^cal1\.([0-9a-f]{32})\.([0-9a-f]{32})\.([A-Za-z0-9_-]{43})\.ics$`;
    `formatFeedToken(companyId, feedId, secret: Uint8Array /* 32 */):
    string`; `parseFeedToken(t): { companyId; feedId; secret: string }
    | null` (ids with dashes restored).
  - `FEED_PAST_DAYS = 90`, `FEED_FUTURE_DAYS = 365`,
    `FEEDS_PER_USER = 5`, `FEED_TOUCH_MINUTES = 10` (product
    defaults).
  - `feed.ts` (pure): `IcsEvent { uid: string; start: IsoDate;
    endInclusive: IsoDate; summary: string; description?: string }`;
    `feedEvents(i: FeedInput): IcsEvent[]` where `FeedInput { scope;
    viewerEmployeeId: string | null; leave: { id; employeeId;
    employeeName; typeName; start; end; status }[]; holidays: { id;
    date; name; kind: "public" | "company" }[]; deadlines: Deadline[]
    }`. Rules: `my`: the viewer's approved leave as `"Leave:
    <typeName>"`, pending as `"Leave (pending): <typeName>"`, every
    holiday as `"Public holiday: <name>"` or `"Company holiday:
    <name>"`; `team`: other people's approved leave only, as `"Away:
    <employeeName>"` (no leave type), plus holidays; the viewer's own
    leave as in `my`; `company-deadlines`: one event per deadline,
    summary from `DEADLINE_LABELS` (`wps-salary` "WPS salary payment
    due", `gpssa-contribution` "GPSSA contribution due",
    `emiratisation-checkpoint` "Emiratisation checkpoint") plus
    `" (YYYY-MM)"` when the deadline has a period, description `"Rule
    status: <rule.status>. See the app for the source."`. UIDs:
    `leave-<id>@payroll`, `holiday-<id>@payroll`, `deadline-<id>
    @payroll`.
    `toIcsFeed(name: string, events: IcsEvent[], stamp: Date): string`:
    `BEGIN:VCALENDAR`, `VERSION:2.0`, `PRODID:-//payroll//feed//EN`,
    `CALSCALE:GREGORIAN`, `METHOD:PUBLISH`, `X-WR-CALNAME:<name>`, one
    `VEVENT` per event with `UID`, `DTSTAMP` (UTC basic format),
    `DTSTART;VALUE=DATE`, `DTEND;VALUE=DATE` = the day after
    `endInclusive`, `SUMMARY`, optional `DESCRIPTION`,
    `TRANSP:TRANSPARENT`; text through `escapeIcsText`, every line
    through `foldIcsLine`, CRLF endings.
  - `feeds.ts`: `createFeed(ctx, body)`: `team` needs owner, hr or
    manager; `company-deadlines` needs owner or hr (else 403
    `FORBIDDEN`); more than `FEEDS_PER_USER` active feeds 409
    `FEED_LIMIT`; secret 32 bytes, stored as SHA-256; returns the URL
    `<publicApiBaseUrl>/v1/calendar/<token>` once; audit
    `calendar.feed-created` (`data: { scope }`). `revokeFeed`: own
    feeds only (others 404); audit `calendar.feed-revoked`.
    `serveFeed(deps, token)`: parse, `enterTenant`, active feed,
    `timingSafeEqual` on the hash, the owner still a member whose role
    still allows the scope; any failure gives 404 `NOT_FOUND` with
    one identical body. Range `today - 90` to `today + 365` (Dubai).
    Leave comes from `listLeaveInRange` (`my`: self; `team`: owner and
    hr all employees, manager self and direct reports by
    `viewerScope`). Updates `last_fetched_at` when older than 10
    minutes. Response headers: `Content-Type: text/calendar;
    charset=utf-8`, `Cache-Control: private, max-age=900`,
    `Referrer-Policy: no-referrer`, `X-Robots-Tag: noindex`.
  - `push.ts`: `notConfiguredCalendarPush(provider: SsoProvider):
    CalendarPushAdapter` (`configured: false`, both methods return
    `{ status: "not-configured" }`); `CALENDAR_PUSH_NOTE = "Google and
    Microsoft calendar sync are not set up. They need each provider's
    app review before any account can connect."`. No OAuth scope is
    requested anywhere in this plan.

- [ ] **Step 1: Write the failing tests**

`feed-token.test.ts`: format then parse round-trips the two ids and
the secret; a token without `.ics`, with upper-case hex or with a
42-character secret parses to null; `FEED_TOKEN_RE` matches the
formatted token.

`calendar-feed-text.test.ts`:
- `feed_my_scope`: approved leave `2026-03-02..2026-03-04` gives
  `DTSTART;VALUE=DATE:20260302` and `DTEND;VALUE=DATE:20260305`,
  summary `Leave: Annual`; a pending request gives `Leave (pending):
  Annual`; a public holiday gives `Public holiday: <name>`.
- `feed_team_hides_type`: a report's approved sick leave gives
  `Away: <name>` and the text contains no `Sick`; their pending leave
  gives no event.
- `feed_deadlines`: a `wps-salary` deadline for 2026-06 due
  `2026-07-01` gives `SUMMARY:WPS salary payment due (2026-06)` and a
  description with the rule status.
- `feed_format`: every line ends with CRLF, none exceeds 75 octets, a
  name with `,` and `;` is escaped, the text starts with
  `BEGIN:VCALENDAR` and ends with `END:VCALENDAR\r\n`.

`calendar-feeds.test.ts`:
- `feed_create_and_fetch`: an employee creates a `my` feed (201, URL
  starts with the test `publicApiBaseUrl`); a public GET of the URL
  path returns `text/calendar` with the private cache and no-referrer
  headers and the employee's approved leave.
- `feed_scope_by_role`: employee `team` 403; manager `team` sees the
  report's leave as "Away"; hr `company-deadlines` 201; manager
  `company-deadlines` 403.
- `feed_revoked_or_wrong`: after revoke the URL gives 404; a token
  with one changed secret character gives 404 with the same body; a
  feed whose owner lost the manager role gives 404 for `team`.
- `feed_limit`: the sixth active feed gives 409 `FEED_LIMIT`.
- `feed_no_sentinels`: an hr `team` feed of the seeded company (with
  `seedPayroll`) contains no `SENTINELS` amount or IBAN and no
  14-digit run.
- `push_adapters_not_configured`: both `ports.calendarPush` adapters
  report `configured: false` and return `not-configured`.
- `feed_audit`: `calendar.feed-created` has `data` `{ scope: "my" }`
  and no URL or token.

- [ ] **Step 2: Run** `pnpm --filter @payroll/api test feed-token
  calendar-feed`. Expected: FAIL.
- [ ] **Step 3: Implement** the files above; append the public id to
  `PUBLIC_CHANNEL_IDS`; conformance rows; `mayView` self.
- [ ] **Step 4: Run** `pnpm check`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(api): secret-URL calendar feeds`.

### Task 7: SSO with OpenID Connect (Google, Microsoft Entra)

Security task: fresh per-task review.

**Files:**
- Create: `packages/contract/src/sso.ts`
- Modify: `packages/contract/src/routes-channels.ts`, `src/errors.ts`,
  `src/registry.ts`, `src/examples.ts`, `src/index.ts`
- Create: `packages/api/migrations/1307_sso.sql`, `src/sso/pkce.ts`
  (pure), `src/sso/id-token.ts`, `src/sso/identity.ts` (pure),
  `src/sso/link.ts` (pure), `src/sso/oidc-http.ts`,
  `src/sso/states.ts`, `src/sso/service.ts`, `src/sso/settings.ts`,
  `src/routes/channels-sso.ts`
- Modify: Plan 3 `src/auth/session.ts` (sessions carry
  `auth_method`), `src/auth/guard.ts` (SSO enforcement),
  `src/routes/auth.ts` (password login refuses a null password hash;
  export `consumeInvite`), `src/http/context.ts`
  (`session.authMethod`), `src/channels/wire.ts`,
  `tests/helpers/fake-channels.ts` (`fakeIssuer()`: an RSA key pair
  from `generateKeyPairSync`, JWKS, and `idToken(claims, opts)`),
  `tests/rls-catalog.test.ts` (`GLOBAL_TABLES` gains `sso_states`,
  `sso_identities`)
- Test: `packages/api/tests/id-token.test.ts`,
  `tests/sso-link-rules.test.ts`, `tests/sso.test.ts`

**Interfaces:**
- Consumes: Task 1 `OidcClient` port, `channelAudit`; Task 2
  `emitEvent` (`sso.linked`); Plan 3 sessions, `LoginResponse`,
  `verifyTotp`, `Keyring.encryptGlobal`, `decryptGlobal`, invites;
  `consumeInvite(tx: Db, deps: AppDeps, setupToken: string, user: {
  email: string; displayName: string; passwordHash: string | null }):
  Promise<{ userId: string; companyId: string; role: Role }>` (Plan 3
  accept-invite logic, exported from `src/routes/auth.ts`).
- Produces (contract):
  - `SsoProviderEnum = z.enum(["google","microsoft"])`.
  - `SsoStartRequest { intent: "login" | "invite"; inviteToken?:
    string 1..200 }` refined: `invite` requires `inviteToken`;
    `SsoStartResponse { authorizeUrl: string; expiresAt: Timestamp }`;
    `SsoCallbackRequest { code: string 1..2048; state: string 1..200;
    totp?: ^\d{6}$ }` (response `LoginResponse`).
  - `SsoIdentity { id; provider; email: string | null; linkedAt;
    lastUsedAt: Timestamp | null }`.
  - `SsoSettingsBody { allowedDomains: Domain[] 0..20;
    googleHostedDomains: Domain[] 0..20; microsoftTenantIds: Id[]
    0..20; jitEmployees: boolean; enforceSso: boolean }` (`Domain =
    ^[a-z0-9-]+(\.[a-z0-9-]+)+$`) refined: `jitEmployees` requires at
    least one `allowedDomains` entry and at least one hosted domain or
    tenant id; `SsoSettings = Body & { version; providers: { google:
    ProviderState; microsoft: ProviderState }; note: typeof
    SSO_NOTE }`; `SSO_NOTE = "Sign-in with Google or Microsoft does not
    replace the authenticator code needed for payroll approvals.
    Owners can always sign in with a password."`
  - Routes appended: `ssoStart POST /v1/auth/sso/{provider}/start`
    (public) to `SsoStartResponse`; `ssoCallback POST
    /v1/auth/sso/{provider}/callback` (public) to `LoginResponse`;
    `ssoLinkStart POST /v1/me/sso-identities/{provider}/link` (user)
    to `SsoStartResponse`; `listSsoIdentities GET
    /v1/me/sso-identities` (user) to `listOf(SsoIdentity)`;
    `unlinkSsoIdentity POST /v1/me/sso-identities/{id}/unlink` (user)
    to `listOf(SsoIdentity)`; `getSsoSettings GET /v1/sso-settings`
    (owner, hr); `putSsoSettings PUT /v1/sso-settings` (owner, mfa) to
    `SsoSettings`.
  - Errors: `SSO_NOT_CONFIGURED` 409, `SSO_STATE_INVALID` 400,
    `SSO_FAILED` 401 (detail `reason` only), `SSO_NOT_LINKED` 401,
    `SSO_IDENTITY_IN_USE` 409, `SSO_REQUIRED` 403,
    `LAST_SIGN_IN_METHOD` 409, `INVITE_EMAIL_MISMATCH` 403.
- Produces (api):
  - Migration 1307: global `sso_states(state_hash text pk, provider,
    intent text check (intent in ('login','invite','link')), user_id
    uuid null, invite_token_hash text null, nonce, code_verifier_enc,
    expires_at, used_at)` and `sso_identities(id, user_id, provider,
    subject_key text, email text null, linked_at, last_used_at,
    unique(provider, subject_key))` (no RLS; `payroll_app` select,
    insert, update); tenant `sso_settings(company_id pk, version int,
    body jsonb, updated_by, updated_at)`; `sessions.auth_method text
    not null default 'password'`; `users.password_hash` drops `NOT
    NULL` (if set); `SECURITY DEFINER` `sso_jit_candidates(p_email
    text, p_domain text) RETURNS TABLE(company_id uuid)` (companies
    whose settings have `jitEmployees` true and `p_domain` in
    `allowedDomains`, with an active employee whose lower-cased email
    is `p_email` and no membership linked to that employee).
  - `pkce.ts` (pure): `pkcePair(random32: Uint8Array): { verifier:
    string; challenge: string }` (verifier base64url of the bytes;
    challenge base64url of its SHA-256, method S256).
  - `id-token.ts`: `verifyIdToken(jwt: string, keys: JsonWebKey[],
    expect: { audience: string; nonce: string; nowSec: number;
    issuerOk: (iss: string, claims: Record<string, unknown>) =>
    boolean }): Record<string, unknown>` throwing
    `IdTokenError(reason)` with reason one of `ID_TOKEN_FORMAT`,
    `ID_TOKEN_ALG` (header `alg` not exactly `RS256`),
    `ID_TOKEN_KID` (no `kid` or no key with it and `kty "RSA"`),
    `ID_TOKEN_SIGNATURE` (`crypto.verify("sha256", ...)` false),
    `ID_TOKEN_ISSUER`, `ID_TOKEN_AUDIENCE` (`aud` neither the client
    id nor an array holding it; an array of more than one also needs
    `azp` equal to the client id), `ID_TOKEN_EXPIRED` (`exp <= now -
    120`), `ID_TOKEN_NOT_YET` (`iat` or `nbf` after `now + 120`),
    `ID_TOKEN_NONCE`. Keys load with `createPublicKey({ key: jwk,
    format: "jwk" })`. Issuer rules (`// UNVERIFIED: issuer formats
    from general knowledge; research EXCERPT says validate issuer and
    tid`): Google `iss` is `https://accounts.google.com` or
    `accounts.google.com`; Microsoft `iss` equals
    `https://login.microsoftonline.com/<tid>/v2.0` with `tid` the
    token's own `tid` claim, a UUID.
  - `identity.ts` (pure): `identityFromClaims(p: SsoProvider, c:
    Record<string, unknown>): { subjectKey: string; email: string |
    null; emailVerified: boolean; hostedDomain: string | null;
    tenantId: string | null; displayName: string }`: Google
    `subjectKey = sub`, `emailVerified = email_verified === true`,
    `hostedDomain = hd ?? null`; Microsoft `subjectKey = <tid>:<oid>`
    (`oid` a UUID, else `IdTokenError("ID_TOKEN_CLAIMS")`), `email =
    email ?? null` (never `preferred_username`), `emailVerified =
    false` always, `tenantId = tid`; emails lower-cased; `displayName
    = name` cut to 80, else the email's local part.
  - `link.ts` (pure): `jitEligible(i: { identity: ReturnType<typeof
    identityFromClaims>; provider; settings: SsoSettingsBody;
    employeeMatch: boolean; userWithEmailExists: boolean }): boolean`:
    true only when `jitEmployees`, `email` is not null, its domain is
    in `allowedDomains`, (Google: `emailVerified` and `hostedDomain`
    in `googleHostedDomains`; Microsoft: `tenantId` in
    `microsoftTenantIds`), `employeeMatch` and not
    `userWithEmailExists`. `inviteEmailOk(identity, provider,
    inviteEmail, settings): boolean`: emails equal and (Google
    `emailVerified`; Microsoft `tenantId` in the inviting company's
    `microsoftTenantIds`).
  - `oidc-http.ts`: `httpOidcClient(http: HttpClient, cfg: { google?:
    { clientId; clientSecret }; microsoft?: { clientId; clientSecret }
    }): OidcClient` (`// UNVERIFIED: discovery URLs and endpoints`):
    discovery from `https://accounts.google.com/.well-known/
    openid-configuration` and `https://login.microsoftonline.com/
    organizations/v2.0/.well-known/openid-configuration`, cached for
    one hour; `authorizeUrl` with `response_type=code`, `scope=openid
    email profile`, `state`, `nonce`, `code_challenge`,
    `code_challenge_method=S256`, `redirect_uri`; `exchangeCode` posts
    form-encoded to the token endpoint; `keys` fetches `jwks_uri`.
  - `states.ts`: `createState(tx, deps, provider, intent, extra: {
    userId?; inviteToken? }): Promise<{ state; nonce; challenge;
    expiresAt }>` (state and nonce 32 random bytes base64url; only
    the SHA-256 of the state stored; verifier with `encryptGlobal`,
    AAD `"sso_states:verifier:<stateHash>"`; 10 minutes);
    `consumeState(tx, deps, provider, state): Promise<StateRow>`
    (`UPDATE ... SET used_at = now WHERE state_hash = $1 AND used_at
    IS NULL AND expires_at > now AND provider = $2 RETURNING`; none:
    400 `SSO_STATE_INVALID`).
  - `service.ts`: redirect URI `<publicAppBaseUrl>/auth/sso/<provider>
    /callback`. `ssoStart`: provider not configured 409
    `SSO_NOT_CONFIGURED`; `invite` checks the invite token's shape
    and stores its hash. `ssoLinkStart`: a user whose `mfaEnrolled`
    is true needs `session.mfa` (403 `MFA_REQUIRED`). `ssoCallback`:
    consume the state; exchange the code; verify the ID token with the
    provider's keys, client id and the state's nonce (any
    `IdTokenError` gives 401 `SSO_FAILED` with `detail.reason`); build
    the identity; then by intent:
    - `link`: the callback must carry the bearer session of the user
      who started it (`Authorization` read by the handler even though
      the route is public); no session, an expired one, or another
      user's gives 400 `SSO_STATE_INVALID` and links nothing (so a
      leaked authorize URL cannot attach someone else's identity).
      Identity already linked to another user 409
      `SSO_IDENTITY_IN_USE`; else link it to the state's user,
      `emitEvent` `sso.linked` in each company of the user; return a
      new session for that user.
    - `invite`: `inviteEmailOk` false 403 `INVITE_EMAIL_MISMATCH`;
      else `consumeInvite(..., { passwordHash: null })` (the invite's
      role is kept: an owner invited someone on purpose); link the
      identity (409 when in use by another user); return a session.
    - `login`: a linked identity gives its user (a `service` user or a
      locked user gives 401 `SSO_NOT_LINKED` with the same body);
      otherwise `sso_jit_candidates(email, domain)`; exactly one
      company where, inside its tenant, `jitEligible` holds: create
      the user (no password, kind `human`), the identity and a
      membership with role `employee` linked to the matching
      employee, audit `sso.member-provisioned` (`data: { role:
      "employee" }`); anything else: 401 `SSO_NOT_LINKED`. Never links
      by email to an existing user; never creates any role but
      `employee`.
    Sessions get `auth_method = "sso:<provider>"`; `mfa` is true only
    when `totp` is given and valid for an enrolled user (a wrong code
    gives 401 `INVALID_CREDENTIALS`). Identity `last_used_at` is set.
  - `unlinkSsoIdentity`: own identities only (404 otherwise); when the
    user has no password and no other identity, 409
    `LAST_SIGN_IN_METHOD`.
  - Guard: on a tenant route, when the company's `enforceSso` is true,
    the caller's role is not `owner` and `session.authMethod` is
    `password`, 403 `SSO_REQUIRED`. API key sessions (Task 9) are not
    affected.
  - Settings: `getSsoSettings` (no row: version 0, empty lists, both
    flags false); `putSsoSettings` with `expectedVersion`, 409
    `SETTINGS_VERSION_CONFLICT`; audit `sso.settings-updated` (`data:
    { changed }`).

- [ ] **Step 1: Write the failing tests**

`id-token.test.ts` (keys from `fakeIssuer()`):
- `id_token_valid_google`: a token with `iss
  "https://accounts.google.com"`, `aud` the client id, matching nonce
  and `exp` in the future returns its claims; `iss
  "accounts.google.com"` also passes.
- `id_token_refusals`: header `alg "none"` with an empty signature,
  `alg "HS256"` signed with the public key text as the secret, an
  unknown `kid`, a payload changed after signing, `aud` of another
  client, `aud ["client","other"]` without `azp`, a wrong nonce, `exp
  = now - 121` and `iat = now + 121` each throw the matching reason;
  `exp = now - 119` passes.
- `id_token_microsoft_issuer`: `iss` with the token's own `tid`
  passes; `iss` naming a different tenant than `tid` throws
  `ID_TOKEN_ISSUER`; a `tid` that is not a UUID throws.

`sso-link-rules.test.ts`: `identityFromClaims("microsoft", { tid, oid,
preferred_username: "a@x.test" })` gives `email: null`; Google without
`email_verified` gives `emailVerified: false`; `jitEligible` truth
table: each condition false alone makes it false; all true makes it
true; `inviteEmailOk` false for Microsoft when `tid` is not listed.

`sso.test.ts` (`fakeIssuer` behind a fake `OidcClient` that returns the
token for a scripted code):
- `sso_login_linked`: a user links Google while logged in (MFA session
  when enrolled), then `ssoStart` plus `ssoCallback` logs in and the
  session has `authMethod "sso:google"` and `mfa` false; with a valid
  `totp` `mfa` is true; the user gets a `security-sso-linked` notice
  after linking.
- `sso_unlinked_owner_email_refused` (Review Focus 2): the owner's
  email is `o@acme.test`; company settings `jitEmployees` with domain
  and hosted domain `acme.test`; an unlinked Google identity with that
  email (verified, `hd "acme.test"`) gives 401 `SSO_NOT_LINKED`; an
  unlinked Microsoft identity with `email "o@acme.test"` from an
  unlisted tenant gives 401; afterwards `sso_identities` has no row,
  no session row was added and the owner's memberships are unchanged.
- `sso_jit_employee_only`: an active employee `e@acme.test` with no
  account, `jitEmployees` on: the first Google login creates one user
  with no password, one identity and one membership with role
  `employee` linked to that employee, audit `sso.member-provisioned`;
  the same flow for an employee record whose job title says "HR
  manager" still gives role `employee`; with `jitEmployees` off it
  gives 401.
- `sso_state_rules`: a state used twice gives 400
  `SSO_STATE_INVALID` the second time; a state older than 10 minutes
  gives 400; a Google state used on the Microsoft callback gives 400.
- `sso_invite`: an hr invite for `h@acme.test` accepted through Google
  with that verified email creates the membership with role `hr`; a
  verified Google identity with another email gives 403
  `INVITE_EMAIL_MISMATCH`.
- `sso_enforced`: with `enforceSso` on, a password session of an hr
  member gets 403 `SSO_REQUIRED` on `GET /v1/employees`; the owner's
  password session still works; an SSO session of the hr member works.
- `sso_link_bound_to_session`: user U starts a link; the callback
  sent with no bearer, or with user V's session, gives 400
  `SSO_STATE_INVALID` and `sso_identities` has no row; the same flow
  with U's session links the identity to U.
- `sso_unlink_last_method`: a JIT user (no password) with one identity
  gets 409 `LAST_SIGN_IN_METHOD`.
- `sso_not_configured`: `ssoStart` with an unconfigured provider gives
  409; `putSsoSettings` needs owner and MFA.
- `sso_global_tables`: the RLS catalog test passes with `sso_states`
  and `sso_identities` listed as global.

- [ ] **Step 2: Run** `pnpm --filter @payroll/api test id-token
  sso-link-rules sso`. Expected: FAIL.
- [ ] **Step 3: Implement** `pkce.ts`, `id-token.ts`, `identity.ts`,
  `link.ts` first, then the rest; append `ssoStart` and `ssoCallback`
  to `PUBLIC_CHANNEL_IDS`; conformance rows.
- [ ] **Step 4: Run** `pnpm check`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(api): OIDC sign-in with linking rules`.

### Task 8: Outbound signed webhooks

Security task: fresh per-task review.

**Files:**
- Create: `packages/contract/src/webhooks.ts`
- Modify: `packages/contract/src/routes-channels.ts`, `src/errors.ts`,
  `src/registry.ts`, `src/examples.ts`, `src/index.ts`
- Create: `packages/api/migrations/1308_webhooks.sql`,
  `src/webhooks/url-guard.ts` (pure), `src/webhooks/sign.ts` (pure),
  `src/webhooks/schedule.ts` (pure), `src/webhooks/events.ts`,
  `src/webhooks/endpoints.ts`, `src/webhooks/deliver.ts`,
  `src/routes/channels-webhooks.ts`
- Modify: `src/channels/events.ts` (webhook fan-out), Plan 3 employee
  create and update services (`emitEvent` `employee.created` and
  `employee.updated`), `src/main.ts` (`jobs` runs
  `deliverDueWebhooks`)
- Test: `packages/api/tests/url-guard.test.ts`,
  `tests/webhook-sign.test.ts`, `tests/webhooks.test.ts`,
  `tests/webhook-delivery.test.ts`

**Interfaces:**
- Consumes: Task 1 `HttpClient`, `resolveHost`, `channelAudit`; Task 2
  `emitEvent`, `DomainEvent`, `notify`; Plan 3 `Keyring`,
  `canonicalJson`.
- Produces (contract):
  - `WEBHOOK_EVENT_TYPES = ["employee.created","employee.updated",
    "leave.requested","leave.decided","pay-run.approved",
    "expense-claim.decided"] as const`; `WebhookEventType =
    z.enum([...WEBHOOK_EVENT_TYPES, "ping"])`.
  - `WebhookEvent { id: ^evt_[0-9a-f-]{36}$; type: WebhookEventType;
    createdAt: Timestamp; companyId: Id; data: { entityType:
    "employee" | "leave-request" | "pay-run" | "expense-claim" |
    "endpoint"; entityId: Id; outcome?: "approved" | "rejected" |
    "returned" } }` (ids only; consumers fetch details with an API
    key).
  - `WEBHOOK_SIGNATURE_NOTE = "Each request carries X-Webhook-Id,
    X-Webhook-Timestamp and X-Webhook-Signature. The signature is
    v1=<hex HMAC-SHA256 of id.timestamp.body with your secret>. Reject
    requests older than 300 seconds and ids you have already seen.
    During a secret rotation two v1 values are sent."`
  - `WebhookEndpointCreate { url: string 1..500; description?: string
    0..200; events: (typeof WEBHOOK_EVENT_TYPES)[number][] 1..6 unique
    }`; `WebhookEndpoint { id; url; description; events; status:
    "active" | "paused"; pausedReason: "manual" | "failing" | "gone" |
    null; secretHint: ^whsec_…[A-Za-z0-9_-]{4}$; consecutiveFailures:
    int; createdAt }`; `WebhookEndpointCreated = WebhookEndpoint & {
    secret: string }`; `WebhookEndpointUpdate { url?; description?;
    events?; status?: "active" | "paused" }`; `WebhookSecretRotate {
    graceHours: int 0..72 }`.
  - `WebhookErrorCode = z.enum(["TIMEOUT","NETWORK","TLS",
    "HOST_NOT_PUBLIC","URL_NOT_ALLOWED","REDIRECT_NOT_FOLLOWED",
    "HTTP_STATUS"])`; `WebhookDelivery { id; endpointId; eventId;
    eventType; status: "pending" | "succeeded" | "failed"; attempts: {
    n: int; at; statusCode: int | null; error: WebhookErrorCode | null;
    durationMs: int }[]; nextAttemptAt: Timestamp | null; createdAt
    }`; `WebhookDeliveryQuery { endpointId?: Id; status?; before?;
    limit?: int 1..100 }`.
  - Routes appended: `listWebhookEndpoints GET /v1/webhook-endpoints`
    (owner, hr) to `listOf(WebhookEndpoint)`; `createWebhookEndpoint
    POST /v1/webhook-endpoints` (owner, mfa, 201) to
    `WebhookEndpointCreated`; `updateWebhookEndpoint PATCH
    /v1/webhook-endpoints/{id}` (owner, mfa) to `WebhookEndpoint`;
    `rotateWebhookSecret POST /v1/webhook-endpoints/{id}/rotate-secret`
    (owner, mfa) to `WebhookEndpointCreated`; `testWebhookEndpoint
    POST /v1/webhook-endpoints/{id}/test` (owner, 201) to
    `WebhookDelivery`; `listWebhookDeliveries GET
    /v1/webhook-deliveries` (owner, hr) to `listOf(WebhookDelivery)`;
    `redeliverWebhook POST /v1/webhook-deliveries/{id}/redeliver`
    (owner, 201) to `WebhookDelivery`.
  - Errors: `WEBHOOK_URL_NOT_ALLOWED` 422, `WEBHOOK_ENDPOINT_LIMIT`
    409, `WEBHOOK_PAUSED` 409.
- Produces (api):
  - Migration 1308: `webhook_endpoints(id, company_id, url,
    description, events text[], status, paused_reason, secret_enc,
    prev_secret_enc, prev_valid_until, secret_last4,
    consecutive_failures int, created_by, created_at, updated_at)`;
    `webhook_events(id, company_id, type, entity_type, entity_id,
    outcome, created_at)`; `webhook_deliveries(id, company_id,
    endpoint_id, event_id, status, attempt_count int, next_attempt_at,
    lease_until, created_at, finished_at)`; `webhook_attempts(
    company_id, delivery_id, n int, at, status_code int null, error,
    duration_ms int, pk(delivery_id, n))`; `SECURITY DEFINER`
    `due_webhook_deliveries(p_now timestamptz, p_limit int) RETURNS
    TABLE(company_id uuid, delivery_id uuid)` (pending with
    `next_attempt_at <= p_now`, or leased past `lease_until`). Secrets
    encrypted with the company DEK, AAD
    `"<companyId>:webhook_endpoints:secret:<id>"` (and `prev_secret`).
  - `url-guard.ts` (pure): `checkWebhookUrl(url: string): { ok: true;
    host: string } | { ok: false }`: parses with `URL`; protocol
    `https:`; no username or password; port empty or `443`; host is
    not an IPv4 or IPv6 literal, not `localhost`, has a dot, and does
    not end with `.localhost`, `.local`, `.internal` or `.home.arpa`;
    at most 500 characters. `isPublicAddress(ip: string): boolean`:
    false for IPv4 in 0.0.0.0/8, 10.0.0.0/8, 100.64.0.0/10,
    127.0.0.0/8, 169.254.0.0/16, 172.16.0.0/12, 192.0.0.0/24,
    192.0.2.0/24, 192.168.0.0/16, 198.18.0.0/15, 198.51.100.0/24,
    203.0.113.0/24, 224.0.0.0/4, 240.0.0.0/4; IPv6 `::`, `::1`,
    fc00::/7, fe80::/10, ff00::/8, 2001:db8::/32, and IPv4-mapped
    `::ffff:` addresses judged as IPv4; true otherwise.
  - `sign.ts` (pure): `webhookSignature(secrets: string[], id: string,
    timestampSec: number, body: string): string` = the values
    `v1=<hex HMAC-SHA256(secret, id + "." + timestampSec + "." +
    body)>` for each secret, current first, joined by `,`;
    `WEBHOOK_TOLERANCE_SEC = 300` (documented for consumers).
  - `schedule.ts` (pure): `WEBHOOK_RETRY_MINUTES = [1, 5, 30, 120,
    360, 720, 1440]` (8 attempts in all); `nextWebhookAttempt(
    attemptsMade: number, now: Date): Date | null`;
    `PAUSE_AFTER_FAILED_DELIVERIES = 5`; `ENDPOINTS_PER_COMPANY = 10`
    (product defaults).
  - `events.ts`: `toWebhookEvent(e: DomainEvent): { type; entityType;
    entityId; outcome? } | null`: `employee.created`,
    `employee.updated`, `leave.requested`, `leave.decided` (with
    outcome), `pay-run.approved`, and `approval.closed` whose subject
    type is `expense-claim` as `expense-claim.decided` (with outcome);
    others null. `emitEvent` inserts one `webhook_events` row and one
    `pending` delivery (`next_attempt_at = now`) per `active` endpoint
    subscribed to that type, in the caller's transaction.
  - `endpoints.ts`: create (`checkWebhookUrl` false: 422
    `WEBHOOK_URL_NOT_ALLOWED`; more than 10: 409
    `WEBHOOK_ENDPOINT_LIMIT`; secret `whsec_` + base64url of 32 random
    bytes, returned once); update (same URL check; status `paused`
    sets `pausedReason "manual"`; `active` resets
    `consecutive_failures`); rotate (new secret, the old one kept as
    `prev_secret` until `now + graceHours`); test (a `ping` event and
    one delivery to this endpoint, even when paused); redeliver (a new
    delivery for the same event id; 409 `WEBHOOK_PAUSED` when the
    endpoint is paused). Audit `webhook.endpoint-created` (`data: {
    events }`), `webhook.endpoint-updated` (`changed`),
    `webhook.secret-rotated`, `webhook.redelivered`, `webhook.paused`
    (`data: { pausedReason }`). The URL never goes into audit data.
  - `deliver.ts`: `deliverDueWebhooks(db: Db, deps: AppDeps, limit =
    100): Promise<{ succeeded: number; failed: number; retried:
    number }>`: claim (lease 60 s, `attempt_count + 1`, decrypt
    secrets, build `body = canonicalJson(WebhookEvent)` with the
    stored event id and time); outside any transaction:
    `checkWebhookUrl`, then `resolveHost(host)`; no address or any
    address not public: error `HOST_NOT_PUBLIC` and no request; else
    `http.send({ method: "POST", url, timeoutMs: 10000, pinAddress:
    first address, headers: { "content-type": "application/json",
    "user-agent": "payroll-webhooks/1", "x-webhook-id": event id,
    "x-webhook-timestamp": now seconds, "x-webhook-signature":
    webhookSignature([current, prev while valid], ...) } })`; record
    in a second transaction: 2xx `succeeded`; 3xx
    `REDIRECT_NOT_FOLLOWED`; 410 `HTTP_STATUS` and the endpoint is
    paused `gone`; other statuses `HTTP_STATUS`; failures with a next
    attempt stay `pending`, else `failed`. A delivery that ends
    `failed` adds 1 to `consecutive_failures`; reaching 5 pauses the
    endpoint (`failing`) and emits `webhook.paused`; a success resets
    it to 0. Response bodies are never stored.

- [ ] **Step 1: Write the failing tests**

`url-guard.test.ts`: `https://hooks.example.test/x` ok;
`http://hooks.example.test`, `https://user:pw@hooks.example.test`,
`https://hooks.example.test:8443`, `https://127.0.0.1/x`,
`https://[::1]/x`, `https://localhost/x`, `https://db.internal/x`,
`https://printer.local/x` and `https://intranet/x` are not ok;
`isPublicAddress` is false for `10.1.2.3`, `172.31.0.1`,
`192.168.1.1`, `169.254.169.254`, `100.64.0.1`, `::1`, `fd00::1`,
`fe80::1`, `::ffff:10.0.0.1` and true for `93.184.216.34` and
`2606:4700::1111`.

`webhook-sign.test.ts`: a known secret, id, timestamp and body give
the hex value computed in the test with `createHmac`; two secrets give
two `v1=` values, current first; a changed body changes the value.

`webhooks.test.ts`:
- `endpoint_create_owner_mfa`: hr 403; owner without MFA 403; owner
  with MFA 201 and a `secret` starting `whsec_`; listing shows only
  `secretHint`; `webhook_endpoints` text does not contain the secret;
  audit `webhook.endpoint-created` has no URL.
- `endpoint_url_refused`: `http://` and `https://10.0.0.1/` give 422
  `WEBHOOK_URL_NOT_ALLOWED`; the eleventh endpoint gives 409.
- `events_fan_out`: two endpoints, one subscribed to
  `employee.created`: creating an employee makes one delivery for that
  endpoint only; approving an expense claim makes an
  `expense-claim.decided` delivery with `outcome "approved"` for a
  subscribed endpoint.

`webhook-delivery.test.ts` (fake HTTP and DNS):
- `delivery_signed_and_verifiable`: the recorded request has the
  three headers; recomputing the HMAC in the test over `id.timestamp.
  body` with the endpoint secret equals the header; the body parses
  as `WebhookEvent`; status `succeeded`.
- `webhook_no_leak_no_ssrf` (Review Focus 4):
  1. The endpoint host resolves to `10.0.0.5`: the attempt has error
     `HOST_NOT_PUBLIC` and the fake HTTP recorded no request.
  2. A scripted 302 with `Location: https://169.254.169.254/`: error
     `REDIRECT_NOT_FOLLOWED` and exactly one request recorded.
  3. Bodies of `pay-run.approved` and `employee.updated` deliveries
     for the seeded company contain no `SENTINELS` amount or IBAN.
  4. The request was sent with `pinAddress` equal to the resolved
     public address.
- `delivery_retries_and_pauses`: scripted 500s: attempts follow
  `WEBHOOK_RETRY_MINUTES` as the clock passes each `next_attempt_at`,
  the eighth failure makes the delivery `failed`; five failed
  deliveries pause the endpoint `failing` and owners get a
  `webhook-paused` notice; a 410 pauses it `gone` at once.
- `rotation_grace`: after `rotateWebhookSecret` with `graceHours: 24`,
  the next request carries two `v1=` values (new first); 24 hours and
  one second later only one.
- `replay_same_event_id`: `redeliverWebhook` sends the same
  `x-webhook-id` with a new timestamp and signature.
- `test_ping`: `testWebhookEndpoint` creates a `ping` delivery that is
  sent even when the endpoint is paused.
- `deliveries_cross_tenant`: company B's owner reading A's delivery id
  through `redeliverWebhook` gets 404.

- [ ] **Step 2: Run** `pnpm --filter @payroll/api test url-guard
  webhook`. Expected: FAIL.
- [ ] **Step 3: Implement** the pure files first, then the rest;
  register `deliverDueWebhooks` in `main.ts jobs`; conformance rows;
  `mayView` owner and hr.
- [ ] **Step 4: Run** `pnpm check`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(api): signed outbound webhooks`.

### Task 9: API keys with scopes, rotation and rate limits

Security task: fresh per-task review.

**Files:**
- Create: `packages/contract/src/api-keys.ts`, `src/api-scopes.ts`
- Modify: `packages/contract/src/routes-channels.ts`, `src/errors.ts`,
  `src/registry.ts`, `src/examples.ts`, `src/index.ts`
- Create: `packages/api/migrations/1309_api_keys.sql`,
  `src/apikeys/format.ts` (pure), `src/apikeys/keys.ts`,
  `src/apikeys/auth.ts`, `src/routes/channels-apikeys.ts`
- Modify: Plan 3 `src/auth/guard.ts` (key path before the session
  path), `src/routes/auth.ts` (login refuses `kind = 'service'`),
  `src/people/redact.ts` (`apiScopes`), `src/routes/users.ts` (list
  omits service users), `src/http/context.ts` (`ctx.apiKey`); Plan 6
  `src/approvals/requests.ts` (members for `resolveChain` are human
  users only); Task 2 `src/channels/recipients.ts` (human users only)
- Test: `packages/contract/tests/api-scopes.test.ts`,
  `packages/api/tests/apikey-format.test.ts`,
  `tests/apikeys.test.ts`, `tests/apikey-auth.test.ts`

**Interfaces:**
- Consumes: Task 1 `consumeRate`, `channelAudit`; Plan 3 `register`
  pipeline, `withTenant`, users, memberships, `toEmployeeView`,
  `sha256Hex`; Plan 6 `resolveChain` members.
- Produces (contract):
  - `ApiScope = z.enum(["employees:read","employees:write",
    "leave:read","leave:write","attendance:read","payroll:read",
    "expenses:read"])`.
  - `API_KEY_SCOPES: Readonly<Record<string, ApiScope>>`, exactly:
    `getCompany`, `listEmployees`, `getEmployee`, `listDepartments`:
    `employees:read`; `createEmployee`, `updateEmployee`,
    `createDepartment`, `updateDepartment`: `employees:write`;
    `listLeaveTypes`, `listLeaveRequests`, `getLeaveBalances`:
    `leave:read`; `createLeaveRequest`, `cancelLeaveRequest`:
    `leave:write`; `listAttendance`: `attendance:read`;
    `listPayRuns`, `getPayRun`, `listPayRunPayslips`, `getPayslip`:
    `payroll:read`; and, when Plan 6 is merged, the ids of `GET
    /v1/expense-claims` and `GET /v1/expense-claims/{id}`:
    `expenses:read`. Every other route is closed to keys.
  - `API_KEY_PREFIX = "hrk_"`; `ApiKeyCreate { name: string 1..80;
    scopes: ApiScope[] 1..7 unique; rateLimitPerMinute?: int 10..1200;
    expiresAt?: Timestamp }`; `API_KEY_DEFAULT_RATE = 120` (product
    default, not a limit of any provider); `ApiKey { id; name; prefix:
    ^hrk_[0-9a-f]{16}$; scopes; rateLimitPerMinute; status: "active" |
    "revoked"; createdAt; expiresAt: Timestamp | null; lastUsedAt:
    Timestamp | null; rotatedAt: Timestamp | null; previousValidUntil:
    Timestamp | null }`; `ApiKeyCreated { key: ApiKey; secret: string
    }`; `ApiKeyUpdate { name?; rateLimitPerMinute? }`; `ApiKeyRotate {
    graceHours: int 0..72 }`.
  - Routes appended: `listApiKeys GET /v1/api-keys` (owner, hr) to
    `listOf(ApiKey)`; `createApiKey POST /v1/api-keys` (owner, mfa,
    201) to `ApiKeyCreated`; `updateApiKey PATCH /v1/api-keys/{id}`
    (owner, mfa) to `ApiKey`; `rotateApiKey POST
    /v1/api-keys/{id}/rotate` (owner, mfa) to `ApiKeyCreated`;
    `revokeApiKey POST /v1/api-keys/{id}/revoke` (owner, mfa) to
    `ApiKey`.
  - Errors: `API_KEY_ROUTE_NOT_ALLOWED` 403, `SCOPE_MISSING` 403,
    `API_KEY_REVOKED` 409 (rotating or updating a revoked key).
- Produces (api):
  - Migration 1309: `users.kind text not null default 'human' check
    (kind in ('human','service'))`; `users.password_hash` nullable
    (if Task 7 has not done it); `api_keys(id, company_id, key_id text
    unique, name, service_user_id, scopes text[],
    rate_limit_per_minute int, status, secret_hash, prev_secret_hash,
    prev_valid_until, created_by, created_at, expires_at,
    last_used_at, rotated_at, revoked_at)`.
  - `format.ts` (pure): `formatApiKey(keyId: string, secret:
    Uint8Array): string` = `hrk_<keyId>_<base64url of 32 bytes>`;
    `parseApiKey(s: string): { keyId: string; secret: string } | null`
    (`^hrk_([0-9a-f]{16})_([A-Za-z0-9_-]{43})$`); `hashKeySecret(secret:
    string): string` (SHA-256 hex; the secret has 256 bits, so no
    slow hash).
  - `keys.ts`: `createApiKey(ctx, body)`: key id 8 random bytes hex,
    secret 32 bytes; a service user `apikey-<keyId>@service.invalid`
    (kind `service`, no password, display name `"API key: <name>"`)
    with membership role `hr`; returns the secret once; audit
    `apikey.created` (`data: { scopes, rateLimitPerMinute }`).
    `rotateApiKey(ctx, id, body)`: new secret; the old hash kept as
    `prev_secret_hash` until `now + graceHours`; audit
    `apikey.rotated` (`data: { graceHours }`). `revokeApiKey`: status
    `revoked` (both secrets dead at once); audit `apikey.revoked`.
    `updateApiKey`: audit `apikey.updated` (`changed`).
  - `auth.ts`: `authenticateApiKey(deps, def: RouteDef, bearer:
    string, companyHeader: string | undefined): Promise<KeyAuth>`, run
    by the guard when the bearer starts with `hrk_`, in this order:
    1. `def.auth !== "tenant"`, `def.mfa`, or `def.id` not in
       `API_KEY_SCOPES`: 403 `API_KEY_ROUTE_NOT_ALLOWED`.
    2. No `X-Company-Id`: 400 `COMPANY_HEADER_REQUIRED`.
    3. In one `withTenant({ companyId: header })`: `parseApiKey`; the
       row by `key_id` (RLS hides other companies' keys); status
       `active`; `expires_at` null or after now; the secret's hash
       equal (`timingSafeEqual`) to `secret_hash`, or to
       `prev_secret_hash` while `now < prev_valid_until`. Any failure:
       401 `UNAUTHENTICATED` with one identical body.
    4. `API_KEY_SCOPES[def.id]` not in the key's scopes: 403
       `SCOPE_MISSING` with `detail.scope`.
    5. `consumeRate("apikey", keyId, rateLimitPerMinute, 60, now)`;
       refused: 429 `RATE_LIMITED` with `Retry-After` (seconds to the
       window end).
    6. `last_used_at = now` when null or older than 60 seconds.
    This transaction commits on its own, so a handler failure still
    counts against the limit. The handler then runs as usual in its
    own `withTenant` with `ctx.user` = the service user, `tenant.role
    = "hr"`, `session = { mfa: false, expiresAt, via: "api-key",
    authMethod: "api-key" }`, `ctx.apiKey = { id, scopes }`.
    Every key response carries `RateLimit-Limit`,
    `RateLimit-Remaining` and `RateLimit-Reset` (seconds).
  - Redaction: `toEmployeeView(row, viewer)` takes `viewer.apiScopes?:
    readonly ApiScope[]`; when present without `payroll:read`,
    `salary`, `bank`, `labourPersonId` and `emiratesIdNumber` are null.
  - Service users: password login gives 401 `INVALID_CREDENTIALS`;
    `listUsers` omits them; Plan 6's chain members and Task 2's
    recipients include `kind = 'human'` users only.

- [ ] **Step 1: Write the failing tests**

`api-scopes.test.ts` (contract): every key of `API_KEY_SCOPES` is a
`ROUTES` id; none of them has `mfa: true` or `auth` other than
`tenant`; none is in `CHANNEL_ROUTES`; none of `putEmployeeSalary`,
`putEmployeeBank`, `getEmployeeBank`, `createPayRun`,
`approvePayRun`, `generateSif`, `downloadSifFile`,
`approveLeaveRequest`, `rejectLeaveRequest`, `listAuditEvents` or any
approval-spine id is a key; every `ApiScope` value is used at least
once (except `expenses:read` before Plan 6).

`apikey-format.test.ts`: format then parse round-trips; `hrk_` with
15 hex characters, upper-case hex, or a 42-character secret parses to
null; `hashKeySecret` is 64 hex characters and differs for two
secrets.

`apikeys.test.ts`:
- `apikey_create_owner_mfa`: hr 403; owner without MFA 403; with MFA
  201 with a `secret` matching the format; listing shows `prefix`
  only; the `api_keys` table text has no secret; audit
  `apikey.created` has scopes and no secret.
- `apikey_service_user`: the service user exists with kind `service`;
  password login with its email gives 401; `GET /v1/users` does not
  list it.
- `service_user_never_approver`: an expense claim in a company whose
  only hr member is a key's service user and whose chain has an hr
  tier resolves to the owner, not the service user; no notification
  goes to a service user.

`apikey-auth.test.ts`:
- `apikey_reads_employees`: a key with `employees:read` lists
  employees (200) with `RateLimit-*` headers; salary, bank and
  identity numbers are null without `payroll:read` and present with
  it.
- `apikey_cannot_escape` (Review Focus 3): with a key holding every
  scope:
  1. `getEmployeeBank` and `downloadSifFile` (MFA routes): 403
     `API_KEY_ROUTE_NOT_ALLOWED`; `approvePayRun`: 403.
  2. `listApiKeys`, `createWebhookEndpoint` (channel routes), `getMe`
     (user route), `approveStep` (spine): 403.
  3. Company B's id in `X-Company-Id`: 401 `UNAUTHENTICATED`, no B
     data.
  4. After `revokeApiKey`: 401.
  5. After `rotateApiKey` with `graceHours: 1`: the old secret works
     for one hour and gives 401 at one hour and one second; the new
     one works.
  6. An expired key (`expiresAt` passed): 401.
- `apikey_scope_missing`: a key with `leave:read` calling
  `listEmployees` gets 403 `SCOPE_MISSING` with `detail.scope
  "employees:read"`.
- `apikey_rate_limit`: `rateLimitPerMinute: 10`: the eleventh call in
  one minute gives 429 with `Retry-After`; the next minute is allowed;
  a call that fails with 404 still counts.
- `apikey_writes_audited_as_service_user`: a key creating an employee
  writes `employee.created` with `actorUserId` = the service user.
- `apikey_sso_enforcement_not_applied`: with `enforceSso` on, a key
  call still works.

- [ ] **Step 2: Run** `pnpm --filter @payroll/contract test
  api-scopes` and `pnpm --filter @payroll/api test apikey`. Expected:
  FAIL.
- [ ] **Step 3: Implement** the files above; conformance rows;
  `mayView` owner and hr for key listing; extend the leak test with a
  key caller (`employees:read` only) that must see no sentinel amount
  or IBAN anywhere.
- [ ] **Step 4: Run** `pnpm check`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(api): scoped API keys with rate
  limits`.

### Task 10: Developer surface (OpenAPI served, guide), handover

**Files:**
- Create: `packages/contract/src/developer-guide.ts`
- Modify: `packages/contract/src/openapi.ts` (API key security,
  `x-api-key-scope`, top-level `webhooks`), `src/routes-channels.ts`,
  `src/registry.ts`, `src/index.ts`, `tests/openapi.test.ts`
- Create: `packages/api/src/routes/channels-developer.ts`
- Modify: `HANDOVER.md`, `LEDGER.md`
- Test: `packages/contract/tests/developer-guide.test.ts`,
  `packages/api/tests/developer.test.ts`

**Interfaces:**
- Consumes: Task 9 `API_KEY_SCOPES`, `ApiScope`; Task 8
  `WEBHOOK_EVENT_TYPES`, `WebhookEvent`, `WEBHOOK_SIGNATURE_NOTE`;
  Plan 3 `buildOpenApi`, `ROUTES`; Task 1 `publicApiBaseUrl`.
- Produces (contract):
  - `buildOpenApi()` additions: `components.securitySchemes.apiKey = {
    type: "http", scheme: "bearer", description: "API key (hrk_...).
    Send X-Company-Id with the key's company." }`; every operation
    whose id is in `API_KEY_SCOPES` gets `security: [{ bearer: [] }, {
    apiKey: [] }]` and `"x-api-key-scope": <scope>`; top-level
    `webhooks` with one entry per `WEBHOOK_EVENT_TYPES` value (a
    `post` whose request body is the `WebhookEvent` schema, the three
    `X-Webhook-*` header parameters, a 2xx response, and
    `WEBHOOK_SIGNATURE_NOTE` as the description). `OpenApiDocument`
    gains `webhooks: Record<string, unknown>`.
  - `DeveloperGuide { baseUrl: string; sections: { id: "auth" |
    "scopes" | "rate-limits" | "errors" | "webhooks" | "examples";
    title: string; paragraphs: string[]; examples: { label: string;
    language: "shell" | "javascript"; code: string }[] }[]; scopes: {
    scope: ApiScope; routes: { id: string; method: string; path:
    string }[] }[]; webhookEvents: string[] }`.
  - `buildDeveloperGuide(baseUrl: string): DeveloperGuide` (pure,
    zod-free logic, no `import` of `node:`): scopes grouped from
    `API_KEY_SCOPES` and `ROUTES`; examples use only placeholders
    `EXAMPLE_KEY = "hrk_0123456789abcdef_" + "EXAMPLE".repeat(6) +
    "X"` and `EXAMPLE_COMPANY = "00000000-0000-4000-8000-000000000000"`:
    (1) shell: `curl -H "Authorization: Bearer <EXAMPLE_KEY>" -H
    "X-Company-Id: <EXAMPLE_COMPANY>" <baseUrl>/v1/employees`; (2)
    shell: a `POST <baseUrl>/v1/leave-requests` with a JSON body; (3)
    javascript: webhook verification with `const { createHmac,
    timingSafeEqual } = require("node:crypto");` (written with
    `require`, so the contract purity scan, which matches `import`
    and `from`, stays green), checking the 300-second tolerance and
    every `v1=` value. Paragraph copy states the rate-limit headers,
    the 429 and `Retry-After`, that keys cannot call MFA routes, and
    that limits are product defaults.
  - Routes appended (public): `getOpenApi GET /v1/openapi.json` to the
    document (`z.record(z.string(), z.unknown())`); `getDeveloperGuide
    GET /v1/developer/guide` to `DeveloperGuide`.
- Produces (api): both handlers build once and cache in memory;
  `Cache-Control: public, max-age=300`; the guide uses
  `deps.channels.publicApiBaseUrl`.
- Developer page spec for Plan 4 (no web code in this plan; Plan 4 or
  a later web plan builds it under the owner's approved UI concept):
  one page "Developers", owner and hr only, with four areas: API keys
  (list with name, prefix, scopes, limit, last used, status; create
  dialog with name, scope checkboxes grouped as in `guide.scopes`,
  limit field labelled "product default 120 per minute", expiry; the
  secret shown once with a copy button and "You will not see this
  again"; rotate with a grace-hours field; revoke with a confirmation);
  webhooks (endpoints with status and paused reason; create with URL
  and event checkboxes, secret shown once; delivery log with attempt
  rows, status code, error and next attempt; redeliver and test
  buttons); documentation (sections of `getDeveloperGuide` with
  copyable examples in shell and JavaScript, and a link to
  `/v1/openapi.json`); sign-in settings (SSO settings form). Empty,
  loading and error states for each list; MFA prompts before every
  owner-only change; English and Arabic labels (Arabic NEEDS NATIVE
  REVIEW).

- [ ] **Step 1: Write the failing tests**

`developer-guide.test.ts`:
- `guide_examples_name_real_routes`: every example's method and path
  (parsed from the code text) is a `ROUTES` entry whose id is in
  `API_KEY_SCOPES`; every scope in `guide.scopes` lists exactly the
  routes mapped to it.
- `guide_no_real_secrets`: every `hrk_` string in the guide equals
  `EXAMPLE_KEY`; no `whsec_` string except the literal placeholder
  `whsec_EXAMPLE`; the text contains no `import ` statement.
- `guide_webhook_events`: `webhookEvents` deep-equals
  `WEBHOOK_EVENT_TYPES`.

`openapi.test.ts` (add): `listEmployees` has `x-api-key-scope
"employees:read"` and both security entries; `getEmployeeBank` has
no `x-api-key-scope`; `webhooks` has one key per event type; the
document still has no `$ref` to a missing component;
`JSON.stringify` succeeds.

`developer.test.ts`: `GET /v1/openapi.json` without auth returns 200
with `openapi "3.1.0"` and the cache header; `GET
/v1/developer/guide` returns `baseUrl` equal to the test
`publicApiBaseUrl`; both ids are in `PUBLIC_CHANNEL_IDS`; the
conformance test covers both.

- [ ] **Step 2: Run** `pnpm --filter @payroll/contract test developer
  openapi` and `pnpm --filter @payroll/api test developer`. Expected:
  FAIL.
- [ ] **Step 3: Implement** the files above.
- [ ] **Step 4: Run** `pnpm check`. Expected: PASS, with
  `CHANNEL_ROUTE_IDS` holding all 48 channel route ids in task order
  (8 public: `whatsAppHookVerify`, `whatsAppHook`, `inboundEmailHook`,
  `getCalendarFeed`, `ssoStart`, `ssoCallback`, `getOpenApi`,
  `getDeveloperGuide`).
- [ ] **Step 5: Update `HANDOVER.md`** (state: the ten feature names;
  `pnpm` commands including `main.ts jobs`; package layout rows for
  `channels`, `whatsapp`, `inbound`, `calendar`, `sso`, `webhooks`,
  `apikeys`; the environment variable groups and that every provider
  is `not-configured` without them; limits: no scheduler set up, no
  Meta business verification started, WhatsApp UAE prices and
  verification lead time unknown, Postmark inbound needs a paid plan,
  inbound mail location not verified, no malware scan, Arabic copy
  unreviewed and not sent, SAML not built, no TDRA position) and
  **append to `LEDGER.md`** section 3 every ruling below with today's
  date.
- [ ] **Step 6: Commit** `feat(api): developer surface and handover`.

---

## Rulings

Claude's calls under the owner's "decide, don't ask" instruction. Each
says what it costs if wrong. The executor appends them to `LEDGER.md`.

1. **Channels are capability 8 (UQ21, UQ22, UQ7's feed) plus parity
   F21 and F22.** The brief named "UQ8"; in the master list UQ8 is the
   cost and budget view, which this plan does not touch. Cost if
   wrong: none in code; the progress count uses the ten names at the
   top.
2. **Every outside service is a port with a fake and a
   not-configured default; tests never touch the network.** A source
   scan keeps network modules in two files. Cost: the real adapters'
   wire formats are untested until someone runs them against a
   provider sandbox; each is one file.
3. **Transactional outbox, sent by `main.ts jobs` under an external
   scheduler (none set up).** Events become notifications, deliveries
   and webhook deliveries in the business transaction. Cost: nothing
   leaves the system until a scheduler runs the job (minutes of
   delay at best).
4. **Claim, send, record in separate steps with a lease (120 s for
   notifications, 60 s for webhooks): at least once.** No network call
   holds a database transaction. Cost: a crash after sending and
   before recording sends the message twice; webhook consumers dedupe
   by `X-Webhook-Id`, people may see a duplicate notice.
5. **In-app notices are the source of truth; email is on by default;
   WhatsApp is off until the person opts in and verifies the number.**
   Cost: fewer WhatsApp users at first.
6. **No new dependency.** ID token checks use `node:crypto`
   (`createPublicKey` from JWK, RS256 only) and HTTP uses
   `node:https` with a pinned address. The research did not vet any
   OIDC or SAML library, and versions were not checked with `npm
   view` in this session. Cost: hand-written security code, so Task 7
   has a per-task review; moving to a vetted library later means
   replacing `id-token.ts` and `oidc-http.ts` only.
7. **WhatsApp through Meta's Cloud API directly, one sender number
   for the service, no BSP.** The research recommends skipping a BSP
   at first. Cost: every company's messages come from one business
   name; per-company numbers need embedded signup later.
8. **WhatsApp decides only approval-spine steps of `expense-claim`.**
   Pay-run approval, pay corrections, bank reveal and SIF download
   stay in the app with MFA. Cost: fewer one-tap approvals; adding a
   subject type is one list entry plus a review.
9. **Action tokens: HMAC-signed (key derived from the master key by
   HKDF), one row per message, one use, 48-hour expiry (product
   default), bound to the recipient's verified phone, and checked with
   the spine's own `mayDecide` before `decide` runs.** Cost: a token
   leaked together with the approver's phone is still bounded by the
   spine's rules; approvers must act within 48 hours or use the app.
10. **Reject from WhatsApp needs a typed reason within 10 minutes**
    (product default), because the spine refuses a reject without a
    note. Cost: two messages to reject; an unanswered reject changes
    nothing and the approver uses the app.
11. **Messages carry names, dates, a period and fixed terms only; no
    amounts, rules, ids or links with tokens.** UQ21's "engine's
    effect and cited rule" is not claimed. Cost: approvers open the
    app to see amounts.
12. **Unreviewed Arabic is never sent; English goes out and the
    delivery records `languageFallback`.** HANDOVER forbids showing
    unreviewed Arabic to employees. Cost: Arabic-preferring users read
    English until a native speaker signs the copy off.
13. **Opt-in is the person's own act in the app, versioned consent
    text naming the company and Meta, a WhatsApp code to prove the
    number, withdrawal in one tap or by STOP (which withdraws in every
    company).** Follows PDPL Art 6 (clear, provable, easy to withdraw)
    and Meta's opt-in rule (EXCERPT). Cost: a person who meant to stop
    for one company opts in again elsewhere.
14. **Email fallback when WhatsApp is not delivered and no email
    delivery exists for that notice,** even if the person turned email
    off for that kind. Cost: an email the person did not ask for; the
    alternative was a silently lost approval request.
15. **Limits are product defaults, not provider limits:** WhatsApp 20
    per person per hour and 200 per company per day, 5 opt-in starts
    per person per day, 10 bad action taps per phone per hour, 200
    inbound emails per company per day, 120 API calls per key per
    minute, 10 webhook endpoints per company, 5 calendar feeds per
    person. Meta's published tiers (EXCERPT) are not copied into code.
    Cost: a busy company reaches a cap and the owner raises it.
16. **Quiet hours use UAE time, hold rather than drop, and never hold
    security notices or verification codes.** Default 22:00 to 07:00.
    Cost: an approval request sent at night waits until morning.
17. **Email-in uses Postmark inbound behind a port, with Basic
    credentials, and answers 200, 401, 403, 500 or 503 according to
    the READ retry rule (403 stops retries).** Postmark inbound needs
    a paid plan (QUERY, not full text). Cost: one paid provider; SES
    in Bahrain is a
    second adapter later if residency in the region matters.
18. **The inbound address is `in+<company id>.<80-bit secret>@
    <domain>`; rotation kills the old address at once.** Cost: a
    leaked address accepts mail only from allowed senders; staff must
    learn the new address after a rotation.
19. **Email-in creates only receipts and empty draft claims, and only
    after a person accepts.** No resignation or visa intake, no OCR,
    no malware scan, no auto-reply, no owner digest. Cost: HR types
    claim items; files are type-sniffed and never rendered inline, but
    not scanned.
20. **Sender checks: SPF, DKIM and DMARC fail rejects (the allow-list
    cannot override a fail); unknown or missing results are flagged
    for review; the allow-list matches exact addresses or exact
    domains.** Cost: an honest sender with broken mail settings is
    rejected and must fix them or use the app.
21. **Calendar: read-only secret-URL ICS feeds; team feeds say "Away"
    without the leave type; Google and Microsoft push are interfaces
    reporting not configured; no OAuth scope is requested.** The
    research rates the ICS feed cheapest and approval-free. Cost: no
    events written into calendars; a leaked URL shows its events until
    revoked.
22. **SSO identity is keyed by Google `sub` or Microsoft `tid:oid`,
    never by email; a Microsoft email claim is treated as unverified;
    the Microsoft app uses the `organizations` endpoint.** Cost:
    someone who changes Google account must link again.
23. **No automatic linking or provisioning except one case: an
    `employee` account for an existing employee record, in exactly one
    company that turned it on, from an allowed domain and an allowed
    Google Workspace domain or Entra tenant.** Invitations accepted by
    SSO keep the role the owner chose. No owner, hr or manager is ever
    created by sign-in. Cost: more steps for admins; linking needs a
    password login first.
24. **SAML, generic OIDC and Okta come later, on customer demand.**
    The research advises OIDC first and SAML through a maintained
    library. Cost: F22 is partly delivered (no Okta).
25. **SSO enforcement never applies to owners (break-glass), and SSO
    never counts as MFA.** Cost: owner passwords remain an attack
    surface, limited by MFA on payroll actions.
26. **Webhooks: thin events (ids only); HMAC-SHA256 over
    `id.timestamp.body`; consumers told to reject after 300 seconds and
    dedupe by id; 8 attempts over about 45 hours; pause after 5 failed
    deliveries or a 410; no redirects; every resolved address must be
    public and the request is pinned to it.** Cost: consumers call the
    API for details; an attacker's DNS that answers public then private
    between two attempts still meets the pin check each time.
27. **No statement about TDRA rules.** The research found TDRA text
    on marketing SMS only and nothing on WhatsApp; this plan neither
    claims nor denies a rule and asks counsel. Cost: none in code.
28. **API keys: one service user per key with role `hr`, a
    default-deny scope map, no salary or bank routes, no pay-run
    actions (create, approve, void), no SIF, approval or MFA routes;
    `payroll:read` exposes payslips and pay runs (read only) by
    design, and salary and identity fields appear only with
    `payroll:read`; SHA-256 of a 256-bit secret, rotation grace up to
    72 hours, fixed one-minute windows.** (Reworded after the security
    review: the old text said "no pay-run routes".) Cost: fixed windows allow a burst of
    up to twice the limit across a window edge; writes are audited
    under the key's service user, not a person.
29. **Service users never approve, never get notices and are not
    listed as users.** Cost: one filter in three queries.
30. **OpenAPI is served live from the contract and the developer
    guide is data; the web page is a spec for Plan 4.** Cost: no
    screens until a web plan builds them.
31. **PDPL: email-in is off by default and needs an owner's
    acknowledgement that mail passes a provider whose storage location
    was not verified; the cross-border basis (Art 22, 23) is for
    counsel.** Cost: owners must switch it on knowingly.
32. **WhatsApp prices for the UAE and Meta's verification lead time
    stay unknown (NOT FOUND in the research); nothing in code or copy
    estimates them.** Cost: the owner budgets without numbers until a
    person reads Meta's AED rate file or asks a BSP.
33. **Migrations 1301 to 1309; `CHANNEL_ROUTES` joined last (as the
    last `ROUTE_GROUPS` group when that list exists).** Plan 3's
    whole-list route counts become membership checks. Cost: a merge
    conflict in `routes.ts` with plans drafted in parallel, resolved
    by keeping every list.
34. **Functions consumed but not named by Plans 3, 6, 9 and 11**
    (`listLeaveInRange`, `storeReceiptBytes`, `createClaim`,
    `listHolidays`, `deadlinesBetween`, `escapeIcsText`,
    `foldIcsLine`, `consumeInvite`) are exported from the named files
    with the signatures in the Prerequisites section. Cost: small
    refactors of those plans' code.
35. **Review:** fresh per-task reviews after Tasks 4, 5, 7, 8 and 9
    (security), one whole-branch review at the end (speed ruling); no
    pause for plan review (ledger, 2026-11-25). Cost: a slipped bug in
    Tasks 1, 2, 3, 6 or 10 is caught at the end.
36. **Ruled out, each with its cost:** SMS; push notifications to a
    phone app; an owner digest; WhatsApp self-service (leave balance,
    payslip questions); two-way calendar sync; SCIM provisioning;
    per-company WhatsApp numbers; inbound malware scanning; OCR on
    inbound attachments; retention periods for notifications, inbound
    mail and delivery logs (PDPL retention not decided); webhook
    payloads with full records. Cost: each is a visible gap in the
    handover.
