# Plan 15: Social Media and Website Insights Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps
> use checkbox (`- [ ]`) syntax for tracking.

**Features delivered (10; count progress by these names):**

1. I1 Insights connector framework: one adapter interface per platform,
   OAuth connect with PKCE, tokens encrypted with the company data key,
   refresh, revoke, sync schedule, rate-limit and error handling, a fake
   provider for tests, data retention setting (Tasks 1 to 4, 9).
2. I2 Instagram insights adapter (professional accounts only) (Task 5).
3. I3 X insights adapter (API v2 metrics; paid-tier cost unknown)
   (Task 5).
4. I4 TikTok insights adapter (daily snapshots; no backfill assumed)
   (Task 6).
5. I5 Snapchat adapter, built and gated: it does not connect until the
   Public Profile API access is confirmed (research: NOT FOUND) (Task 6).
6. I6 Website insights: Google Analytics 4 Data API and Search Console
   adapters, plus a first-party, cookieless, aggregate-only pixel with
   UTM capture (Task 7).
7. I7 Normalised metrics model: per-platform metric definitions, daily
   time series storage, never summed across platforms whose
   definitions differ; dashboard data endpoints for the web app
   (Tasks 2, 8).
8. I8 Employer-brand and hiring link: careers page traffic to
   candidates, applications and hires by campaign, and employee
   advocacy links (Task 8).
9. I9 Anomaly alerts as simple parameterised rules, and scheduled
   weekly or monthly insight reports (Task 9).
10. I10 Post publishing and scheduling only where the platform API
    allows (flagged per platform), with approval, plus the app-review
    checklist per platform (Task 10).

**Goal:** Let an SME connect its Instagram, X, TikTok and (once
confirmed) Snapchat accounts and its website, see honest per-platform
insights next to its hiring numbers, get alerts and reports, and
publish where a platform's API allows, without claiming any platform
approval, price or review time that the research did not confirm.

**Architecture:** Plan 15 extends Plan 3's `packages/contract` and
`packages/api`; it adds no package. Every platform is one
`PlatformAdapter` (Task 1) in `AppDeps.insights`, with a scripted fake
for tests and a real adapter that is `not-configured` until its
environment group is set, so `pnpm check` never touches the network.
Adapters speak HTTP only through Plan 13's `HttpClient` port. Connect
is OAuth 2 with PKCE; tokens are sealed with the company DEK. A job
(`main.ts jobs`) claims due connections with a lease, pulls daily
values, normalises them against a per-platform metric catalog and
upserts them into one time series table. Dashboards, alerts, reports
and the careers funnel read that table through pure functions (roll-up,
comparability, alert evaluation, funnel). The pixel is a public beacon
that stores counts only.

**Tech Stack:** As Plan 3: Node 22, TypeScript 7.0.2, zod 4.6.7, Hono
4.13.17, @electric-sql/pglite 0.5.16 (tests), pg 8.23.1, Vitest 5.1.2,
fast-check 4.11.0, tsx 4.23.15. Node built-ins only (`node:crypto`
`createHash`, `randomBytes` through `AppDeps`). No new dependency and
no platform SDK (Ruling 5).

**Spec:** `docs/superpowers/specs/2026-11-25-master-feature-list.md`
(section 12: UQ32 social integrations, UQ33 website insights),
`LEDGER.md` section 1 (2026-11-25: "If LinkedIn is risky ignore it. But
the rest it should be full integration."; "Also the website integration
for the data insights.") and section 3 (2026-11-25: "full integration"
read as connect, pull insights, publish or schedule where the API
allows; direct integrations, not an aggregator),
`docs/research/2026-11-25-social-insights-feasibility.md` and
`docs/research/2026-11-25-website-insights-feasibility.md` (snippet
level; UNVERIFIED and "not found" labels used as stated there),
`docs/research/2026-11-26-channels-feasibility.md` (Google sensitive
scope review "can take up to 10 days", QUERY label),
`docs/research/2026-11-26-pdpl-primary.md`,
`docs/engineering-standards.md`. Extends
`docs/superpowers/plans/2026-11-26-plan-3-backend.md` (contract, API,
tenancy, audit, roles, keyring). Uses
`2026-11-26-plan-13-channels.md` (ports, `HttpClient`, `consumeRate`,
`notify`, `pkcePair`, config groups), `2026-11-26-plan-11-owner-view-
evidence.md` (`main.ts jobs`, `JobCtx`, the `payroll_jobs` role),
`2026-11-26-plan-10-performance-learning.md` (`ROUTE_GROUPS`, 4-digit
migrations) and `2026-11-26-plan-8-hiring-exit.md` (candidates,
applications, `assertDecidable`).

**Not claimed (so progress is not over-counted):** any platform's app
review passed or started; any price for X, TikTok, Snapchat or Google;
any review lead time; LinkedIn (excluded, Ruling 2); Snapchat insights
that work today (gated, Ruling 9); demographics and audience breakdowns
(Ruling 12); comments, messages and social listening; paid ads data;
Plausible, Fathom, Matomo or PostHog connectors (Ruling 18); web
screens (a web plan builds them from the endpoint spec in Task 8).

**Prerequisites (per task).** Where this plan consumes a function of
another plan that its Interfaces blocks do not name exactly, the
executor exports it from the named file under the name given here,
renaming only at the export (the pattern of Plan 10).

| Task | Needs merged first |
|---|---|
| 1 | Plan 3 Tasks 1 to 8; Plan 13 Tasks 1 and 3 (ports, HTTP client) |
| 2 | Task 1 |
| 3 | Task 2; Plan 13 Task 7 (`pkcePair`) |
| 4 | Task 3; Plan 11 Task 5 (`main.ts jobs`, `payroll_jobs`) |
| 5 | Task 4 |
| 6 | Task 4 |
| 7 | Task 4 |
| 8 | Task 7; Plan 8 Task 3 (candidates, applications) |
| 9 | Task 8; Plan 13 Task 2 (`notify`) |
| 10 | Task 4; Plan 8 Task 3 (`assertDecidable`) |

Signatures consumed from other plans (exact; exported as named):

- Plan 3: `RouteDef`, `ten`, `pub`, `PAYROLL`, `OWNER`, `ALL_ROLES`,
  `listOf`, `SCHEMAS`, `register`, `ReqCtx`, `ApiError`, `appendAudit`,
  `AuditInput`, `AuditEvent`, `Keyring`, `withTenant`, `Db`,
  `dubaiDate(d: Date): string`, `makeApp`, `seedCompany`, `call`.
- Plan 13 `src/channels/ports.ts`: `HttpClient`, `HttpRequest`,
  `HttpResponse`, `HttpFailure`; `src/channels/rate.ts`:
  `consumeRate(tx, companyId, scope, key, limit, windowSec, now)`;
  `src/channels/notify.ts`: `notify(c: ReqCtx | JobCtx, r: { userId;
  kind; vars; link }): Promise<void>`; `src/sso/pkce.ts`:
  `pkcePair(random32: Uint8Array): { verifier; challenge }`;
  `src/config.ts`: `loadConfig` with all-or-nothing groups;
  `tests/helpers/fake-channels.ts`: `FakeHttp` (records requests,
  answers from a script).
- Plan 11 `src/reports/jobs.ts`: `JobCtx { tx: Db; deps: AppDeps;
  companyId: string; userId: string }`; `main.ts jobs` runs each
  registered job once and exits; role `payroll_jobs` (NOLOGIN,
  BYPASSRLS) owns `SECURITY DEFINER` claim functions.
- Plan 8 `src/hiring/*`: tables `candidates(id, company_id, source,
  source_detail, created_at)`, `applications(id, company_id,
  requisition_id, candidate_id, created_at)`,
  `application_stage_events(application_id, stage, at)`;
  `assertDecidable(ctx, item: { status; requestedBy }, opts: { pending;
  roles }): void` (403 `SOD_VIOLATION` when the caller requested it).
- Plan 10 Task 1: `ROUTE_GROUPS` and `migrate` accepting
  `^(\d{3,4})_[a-z0-9_]+\.sql$` in numeric order. If neither Plan 10 nor
  Plan 11 is merged, Task 1 adds both (with Plan 10's
  `migrate_numeric_order` test).

## Global Constraints

- Plan 3's Global Constraints apply unchanged: 80-character lines,
  files under about 300 lines, functions under 30, RLS forced on every
  tenant table, all queries through `withTenant`, injected time, ids and
  randomness (`AppDeps`), `/v1`, `X-Company-Id`, tests offline (no
  network, Docker or hosted database).
- No network in tests. Adapters call `deps.channels.http` only; Plan
  13's network scan (`fetch(` nowhere, `node:https` only in
  `src/channels/http-node.ts`) covers `src/insights/` unchanged.
- Every real adapter reports `configured: false` until its whole
  environment group is set; a partial group throws at start-up naming
  the missing variables.
- LinkedIn is not a `PlatformId`. It appears only in
  `EXCLUDED_PLATFORMS` with its reason (Ruling 2).
- Provider facts not READ in the research are labelled in code with
  `// UNVERIFIED: <what>` and kept in one adapter file per platform:
  endpoints, scopes, field names, token lifetimes, text limits. Adapter
  tests run against fixture files that carry `"_note": "ASSUMED SHAPE
  (UNVERIFIED)"`; no test asserts a provider wire format as fact.
- No price, quota figure from a third party, or review lead time
  appears in code, constants, defaults or copy. Unknowns are the
  literal `"unknown"`. Every limit in this plan is labelled "product
  default, not a provider limit".
- Nothing in code, copy or API says a platform "approved", "verified",
  "certified" or "partnered" with the product; `APP_REVIEW_STATUS` is
  `"not-started"` for every platform (Task 10 test).
- Metrics are never summed, averaged or compared across platforms
  unless they share a `comparableGroup` (Task 2); no dashboard endpoint
  returns a cross-platform total.
- Tokens: access and refresh tokens exist in plain text only in memory
  inside `src/insights/vault.ts` and an adapter call. They never appear
  in responses, logs, audit rows, sync-run rows or error bodies.
- The pixel stores no IP address, user agent, cookie, visitor id,
  query string or full referrer: only daily counts by path, event,
  referrer host and UTM values (Task 7).
- Audit actions match `^[a-z]+(\.[a-z-]+)+$`; every Plan 15 service
  audits through `insightsAudit` (Task 1), which refuses
  `INSIGHT_SENSITIVE_KEYS` at any depth.
- No DELETE route or grant for `payroll_app`; removal is a status
  (`revoked`, `paused`, `cancelled`, `archived`). Retention deletes
  only through one `SECURITY DEFINER` function (Task 9, Ruling 16).
- Migrations are numbered `1501_` to `1508_` (Plan 15's range is
  `1501_` to `1509_`; `1509_` stays free).
- Routes live in `INSIGHTS_ROUTES` (`routes-insights.ts`), appended as
  the last group of `ROUTE_GROUPS`. Viewing insights is owner and hr
  only (Ruling 7), except `getAdvocacyLink` (all roles).
- "Today" is `dubaiDate(deps.now())`; days from a platform are stored
  as the platform reports them (Ruling 11).
- Each task ends with `pnpm check` green and one commit, adds one
  happy-path row per new route to `tests/conformance.test.ts` and its
  ids to the `tests/leak.test.ts` id map. Review: fresh per-task review
  after Tasks 3 (tokens), 7 (public pixel) and 10 (publishing); one
  whole-branch review at the end (speed ruling, 2026-11-26).

## Review Focus

1. An OAuth callback replayed, sent by another user or company, sent
   after expiry, or carrying a state issued for another platform: no
   connection and no token stored (Task 3
   `oauth_state_single_use_and_bound`).
2. Token leaks: a plaintext access or refresh token appears in no
   response, log line, audit row, sync-run row, error body or
   unencrypted column, and revoke wipes the sealed copies (Task 3
   `tokens_never_leave`).
3. A dashboard asked for Instagram views plus TikTok views, or a weekly
   roll-up of reach: refused or shown per platform, never a made-up
   total (Task 2 `no_sum_across_definitions`, Task 8
   `overview_has_no_cross_platform_total`).
4. A platform answering 429, 5xx storms or `invalid_grant` mid-sync:
   the connection backs off without a hot loop, keeps the points
   already stored, re-running writes identical rows, and a dead grant
   becomes `needs-reauth` (Task 4 `sync_backoff_idempotent_reauth`).
5. The public pixel hit from a non-allowed origin, flooded, by a bot, or
   with an email address in the page's query string: nothing stored for
   the bad origin or bot, no query string ever stored, the flood rate
   limited, counts only (Task 7 `pixel_stores_no_identifiers`).

## File Structure

```
packages/contract/src/routes-insights.ts     INSIGHTS_ROUTES (Tasks 1-10)
packages/contract/src/routes.ts              + group (Task 1)
packages/contract/src/insights-platforms.ts  PlatformId, catalog, LinkedIn
packages/contract/src/insights-metrics.ts    METRIC_CATALOG (Task 2)
packages/contract/src/insights-settings.ts   settings, defaults
packages/contract/src/insights-connect.ts    connections, sync runs
packages/contract/src/insights-sites.ts      sites, pixel beacon
packages/contract/src/insights-dash.ts       overview, series, funnel
packages/contract/src/insights-alerts.ts     rules, alerts, reports
packages/contract/src/insights-posts.ts      posts, publish rules
packages/contract/src/insights-review.ts     app-review checklists
packages/api/migrations/1501_insights_platform.sql ... 1508_*.sql
packages/api/src/insights/                   ports, audit, settings,
                                             vault, oauth, connections,
                                             sync, schedule (pure),
                                             normalise (pure), rollup
                                             (pure), pixel, funnel (pure),
                                             alerts, reports, posts
packages/api/src/insights/adapters/          instagram, x, tiktok,
                                             snapchat, ga4,
                                             search-console, wire
packages/api/tests/fixtures/insights/        ASSUMED SHAPE fixtures
packages/api/src/routes/insights-*.ts        route files per task
HANDOVER.md, LEDGER.md                       updated in Task 10
```

---

### Task 1: Insights platform: routes, catalog, ports, settings, audit

**Files:**
- Create: `packages/contract/src/routes-insights.ts`,
  `src/insights-platforms.ts`, `src/insights-settings.ts`
- Modify: `packages/contract/src/routes.ts` (append `INSIGHTS_ROUTES`
  as the last `ROUTE_GROUPS` entry), `src/errors.ts`, `src/registry.ts`,
  `src/examples.ts`, `src/index.ts`
- Create: `packages/api/migrations/1501_insights_platform.sql`,
  `packages/api/src/insights/ports.ts`, `src/insights/errors.ts`,
  `src/insights/not-configured.ts`, `src/insights/audit.ts`,
  `src/insights/settings.ts`, `src/insights/usage.ts`,
  `src/insights/adapters/wire.ts`, `src/routes/insights-settings.ts`,
  `packages/api/tests/helpers/fake-insights.ts`
- Modify: `packages/api/src/deps.ts` (`AppDeps.insights:
  InsightPorts`), `src/config.ts` (five groups), `src/app.ts`
  (register), `tests/helpers/test-app.ts` (`makeApp({ insights })`,
  default `fakeInsights()`), `tests/main.test.ts`
- Test: `packages/contract/tests/routes-insights.test.ts`,
  `tests/insights-catalog.test.ts`,
  `packages/api/tests/insights-platform.test.ts`

**Interfaces:**
- Consumes: Plan 3 route helpers, `register`, `ReqCtx`, `ApiError`,
  `appendAudit`; Plan 13 `HttpClient`, `loadConfig`, `consumeRate`.
- Produces (contract):
  - `PlatformId = z.enum(["instagram","x","tiktok","snapchat","ga4",
    "search-console","pixel"])`; `SOCIAL_PLATFORMS = ["instagram","x",
    "tiktok","snapchat"]`; `OAUTH_PLATFORMS` = every id except
    `"pixel"`.
  - `Evidence = z.enum(["unverified","not-found","official-query"])`
    (`official-query`: an official page answered through a Firecrawl
    query, as labelled in the channels research).
  - `Capability { available: true | false | "unknown"; evidence:
    Evidence; note: string }`.
  - `PlatformInfo { id; name; kind: "social" | "website"; auth: "oauth"
    | "site-key"; capabilities: { insights; publish; historyBackfill;
    demographics }: Capability each; historyDays: int 1..90 (product
    default); cost: { status: "free-as-found" | "unknown"; note };
    review: { process: string; leadTime: "unknown"; note; evidence };
    scopes: { read: string[]; publish: string[] } }`.
  - `PLATFORM_CATALOG: Record<PlatformId, PlatformInfo>` with exactly:
    - `instagram`: insights `true`/`unverified` ("Professional
      accounts only; some data delayed up to 48 hours; impressions
      replaced by views in 2025"); publish `true`/`unverified` ("From
      general knowledge, not in the research note"); historyBackfill
      `true`/`unverified`; demographics `false`/`unverified` ("needs
      100+ followers; not built"); historyDays 30; cost
      `free-as-found`; review process "Meta App Review with Advanced
      Access after Business Verification", note "reports range from
      days to weeks (UNVERIFIED)"; scopes read
      `["instagram_business_basic","instagram_business_manage_insights"]`,
      publish `["instagram_business_content_publish"]` (all
      `// UNVERIFIED`).
    - `x`: insights `true`/`unverified` ("Private metrics only for the
      owner's posts and only the last 30 days"); publish
      `true`/`unverified`; historyBackfill `true`/`unverified`;
      demographics `false`/`not-found`; historyDays 29; cost `unknown`
      ("Pay-per-use by 2026 per a third-party report; old Basic and Pro
      tiers closed to new sign-ups; price not confirmed"); review
      process "Self-serve developer account; the owner authorises by
      OAuth"; scopes read `["tweet.read","users.read",
      "offline.access"]`, publish `["tweet.write"]`.
    - `tiktok`: insights `true`/`unverified` ("Display API or Business
      API; approval needed"); publish `"unknown"`/`unverified` ("Content
      posting needs an audit and domain checks (general knowledge); off
      until confirmed"); historyBackfill `false`/`unverified` ("assume
      daily snapshots from connection"); demographics
      `"unknown"`/`unverified`; historyDays 1; cost `free-as-found`;
      review process "TikTok developer app approval", note "timeline
      UNVERIFIED"; scopes read `["user.info.basic","user.info.stats",
      "video.list"]`, publish `[]`.
    - `snapchat`: insights `"unknown"`/`not-found` ("Public Profile API
      under the Marketing API; access process not found"); publish
      `false`/`not-found`; historyBackfill `"unknown"`/`not-found`;
      demographics `"unknown"`/`not-found`; historyDays 1; cost
      `free-as-found`; review process "not found", note "Access process
      NOT FOUND in research"; scopes read `[]`, publish `[]`.
    - `ga4`: insights `true`/`unverified`; publish `false`/`unverified`
      (read-only API); historyBackfill `true`/`unverified`; demographics
      `false`/`unverified` ("not built"); historyDays 90; cost
      `unknown` ("generally free (UNVERIFIED); quotas per property per
      day apply"); review process "Google OAuth verification; whether
      analytics.readonly is sensitive or restricted is not confirmed",
      note "Google's page: sensitive scope review can take up to 10
      days (QUERY); a snippet said 3 to 5 business days";
      evidence `official-query`; scopes read
      `["https://www.googleapis.com/auth/analytics.readonly"]`.
    - `search-console`: as `ga4` with publish `false`, historyDays 90,
      scopes read `["https://www.googleapis.com/auth/
      webmasters.readonly"]`, insights note "search clicks,
      impressions and position by page only".
    - `pixel`: auth `site-key`; insights `true`/`unverified` ("our own
      beacon; no third party"); publish `false`; historyBackfill
      `false`; demographics `false`; historyDays 1; cost
      `free-as-found`; review process "none (first party)"; scopes `[]`.
  - `EXCLUDED_PLATFORMS = [{ id: "linkedin", reason: "Excluded by the
    owner (2026-11-25: 'If LinkedIn is risky ignore it'). Research:
    analytics-only upgrade requests are reportedly rejected and storage
    terms are strict (UNVERIFIED)." }] as const`.
  - `InsightSettingsBody { retentionMonths: int 3..60;
    publishingEnabled: boolean; publishApprovalRequired: boolean;
    syncHourDubai: int 0..23; dailyRequestCap: Record<PlatformId, int
    1..10000> }`; `INSIGHT_DEFAULTS = { retentionMonths: 25,
    publishingEnabled: false, publishApprovalRequired: true,
    syncHourDubai: 3, dailyRequestCap: { instagram: 200, x: 20, tiktok:
    200, snapchat: 200, ga4: 200, "search-console": 200, pixel: 1 } }`;
    `INSIGHT_DEFAULTS_NOTE = "Product defaults, not provider limits or
    law. X reads may be charged per request; its price is unknown."`;
    `InsightSettings = Body & { version: int >= 0; note }`;
    `InsightSettingsUpdate = Body & { expectedVersion: int >= 0 }`.
  - `PlatformStatus = PlatformInfo & { configured: boolean;
    reviewStatus: "not-started" }`; `PlatformList { platforms:
    PlatformStatus[]; excluded: typeof EXCLUDED_PLATFORMS }`.
  - `InsightUsage { day: IsoDate; platform: PlatformId; requests: int;
    cap: int }`.
  - Routes (this task): `getInsightSettings GET /v1/insights/settings`
    (owner, hr); `putInsightSettings PUT /v1/insights/settings` (owner,
    mfa); `listInsightPlatforms GET /v1/insights/platforms` (owner, hr)
    to `PlatformList`.
  - Errors (status): `SETTINGS_VERSION_CONFLICT` 409 (if absent),
    `PLATFORM_NOT_CONFIGURED` 409, `PLATFORM_NOT_AVAILABLE` 409,
    `PROVIDER_ERROR` 502 (detail `kind` only), `DAILY_CAP_REACHED` 429.
- Produces (api):
  - Migration 1501: `insight_settings(company_id pk, version int, body
    jsonb, updated_by, updated_at)`; `insight_api_usage(company_id,
    platform text, day date, requests int, pk(company_id, platform,
    day))`. RLS as Plan 3; grants select, insert, update.
  - `ports.ts` (types only):
    - `TokenSet { accessToken: string; refreshToken: string | null;
      expiresAt: string | null; scopes: string[] }`.
    - `ExternalAccount { externalAccountId: string (1..200);
      displayName: string (1..200) }`.
    - `RawPoint { metricId: string; day: string; dims?: Partial<
      Record<DimName, string>>; value: number }` with `DimName =
      "page" | "source" | "medium" | "campaign"` (Task 2).
    - `PublishRequest { idempotencyKey: string; text: string; mediaUrl:
      string | null }`; `PublishOutcome = { status: "published";
      externalPostId: string; url: string | null } | { status:
      "failed"; code: string }`.
    - `interface PlatformAdapter { readonly platform: PlatformId;
      readonly configured: boolean; authorizeUrl(a: { state: string;
      codeChallenge: string; redirectUri: string; scopes: string[] }):
      string; exchangeCode(a: { code: string; codeVerifier: string;
      redirectUri: string }, meter: Meter): Promise<TokenSet>;
      refresh(t: TokenSet, meter: Meter): Promise<TokenSet>; revoke(t:
      TokenSet, meter: Meter): Promise<void>; accounts(t: TokenSet,
      meter: Meter): Promise<ExternalAccount[]>; fetchDaily(t:
      TokenSet, r: { externalAccountId: string; from: string; to:
      string; today: string }, meter: Meter): Promise<RawPoint[]>;
      publish?(t: TokenSet, externalAccountId: string, p:
      PublishRequest, meter: Meter): Promise<PublishOutcome> }`.
      `type Meter = () => Promise<void>`: the adapter awaits it before
      every HTTP request, so the daily request cap (`countRequest`)
      counts real requests. A method that needs no refresh logic
      (no refresh token, no long-lived token) throws
      `AdapterError("auth", "invalid_grant")` from `refresh`.
    - `class AdapterError extends Error { kind: "auth" | "rate-limit" |
      "transient" | "permanent" | "not-configured"; code: string;
      retryAfterSec: number | null }` (in `errors.ts`). `auth` with
      code `invalid_grant` means the grant is dead.
    - `InsightPorts { adapters: Record<Exclude<PlatformId, "pixel">,
      PlatformAdapter>; redirectBase: string }` (`redirectBase` =
      Plan 13 `publicAppBaseUrl`).
  - `not-configured.ts`: `notConfiguredAdapter(p): PlatformAdapter`
    (`configured: false`; every method throws `AdapterError("not-
    configured", "NOT_CONFIGURED")`); `notConfiguredInsights(base)`.
  - `audit.ts`: `INSIGHT_SENSITIVE_KEYS = ["token","accessToken",
    "refreshToken","secret","code","state","verifier","text","caption",
    "url","mediaUrl","referrer","email","ip","userAgent","value",
    "observed","baseline"]`; `insightsAudit(tx: Db, e: AuditInput):
    Promise<AuditEvent>` throws `AUDIT_SENSITIVE_DATA` on any key at
    any depth, then calls `appendAudit`.
  - `settings.ts`: `getInsightSettings(tx: Db, companyId: string):
    Promise<InsightSettings>` (no row: version 0 and defaults);
    `putInsightSettings(ctx, body)`: version mismatch 409; audit
    `insights.settings-updated` (`data: { changed: string[] }`).
  - `usage.ts`: `countRequest(tx: Db, companyId: string, platform:
    PlatformId, day: string, cap: number): Promise<void>`: upsert
    `requests + 1`; when the new count is above `cap` throws
    `AdapterError("rate-limit", "DAILY_CAP_REACHED", null)` (counted
    before the call is made, so a refused call costs nothing).
    `listUsage(tx, companyId, from, to): Promise<InsightUsage[]>`.
  - `config.ts` groups, each all or nothing: `INSTAGRAM` =
    `META_APP_ID`, `META_APP_SECRET`, `META_GRAPH_VERSION`; `X_API` =
    `X_CLIENT_ID`, `X_CLIENT_SECRET`; `TIKTOK` = `TIKTOK_CLIENT_KEY`,
    `TIKTOK_CLIENT_SECRET`; `SNAPCHAT` = `SNAP_CLIENT_ID`,
    `SNAP_CLIENT_SECRET`; `GOOGLE_INSIGHTS` =
    `GOOGLE_INSIGHTS_CLIENT_ID`, `GOOGLE_INSIGHTS_CLIENT_SECRET` (shared
    by `ga4` and `search-console`).
  - `adapters/wire.ts`: `buildInsightPorts(cfg: Config, http:
    HttpClient): InsightPorts` starts from `notConfiguredInsights` and
    swaps in each configured adapter (Tasks 5 to 7 add lines). Called
    only by `main.ts`.
  - `tests/helpers/fake-insights.ts`: `fakeInsights(opts?):
    FakeInsights` with `ports: InsightPorts` and per platform a
    `FakeAdapter` that is `configured: true` (unless `opts.off`
    lists it) and scriptable: `accountsResult`, `tokens` (issued
    tokens are `"fake-access-<n>"` and `"fake-refresh-<n>"`),
    `points: RawPoint[]` returned by `fetchDaily` (filtered to `from`
    to `to`), `failNext(method, AdapterError)`, `calls: { method;
    args }[]`, `published: PublishRequest[]`.
- Behaviour: `listInsightPlatforms` returns the catalog in
  `PlatformId` order with `configured` from the ports (`pixel` always
  true) and `reviewStatus: "not-started"`.

- [ ] **Step 1: Write the failing tests**

`routes-insights.test.ts` (contract):
- `INSIGHTS_ROUTES.map((r) => r.id)` deep-equals the literal
  `INSIGHT_ROUTE_IDS` in the test (this task: `getInsightSettings`,
  `putInsightSettings`, `listInsightPlatforms`; each later task appends
  its ids in its Interfaces order).
- `ROUTE_GROUPS.at(-1)` is `INSIGHTS_ROUTES`; `ROUTES` deep-equals
  `ROUTE_GROUPS.flat()`; no `(method, path)` pair repeats; no route
  has method `DELETE`; every insights route is `tenant` except ids in
  `PUBLIC_INSIGHT_IDS` (empty now; Task 7 adds `collectPixel`).

`insights-catalog.test.ts` (contract):
- `catalog_keys_match_enum`: `Object.keys(PLATFORM_CATALOG)` equals
  `PlatformId.options`; `PlatformId.safeParse("linkedin").success` is
  false; `EXCLUDED_PLATFORMS[0].id` is `"linkedin"`.
- `catalog_honest_labels`: snapchat `insights.available` is
  `"unknown"` and `publish.available` false with evidence
  `not-found`; tiktok `publish.available` is `"unknown"`; every
  `review.leadTime` is `"unknown"`; x `cost.status` is `"unknown"`;
  `JSON.stringify(PLATFORM_CATALOG)` matches none of
  `/approved|verified partner|certified|\$\d/i`.
- `defaults_parse`: `INSIGHT_DEFAULTS` parses with
  `InsightSettingsBody`; `retentionMonths: 2` fails; the note contains
  "not provider limits".

`insights-platform.test.ts` (api):
- `settings_defaults_and_owner_mfa`: hr GET gives version 0 and the
  defaults; hr PUT 403 `FORBIDDEN`; owner without MFA 403
  `MFA_REQUIRED`; owner with MFA and `expectedVersion: 0` gives version
  1; again with 0 gives 409 `SETTINGS_VERSION_CONFLICT`; the audit row
  `insights.settings-updated` has `data` deep-equal to `{ changed:
  ["retentionMonths"] }` after changing only that field.
- `platform_list_configured_state`: with `fakeInsights({ off: ["x"] })`
  the x row has `configured: false`, instagram `true`, every row
  `reviewStatus: "not-started"`, `excluded[0].id` `"linkedin"`;
  manager GET is 403.
- `insights_audit_refuses_sensitive`: `insightsAudit` with `data: {
  accessToken: "a" }` and with `data: { nested: { state: "s" } }`
  throws `AUDIT_SENSITIVE_DATA`.
- `usage_cap_counts_before_call`: cap 2: two `countRequest` calls pass,
  the third throws `DAILY_CAP_REACHED`; `listUsage` shows 3 for that
  day; company B's count is separate.
- `not_configured_adapter_throws`: `notConfiguredAdapter("x")
  .accounts(...)` rejects with kind `not-configured`.

`main.test.ts` (add): an env without insight variables gives every
adapter `configured: false`; `META_APP_ID` alone throws a message
naming `META_APP_SECRET` and `META_GRAPH_VERSION`.

- [ ] **Step 2: Run** `pnpm --filter @payroll/contract test
  routes-insights insights-catalog` and `pnpm --filter @payroll/api
  test insights-platform main`. Expected: FAIL, modules not found.
- [ ] **Step 3: Implement** the files above; register the three
  routes; conformance rows; `mayView` owner and hr.
- [ ] **Step 4: Run** `pnpm check`. Expected: PASS, including the RLS
  catalog test over the two new tables.
- [ ] **Step 5: Commit** `feat(api): insights platform, catalog,
  settings`.

### Task 2: Metric catalog and normalised time series

**Files:**
- Create: `packages/contract/src/insights-metrics.ts`
- Modify: `packages/contract/src/routes-insights.ts`, `src/registry.ts`,
  `src/examples.ts`, `src/index.ts`, `src/errors.ts`
- Create: `packages/api/migrations/1502_insight_points.sql`,
  `packages/api/src/insights/normalise.ts` (pure),
  `src/insights/comparable.ts` (pure), `src/insights/rollup.ts` (pure),
  `src/insights/points.ts`, `src/routes/insights-metrics.ts`
- Test: `packages/contract/tests/insights-metrics.test.ts`,
  `packages/api/tests/insights-normalise.test.ts`,
  `tests/insights-points.test.ts`

**Interfaces:**
- Consumes: Task 1 `PlatformId`, `Evidence`, `RawPoint`, `DimName`.
- Produces (contract):
  - `MetricKind = z.enum(["followers","reach","impressions","views",
    "engagement","posts","traffic","page-views","clicks",
    "position"])`.
  - `MetricDef { id: ^[a-z]+(\.[a-z-]+)+$; platform: PlatformId; kind:
    MetricKind; label: string; definition: string; aggregation: "sum" |
    "last" | "none"; unit: "count" | "position"; snapshot: boolean;
    dims: DimName[]; comparableGroup: string | null; evidence:
    Evidence }`. `aggregation`: `sum` adds days, `last` takes the
    bucket's last day, `none` cannot be rolled up (unique counts and
    averages). `snapshot` true: the value is read "now" and recorded
    on the sync's Dubai date.
  - `METRIC_CATALOG: readonly MetricDef[]`, exactly these ids (all
    `evidence: "unverified"` unless stated; every `comparableGroup`
    null, Ruling 10):
    - Instagram: `ig.followers` (followers, last, snapshot),
      `ig.reach` (reach, none: "accounts reached per day as reported;
      not additive across days"), `ig.views` (views, sum: "replaced
      impressions in 2025"), `ig.interactions` (engagement, sum),
      `ig.posts` (posts, last, snapshot).
    - X: `x.followers` (followers, last, snapshot), `x.posts` (posts,
      last, snapshot: "total posts on the profile"),
      `x.impressions` (impressions, sum: "owner's posts, last 30 days
      only"), `x.engagements` (engagement, sum: "likes, replies,
      reposts and quotes on the owner's posts"), `x.link-clicks`
      (clicks, sum).
    - TikTok: `tt.followers` (followers, last, snapshot), `tt.videos`
      (posts, last, snapshot), `tt.likes` (engagement, last,
      snapshot: "lifetime likes on the profile").
    - Snapchat: `sc.followers` (followers, last, snapshot, evidence
      `not-found`), `sc.views` (views, sum, `not-found`).
    - GA4: `ga4.sessions` (traffic, sum, dims `source`, `medium`,
      `campaign`), `ga4.users` (traffic, none: "unique users per day as
      reported"), `ga4.page-views` (page-views, sum, dims `page`).
    - Search Console: `gsc.clicks` (clicks, sum, dims `page`),
      `gsc.impressions` (impressions, sum, dims `page`),
      `gsc.position` (position, none, unit `position`, dims `page`).
    - Pixel: `px.views` (page-views, sum, dims `page`, `source`,
      `medium`, `campaign`), `px.apply-clicks` (clicks, sum, same dims).
  - `metricById(id): MetricDef` (throws on unknown).
  - Route: `listInsightMetrics GET /v1/insights/metrics` (owner, hr)
    to `listOf(MetricDef)`.
  - Errors: `METRICS_NOT_COMPARABLE` 422, `GRAIN_NOT_SUPPORTED` 422,
    `METRIC_PLATFORM_MISMATCH` 422.
- Produces (api):
  - Migration 1502: `insight_points(company_id, source_id uuid,
    metric_id text, day date, dim_key text not null default '', dims
    jsonb not null default '{}', value_e4 bigint not null check
    (value_e4 >= 0), fetched_at timestamptz, pk(company_id, source_id,
    metric_id, day, dim_key))` where `source_id` is a connection id or
    a pixel site id; index `(company_id, metric_id, day)`. RLS; grants
    select, insert, update.
  - `normalise.ts`: `normalisePoints(platform: PlatformId, raw:
    RawPoint[], window: { from: string; to: string; today: string }):
    { rows: PointRow[]; rejected: { metricId: string; reason:
    RejectReason }[] }` where `PointRow { metricId; day; dimKey; dims;
    valueE4: bigint }` and `RejectReason = "unknown-metric" |
    "platform-mismatch" | "bad-day" | "outside-window" | "negative" |
    "not-integer" | "bad-dim"`. Rules: metric must exist and belong to
    `platform`; `day` a valid ISO date within `from..to`, or equal to
    `today` for a `snapshot` metric; `count` values integers >= 0;
    `position` values >= 0 with at most 4 decimals; dims only those in
    the def, each 1..300 chars; `dimKey` = the dims as
    `name=value` pairs sorted by name and joined by `|` (`""` when
    none); `valueE4 = BigInt(Math.round(value * 10000))`. Duplicates
    (same metric, day, dimKey) keep the last one.
  - `comparable.ts`: `assertComparable(metricIds: string[]): void`
    throws `ApiError(422, "METRICS_NOT_COMPARABLE")` unless every def
    has the same non-null `comparableGroup` (a single id is always
    fine).
  - `rollup.ts`: `rollup(points: { day: string; valueE4: bigint }[],
    aggregation: MetricDef["aggregation"], grain: "day" | "week" |
    "month"): { start: string; valueE4: bigint }[]`: weeks start on
    Monday (ISO), months on day 1; `sum` adds, `last` takes the latest
    day's value; `none` with a grain other than `day` throws
    `ApiError(422, "GRAIN_NOT_SUPPORTED")`; output sorted by start;
    empty buckets omitted.
  - `points.ts`: `upsertPoints(tx: Db, companyId: string, sourceId:
    string, rows: PointRow[], now: Date): Promise<number>` (`INSERT ...
    ON CONFLICT (pk) DO UPDATE SET value_e4, dims, fetched_at`, in
    batches of 500; returns rows written); `readSeries(tx, companyId,
    sourceId, metricId, from, to, dimKey = ""): Promise<{ day;
    valueE4 }[]>`; `readByDim(tx, companyId, sourceIds: string[],
    metricId, dim: DimName, from, to, limit): Promise<{ value: string;
    totalE4: bigint }[]>` (sums `value_e4` over days for metrics with
    `aggregation: "sum"` only, else 422 `GRAIN_NOT_SUPPORTED`; groups by
    `dims->>dim`; sorted by total descending then value).

- [ ] **Step 1: Write the failing tests**

`insights-metrics.test.ts` (contract):
- `metric_ids_unique_and_prefixed`: ids unique; each id's prefix maps
  to its platform (`ig`, `x`, `tt`, `sc`, `ga4`, `gsc`, `px`); every
  `PlatformId` has at least one metric.
- `no_shared_groups`: every `comparableGroup` is null.
- `none_for_unique_counts`: `ig.reach`, `ga4.users` and `gsc.position`
  have `aggregation: "none"`; every `snapshot: true` metric has
  `aggregation: "last"`; both Snapchat metrics have evidence
  `not-found`.

`insights-normalise.test.ts` (pure):
- `normalise_accepts_and_keys_dims`: `px.views` with dims `{ source:
  "ig", page: "/careers" }` gives `dimKey "page=/careers|source=ig"`
  and `valueE4 120000n` for value 12.
- `normalise_rejects`: a `tt.followers` point sent for platform
  `instagram` is `platform-mismatch`; `ig.views` with value `-1` is
  `negative`, value `1.5` is `not-integer`; `ig.views` on a day after
  `to` is `outside-window`; `ig.followers` on `today` is accepted
  although `today > to`; `ga4.sessions` with dim `page` is `bad-dim`;
  `"2026-02-30"` is `bad-day`.
- `normalise_position_decimals`: `gsc.position` 3.25 gives `32500n`.
- `no_sum_across_definitions` (Review Focus 3): `assertComparable(
  ["ig.views","tt.likes"])` and `(["ig.views","sc.views"])` throw
  `METRICS_NOT_COMPARABLE`; `(["ig.views"])` passes.
- `rollup_rules`: daily values 1..14 (as `valueE4` 10000n x n) from
  Monday 2026-11-02 give two weeks with sums 28 and 77 (x 10000n) for
  `sum`, 7 and 14 for `last`; `none` with `week` throws
  `GRAIN_NOT_SUPPORTED`; a fast-check property: for `sum`, the total
  over weeks equals the total over days.

`insights-points.test.ts` (db):
- `upsert_idempotent`: writing the same 3 rows twice leaves 3 rows;
  writing one again with a new value updates it (platform restatement).
- `points_tenant_isolated`: company B reads none of A's points.
- `read_by_dim_top`: `px.views` on 3 pages over 2 days gives pages in
  descending total order with `limit: 2`; `readByDim` on `ig.reach`
  throws `GRAIN_NOT_SUPPORTED`.
- `list_metrics_route`: hr GET returns `METRIC_CATALOG.length` rows;
  employee 403.

- [ ] **Step 2: Run** `pnpm --filter @payroll/contract test
  insights-metrics` and `pnpm --filter @payroll/api test
  insights-normalise insights-points`. Expected: FAIL.
- [ ] **Step 3: Implement** the files above.
- [ ] **Step 4: Run** `pnpm check`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(api): insight metric catalog and series`.

### Task 3: Connect: OAuth with PKCE, token vault, accounts, revoke

Security task: fresh per-task review.

**Files:**
- Create: `packages/contract/src/insights-connect.ts`
- Modify: `packages/contract/src/routes-insights.ts`, `src/errors.ts`,
  `src/registry.ts`, `src/examples.ts`, `src/index.ts`
- Create: `packages/api/migrations/1503_insight_connections.sql`,
  `packages/api/src/insights/vault.ts`, `src/insights/oauth-states.ts`,
  `src/insights/connect.ts`, `src/insights/connections.ts`,
  `src/routes/insights-connect.ts`
- Test: `packages/api/tests/insights-connect.test.ts`,
  `tests/insights-tokens.test.ts`

**Interfaces:**
- Consumes: Task 1 `PlatformAdapter`, `TokenSet`, `AdapterError`,
  `PLATFORM_CATALOG`, `getInsightSettings`, `countRequest`,
  `insightsAudit`, `fakeInsights`; Plan 13 `pkcePair`; Plan 3
  `Keyring.encrypt`, `decrypt`, the company's `dek_wrapped`.
- Produces (contract):
  - `OauthPlatform = PlatformId.exclude(["pixel"])`.
  - `ConnectionStatus = z.enum(["pending-account","active",
    "needs-reauth","error","revoked"])`.
  - `InsightConnection { id; platform: OauthPlatform; status;
    externalAccountId: string | null; displayName: string | null;
    scopes: string[]; publishScopes: boolean; connectedBy: Id;
    connectedAt: Timestamp; lastSyncAt: Timestamp | null; nextSyncAt:
    Timestamp | null; consecutiveFailures: int; lastErrorCode: string |
    null; rateLimitedUntil: Timestamp | null; revokedAt: Timestamp |
    null }`.
  - `ConnectStartRequest { includePublish: boolean (default false) }`;
    `ConnectStartResponse { authorizeUrl: string; expiresAt:
    Timestamp }`; `ConnectCallbackRequest { code: string 1..2048;
    state: string 1..200 }`; `AccountChoice { externalAccountId;
    displayName }`; `ChooseAccountRequest { externalAccountId: string
    1..200 }`.
  - Routes appended (owner, hr unless stated):
    `startInsightConnect POST /v1/insights/connections/{platform}/start`
    to `ConnectStartResponse`; `completeInsightConnect POST
    /v1/insights/connections/{platform}/callback` to
    `InsightConnection`; `listInsightConnections GET
    /v1/insights/connections` to `listOf(InsightConnection)`;
    `getInsightConnection GET /v1/insights/connections/{id}`;
    `listInsightConnectionAccounts GET
    /v1/insights/connections/{id}/accounts` to `listOf(AccountChoice)`;
    `chooseInsightConnectionAccount PUT
    /v1/insights/connections/{id}/account` to `InsightConnection`;
    `revokeInsightConnection POST /v1/insights/connections/{id}/revoke`
    to `InsightConnection`. `{platform}` is `OauthPlatform` (so
    `linkedin` and `pixel` give 400 `VALIDATION_FAILED`).
  - Errors: `OAUTH_STATE_INVALID` 400, `NO_ELIGIBLE_ACCOUNT` 422,
    `ACCOUNT_ALREADY_CONNECTED` 409, `CONNECTION_NOT_PENDING` 409,
    `CONNECTION_REVOKED` 409, `PUBLISHING_DISABLED` 409,
    `PUBLISH_NOT_AVAILABLE` 409.
- Produces (api):
  - Migration 1503: `insight_oauth_states(state_hash text pk,
    company_id, platform, user_id, include_publish bool, verifier_enc,
    expires_at, used_at)`; `insight_connections(id, company_id,
    platform, external_account_id text null, display_name text null,
    status, scopes text[], publish_scopes bool, token_enc text null,
    choices_enc text null, token_expires_at timestamptz null,
    connected_by, connected_at, last_sync_at, last_synced_day date,
    next_sync_at, sync_lease_until, consecutive_failures int default 0,
    last_error_code text, rate_limited_until, revoked_at)`; unique index
    `(company_id, platform, external_account_id)` where `status <>
    'revoked' and external_account_id is not null`. RLS; grants select,
    insert, update.
  - `vault.ts`: `REFRESH_MARGIN_SEC = 604800` (7 days; product
    default); `sealTokens(c: ReqCtx | JobCtx, connId: string, t:
    TokenSet): Promise<string>` (JSON of `t` encrypted with the company
    DEK, AAD `"<companyId>:insight_connections:token_enc:<connId>"`);
    `openTokens(c, connId, cipher): Promise<TokenSet>`;
    `freshTokens(c, conn: ConnRow, meter: Meter): Promise<TokenSet>`:
    opens; when `expiresAt` is not null and less than
    `REFRESH_MARGIN_SEC` away, calls `adapter.refresh`, reseals,
    updates `token_expires_at` and audits `insights.token-refreshed`
    (`data: { connectionId }`); an `AdapterError` of kind `auth` sets
    `status = "needs-reauth"`, `last_error_code` to its code, audits
    `insights.needs-reauth` and rethrows; an expired token whose
    refresh fails the same way gives the same result.
  - `oauth-states.ts`: `createState(ctx, platform, includePublish):
    Promise<{ state; challenge; expiresAt }>` (state 32 random bytes
    base64url; only `sha256Hex(state)` stored; verifier from
    `pkcePair(deps.randomBytes(32))` encrypted with AAD
    `"<companyId>:insight_oauth_states:verifier_enc:<stateHash>"`; 10
    minutes); `consumeState(ctx, platform, state): Promise<{
    includePublish; verifier }>` = `UPDATE ... SET used_at = now WHERE
    state_hash = $1 AND platform = $2 AND user_id = $3 AND used_at IS
    NULL AND expires_at > now RETURNING` (RLS limits the company);
    none: 400 `OAUTH_STATE_INVALID`, one body for every cause.
  - `connect.ts`:
    - `redirectUri(platform) = <redirectBase>/insights/oauth/<platform>
      /callback`.
    - `startConnect(ctx, platform, body)`: in order: adapter not
      configured 409 `PLATFORM_NOT_CONFIGURED`; catalog
      `insights.available !== true` 409 `PLATFORM_NOT_AVAILABLE`;
      `includePublish` and settings `publishingEnabled` false 409
      `PUBLISHING_DISABLED`; `includePublish` and catalog
      `publish.available !== true` 409 `PUBLISH_NOT_AVAILABLE`; scopes
      = read scopes plus publish scopes when asked; audit
      `insights.connect-started` (`data: { platform }`).
    - `completeConnect(ctx, platform, body)`: `consumeState`;
      `exchangeCode` (an `AdapterError` gives 502 `PROVIDER_ERROR` with
      `detail.kind`; nothing stored); `accounts`; none: 422
      `NO_ELIGIBLE_ACCOUNT` and `revoke` is attempted; one: check
      duplicates (409 `ACCOUNT_ALREADY_CONNECTED`, the new grant
      revoked), insert `active` with `next_sync_at = now`; several:
      insert `pending-account` with `choices_enc` sealed like tokens
      (column `choices_enc`). Scopes stored are the `TokenSet.scopes`
      returned; `publish_scopes` true only when every publish scope is
      among them. Reconnect: when the account matches a connection in
      `needs-reauth` or `error`, that row gets the new tokens, scopes,
      `status "active"`, failures 0 and `next_sync_at = now` (no new
      row, history kept). Audit `insights.connected` (`data: {
      platform, connectionId }`).
    - `chooseAccount(ctx, id, body)`: status not `pending-account` 409
      `CONNECTION_NOT_PENDING`; unknown id 404 `NOT_FOUND`; duplicate
      409; then `active`, `choices_enc` null, `next_sync_at = now`.
    - `revokeConnection(ctx, id)`: already revoked 409
      `CONNECTION_REVOKED`; calls `adapter.revoke` (a failure is kept:
      audit `data.providerRevoke` `"failed"` and `last_error_code
      "REVOKE_FAILED"`, never thrown); sets `status "revoked"`,
      `token_enc` and `choices_enc` null, `revoked_at`; points are kept
      (Ruling 8). Audit `insights.revoked`.
  - `connections.ts`: `loadConnection(tx, companyId, id):
    Promise<ConnRow>` (404), `listConnections`, and
    `toConnectionView(row): InsightConnection`, the only serialiser
    (it never reads `token_enc` or `choices_enc`).

- [ ] **Step 1: Write the failing tests**

`insights-connect.test.ts`:
- `oauth_start_builds_url`: hr starts instagram; the fake records one
  `authorizeUrl` call whose `scopes` deep-equal the catalog read scopes,
  `redirectUri` ends with `/insights/oauth/instagram/callback` and
  `state` is 43 characters; `insight_oauth_states` row text does not
  contain the state.
- `oauth_start_refusals`: snapchat (fake configured) 409
  `PLATFORM_NOT_AVAILABLE`; x with `fakeInsights({ off: ["x"] })` 409
  `PLATFORM_NOT_CONFIGURED`; instagram `includePublish: true` with
  publishing off 409 `PUBLISHING_DISABLED`; tiktok `includePublish:
  true` with publishing on 409 `PUBLISH_NOT_AVAILABLE`; path platform
  `linkedin` and `pixel` give 400; manager 403.
- `oauth_state_single_use_and_bound` (Review Focus 1): after a good
  callback, the same state again gives 400 `OAUTH_STATE_INVALID`; a
  fresh state used by another hr user of the company, by company B's
  owner with B's header, after advancing the clock 10 minutes and 1
  second, or on `x` when issued for `instagram`, each gives 400 with a
  body identical to the replay's; in every failing case the fake's
  `exchangeCode` was not called and the connection count is
  unchanged.
- `connect_single_account_active`: one account gives `active`,
  `nextSyncAt` equal to now, `scopes` from the fake token, `publishScopes`
  false.
- `connect_multi_account_choose`: two accounts give `pending-account`;
  the accounts route lists both; choosing an unknown id 404; choosing
  one gives `active` with its `displayName`; choosing again 409
  `CONNECTION_NOT_PENDING`.
- `connect_duplicate_account`: a second connect of the same account
  409 `ACCOUNT_ALREADY_CONNECTED` and the fake's `revoke` was called
  for the new grant; after revoking the first connection a new connect
  succeeds.
- `reconnect_replaces_tokens`: a `needs-reauth` connection
  reconnected to the same account keeps its id and points, becomes
  `active` with failures 0, and its sealed token opens to the new
  fake token.
- `connect_no_eligible_account`: zero accounts gives 422
  `NO_ELIGIBLE_ACCOUNT` and no row.
- `connect_provider_error`: `exchangeCode` failing with kind
  `transient` gives 502 `PROVIDER_ERROR` with `detail` deep-equal to
  `{ kind: "transient" }`.

`insights-tokens.test.ts`:
- `token_refresh_margin`: tokens expiring in 5 minutes: `freshTokens`
  calls `refresh` once and the row's `token_expires_at` changes;
  expiring in 8 days: no refresh; refresh failing `auth` /
  `invalid_grant`: status `needs-reauth`, `lastErrorCode
  "invalid_grant"`, audit `insights.needs-reauth`.
- `tokens_never_leave` (Review Focus 2): connect, refresh and revoke
  one connection; then the joined text of every response body, every
  `logs` line, every `audit_events.data`, and `row_to_json` of every
  row in `insight_connections` and `insight_oauth_states`, contains no
  `fake-access-`, no `fake-refresh-` and not the callback code
  `"code-123"`; before revoke `token_enc` starts with `v1.`; after
  revoke `token_enc` and `choices_enc` are null and the fake's `revoke`
  received the stored tokens.
- `revoke_provider_failure_recorded`: `revoke` failing `transient`
  still gives `revoked`, `lastErrorCode "REVOKE_FAILED"` and audit
  `data.providerRevoke "failed"`; revoking again 409
  `CONNECTION_REVOKED`.
- `connection_tenant_isolated`: company B's owner reading A's
  connection id with B's header gets 404.

- [ ] **Step 2: Run** `pnpm --filter @payroll/api test insights-connect
  insights-tokens`. Expected: FAIL.
- [ ] **Step 3: Implement** the files above; conformance rows; leak id
  map (`connectionId`); `mayView` owner and hr.
- [ ] **Step 4: Run** `pnpm check`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(api): insight connections with OAuth
  and sealed tokens`.

### Task 4: Sync engine: schedule, lease, rate limits, backoff, job

**Files:**
- Modify: `packages/contract/src/insights-connect.ts` (`SyncRun`),
  `src/routes-insights.ts`, `src/errors.ts`, `src/registry.ts`,
  `src/index.ts`
- Create: `packages/api/migrations/1504_insight_sync.sql`,
  `packages/api/src/insights/schedule.ts` (pure),
  `src/insights/sync.ts`, `src/insights/sync-jobs.ts`,
  `src/routes/insights-sync.ts`
- Modify: `packages/api/src/main.ts` (`jobs` runs `runDueSyncs`)
- Test: `packages/api/tests/insights-schedule.test.ts`,
  `tests/insights-sync.test.ts`

**Interfaces:**
- Consumes: Tasks 1 to 3 (`freshTokens`, `normalisePoints`,
  `upsertPoints`, `countRequest`, `loadConnection`); Plan 11 `JobCtx`,
  `payroll_jobs`; Plan 13 `consumeRate`.
- Produces (contract):
  - `SyncRun { id; connectionId; startedAt; finishedAt: Timestamp |
    null; status: "ok" | "partial" | "failed" | "rate-limited" |
    "skipped"; window: { from: IsoDate; to: IsoDate } | null;
    pointsWritten: int; rejected: int; errorCode: string | null }`.
  - Routes appended (owner, hr): `syncInsightConnection POST
    /v1/insights/connections/{id}/sync` to `InsightConnection` (queues;
    Ruling 13); `listInsightSyncRuns GET
    /v1/insights/connections/{id}/sync-runs` to `listOf(SyncRun)`
    (latest 50, newest first); `getInsightUsage GET /v1/insights/usage`
    (query `from`, `to`) to `listOf(InsightUsage)`.
  - Errors: `SYNC_TOO_SOON` 429, `CONNECTION_NOT_ACTIVE` 409.
- Produces (api):
  - Migration 1504: `insight_sync_runs(id, company_id, connection_id,
    started_at, finished_at, status, window_from date, window_to date,
    points_written int, rejected int, error_code text)`; function
    `due_insight_connections(p_now timestamptz, p_limit int) RETURNS
    TABLE(company_id uuid, connection_id uuid, user_id uuid)` `SECURITY
    DEFINER`, `SET search_path = public`, owned by `payroll_jobs`
    (granted SELECT on `insight_connections` only), returning active
    connections with `next_sync_at <= p_now`, `rate_limited_until` null
    or passed, `sync_lease_until` null or passed, ordered by
    `next_sync_at`; `user_id = connected_by`. `GRANT EXECUTE` to
    `payroll_app`.
  - `schedule.ts` (pure): `RESTATE_DAYS = 3`, `ERROR_AFTER_FAILURES =
    8`, `LEASE_MINUTES = 10`, `MIN_RATE_WAIT_SEC = 60` (all product
    defaults); `syncJitterMinutes(connectionId: string): number` =
    `parseInt(sha256Hex(connectionId).slice(0, 8), 16) % 60`;
    `nextSyncAt(now: Date, hourDubai: number, connectionId: string):
    Date` = the first instant strictly after `now` whose Dubai time
    (UTC+4) is `hourDubai:jitter`; `backoffMinutes(failures: number):
    number` = `min(15 * 2 ** (failures - 1), 1440)` for `failures >=
    1`; `syncWindow(a: { lastSyncedDay: string | null; today: string;
    historyDays: number }): { from: string; to: string }` with `to =
    today - 1 day`, floor `to - (historyDays - 1)`; first sync: `from`
    = the floor; later: `from = max(floor, min(lastSyncedDay + 1, to -
    (RESTATE_DAYS - 1)))`; `nextDubaiMidnight(now: Date): Date`.
  - `sync.ts`: `syncConnection(c: ReqCtx | JobCtx, connId: string):
    Promise<SyncRun>`:
    1. Claim: `UPDATE insight_connections SET sync_lease_until = now +
       LEASE_MINUTES WHERE id = $1 AND status = 'active' AND
       (sync_lease_until IS NULL OR sync_lease_until < now) RETURNING`;
       none: a `skipped` run.
    2. `meter = () => countRequest(tx, companyId, platform, today,
       settings.dailyRequestCap[platform])`; `freshTokens`;
       `syncWindow` with the catalog `historyDays`; `fetchDaily`;
       `normalisePoints`; `upsertPoints` with `sourceId = connId`.
    3. Success: run `ok` (or `partial` when `rejected > 0`);
       `last_sync_at = now`, `last_synced_day = to`,
       `consecutive_failures = 0`, `last_error_code = null`,
       `next_sync_at = nextSyncAt(now, settings.syncHourDubai, id)`.
    4. `AdapterError` `rate-limit`: run `rate-limited`;
       `rate_limited_until = now + max(retryAfterSec ?? 0,
       MIN_RATE_WAIT_SEC)` seconds, or `nextDubaiMidnight(now)` for
       `DAILY_CAP_REACHED`; failures unchanged.
    5. `auth`: run `failed`; `status = "needs-reauth"` (already set by
       `freshTokens` when it came from refresh).
    6. `transient`, `permanent`, `HttpFailure`, `not-configured`: run
       `failed`; `consecutive_failures + 1`; `next_sync_at = now +
       backoffMinutes(failures)`; at `ERROR_AFTER_FAILURES` the status
       becomes `error` (only a reconnect or `syncInsightConnection`
       restarts it, Ruling 13).
    7. Always: `sync_lease_until = null`; `error_code` is the
       adapter's code when it matches `^[A-Za-z0-9_.-]{1,64}$`, else
       `"PROVIDER_ERROR"` (provider text never stored); one
       `insight_sync_runs` row; audit only on status changes
       (`insights.status-changed`, `data: { connectionId, from, to }`).
    A failed run writes no points; points from earlier runs stay.
  - `sync-jobs.ts`: `runDueSyncs(db: Db, deps: AppDeps, limit = 50):
    Promise<{ ran: number; skipped: number; failed: number }>`: calls
    `due_insight_connections(now, limit)`; per row one `withTenant({
    companyId, userId })` with a `JobCtx`; a connection whose
    `connected_by` lost owner or hr membership is synced all the same
    (the grant belongs to the company, Ruling 6).
  - Manual sync: `consumeRate(tx, companyId, "insight-sync", connId, 1,
    900, now)` (product default once per 15 minutes) else 429
    `SYNC_TOO_SOON`; status `revoked`, `pending-account` or
    `needs-reauth` 409 `CONNECTION_NOT_ACTIVE` (a dead grant needs a
    reconnect); an `error` connection returns to `active` with
    failures reset; sets `next_sync_at = now`.

- [ ] **Step 1: Write the failing tests**

`insights-schedule.test.ts` (pure):
- `next_sync_at_dubai_hour`: for an id with jitter `m`,
  `nextSyncAt(2026-11-26T10:00:00Z, 3, id)` is `2026-11-26T23:<m>:00Z`
  (03:m Dubai on 27 November); with `now` one minute after that
  instant the result is 24 hours later; a fast-check property: jitter
  is an integer 0 to 59 and the result is always after `now` and
  within 24 hours.
- `backoff_table`: `backoffMinutes` of 1, 2, 3, 7, 8, 20 is 15, 30,
  60, 960, 1440, 1440.
- `sync_window_rules`: today `2026-11-26`, historyDays 30, first sync:
  `2026-10-27` to `2026-11-25`; lastSyncedDay `2026-11-20`: from
  `2026-11-21`; lastSyncedDay `2026-11-25`: from `2026-11-23`;
  historyDays 1: from and to `2026-11-25`; lastSyncedDay
  `2026-09-01` with historyDays 29: from `2026-10-28`.
- `next_dubai_midnight`: `2026-11-26T10:00:00Z` gives
  `2026-11-26T20:00:00Z`; `2026-11-26T20:00:00Z` gives
  `2026-11-27T20:00:00Z`.

`insights-sync.test.ts`:
- `sync_happy_path`: a connected instagram with fake points for
  `ig.views` on three days and `ig.followers` on today: run `ok`,
  `pointsWritten 4`, `last_synced_day 2026-11-25`, `nextSyncAt` as the
  schedule says, `getInsightUsage` shows the meter count for today.
- `sync_partial_rejects`: one point with metric `ig.unknown`: run
  `partial`, `rejected 1`, the others written.
- `sync_backoff_idempotent_reauth` (Review Focus 4):
  1. `rate-limit` with `retryAfterSec 120`: run `rate-limited`,
     `rateLimitedUntil` now + 120 s, failures 0; `runDueSyncs` at +60 s
     does not call the adapter, at +121 s it does. `retryAfterSec 10`
     gives now + 60 s.
  2. Eight `transient` failures, the clock moved to each
     `next_sync_at`: delays 15, 30, 60, 120, 240, 480, 960 minutes;
     after the eighth the status is `error` and later `runDueSyncs`
     calls do not reach the adapter; calling `runDueSyncs` twice at
     the same instant calls the adapter once (no hot loop).
  3. The same fake points synced twice give `insight_points` rows equal
     apart from `fetched_at`.
  4. `refresh` failing `invalid_grant` (token near expiry): run
     `failed` with `errorCode "invalid_grant"`, status `needs-reauth`,
     not claimed again by `runDueSyncs`.
- `sync_daily_cap`: settings cap for x of 1 and a fake that meters
  twice: run `rate-limited`, `errorCode "DAILY_CAP_REACHED"`,
  `rateLimitedUntil 2026-11-26T20:00:00Z` at now `10:00Z`.
- `sync_lease_concurrent`: two concurrent `syncConnection` calls give
  one `ok` run and one `skipped` run; the fake's `fetchDaily` ran once.
- `sync_error_code_sanitised`: code `"bad token abc def?"` is stored as
  `"PROVIDER_ERROR"`; `"HTTP_503"` is stored as is.
- `manual_sync_queues`: POST sync sets `nextSyncAt` to now; a second
  POST within 15 minutes 429 `SYNC_TOO_SOON`; on a revoked connection
  409 `CONNECTION_NOT_ACTIVE`; on an `error` connection the status
  returns to `active` with failures 0.
- `sync_runs_listed`: newest first; employee 403.
- `due_function_owned_by_jobs_role`: `pg_proc` owner of
  `due_insight_connections` is `payroll_jobs`; `prosecdef` true.

- [ ] **Step 2: Run** `pnpm --filter @payroll/api test
  insights-schedule insights-sync`. Expected: FAIL.
- [ ] **Step 3: Implement** the files above; register `runDueSyncs` in
  `main.ts jobs`; conformance rows.
- [ ] **Step 4: Run** `pnpm check`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(api): insight sync engine and job`.

### Task 5: Instagram and X adapters

**Files:**
- Create: `packages/api/src/insights/adapters/http-json.ts`,
  `adapters/oauth-common.ts`, `adapters/hosts.ts`,
  `adapters/instagram.ts`, `adapters/x.ts`
- Modify: `packages/api/src/insights/adapters/wire.ts`
- Create fixtures: `packages/api/tests/fixtures/insights/instagram/`
  `me-business.json`, `me-personal.json`, `insights.json`,
  `media-container.json`, `media-publish.json`, `token.json`;
  `tests/fixtures/insights/x/` `token.json`, `me.json`,
  `tweets-1.json`, `tweets-2.json`, `tweet-create.json`
- Test: `packages/api/tests/insights-adapter-common.test.ts`,
  `tests/insights-instagram.test.ts`, `tests/insights-x.test.ts`

**Interfaces:**
- Consumes: Task 1 `PlatformAdapter`, `AdapterError`, `Meter`; Plan 13
  `HttpClient`, `HttpFailure`, `FakeHttp`.
- Produces:
  - `http-json.ts`: `requestJson(http: HttpClient, meter: Meter, r: {
    method: "GET" | "POST"; url: string; headers?: Record<string,
    string>; form?: Record<string, string>; json?: unknown }):
    Promise<unknown>` (awaits `meter` first; `timeoutMs` 15000;
    status mapping: 2xx parses JSON; 401 and 403 `auth` with the body's
    `error` string when it matches the code pattern, else
    `HTTP_<status>`; 429 `rate-limit` with `retry-after` seconds when
    numeric; 5xx `transient` `HTTP_<status>`; other 4xx `permanent`
    `HTTP_<status>`; a body `{ "error": "invalid_grant" }` from any
    status gives `auth` / `invalid_grant`; `HttpFailure` gives
    `transient` with its code; unparsable JSON gives `permanent`
    `BAD_JSON`).
  - `oauth-common.ts`: `authorizeUrlFor(base: string, params:
    Record<string, string>): string` (URL-encoded, sorted keys);
    `tokenSetFrom(json: unknown, now: Date, fallbackScopes: string[]):
    TokenSet` (`access_token`, `refresh_token`, `expires_in` seconds to
    `expiresAt`, `scope` split on spaces or commas; a missing
    `access_token` gives `permanent` `BAD_TOKEN_RESPONSE`).
  - `hosts.ts`: `ADAPTER_HOSTS: Record<OauthPlatform, string[]>`:
    instagram `["www.instagram.com","api.instagram.com",
    "graph.instagram.com"]`; x `["x.com","api.x.com"]`; tiktok
    `["www.tiktok.com","open.tiktokapis.com"]`; snapchat
    `["accounts.snapchat.com"]`; ga4 and search-console
    `["accounts.google.com","oauth2.googleapis.com",
    "analyticsadmin.googleapis.com","analyticsdata.googleapis.com",
    "www.googleapis.com"]` (all `// UNVERIFIED`).
  - Tokens go only in the `Authorization: Bearer` header, never in a
    URL (Ruling 20); client secrets only in a form body or Basic
    header.
  - `instagram.ts`: `instagramAdapter(http: HttpClient, cfg: { appId:
    string; appSecret: string; graphVersion: string; now: () => Date }):
    PlatformAdapter` (`// UNVERIFIED` throughout, general knowledge of
    the Instagram API with Instagram Login):
    - authorize `https://www.instagram.com/oauth/authorize` with
      `client_id`, `redirect_uri`, `response_type=code`, `scope`
      comma-joined, `state`, `code_challenge`,
      `code_challenge_method=S256`.
    - `exchangeCode`: POST form to
      `https://api.instagram.com/oauth/access_token`, then GET
      `https://graph.instagram.com/access_token?grant_type=
      ig_exchange_token` with the short token in the header for a
      long-lived token (two meter calls); `refreshToken` null.
    - `refresh`: GET `https://graph.instagram.com/
      refresh_access_token?grant_type=ig_refresh_token` with the
      current token; `revoke`: no endpoint known, resolves without a
      request (recorded in Ruling 21).
    - `accounts`: GET `https://graph.instagram.com/<ver>/me?fields=
      user_id,username,account_type`; `account_type` `BUSINESS` or
      `MEDIA_CREATOR` gives one account (`user_id`, `username`), any
      other gives `[]`.
    - `fetchDaily`: GET `/<ver>/<id>/insights?metric=reach,views,
      total_interactions&period=day&since=<from 00:00Z unix>&until=<to
      +1 day 00:00Z unix>`; `IG_METRIC_MAP = { reach: "ig.reach",
      views: "ig.views", total_interactions: "ig.interactions" }`;
      each value's day is the date of `end_time` minus one day; then
      GET `/<ver>/me?fields=followers_count,media_count` for
      `ig.followers` and `ig.posts` on `today`.
    - `publish`: `mediaUrl` null gives `{ status: "failed", code:
      "MEDIA_REQUIRED" }` with no request; else POST
      `/<ver>/<id>/media` (`image_url`, `caption`) then POST
      `/<ver>/<id>/media_publish` (`creation_id`); outcome `published`
      with the returned `id`, `url` null.
  - `x.ts`: `xAdapter(http, cfg: { clientId; clientSecret; now }):
    PlatformAdapter` (`// UNVERIFIED`, general knowledge of X API v2):
    - authorize `https://x.com/i/oauth2/authorize` (space-joined
      scope, PKCE S256); token POST form to
      `https://api.x.com/2/oauth2/token` with `Authorization: Basic
      base64(clientId:clientSecret)` (`grant_type=authorization_code`
      or `refresh_token`); revoke POST
      `https://api.x.com/2/oauth2/revoke`.
    - `accounts`: GET `https://api.x.com/2/users/me?user.fields=
      public_metrics` gives one account (`id`, `username`).
    - `fetchDaily`: `x.followers` and `x.posts` on `today` from
      `public_metrics`; GET `/2/users/<id>/tweets?start_time=<from
      Dubai 00:00 as Z>&end_time=<to + 1 day Dubai 00:00 as Z>&
      tweet.fields=created_at,public_metrics,non_public_metrics&
      max_results=100`, following `meta.next_token` as
      `pagination_token` for at most `X_MAX_PAGES = 5` pages (product
      default); each post counts on the Dubai date of `created_at`:
      `x.impressions` += `non_public_metrics.impression_count`,
      `x.link-clicks` += `non_public_metrics.url_link_clicks`,
      `x.engagements` += like + reply + retweet + quote counts. Days
      with posts only; values are "for posts created that day, as of
      the sync" (Ruling 19).
    - `publish`: text over `X_TEXT_MAX = 280` gives `failed`
      `TEXT_TOO_LONG` with no request; else POST
      `https://api.x.com/2/tweets` `{ text }`; outcome `published` with
      `data.id` and `url` `https://x.com/i/web/status/<id>`.
  - `wire.ts`: `INSTAGRAM` group builds `instagramAdapter`, `X_API`
    builds `xAdapter`.

- [ ] **Step 1: Write the failing tests**

`insights-adapter-common.test.ts`:
- `fixtures_are_labelled`: every `.json` under
  `tests/fixtures/insights/` has `_note` equal to `"ASSUMED SHAPE
  (UNVERIFIED)"` (later tasks' fixtures are covered automatically).
- `http_status_mapping`: through `FakeHttp`: 401 gives `auth`; 429
  with `retry-after: 30` gives `rate-limit` and `retryAfterSec 30`;
  503 gives `transient` `HTTP_503`; 400 gives `permanent` `HTTP_400`;
  body `{"error":"invalid_grant"}` with 400 gives `auth`
  `invalid_grant`; `HttpFailure("TIMEOUT")` gives `transient`
  `TIMEOUT`; the meter ran once per request.
- `adapter_hosts_and_headers`: for every adapter built in this and
  later tasks (a table in the test), driving `authorizeUrl`,
  `exchangeCode`, `accounts`, `fetchDaily` and `publish` (when
  defined) with fixtures: every recorded request URL is `https://`
  with a host in `ADAPTER_HOSTS[platform]`; no URL contains the access
  token or the client secret.

`insights-instagram.test.ts`:
- `ig_authorize_url`: contains the app id, `code_challenge_method=S256`,
  the state and each requested scope.
- `ig_exchange_long_lived`: two requests; the result has
  `refreshToken` null and `expiresAt` from the long-lived token's
  `expires_in`.
- `ig_accounts_eligibility`: `me-business.json` gives one account with
  the username; `me-personal.json` gives `[]`.
- `ig_fetch_maps`: `insights.json` (two days) gives six points with
  ids `ig.reach`, `ig.views`, `ig.interactions`, days shifted one day
  back from `end_time`, plus `ig.followers` and `ig.posts` on
  `today`; the meter ran twice; all points pass `normalisePoints`.
- `ig_publish_two_step`: with `mediaUrl`: two POSTs in order, outcome
  `published` with the fixture id; without: `failed` `MEDIA_REQUIRED`
  and no request.

`insights-x.test.ts`:
- `x_token_basic_auth`: `exchangeCode` sends `Authorization: Basic
  <base64 id:secret>` and `code_verifier` in the form; the secret is
  not in the URL.
- `x_fetch_pages_and_days`: `tweets-1.json` (with `next_token`) and
  `tweets-2.json`: a post at `2026-11-24T21:30:00Z` counts on
  `2026-11-25`; `x.impressions`, `x.link-clicks` and `x.engagements`
  sum per day as defined; `x.followers` and `x.posts` on today; meter
  calls = 1 + pages; a script of 7 pages stops after 5.
- `x_publish_text`: POST body deep-equals `{ text }`; url
  `https://x.com/i/web/status/<id>`; 281 characters give `failed`
  `TEXT_TOO_LONG` with no request.

- [ ] **Step 2: Run** `pnpm --filter @payroll/api test
  insights-adapter-common insights-instagram insights-x`. Expected:
  FAIL.
- [ ] **Step 3: Implement** the files above and the fixtures (each
  with the `_note` field).
- [ ] **Step 4: Run** `pnpm check`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(api): Instagram and X insight adapters`.

### Task 6: TikTok adapter and the gated Snapchat adapter

**Files:**
- Create: `packages/api/src/insights/adapters/tiktok.ts`,
  `adapters/snapchat.ts`
- Modify: `packages/api/src/insights/adapters/wire.ts`,
  `tests/insights-adapter-common.test.ts` (table rows)
- Create fixtures: `tests/fixtures/insights/tiktok/` `token.json`,
  `user-info.json`; `tests/fixtures/insights/snapchat/token.json`
- Test: `packages/api/tests/insights-tiktok.test.ts`,
  `tests/insights-snapchat.test.ts`

**Interfaces:**
- Consumes: Task 5 `requestJson`, `authorizeUrlFor`, `tokenSetFrom`,
  `ADAPTER_HOSTS`.
- Produces:
  - `tiktok.ts`: `tiktokAdapter(http, cfg: { clientKey; clientSecret;
    now }): PlatformAdapter` (`// UNVERIFIED`, general knowledge of the
    TikTok Display API v2): authorize
    `https://www.tiktok.com/v2/auth/authorize/` with `client_key`,
    comma-joined `scope`, `response_type=code`, `redirect_uri`,
    `state`, `code_challenge`, `code_challenge_method=S256`; token and
    refresh POST form to `https://open.tiktokapis.com/v2/oauth/token/`
    (`client_key`, `client_secret` in the form body); revoke POST form
    to `https://open.tiktokapis.com/v2/oauth/revoke/`; `accounts`: GET
    `https://open.tiktokapis.com/v2/user/info/?fields=open_id,
    display_name` gives one account; `fetchDaily` ignores the window
    and reads `follower_count`, `video_count`, `likes_count` once for
    `tt.followers`, `tt.videos`, `tt.likes` on `today` (no backfill,
    catalog `historyBackfill: false`); no `publish` method.
  - `snapchat.ts`: `SNAPCHAT_OPEN_QUESTIONS = ["Which endpoint returns
    Public Profile insights for a brand profile", "Which OAuth scopes
    grant it", "Whether a business or brand profile is eligible",
    "The app review or partner process and its lead time", "Data lag
    and history depth"]`; `snapchatAdapter(http, cfg: { clientId;
    clientSecret; now }): PlatformAdapter`: `authorizeUrl` and
    `exchangeCode` against `https://accounts.snapchat.com/login/
    oauth2/authorize` and `/login/oauth2/access_token`
    (`// UNVERIFIED`); `accounts` and `fetchDaily` throw
    `AdapterError("permanent", "SNAPCHAT_API_NOT_CONFIRMED")`
    (`// NOT FOUND: Public Profile insights endpoint`); `refresh` and
    `revoke` throw the same; no `publish` method.
  - `wire.ts`: `TIKTOK` builds `tiktokAdapter`, `SNAPCHAT` builds
    `snapchatAdapter`.

- [ ] **Step 1: Write the failing tests**

`insights-tiktok.test.ts`:
- `tt_authorize_url`: uses `client_key` (not `client_id`), comma-joined
  scopes and S256.
- `tt_token_secret_in_body`: the token request carries
  `client_secret` in the form body and not in the URL.
- `tt_snapshot_only`: with window `2026-11-01..2026-11-25` and today
  `2026-11-26`, `fetchDaily` makes one request and returns exactly
  three points, all on `2026-11-26`, ids `tt.followers`, `tt.videos`,
  `tt.likes`.
- `tt_no_publish`: `tiktokAdapter(...).publish` is undefined and the
  catalog's tiktok `publish.available` is `"unknown"`.

`insights-snapchat.test.ts`:
- `snapchat_connect_refused_even_configured`: with a configured
  snapchat adapter in the ports, `startInsightConnect` for snapchat
  gives 409 `PLATFORM_NOT_AVAILABLE` and the adapter's
  `authorizeUrl` was not called.
- `snapchat_methods_not_confirmed`: `accounts` and `fetchDaily` reject
  with code `SNAPCHAT_API_NOT_CONFIRMED`.
- `snapchat_gate_moves_together`: if
  `PLATFORM_CATALOG.snapchat.capabilities.insights.available` is
  `true`, then `fetchDaily` must not reject with
  `SNAPCHAT_API_NOT_CONFIRMED` (today the first condition is false, so
  the test documents the rule that lifting the gate needs both
  changes and a source).
- `snapchat_open_questions_listed`: five entries, and the app-review
  checklist of Task 10 repeats them (added there).

- [ ] **Step 2: Run** `pnpm --filter @payroll/api test insights-tiktok
  insights-snapchat insights-adapter-common`. Expected: FAIL.
- [ ] **Step 3: Implement** the files above and fixtures.
- [ ] **Step 4: Run** `pnpm check`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(api): TikTok adapter, gated Snapchat
  adapter`.

### Task 7: Website insights: GA4, Search Console and the pixel

Security task (public endpoint): fresh per-task review.

**Files:**
- Create: `packages/contract/src/insights-sites.ts`
- Modify: `packages/contract/src/routes-insights.ts`, `src/errors.ts`,
  `src/registry.ts`, `src/examples.ts`, `src/index.ts`
- Create: `packages/api/migrations/1505_insight_sites.sql`,
  `packages/api/src/insights/adapters/google-oauth.ts`,
  `adapters/ga4.ts`, `adapters/search-console.ts`,
  `src/insights/pixel-clean.ts` (pure), `src/insights/pixel.ts`,
  `src/insights/sites.ts`, `src/insights/snippet.ts` (pure),
  `src/routes/insights-sites.ts`
- Modify: `packages/api/src/insights/adapters/wire.ts`,
  `tests/insights-adapter-common.test.ts` (table rows)
- Create fixtures: `tests/fixtures/insights/google/` `token.json`,
  `account-summaries.json`, `ga4-sessions.json`, `ga4-users.json`,
  `ga4-pages.json`, `gsc-sites.json`, `gsc-query.json`
- Test: `packages/api/tests/insights-google.test.ts`,
  `tests/insights-pixel-clean.test.ts`, `tests/insights-pixel.test.ts`

**Interfaces:**
- Consumes: Tasks 1 to 5; Plan 13 `consumeRate`; Plan 3 `pub` route
  helper and `ctx.enterTenant`.
- Produces (contract):
  - `Origin = ^https://[a-z0-9.-]+(:\d{2,5})?$`.
  - `InsightSite { id; name; publicKey: ^pk_[A-Za-z0-9_-]{22}$;
    allowedOrigins: Origin[] 1..10; careersPathPrefix: ^/[^?#]{0,99}$;
    careersUrl: string (https URL) | null; status: "active" |
    "archived"; createdAt }`; `InsightSiteCreate { name 1..80;
    allowedOrigins; careersPathPrefix (default "/careers"); careersUrl?
    }`; `InsightSiteUpdate` (partial of create plus `status`).
  - `PixelBeacon { t: "view" | "apply-click"; p: string 1..2048; r?:
    string max 2048; u?: { s?: max 100; m?: max 100; c?: max 100 } }`.
  - `PIXEL_NOTE = "Counts only: no cookies, no visitor id, and no IP
    address or browser details are stored. Query strings are dropped.
    Say in your website's privacy notice that you count page views."`
  - Routes appended: `listInsightSites GET /v1/insights/sites` (owner,
    hr); `createInsightSite POST /v1/insights/sites` (owner, hr; 201);
    `updateInsightSite PATCH /v1/insights/sites/{id}` (owner, hr);
    `getInsightSiteSnippet GET /v1/insights/sites/{id}/snippet`
    (owner, hr; `contentType: "text/plain"`); `collectPixel POST
    /v1/px/{siteKey}` (public, `rawBody: true`, `bodyLimit: 4096`,
    status 204; appended to `PUBLIC_INSIGHT_IDS`).
  - Errors: `PIXEL_ORIGIN_FORBIDDEN` 403.
- Produces (api):
  - Migration 1505: `insight_sites(id, company_id, name, public_key
    text unique, allowed_origins text[], careers_path_prefix,
    careers_url, status, created_by, created_at)`; function
    `pixel_site_lookup(p_key text) RETURNS TABLE(company_id uuid,
    site_id uuid, allowed_origins text[])` `SECURITY DEFINER`, owned by
    `payroll_jobs` (SELECT on `insight_sites` only), active sites only;
    `GRANT EXECUTE` to `payroll_app`.
  - `google-oauth.ts`: `googleOAuth(http, cfg: { clientId;
    clientSecret; now })` giving `authorizeUrl` (base
    `https://accounts.google.com/o/oauth2/v2/auth`, `access_type=
    offline`, `prompt=consent`, `include_granted_scopes=true`,
    space-joined scope, S256), `exchangeCode` and `refresh` (POST form
    to `https://oauth2.googleapis.com/token`; a refresh response
    without `refresh_token` keeps the old one) and `revoke` (POST form
    to `https://oauth2.googleapis.com/revoke`), all `// UNVERIFIED`.
  - `ga4.ts`: `ga4Adapter(http, cfg): PlatformAdapter` (Google OAuth
    plus): `accounts`: GET `https://analyticsadmin.googleapis.com/
    v1beta/accountSummaries` gives one choice per property
    (`properties/<n>`, the property's display name); `fetchDaily`:
    three POSTs to `https://analyticsdata.googleapis.com/v1beta/
    <property>:runReport` with `dateRanges [{ startDate: from,
    endDate: to }]`: (1) dimensions `date`, `sessionSource`,
    `sessionMedium`, `sessionCampaignName`, metric `sessions` to
    `ga4.sessions`; (2) dimension `date`, metric `totalUsers` to
    `ga4.users`; (3) dimensions `date`, `pagePath`, metric
    `screenPageViews`, `limit 1000`, to `ga4.page-views`. `date`
    `YYYYMMDD` becomes ISO; a dimension value `(not set)` or empty is
    left out of `dims`; page paths go through `cleanPath`.
  - `search-console.ts`: `searchConsoleAdapter(http, cfg)`: `accounts`:
    GET `https://www.googleapis.com/webmasters/v3/sites` (entries with
    `permissionLevel` other than `siteUnverifiedUser`); `fetchDaily`:
    POST `https://www.googleapis.com/webmasters/v3/sites/<encoded
    siteUrl>/searchAnalytics/query` `{ startDate, endDate, dimensions:
    ["date","page"], rowLimit: 1000 }` to `gsc.clicks`,
    `gsc.impressions`, `gsc.position` with `page` from `cleanPath`
    (Ruling 18: pages only, no search queries).
  - `pixel-clean.ts` (pure):
    - `cleanPath(p: string): string | null`: take the path of an
      absolute URL, else the input; drop query and fragment;
      percent-decode (invalid encoding gives null); collapse repeated
      `/`; must start with `/`; then replace a segment containing `@`,
      a run of 6 or more digits, a UUID, or a hex run of 16 or more
      characters with `:id`; cut to 200 characters.
    - `referrerHost(r: string | undefined): string | null` (lower-case
      host of an `http` or `https` URL, else null).
    - `cleanUtm(v: string | undefined): string | null` (null when it
      contains `@`; trim, lower-case, characters outside `[a-z0-9._-]`
      become `-`, cut to 60, empty gives null).
    - `isBot(ua: string | undefined): boolean` (missing or matching
      `/bot|crawl|spider|slurp|preview|headless|lighthouse/i`).
    - `beaconDims(b: PixelBeacon, siteHosts: string[]): Partial<Record<
      DimName, string>>`: `page` = `cleanPath(b.p)`; `source` =
      `cleanUtm(b.u?.s)`, else the referrer host when it is not one of
      `siteHosts`, else `"direct"`; `medium` = `cleanUtm(b.u?.m)`, else
      `"referral"` when a foreign referrer exists, else `"none"`;
      `campaign` = `cleanUtm(b.u?.c)` (left out when null).
  - `pixel.ts`: `collectPixel(c, siteKey, rawBody, headers)`: unknown
    or archived key 404 `NOT_FOUND`; `Origin` header not in
    `allowed_origins` 403 `PIXEL_ORIGIN_FORBIDDEN`; `isBot(user-agent)`
    gives 204 with nothing stored; body not a `PixelBeacon` (after
    `JSON.parse`) 400 `VALIDATION_FAILED`; `cleanPath` null gives 204
    with nothing stored; `consumeRate(tx, companyId, "pixel", siteId,
    600, 60, now)` (product default) else 429 `RATE_LIMITED`; then one
    upsert into `insight_points` (`source_id` = site id, metric
    `px.views` or `px.apply-clicks`, `day = dubaiDate(now)`, `value_e4
    = insight_points.value_e4 + 10000` on conflict). The response sets
    `Access-Control-Allow-Origin` to the allowed origin and `Vary:
    Origin`. The user agent and IP are read only for the bot check and
    the rate key and never written.
  - `sites.ts`: create (public key `pk_` + 22 base64url characters from
    16 random bytes), list, update; audit `insights.site-created` and
    `insights.site-updated` (`data: { siteId, changed }`).
  - `snippet.ts` (pure): `buildSnippet(apiBase: string, publicKey:
    string): string`: one `<script>` that, on load, sends `{ t: "view",
    p: location.pathname, r: document.referrer, u: { s, m, c } }` (the
    three `utm_` values read from `location.search`; nothing else from
    it) with `navigator.sendBeacon` as a `text/plain` Blob to
    `<apiBase>/v1/px/<publicKey>`, and sends `t: "apply-click"` when an
    element with a `data-apply` attribute is clicked. No cookie, no
    `localStorage`, no `sessionStorage`, no identifier. The source
    builds the text from an array of short strings.
  - `wire.ts`: `GOOGLE_INSIGHTS` builds both Google adapters.

- [ ] **Step 1: Write the failing tests**

`insights-pixel-clean.test.ts` (pure):
- `clean_path_rules`: `"/careers/?email=a@b.com#x"` gives
  `"/careers/"`; `"https://acme.ae/jobs/123456/apply?utm_source=ig"`
  gives `"/jobs/:id/apply"`; `"/u/sara@acme.ae"` gives `"/u/:id"`;
  `"/a//b"` gives `"/a/b"`; `"/%E0%A4%A"` gives null; `"careers"`
  gives null; a 300-character path gives 200 characters.
- `referrer_and_utm`: `referrerHost("https://www.Instagram.com/p/x?y=1")`
  is `"www.instagram.com"`; `referrerHost("android-app://x")` is null;
  `cleanUtm("Summer Hiring 2026!")` is `"summer-hiring-2026-"`;
  `cleanUtm("a@b.com")` is null.
- `beacon_dims`: no UTM, referrer on the site's own host: `source
  "direct"`, `medium "none"`, no `campaign`; UTM source `Instagram`
  medium `social`: `source "instagram"`, `medium "social"`.

`insights-pixel.test.ts`:
- `site_crud_and_snippet`: hr creates a site (201, `publicKey`
  matches the pattern); manager 403; `allowedOrigins ["http://x.ae"]`
  400; the snippet route returns `text/plain` containing the key and
  `/v1/px/`, and not containing `cookie`, `localStorage` or
  `sessionStorage`.
- `pixel_counts`: two `view` beacons for `/careers` with UTM source
  `instagram`, medium `social`, from an allowed origin, and one
  `apply-click`: `px.views` row with `dimKey
  "medium=social|page=/careers|source=instagram"` and `value_e4
  20000n`; `px.apply-clicks` 10000n; responses 204 with
  `Access-Control-Allow-Origin` equal to the origin.
- `pixel_stores_no_identifiers` (Review Focus 5): a beacon with an
  `Origin` not allowed gives 403 and no row; user agent `"Googlebot/2.1"`
  gives 204 and no row; page `"/careers?email=sara@acme.ae"` with
  referrer `"https://mail.example/inbox?u=sara@acme.ae"`: the joined
  `row_to_json` text of every `insight_points` row, every audit row and
  every log line contains no `sara`, no `@` and no `?`; the 601st beacon
  within one minute gives 429 and the count stays 600 beacons; no
  column of any `insight_*` table is named like `ip`, `user_agent`,
  `cookie` or `visitor` (catalog scan).
- `pixel_unknown_or_archived_key`: unknown key 404; after archiving
  the site its key gives 404.
- `pixel_is_public`: no `Authorization` header needed; the route id is
  in `PUBLIC_INSIGHT_IDS`, which `tests/routes.test.ts` adds to its
  allowed public ids (beside Plan 13's `PUBLIC_CHANNEL_IDS`).

`insights-google.test.ts`:
- `google_authorize_offline`: the URL has `access_type=offline`,
  `prompt=consent`, the analytics scope and S256.
- `google_refresh_keeps_refresh_token`: a refresh response without
  `refresh_token` keeps the old one.
- `ga4_properties_as_choices`: two properties in the fixture give a
  `pending-account` connection with two choices (through
  `completeInsightConnect` with the adapter over `FakeHttp`).
- `ga4_reports_map`: the three fixtures give `ga4.sessions` with
  `source`, `medium`, `campaign` dims (a `(not set)` campaign left
  out), `ga4.users` and `ga4.page-views` with `page`; `"20261124"`
  becomes `"2026-11-24"`; the meter ran three times.
- `gsc_pages_clean`: page `"https://acme.ae/careers?ref=x"` becomes
  `"/careers"`; `position` 3.25 normalises to `32500n`; a site with
  `siteUnverifiedUser` is not offered as a choice.

- [ ] **Step 2: Run** `pnpm --filter @payroll/api test insights-google
  insights-pixel`. Expected: FAIL.
- [ ] **Step 3: Implement** the files above and fixtures; conformance
  rows (the pixel row posts a valid beacon with an allowed origin);
  leak id map (`siteId`).
- [ ] **Step 4: Run** `pnpm check`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(api): GA4, Search Console and pixel
  website insights`.

### Task 8: Dashboard endpoints and the careers funnel

**Files:**
- Create: `packages/contract/src/insights-dash.ts`
- Modify: `packages/contract/src/routes-insights.ts`, `src/errors.ts`,
  `src/registry.ts`, `src/examples.ts`, `src/index.ts`
- Create: `packages/api/migrations/1506_candidate_attribution.sql`,
  `packages/api/src/insights/values.ts` (pure),
  `src/insights/overview.ts`, `src/insights/sources.ts`,
  `src/insights/utm.ts` (pure), `src/insights/funnel.ts` (pure),
  `src/insights/careers.ts`, `src/routes/insights-dash.ts`
- Test: `packages/api/tests/insights-values.test.ts`,
  `tests/insights-dash.test.ts`, `tests/insights-funnel.test.ts`

**Interfaces:**
- Consumes: Task 2 `METRIC_CATALOG`, `rollup`, `readSeries`,
  `readByDim`, `assertComparable`; Task 3 `loadConnection`; Task 7
  sites, `cleanUtm`; Plan 8 tables `candidates`, `applications`,
  `application_stage_events`.
- Produces (contract):
  - `MetricValue = ^\d{1,15}(\.\d{1,4})?$` (decimal text from
    `value_e4`).
  - `HEADLINE_METRICS: Record<PlatformId, string[]>`: instagram
    `["ig.followers","ig.reach","ig.views","ig.interactions"]`; x
    `["x.followers","x.impressions","x.engagements"]`; tiktok
    `["tt.followers","tt.videos","tt.likes"]`; snapchat
    `["sc.followers","sc.views"]`; ga4 `["ga4.sessions","ga4.users",
    "ga4.page-views"]`; search-console `["gsc.clicks",
    "gsc.impressions","gsc.position"]`; pixel `["px.views",
    "px.apply-clicks"]`.
  - `NO_TOTALS_NOTE = "Each platform counts differently, so figures
    are shown per platform and never added together."`
  - `RangeQuery { from: IsoDate; to: IsoDate }` refined `from <= to`
    and at most 366 days.
  - `MetricSummary { metricId; label; aggregation; current: MetricValue
    | null; previous: MetricValue | null; changePct: int | null;
    series: { day: IsoDate; value: MetricValue }[] }`;
    `OverviewTile { sourceId: Id; sourceKind: "connection" | "site";
    platform; displayName: string; status: string; metrics:
    MetricSummary[] }`; `InsightOverview { from; to; tiles:
    OverviewTile[]; note: typeof NO_TOTALS_NOTE }`.
  - `SeriesQuery { sourceId; metricId; from; to; grain: "day" | "week"
    | "month" (default "day"); dimKey?: max 400 }`; `InsightSeries {
    sourceId; metricId; grain; points: { start: IsoDate; value:
    MetricValue }[] }`.
  - `TopQuery { sourceId; metricId; from; to; limit: int 1..50
    (default 10) }`; `TopRows { metricId; rows: { value: string; total:
    MetricValue }[] }`.
  - `CareersFunnelQuery { from; to; siteId?: Id; ga4ConnectionId?: Id;
    careersPathPrefix?: ^/[^?#]{0,99}$ }` refined: exactly one of
    `siteId` and `ga4ConnectionId`.
  - `CareersFunnel { from; to; traffic: { system: "pixel" | "ga4";
    careersViews: MetricValue; applyClicks: MetricValue | null;
    bySource: { source: string; views: MetricValue }[]; byCampaign: {
    campaign: string; views: MetricValue; applyClicks: MetricValue |
    null }[] }; hiring: { candidates: int; applications: int; hires:
    int; bySource: { source: string; candidates: int }[]; byCampaign:
    { campaign: string; candidates: int; applications: int; hires: int
    }[] }; note: typeof FUNNEL_NOTE }`; `FUNNEL_NOTE = "Traffic and
    candidates are linked by campaign name only, never by visitor. A
    campaign shows both sides only when the same UTM campaign is used
    on links and recorded on candidates."`
  - `CandidateAttributionPut = { utmSource?: max 100; utmMedium?: max
    100; utmCampaign?: max 100 } | { fromUrl: https URL max 2048 }`;
    `CandidateAttribution { candidateId; utmSource: string | null;
    utmMedium: string | null; utmCampaign: string | null }`.
  - `AdvocacyLinkQuery { siteId: Id; campaign?: max 60 }`;
    `AdvocacyLink { url: string; note: typeof ADVOCACY_NOTE }`;
    `ADVOCACY_NOTE = "This link carries no personal identifier, so
    shares are counted together, not per employee."`
  - Routes appended: `getInsightOverview GET /v1/insights/overview`
    (`RangeQuery`), `getInsightSeries GET /v1/insights/series`,
    `getInsightTopPages GET /v1/insights/top-pages`,
    `getInsightTrafficSources GET /v1/insights/traffic-sources`,
    `getCareersFunnel GET /v1/insights/careers-funnel` (all owner,
    hr); `putCandidateAttribution PUT
    /v1/candidates/{id}/attribution` (owner, hr) to
    `CandidateAttribution`; `getAdvocacyLink GET
    /v1/insights/advocacy-link` (all roles).
  - Errors: `DIMENSION_NOT_SUPPORTED` 422, `CAREERS_URL_MISSING` 409.
- Produces (api):
  - Migration 1506: `candidate_attribution(company_id, candidate_id
    uuid pk, utm_source, utm_medium, utm_campaign, set_by, set_at)`.
    RLS; grants select, insert, update.
  - `values.ts` (pure): `formatE4(v: bigint): string` (`123`,
    `3.25`, trailing zeros dropped); `summariseMetric(def: MetricDef,
    cur: { day; valueE4 }[], prev: { day; valueE4 }[]): Omit<
    MetricSummary, "series">`: `sum` gives totals; `last` gives the
    latest day's value in each period; `none` gives `current` and
    `previous` null; `changePct = trunc((cur - prev) * 100 / prev)`
    (bigint division), null when either is null or `prev` is 0;
    `previousRange(from, to): { from; to }` (the same number of days
    ending the day before `from`).
  - `sources.ts`: `loadSource(tx, companyId, sourceId): Promise<{ kind:
    "connection" | "site"; platform: PlatformId; displayName; status;
    careersPathPrefix: string | null }>` (connection of any status,
    revoked included, or site; else 404); `assertMetricFor(platform,
    metricId)` (422 `METRIC_PLATFORM_MISMATCH`).
  - `overview.ts`: `buildOverview(ctx, range): Promise<InsightOverview>`:
    one tile per connection that is not `pending-account` and per
    active site, each with its `HEADLINE_METRICS`; `series` is the
    daily series of the current range (`dimKey ""`); `none`
    metrics show the series only. No field sums across tiles.
  - Series and top routes: series uses `rollup` with the metric's
    aggregation; top pages needs a metric whose `dims` include `page`,
    traffic sources one with `source`, else 422
    `DIMENSION_NOT_SUPPORTED`; both use `readByDim`.
  - `utm.ts` (pure): `tagUrl(url: string, u: { source: string; medium:
    string; campaign: string }): string` (sets or replaces the three
    `utm_` parameters, keeps others and their order);
    `tagLinksInText(text: string, u): string` (every `https?://\S+`
    token tagged, trailing `.,;:!?)` kept outside the URL);
    `parseUtm(url: string): { utmSource; utmMedium; utmCampaign }`
    (each through `cleanUtm`).
  - `funnel.ts` (pure): `buildCareersFunnel(i: { system; prefix:
    string; views: { page; source: string | null; campaign: string |
    null; valueE4: bigint }[]; clicks: same[] | null; candidates: {
    id; source; createdDay: string; campaign: string | null }[];
    applications: { id; candidateId; createdDay: string }[]; hires: {
    applicationId; day: string }[]; from; to }): CareersFunnel`:
    views count when `page` starts with `prefix`; candidates,
    applications and hires count when their day is within `from..to`
    (Dubai dates); `byCampaign` lists every campaign seen on either
    side, sorted by name, with `""` shown as `"(none)"`; ratios are
    not computed (Ruling 15).
  - `careers.ts`: loads the inputs: pixel site: `px.views` and
    `px.apply-clicks` rows by dims; GA4: `ga4.page-views` rows by
    `page` with `careersPathPrefix` (query, default `"/careers"`),
    `applyClicks` null, `bySource` and `byCampaign` empty for traffic
    (GA4 page views carry no source dims; Ruling 15); candidates from
    Plan 8 with `candidate_attribution.utm_campaign`; hires are
    `application_stage_events` with stage `hired`.
  - `putCandidateAttribution`: candidate must exist in the tenant
    (404); `fromUrl` parsed with `parseUtm`; values through
    `cleanUtm`; upsert; audit `candidate.attribution-set` (`data: {
    candidateId, fields: string[] }`).
  - `getAdvocacyLink`: site `careersUrl` null 409
    `CAREERS_URL_MISSING`; `url = tagUrl(careersUrl, { source:
    "employee-share", medium: "advocacy", campaign: cleanUtm(campaign)
    ?? "advocacy" })`; no user, employee or company id in the URL
    (Ruling 14).
- Web endpoint spec (for a later web plan under the owner's approved
  UI concept; no web code here): an "Insights" area for owner and hr
  with: Overview (one tile per platform or site with headline metrics,
  sparkline, change and `NO_TOTALS_NOTE`; no total tile); Metric detail
  (chart from `getInsightSeries` with a day, week, month switch that
  disables week and month for `aggregation "none"`); Website (top
  pages, traffic sources); Careers funnel (traffic beside candidates,
  applications and hires by campaign with `FUNNEL_NOTE`); Connections
  (a card per platform from `listInsightPlatforms` with capability
  badges, the catalog notes, "not configured" and "not available"
  states, reconnect for `needs-reauth`, last sync and errors);
  Alerts, Reports, Posts, Sites (with the snippet and `PIXEL_NOTE`),
  App review (Task 10), Settings. A "Share a job" button on the
  employee home uses `getAdvocacyLink`. Empty, loading and error
  states everywhere; English and Arabic labels (Arabic NEEDS NATIVE
  REVIEW).

- [ ] **Step 1: Write the failing tests**

`insights-values.test.ts` (pure):
- `format_e4`: `120000n` gives `"12"`, `32500n` gives `"3.25"`, `0n`
  gives `"0"`.
- `summarise_rules`: `ig.views` 10 a day on 2026-11-01..07 (previous)
  and 13 a day on 2026-11-08..14 (current): current `"91"`, previous
  `"70"`, `changePct 30`; `ig.followers` gives the value of the last
  day in each period; `ig.reach` gives current and previous null and
  `changePct` null; previous total 0 gives `changePct` null; a drop
  from 70 to 50 gives `-28`.
- `previous_range`: `2026-11-08..2026-11-14` gives
  `2026-11-01..2026-11-07`.
- `utm_tagging`: `tagUrl("https://a.ae/j?x=1&utm_source=old",
  { source: "x", medium: "social", campaign: "summer" })` is
  `"https://a.ae/j?x=1&utm_source=x&utm_medium=social&
  utm_campaign=summer"` (one string in the test);
  `tagLinksInText("Join us: https://a.ae/careers.", ...)` keeps the
  final `.` outside the URL.

`insights-dash.test.ts`:
- `overview_has_no_cross_platform_total` (Review Focus 3): with an
  instagram and a tiktok connection both holding data, the overview
  has one tile per source; no key named `total` or `totals` appears at
  any depth of the JSON; `note` equals `NO_TOTALS_NOTE`; the instagram
  `ig.views` current equals the sum of instagram rows only.
- `overview_includes_revoked_history`: a revoked connection still has
  a tile with `status "revoked"` and its history; a `pending-account`
  connection has none.
- `series_grain_and_mismatch`: `ig.reach` with grain `week` 422
  `GRAIN_NOT_SUPPORTED`; `gsc.clicks` on an instagram source 422
  `METRIC_PLATFORM_MISMATCH`; company B's source id 404; `ig.views`
  week grain from Monday 2026-11-02 gives weekly sums.
- `top_pages_and_sources`: `px.views` pages sorted by total with
  `limit 2`; `ig.views` on the top-pages route 422
  `DIMENSION_NOT_SUPPORTED`; traffic sources for `ga4.sessions`
  grouped by `source`.
- `dash_roles`: manager and employee get 403 on every dashboard route.

`insights-funnel.test.ts`:
- `funnel_pixel`: site prefix `/careers`; `px.views` 50 on
  `/careers` (campaign `summer`, source `instagram`), 30 on
  `/careers/dev` (no campaign), 99 on `/about`: `careersViews "80"`;
  three candidates created in range (two `social` with attribution
  campaign `summer`, one `website` without), one created before the
  range; both `summer` candidates applied and one was hired in range:
  `hiring.candidates 3`, `byCampaign` row `summer` `{ candidates: 2,
  applications: 2, hires: 1 }` and its traffic views `"50"`; the
  `"(none)"` row has views `"30"` and one candidate.
- `funnel_ga4_no_source_split`: with a GA4 connection, `careersViews`
  counts `ga4.page-views` under `/careers`, `applyClicks` is null and
  traffic `bySource` is empty.
- `funnel_requires_one_source`: both ids 400; neither 400.
- `attribution_from_url`: `fromUrl "https://acme.ae/careers?
  utm_source=Instagram&utm_campaign=Summer%2026"` stores
  `utmSource "instagram"`, `utmCampaign "summer-26"`; manager 403;
  company B's candidate 404; audit `data.fields` lists the three
  names.
- `advocacy_link_no_identifier`: an employee gets `url
  "https://acme.ae/careers?utm_source=employee-share&utm_medium=
  advocacy&utm_campaign=advocacy"` (one string in the test), which
  contains none of the caller's user id, employee id or the company
  id; a site without `careersUrl` 409 `CAREERS_URL_MISSING`.

- [ ] **Step 2: Run** `pnpm --filter @payroll/api test insights-values
  insights-dash insights-funnel`. Expected: FAIL.
- [ ] **Step 3: Implement** the files above; conformance rows; leak id
  map; `mayView` owner and hr (advocacy link: all).
- [ ] **Step 4: Run** `pnpm check`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(api): insight dashboards and careers
  funnel`.

### Task 9: Alerts, scheduled reports and data retention

**Files:**
- Create: `packages/contract/src/insights-alerts.ts`
- Modify: `packages/contract/src/routes-insights.ts`, `src/errors.ts`,
  `src/registry.ts`, `src/examples.ts`, `src/index.ts`, Plan 13
  `src/notifications.ts` and `src/templates.ts` (two kinds)
- Create: `packages/api/migrations/1507_insight_alerts_reports.sql`,
  `packages/api/src/insights/alert-eval.ts` (pure),
  `src/insights/report-period.ts` (pure),
  `src/insights/retention.ts` (pure), `src/insights/alerts.ts`,
  `src/insights/reports.ts`, `src/insights/insight-jobs.ts`,
  `src/routes/insights-alerts.ts`
- Modify: `packages/api/src/main.ts` (`jobs` runs
  `runInsightAlertsAndReports` and `runInsightRetention`)
- Test: `packages/api/tests/insights-alert-eval.test.ts`,
  `tests/insights-alerts.test.ts`, `tests/insights-reports.test.ts`,
  `tests/insights-retention.test.ts`

**Interfaces:**
- Consumes: Task 2 `readSeries`; Task 4 connection failures; Task 8
  `summariseMetric`, `previousRange`, `loadSource`, `assertMetricFor`,
  `HEADLINE_METRICS`, `NO_TOTALS_NOTE`; Plan 13 `notify`; Plan 11
  `JobCtx`, `payroll_jobs`.
- Produces (contract):
  - `AlertKind = z.enum(["drop-pct","rise-pct","below","above",
    "no-data","sync-failing"])`.
  - `AlertRuleBody { name 1..80; sourceId: Id; metricId?: string;
    kind; threshold: int 1..1000000; windowDays: int 1..90 (default 7);
    recipients: Id[] 1..10 }` refined: `metricId` required unless
    `sync-failing`; `threshold <= 1000` for the two `-pct` kinds;
    `AlertRule = Body & { id; status: "active" | "paused"; createdBy;
    createdAt; lastEvaluatedOn: IsoDate | null }`; `AlertRuleUpdate`
    (partial of body plus `status`).
  - `InsightAlert { id; ruleId; ruleName; day: IsoDate; reason:
    "drop" | "rise" | "below" | "above" | "no-data" | "sync-failing";
    observed: MetricValue | null; baseline: MetricValue | null; firedAt
    }`.
  - `ALERT_NOTE = "Alert rules are your own settings, not advice. A
    rule fires at most once a day."`
  - `ReportScheduleBody { name 1..80; cadence: "weekly" | "monthly";
    sourceIds: Id[] 1..20; recipients: Id[] 1..10 }`;
    `ReportSchedule = Body & { id; status: "active" | "paused";
    nextRunOn: IsoDate; createdBy; createdAt }`;
    `ReportScheduleUpdate`; `InsightReport { id; scheduleId;
    periodStart; periodEnd; createdAt; sections: { sourceId; platform;
    displayName; metrics: Omit<MetricSummary, "series">[] }[]; note:
    typeof NO_TOTALS_NOTE }`.
  - Routes appended (owner, hr): `listInsightAlertRules GET
    /v1/insights/alert-rules`, `createInsightAlertRule POST
    /v1/insights/alert-rules` (201), `updateInsightAlertRule PATCH
    /v1/insights/alert-rules/{id}`, `listInsightAlerts GET
    /v1/insights/alerts` (query `before?: Timestamp`, `limit?: 1..100`),
    `listInsightReportSchedules GET /v1/insights/report-schedules`,
    `createInsightReportSchedule POST /v1/insights/report-schedules`
    (201), `updateInsightReportSchedule PATCH
    /v1/insights/report-schedules/{id}`, `listInsightReports GET
    /v1/insights/reports`, `getInsightReport GET
    /v1/insights/reports/{id}`.
  - Errors: `RECIPIENT_NOT_ALLOWED` 422.
  - Plan 13 `NotificationKind` gains `"insight-alert"` (vars
    `ruleName`, `platformName`, `metricLabel`, `reasonWord`; link
    `/insights/alerts`) and `"insight-report"` (vars `scheduleName`,
    `periodStart`, `periodEnd`; link `/insights/reports/<id>`), English
    copy here and Arabic marked `NEEDS NATIVE REVIEW`. No number with
    decimals is ever a variable.
- Produces (api):
  - Migration 1507: `insight_alert_rules(id, company_id, name,
    source_id, metric_id, kind, threshold, window_days, recipients
    uuid[], status, created_by, created_at, last_evaluated_on date)`;
    `insight_alerts(id, company_id, rule_id, day date, reason,
    observed_e4 bigint, baseline_e4 bigint, fired_at, unique(company_id,
    rule_id, day))`; `insight_report_schedules(id, company_id, name,
    cadence, source_ids uuid[], recipients uuid[], status, next_run_on
    date, created_by, created_at)`; `insight_reports(id, company_id,
    schedule_id, period_start, period_end, body jsonb, created_at,
    unique(schedule_id, period_start))`. RLS; grants select, insert,
    update. Functions owned by `payroll_jobs`, `SECURITY DEFINER`:
    `due_insight_companies(p_today date) RETURNS TABLE(company_id uuid,
    user_id uuid)` (companies with an active rule whose
    `last_evaluated_on` is null or before `p_today`, or an active
    schedule with `next_run_on <= p_today`; `user_id` = that row's
    `created_by`); `insight_companies() RETURNS TABLE(company_id uuid,
    user_id uuid)` (companies with an `insight_settings` row; `user_id`
    = `updated_by`); `purge_insight_data(p_company uuid, p_before date)
    RETURNS int` that raises unless `p_company =
    nullif(current_setting('app.company_id', true), '')::uuid`, then
    deletes that company's `insight_points` with `day < p_before`,
    `insight_sync_runs` and `insight_alerts` and `insight_reports` with
    their date before `p_before`, and returns the count;
    `payroll_jobs` gets DELETE on those four tables only. `GRANT
    EXECUTE` on all three to `payroll_app`.
  - `alert-eval.ts` (pure): `evaluateRule(r: { kind; threshold;
    windowDays }, s: { points: { day; valueE4 }[]; today: string;
    consecutiveFailures: number; connectedDay: string }): { fired:
    boolean; reason: InsightAlert["reason"] | null; day: string;
    observedE4: bigint | null; baselineE4: bigint | null; skip:
    "insufficient-data" | "zero-baseline" | "no-points" | null }`:
    - `below` and `above`: latest point against `threshold * 10000`.
    - `drop-pct` and `rise-pct`: latest point against the baseline =
      floor of the mean of the points in the `windowDays` days before
      the latest day; fewer than `ceil(windowDays / 2)` such points:
      `skip "insufficient-data"`; baseline 0: `skip "zero-baseline"`;
      `pct = (baseline - latest) * 100 / baseline` (drop) or
      `(latest - baseline) * 100 / baseline` (rise), bigint division;
      fired when `pct >= threshold`.
    - `no-data`: days from the latest point day (or `connectedDay`
      when there are none) to `today` greater than `threshold`; `day =
      today`.
    - `sync-failing`: `consecutiveFailures >= threshold`; `day =
      today`.
    - `day` is the latest point's day for the four value kinds; no
      points gives `skip "no-points"`.
  - `report-period.ts` (pure): `reportPeriod(cadence, runOn): { start;
    end }` (weekly: the Monday-to-Sunday week before `runOn`; monthly:
    the calendar month before `runOn`); `nextRunOn(cadence, after):
    string` (weekly: the next Monday strictly after; monthly: day 1 of
    the next month strictly after).
  - `retention.ts` (pure): `retentionCutoff(today: string, months:
    number): string` = day 1 of the month `months` months before
    today's month.
  - `alerts.ts`: rule CRUD (recipients must be owner or hr members of
    the company, else 422 `RECIPIENT_NOT_ALLOWED`; `sync-failing` needs
    a connection source; `assertMetricFor`; audit
    `insights.alert-rule-created` and `-updated` with `data: { ruleId,
    changed }`); `evaluateCompanyRules(c: JobCtx, today)`: per active
    rule not yet evaluated today: `evaluateRule` on the last
    `windowDays + 1` days of the series (`dimKey ""`); when fired,
    insert the alert `ON CONFLICT DO NOTHING` and, only when a row was
    inserted, `notify` each recipient; set `last_evaluated_on = today`.
  - `reports.ts`: schedule CRUD (`nextRunOn(cadence, today)` on
    create; same recipient rule); `runDueReports(c: JobCtx, today)`:
    per due schedule, `reportPeriod(cadence, next_run_on)`, one section
    per source with `summariseMetric` over `HEADLINE_METRICS` (period
    against the previous equal period), insert `ON CONFLICT DO
    NOTHING`, notify recipients only when inserted, `next_run_on =
    nextRunOn(cadence, today)`; audit `insights.report-created`.
  - `insight-jobs.ts`: `runInsightAlertsAndReports(db, deps):
    Promise<{ companies: number; alerts: number; reports: number }>`
    over `due_insight_companies(today)`; `runInsightRetention(db,
    deps): Promise<{ companies: number; rows: number }>` over
    `insight_companies()`, per company `purge_insight_data(id,
    retentionCutoff(today, settings.retentionMonths))` inside its
    `withTenant`, audit `insights.retention-purged` (`data: { before,
    rows }`).

- [ ] **Step 1: Write the failing tests**

`insights-alert-eval.test.ts` (pure):
- `drop_and_rise`: seven days of 100 then 70, window 7: `drop-pct`
  threshold 25 fires with `observedE4 700000n`, `baselineE4 1000000n`;
  threshold 31 does not; seven days of 100 then 130, `rise-pct`
  threshold 30 fires.
- `skips`: four points before the latest with window 10 gives `skip
  "insufficient-data"`; a baseline of zeros gives `skip
  "zero-baseline"`; no points gives `skip "no-points"`.
- `levels`: `below` 80 with latest 70 fires; `above` 80 with latest 70
  does not.
- `no_data_and_sync`: `no-data` threshold 3, latest day `2026-11-21`,
  today `2026-11-26` fires; latest `2026-11-24` does not; no points
  and `connectedDay 2026-11-20` fires; `sync-failing` threshold 3 with
  3 failures fires, with 2 does not.

`insights-alerts.test.ts`:
- `alert_rule_validation`: `drop-pct` without `metricId` 400; a
  manager as recipient 422 `RECIPIENT_NOT_ALLOWED`; `gsc.clicks` on an
  instagram source 422 `METRIC_PLATFORM_MISMATCH`; `sync-failing` on a
  pixel site 422 `VALIDATION_FAILED`; manager create 403.
- `alert_job_once_per_day`: a firing rule gives one `insight_alerts`
  row and one notification per recipient; running the job again the
  same Dubai day gives no new row and no new notification; the next
  day, with the metric recovered, no alert; a paused rule is not
  evaluated.
- `alert_vars_have_no_decimals`: every `vars` value passed to
  `notify` fails `^\d[\d,]*\.\d{2}$` (Plan 13's
  `TEMPLATE_VAR_FORBIDDEN` pattern).

`insights-reports.test.ts`:
- `report_period_and_next`: weekly `runOn 2026-11-23` gives
  `2026-11-16..2026-11-22`; `nextRunOn("weekly", "2026-11-23")` is
  `2026-11-30`; a weekly schedule created on 2026-11-26 has `nextRunOn
  2026-11-30`; monthly `runOn 2026-12-01` gives `2026-11-01..
  2026-11-30` and the next run `2027-01-01`.
- `report_job_builds_once`: at 2026-11-30 the job writes one report
  with one section per source, `note` `NO_TOTALS_NOTE`, no key `total`
  at any depth; a second run the same day writes nothing and notifies
  nobody; `getInsightReport` as employee 403.

`insights-retention.test.ts`:
- `retention_cutoff`: `("2026-11-26", 25)` gives `2024-10-01`;
  `("2026-03-31", 1)` gives `2026-02-01`; `("2026-01-15", 3)` gives
  `2025-10-01`.
- `retention_purge_scoped`: company A with `retentionMonths 3` on
  2026-11-26: a point dated `2026-07-31` is deleted and `2026-08-01`
  kept; company B's old points stay; the audit row has `data.before
  "2026-08-01"`.
- `retention_delete_only_through_function`: `DELETE FROM
  insight_points` as `payroll_app` fails with permission denied;
  `purge_insight_data` with company B's id inside A's tenant raises.

- [ ] **Step 2: Run** `pnpm --filter @payroll/api test
  insights-alert-eval insights-alerts insights-reports
  insights-retention`. Expected: FAIL.
- [ ] **Step 3: Implement** the files above; register both jobs in
  `main.ts jobs`; conformance rows; leak id map.
- [ ] **Step 4: Run** `pnpm check`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(api): insight alerts, reports and
  retention`.

### Task 10: Publishing where allowed, app-review checklists, handover

Security task (posts to a company's public accounts): fresh per-task
review.

**Files:**
- Create: `packages/contract/src/insights-posts.ts`,
  `src/insights-review.ts`
- Modify: `packages/contract/src/routes-insights.ts`, `src/errors.ts`,
  `src/registry.ts`, `src/examples.ts`, `src/index.ts`
- Create: `packages/api/migrations/1508_insight_posts.sql`,
  `packages/api/src/insights/posts.ts`, `src/insights/publish.ts`,
  `src/routes/insights-posts.ts`
- Modify: `packages/api/src/main.ts` (`jobs` runs `publishDuePosts`),
  `HANDOVER.md`, `LEDGER.md`
- Test: `packages/contract/tests/insights-review.test.ts`,
  `packages/api/tests/insights-posts.test.ts`,
  `tests/insights-publish.test.ts`

**Interfaces:**
- Consumes: Task 1 catalog, settings, `insightsAudit`; Task 3
  `freshTokens`, `loadConnection`; Task 4 `countRequest` meter; Task 6
  `SNAPCHAT_OPEN_QUESTIONS`; Task 8 `tagLinksInText`; Plan 8
  `assertDecidable`.
- Produces (contract):
  - `PUBLISH_RULES: Record<"instagram" | "x" | "tiktok" | "snapchat", {
    allowed: boolean; maxText: int | null; mediaRequired: boolean;
    note: string }>`: instagram `{ true, 2200, true, "One image by
    public https URL. Limits from general knowledge (UNVERIFIED)." }`;
    x `{ true, 280, false, "Text only. Weighted character counting is
    not modelled (UNVERIFIED)." }`; tiktok `{ false, null, true,
    "Publishing capability unknown; off until confirmed." }`; snapchat
    `{ false, null, false, "No publishing API found." }`.
  - `PostStatus = z.enum(["draft","pending-approval","scheduled",
    "publishing","published","failed","cancelled"])`.
  - `InsightPostCreate { connectionId: Id; text: string 1..2200;
    mediaUrl?: https URL max 1000; scheduledAt: Timestamp;
    utmCampaign?: max 60; submit: boolean (default false) }`;
    `InsightPostUpdate { text?; mediaUrl?: string | null;
    scheduledAt?; utmCampaign?: string | null }`; `InsightPost { id;
    connectionId; platform; status; text; mediaUrl: string | null;
    scheduledAt; utmCampaign: string | null; createdBy; approvedBy: Id
    | null; approvedAt: Timestamp | null; publishedAt: Timestamp |
    null; externalPostId: string | null; externalUrl: string | null;
    errorCode: string | null; createdAt }`.
  - `insights-review.ts`: `APP_REVIEW_STATUS = "not-started" as const`;
    `ReviewItem { id: string; text: string; evidence: Evidence }`;
    `AppReviewChecklist { key: "instagram" | "x" | "tiktok" |
    "snapchat" | "google"; reviewer: string; status: typeof
    APP_REVIEW_STATUS; leadTime: "unknown"; leadTimeNote: string;
    prerequisites: ReviewItem[]; items: ReviewItem[]; openQuestions:
    string[] }`; `APP_REVIEW_CHECKLISTS` with exactly these five:
    - instagram: reviewer "Meta App Review"; prerequisites "Meta
      Business Verification of our company", "A Meta developer app
      with the Instagram API product" (unverified); items "Advanced
      Access request for each insights and publishing permission",
      "Screen recording of the connect and insights flow", "Privacy
      policy and data deletion instructions URL", "Test professional
      account for reviewers", "Explain why each permission is needed"
      (unverified); leadTimeNote "Reports range from days to weeks
      (UNVERIFIED); no figure is used"; openQuestions "Whether
      insights for creator accounts need extra permissions", "Exact
      permission names in 2026".
    - x: reviewer "X developer platform (self-serve)"; prerequisites
      "Developer account with a payment method" (unverified); items
      "OAuth 2.0 app with PKCE and the callback URL", "Use-case
      description", "Plan for deleting stored data when posts are
      deleted" (unverified); leadTimeNote "Self-serve; access tier
      and price not confirmed"; openQuestions "Price per read and per
      post in 2026", "Whether non-public metrics need a paid tier".
    - tiktok: reviewer "TikTok for Developers app review"; items
      "App review for Display API scopes", "Content posting audit
      before any public post" (unverified); leadTimeNote "Timeline
      UNVERIFIED"; openQuestions "Display API or Business API for a
      company account", "Whether history can be backfilled",
      "Demographics availability".
    - snapchat: reviewer "not found"; items `[]`; leadTimeNote "Access
      process NOT FOUND"; openQuestions = `SNAPCHAT_OPEN_QUESTIONS`.
    - google: reviewer "Google OAuth app verification"; items "OAuth
      consent screen with app homepage and privacy policy on a verified
      domain", "Demo video of the scope use", "Scope justification for
      analytics.readonly and webmasters.readonly" (official-query for
      the video and homepage, per the channels research); leadTimeNote
      "Google: sensitive scope review can take up to 10 days (QUERY);
      a snippet said 3 to 5 business days; restricted scopes may need
      a security assessment"; openQuestions "Are both scopes
      sensitive or restricted".
  - Routes appended (owner, hr): `listInsightPosts GET
    /v1/insights/posts` (query `status?`, `connectionId?`),
    `createInsightPost POST /v1/insights/posts` (201),
    `updateInsightPost PATCH /v1/insights/posts/{id}`,
    `submitInsightPost POST /v1/insights/posts/{id}/submit`,
    `approveInsightPost POST /v1/insights/posts/{id}/approve`,
    `cancelInsightPost POST /v1/insights/posts/{id}/cancel`,
    `getInsightAppReview GET /v1/insights/app-review` to
    `listOf(AppReviewChecklist)`.
  - Errors: `PUBLISH_SCOPE_MISSING` 409, `POST_NOT_EDITABLE` 409,
    `TEXT_TOO_LONG` 422, `MEDIA_REQUIRED` 422, `SCHEDULE_TOO_SOON` 422.
- Produces (api):
  - Migration 1508: `insight_posts(id, company_id, connection_id,
    platform, status, text, media_url, scheduled_at, utm_campaign,
    created_by, approved_by, approved_at, published_at,
    external_post_id, external_url, error_code, created_at)`; function
    `due_insight_posts(p_now timestamptz, p_limit int) RETURNS
    TABLE(company_id uuid, post_id uuid, user_id uuid)` (`scheduled`
    with `scheduled_at <= p_now`; `user_id = created_by`) owned by
    `payroll_jobs`, `SECURITY DEFINER`. RLS; grants select, insert,
    update.
  - `posts.ts`: create checks in order: settings `publishingEnabled`
    false 409 `PUBLISHING_DISABLED`; connection not `active` 409
    `CONNECTION_NOT_ACTIVE`; `PUBLISH_RULES[platform].allowed` false
    (or a website platform) 409 `PUBLISH_NOT_AVAILABLE`;
    `publish_scopes` false 409 `PUBLISH_SCOPE_MISSING`; text longer
    than `maxText` 422 `TEXT_TOO_LONG`; `mediaRequired` without
    `mediaUrl` 422 `MEDIA_REQUIRED`; `scheduledAt` before now plus 5
    minutes (product default) 422 `SCHEDULE_TOO_SOON`. Status `draft`;
    `submit: true` gives `pending-approval`, or `scheduled` when
    `publishApprovalRequired` is false. Update only in `draft` (409
    `POST_NOT_EDITABLE`), re-running the same checks. Submit: `draft`
    to `pending-approval` (or `scheduled`). Approve:
    `assertDecidable(ctx, { status, requestedBy: createdBy }, {
    pending: "pending-approval", roles: PAYROLL })` then `scheduled`.
    Cancel: from `draft`, `pending-approval` or `scheduled`; else 409
    `POST_NOT_EDITABLE`. Audits `insights.post-created`,
    `-submitted`, `-approved`, `-cancelled` with `data: { postId,
    platform }` only.
  - `publish.ts`: `publishDuePosts(db, deps, limit = 20): Promise<{
    published: number; failed: number; skipped: number }>`: over
    `due_insight_posts(now, limit)`, per post one `withTenant`:
    claim with `UPDATE insight_posts SET status = 'publishing' WHERE
    id = $1 AND status = 'scheduled' AND scheduled_at <= now
    RETURNING` (none: skipped); re-check publishing enabled and the
    connection active (else `failed` with `PUBLISHING_DISABLED` or
    `CONNECTION_NOT_ACTIVE`, no adapter call); text through
    `tagLinksInText` with `{ source: platform, medium: "social",
    campaign: utmCampaign }` when `utmCampaign` is set; `freshTokens`;
    `adapter.publish(tokens, externalAccountId, { idempotencyKey:
    post.id, text, mediaUrl }, meter)`; `published` sets
    `published_at`, `external_post_id`, `external_url`; `failed` or an
    `AdapterError` sets `failed` with the sanitised code (Task 4 rule).
    A failed post is never retried automatically (Ruling 17). Audits
    `insights.post-published` or `insights.post-failed` (`data: {
    postId, platform }`).

- [ ] **Step 1: Write the failing tests**

`insights-review.test.ts` (contract):
- `publish_rules_match_catalog`: for each social platform,
  `PUBLISH_RULES[p].allowed` equals
  `PLATFORM_CATALOG[p].capabilities.publish.available === true`.
- `app_review_honest`: five checklists with keys `instagram`, `x`,
  `tiktok`, `snapchat`, `google`; every `status` is `"not-started"` and
  every `leadTime` `"unknown"`; the JSON text matches none of
  `/\b(approved|passed|granted|certified)\b/i` and contains no `$`;
  the snapchat `openQuestions` deep-equal `SNAPCHAT_OPEN_QUESTIONS`;
  the instagram items mention "Advanced Access" and its prerequisites
  "Business Verification"; the google items mention "Demo video" and
  "privacy policy".
- `linkedin_absent`: no checklist key and no `PUBLISH_RULES` key is
  `linkedin`.

`insights-posts.test.ts`:
- `post_create_gates`: publishing off 409 `PUBLISHING_DISABLED`;
  publishing on and an instagram connection without publish scopes
  409 `PUBLISH_SCOPE_MISSING`; a tiktok connection 409
  `PUBLISH_NOT_AVAILABLE`; a GA4 connection 409
  `PUBLISH_NOT_AVAILABLE`; x text of 281 characters 422
  `TEXT_TOO_LONG`; instagram without `mediaUrl` 422 `MEDIA_REQUIRED`;
  `scheduledAt` now plus 4 minutes 422 `SCHEDULE_TOO_SOON`; manager
  403.
- `post_approval_sod`: hr A creates with `submit: true` (status
  `pending-approval`); hr A approving gets 403 `SOD_VIOLATION`; hr B
  approving gives `scheduled` with `approvedBy` B; with
  `publishApprovalRequired: false` a submitted post is `scheduled` at
  once.
- `post_edit_and_cancel`: PATCH a `scheduled` post 409
  `POST_NOT_EDITABLE`; cancel a `scheduled` post gives `cancelled`;
  cancel again 409.
- `post_audit_no_text`: every post audit row's `data` keys are exactly
  `["platform","postId"]`.

`insights-publish.test.ts`:
- `publish_exactly_once`: two concurrent `publishDuePosts` runs at the
  scheduled time call the fake's `publish` once; the post is
  `published` with the fake's `externalPostId`; a third run calls
  nothing; a post whose publish fails `transient` becomes `failed` with
  `errorCode "HTTP_503"` and a later run does not call `publish` for
  it.
- `publish_tags_links`: x text `"Join us https://acme.ae/careers"` with
  `utmCampaign "summer"`: the fake received text containing
  `https://acme.ae/careers?utm_source=x&utm_medium=social&
  utm_campaign=summer` (one string in the test); the stored
  `insight_posts.text` is unchanged.
- `publish_rechecks_at_run`: publishing turned off after scheduling
  gives `failed` `PUBLISHING_DISABLED` with no adapter call; a revoked
  connection gives `failed` `CONNECTION_NOT_ACTIVE`.
- `app_review_route`: hr GET returns the five checklists; employee
  403.

- [ ] **Step 2: Run** `pnpm --filter @payroll/contract test
  insights-review` and `pnpm --filter @payroll/api test insights-posts
  insights-publish`. Expected: FAIL.
- [ ] **Step 3: Implement** the files above; register
  `publishDuePosts` in `main.ts jobs`; conformance rows; leak id map.
- [ ] **Step 4: Run** `pnpm check`. Expected: PASS, with
  `INSIGHT_ROUTE_IDS` holding all 42 insights route ids in task order.
- [ ] **Step 5: Update `HANDOVER.md`** (state: the ten feature names;
  `main.ts jobs` now also runs `runDueSyncs`,
  `runInsightAlertsAndReports`, `runInsightRetention` and
  `publishDuePosts`; package layout rows for `src/insights/` and
  `src/insights/adapters/`; the five environment groups and that every
  adapter is `not-configured` without them; limits: no app review
  started for any platform, Snapchat gated (open questions listed), X
  price unknown, TikTok publishing off, LinkedIn excluded, no
  demographics, no search queries, no scheduler set up, endpoints and
  scopes UNVERIFIED and fixture-tested only, pixel privacy wording for
  the customer's notice needs a lawyer's check, Arabic copy
  unreviewed) and **append to `LEDGER.md`** section 3 every ruling
  below with today's date.
- [ ] **Step 6: Commit** `feat(api): insight publishing, app review
  checklists, handover`.

## Rulings

Claude's calls under the owner's "decide, don't ask" instruction. Each
says what it costs if wrong. The executor appends them to `LEDGER.md`.

1. **Direct integrations, no aggregator** (LEDGER section 3,
   2026-11-25). Each platform is one adapter behind one interface, so
   an aggregator could later be one more adapter. Cost: four app
   reviews instead of one vendor contract; weeks before a real
   customer can connect.
2. **LinkedIn is out and is not a `PlatformId`.** Why: the owner said
   "If LinkedIn is risky ignore it"; research found analytics-only
   upgrade requests reportedly rejected and strict storage terms
   (UNVERIFIED). It lives only in `EXCLUDED_PLATFORMS` with that
   reason. Cost: no LinkedIn employer-brand data, the strongest
   hiring channel for many SMEs; adding it later is one adapter plus
   an enum value.
3. **Platform order: Instagram, X, TikTok, Snapchat, then website.**
   Instagram has the clearest insights API in the research; X is
   self-serve but paid; TikTok needs approval; Snapchat's process was
   not found. Cost: none if a customer needs another order; adapters
   are independent.
4. **Capabilities are code constants with evidence labels**, and
   lifting one (for example Snapchat insights or TikTok publishing)
   needs a code change with its source in the same commit, guarded by
   `snapchat_gate_moves_together` and `publish_rules_match_catalog`.
   Cost: an operator cannot switch a platform on by configuration.
5. **No platform SDKs; adapters speak HTTP through Plan 13's
   `HttpClient`.** Keeps one network door and the offline tests.
   Cost: we maintain request code for six APIs by hand.
6. **A connection belongs to the company, not the user who connected
   it;** syncing continues if that user leaves (`JobCtx` acts as
   them for audit). Cost: an ex-employee's personal grant may keep
   working until someone revokes it; the Connections screen shows
   `connectedBy`.
7. **Insights are owner and hr only** (Plan 3 has no marketing role);
   only `getAdvocacyLink` is open to all roles. Cost: a marketing
   person needs the hr role, which also shows payroll data; a
   marketing role is a later change.
8. **Revoke keeps history; retention deletes it.** Tokens and account
   choices are wiped at once; points stay until the retention cutoff.
   Cost: a company wanting an immediate purge waits for retention or
   lowers `retentionMonths` to 3.
9. **Snapchat is built and gated.** The adapter, catalog entries and
   checklist exist; connect is refused with `PLATFORM_NOT_AVAILABLE`
   because the research did not find the insights endpoint or access
   process. Cost: the owner's "full integration" is not met for
   Snapchat until the five open questions are answered.
10. **No metric is comparable across platforms** (`comparableGroup`
    null everywhere); dashboards and reports never show a total.
    Cost: no "total followers" headline the owner might expect.
11. **Days are stored as the platform reports them;** snapshot metrics
    use the Dubai date of the sync; X posts count on the Dubai date
    they were created; the pixel uses the Dubai date. Cost: GA4 and
    Search Console days follow each property's own time zone, so a
    day can differ by a few hours from Dubai's.
12. **No demographics or audience breakdowns.** Research flags
    thresholds (Instagram 100+ followers) and conflicting sources
    (TikTok). Cost: UQ32's "audience" part is not delivered.
13. **Manual sync queues instead of running inside the request;**
    once per 15 minutes per connection (product default); after 8
    failures a connection stops (`error`) until reconnected or synced
    by hand. Cost: "Sync now" waits for the next job run.
14. **Advocacy links carry no personal identifier;** shares count
    together under `utm_source=employee-share`. Cost: no per-employee
    leaderboard or reward for sharing.
15. **The careers funnel links traffic and candidates by campaign name
    only, never by visitor, and computes no conversion ratio;** GA4
    supplies careers page views but no source split (page views carry
    no source in our reports). Cost: the funnel is coarse; precise
    attribution needs the pixel plus disciplined UTM tags.
16. **Deletion only through `purge_insight_data`** (`SECURITY DEFINER`,
    owned by `payroll_jobs`, checks the tenant), keeping Plan 3's "no
    delete grant" rule for `payroll_app`. Cost: one more privileged
    function to review.
17. **A failed publish is never retried automatically.** Platform
    idempotency is unconfirmed, and a duplicate public post is worse
    than a late one. Cost: HR re-creates a failed post by hand.
18. **Website scope: GA4 and Search Console pages only, plus the
    pixel;** no search query text, no Plausible, Fathom, Matomo or
    PostHog yet (research order puts them "on demand"). Cost: SEO
    keyword views and those tools wait for a later plan.
19. **X metrics are "for posts created that day, as of the sync"** and
    are refreshed for 3 days (restatement window); the sync window is
    capped at 29 days because private metrics last 30 days. Cost:
    impressions that arrive later on older posts are not counted.
20. **Tokens only in `Authorization` headers, never in URLs,** and
    provider error text is never stored (codes only). Cost: if a
    platform accepts tokens only as a query parameter, its adapter
    needs an exception reviewed with the security review.
21. **Instagram revoke makes no request** (no endpoint known); the
    token is wiped and expires on its own. Cost: the grant stays valid
    at Meta until expiry or until the user removes the app.
22. **Pixel: counts only, cookieless, query strings dropped, ids in
    paths replaced by `:id`;** the customer's privacy notice must
    mention it (`PIXEL_NOTE`). Treated as aggregate data, not personal
    data, which is a reading of PDPL, not legal advice. Cost: no
    unique visitors and no per-visit journeys; a lawyer may still ask
    for consent wording.
23. **Product defaults** (each labelled "not a provider limit"):
    retention 25 months, X daily request cap 20 and others 200, sync
    at 03:00 Dubai with a per-connection minute, restatement 3 days,
    backoff 15 minutes doubling to 24 hours, lease 10 minutes, pixel
    600 beacons per site per minute, posts at least 5 minutes ahead,
    X 5 pages per sync. Cost: a company may hit a cap sooner or later
    than it would like; all but the pixel and lease are settings or
    constants in one file.
24. **Publishing needs approval by a second owner or hr user by
    default,** switchable off. Cost: a one-person team turns it off.
25. **Two new Plan 13 notification kinds** (`insight-alert`,
    `insight-report`), with integer-only variables so Plan 13's
    money-pattern guard never trips. Cost: a touch on Plan 13's
    contract files.
26. **Functions consumed but not named by Plans 3, 8, 11 and 13** are
    exported from the named files with the signatures in the
    Prerequisites section. Cost: small refactors of those plans' code.
27. **Ruled out, each with its cost:** demographics; comments,
    messages and listening; paid ads data; LinkedIn; per-post content
    storage for other people's posts; AI captions or summaries;
    competitor benchmarking; web screens. Cost: each is a visible gap
    in the handover.
28. **Review:** fresh per-task reviews after Task 3 (tokens), Task 7
    (public pixel) and Task 10 (publishing), plus one whole-branch
    review (speed ruling). Cost: a slipped bug in Tasks 1, 2, 4 to 6, 8
    or 9 is caught at the end.
