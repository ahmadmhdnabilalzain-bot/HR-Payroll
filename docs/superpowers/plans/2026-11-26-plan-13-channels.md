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

| Task | Needs merged first |
|---|---|
| 1 | Plan 3 Tasks 1 to 8 |
| 2 | Task 1 |
| 3 | Task 2 |
| 4 | Task 3; Plan 6 Tasks 2 and 5 |
| 5 | Task 3; Plan 6 Tasks 3 and 5 |
| 6 | Task 1; Plan 9 Task 3 (holidays); Plan 11 Task 5 (deadlines) |
| 7 | Task 2 |
| 8 | Task 3 |
| 9 | Task 1 |
| 10 | Tasks 1 to 9 |

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
  Cloud API send and webhook shapes, Postmark send endpoint, Google and
  Entra issuer formats and discovery URLs. Tests assert the port with
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
   `webhook_no_leak_no_ssrf`, Task 3 `outbox_has_no_sentinels`).
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
packages/api/src/inbound/                 auth-results (pure), mailbox,
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
    - `InboundEmail { messageId: string; from: string; mailboxHash:
      string; subject: string; text: string; headers: { name: string;
      value: string }[]; attachments: { name: string; contentType:
      string; bytes: Uint8Array }[] }`; `interface InboundEmailAdapter
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
  allowed list when present); `"owner-only routes are the four"` and
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
