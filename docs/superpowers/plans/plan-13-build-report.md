# Plan 13 build report (channels and integrations)

Date: 2026-11-26. Branch `api-plan-13`, worktree
`/home/user/HR-Payroll/.claude/worktrees/agent-a59589f188e1476fc`.
Nothing is pushed.

## Setup and merge resolutions

- `git reset --hard deffc89`, then merged
  `origin/claude/quirky-wozniak-b7xkvr` (backend review fixes). The
  merge commit is the first commit on the branch.
- Conflicts were resolved by keeping both sides:
  - `contract/src/payroll.ts`: `PayRun` keeps Plan 6's
    `reimbursementTotal`, `claimCount`, `pendingClaimCount` and the
    review's `changedSinceLastRun`.
  - `api/src/payroll/compute.ts`: reimbursements are applied, then the
    review's wire-cap check (`capProblems`) runs. No new cap was
    invented (a `net` cap tried during the merge was removed again).
  - `api/src/payroll/pay-runs.ts`: the insert stores both the claim
    columns and `changes`; the keyed `snapshotHash(snap, mac)` is used
    with Plan 6's claim source; audit data is the review's flat
    `year`/`month`; Plan 6's `linkClaims`, `markReimbursed` and
    `releaseClaims` are kept; `RUN_EMPTY` is kept.
  - `api/src/payroll/snapshot.ts`: the review's employee share lock and
    unreadable-field problems plus Plan 6's claim source. The employee
    loop moved to `snapshotEmployees` to keep functions under 30 lines.
  - `api/src/people/employees.ts`: the sealed column union holds both
    sides' columns.
  - Tests: `conformance.test.ts` uses the review's `api-flow` helper
    with Plan 6's `PLAN6_PENDING` filter; `pg.integration.test.ts`
    (new from the review) gets the same filter; `reimburse.test.ts`
    adds the bank and labour id the review made required;
    `reimbursed-once.test.ts` adds `serviceUnpaidLeaveDays: 0`, which
    the review made required for leavers.
  - Web (`apps/web`): the review's `ErrorDetail` and problem decoding,
    plus Plan 6's claim fields on mock pay runs.
- `pnpm-lock.yaml` needed no change (`pnpm install` was clean).

## Baseline failures (present before Plan 13, left alone)

- `apps/web` `tests/unit/i18n.test.ts` `every-error-code-has-text`
  fails on 19 Plan 6 error codes with no English text. Plan 13 adds
  codes too (listed under Concerns); web is not in this plan's scope.
- `pnpm ops:typecheck` fails: `deploy/serve.ts` calls `systemDeps`
  with two arguments, but Plan 6 added a third (`blobs`). Plan 13
  adds an optional fourth (`channels`) and does not touch `deploy/`.

## Progress

All ten tasks done; the final status, tests, decisions and concerns
are at the end.

## Task log

### Task 1: channel platform, ports, settings

- Contract: `ROUTE_GROUPS` created in `routes.ts` (no plan had made it
  yet); `ROUTES = ROUTE_GROUPS.flat()`; `CHANNEL_ROUTES` is the last
  group. Shared files get one import and one spread line each
  (`errors-channels.ts`, `registry-channels.ts`,
  `examples-channels.ts`).
- `routes.test.ts`: the route count became "the Plan 3 and Plan 6 ids
  are all present" (literal id lists in `tests/route-ids.ts`); the
  public, MFA, owner-only, text/plain and binary checks became subset
  checks that ignore channel routes (`PUBLIC_CHANNEL_IDS` literal).
- `migrate.ts` accepts `^(\d{3,4})_` and sorts numerically (it took
  only three digits and sorted as text, so `1301_` would have run
  before `601_`); test `migrate_numeric_order`.
- `INBOUND_PAYLOAD_INVALID` and `SSO_NOT_CONFIGURED` were added in
  Task 1 (the not-configured ports throw them).

### Task 2: notifications, templates, quiet hours

- `emitEvent(c: EventCtx, e)` takes `{ tx, deps, companyId }` instead
  of `ReqCtx | JobCtx` (`eventCtx(ctx)` builds it from a request);
  Plan 11's `JobCtx` does not exist on this branch.
- Events are emitted from the leave route handlers (create, approve,
  reject), pay-run approval, Plan 6's `openRequest` and `decide` (a
  moved step notifies the next step's approvers; a close notifies the
  claimant).
- Template variable errors are internal `CodedError`s (never API
  codes), as the plan says.
- A field-crypto helper for Plan 13 tables (`channels/crypto.ts`) uses
  the company key with AAD `<company>:<table>:<column>:<row>`, so
  Plan 3's sealed-column union is not widened.
- Notification titles and bodies are stored in clear (the plan's
  table); only the outbox payload is sealed.

### Task 3: dispatcher, senders, WhatsApp opt-in

- Jobs get an `Enter` (`(tenant, fn) => withTenant(db, tenant, fn)`)
  built in `main.ts`, not a raw `Db`: Plan 3's `one-place` test
  forbids `withTenant(` outside the request plumbing and `main.ts`.
  `dispatchDue(enter, deps)`; `main.ts jobs` runs every job in
  `src/jobs/jobs.ts` once and exits (Plan 11's `jobs` command does not
  exist on this branch, so Task 3 created it).
- SECURITY DEFINER functions vs forced RLS: forced RLS applies to the
  table owner too unless it is a superuser or has BYPASSRLS, and the
  owner role in the real-PostgreSQL suite (and in production) is
  neither. Each table a cross-company function reads gets a "job
  scan" policy keyed to the migrating role (`app_company_id() IS NULL
  AND current_user = '<owner>'`, written with `format(%L,
  current_user)`). `payroll_app` never matches it. Functions use `SET
  search_path FROM CURRENT` (the PostgreSQL suite migrates into a
  per-test schema, so `= public` would break). Covered by
  `pg-channels.integration.test.ts` on real PostgreSQL: rows of two
  companies found through the runtime role; the runtime role still
  reads nothing without a tenant.
- A wrong verification code is counted and committed (`Refuse`), so
  the fifth wrong code withdraws the opt-in.
- "An email delivery exists" (fallback rule) means an email row for
  the notice that is not `skipped`; a person who switched email off
  still gets the fallback (Ruling 14).
- Withdrawing in the app marks waiting WhatsApp rows `skipped
  no-opt-in` and adds their email fallbacks at once (the plan said the
  fallback "applies at dispatch", but skipped rows are never picked
  again).
- `channel_opt_ins.phone_last4` is stored so `getMyChannels` needs no
  decryption.

### Task 4: WhatsApp approvals (signed one-time actions)

- `decide` reads `ctx.body` (no fifth argument), so `actorCtx` carries
  `{ stepOrder, note }` as the body. The tenant transaction is opened
  with `app.user_id` set to the action's recipient (a short read
  finds the recipient first).
- `decide.ts` exports `verdictFor(ctx, approvalId)`: the same
  separation-of-duties verdict `decide` reaches (the WhatsApp
  pre-check reuses it rather than rebuilding the excluded list).
- `SubjectType` has one value (`expense-claim`), so "a subject type
  not in `CHANNEL_APPROVABLE_SUBJECTS`" is tested through the pure
  `channelApprovable(type, list)` with an injected list.
- Token signature comparison uses the canonical base64url text: the
  last character of a 43-character base64url string carries two spare
  bits, so comparing decoded bytes would accept a second spelling of
  the same token.
- Stricter than the plan: no reply at all when the phone's opt-in is
  no longer active (the plan replied "stale" whenever the phone
  matched); STOP replies only when something was withdrawn; at tap
  time the company's `whatsappApprovals` switch and
  `CHANNEL_APPROVABLE_SUBJECTS` are checked again (a tap after the
  switch was turned off is refused).
- STOP also expires that phone's actions waiting for a reason in every
  company (`expire_awaiting_by_phone`, SECURITY DEFINER, job-scan
  policy on `channel_actions`).
- The approval request id and step travel to the send step in the
  sealed payload (`meta`), not in the notification link.
- Security self-review (no subagent could be dispatched): replay by
  message id (`inbound_seen`), one use per action under `FOR UPDATE`,
  phone hash and active opt-in binding, step and status re-check,
  `verdictFor` before `decide` and `decide`'s own checks after, a
  per-phone bad-tap limit (10 per hour, product default) that is
  consulted before any work, forged and expired tokens dropped before
  any database access, and no phone number, token or text in audit
  data (tested).

### Task 5: email-in with a review inbox

- Stricter than the plan (advisor finding): SPF and DKIM passes count
  as "pass" only when at least one of them is for the From domain (or
  a subdomain), read from `smtp.mailfrom` and `header.d`. Mail from
  an attacker's domain with valid SPF and DKIM for that domain and a
  forged `From: sara@acme.test` is flagged `SENDER_UNVERIFIED` for the
  human review, not passed. DMARC pass still passes (it implies
  alignment). Tested.
- `storeReceiptBytes(ctx, employeeId, fileName, bytes)` was split out
  of Plan 6's `uploadReceipt` (the checks run again inside); the
  receipt blob key pattern accepts `inbound` (test added).
- Rejected items store a SHA-256 of the provider message id (the
  plan's `message_id` column) and nothing about the sender.
- The daily inbound limit uses a window aligned to Dubai midnight.
- Attachment file names are kept in clear (control characters and
  slashes removed, 255 characters at most); sender, subject and text
  are sealed.
- Security self-review: credentials compared in constant time; the
  mailbox secret is compared by hash; a refused mailbox stores
  nothing; duplicates are dropped by message id; nothing reaches a
  receipt or claim without a person (owner or hr) accepting; accepted
  files go through Plan 6's size and magic-byte checks again; downloads
  are attachments with `nosniff` and `no-store`; no reply email.

### Task 6: secret-URL calendar feeds

- Plans 9 (holidays) and 11 (deadlines, `src/export/ics.ts`, `JobCtx`)
  are not on this branch. `src/export/ics.ts` was created with only
  `escapeIcsText` and `foldIcsLine`; holidays and deadlines come from
  one seam (`calendar/sources.ts`) that returns none until those plans
  merge, and the feed text is tested with fixture holidays and
  deadlines. A `company-deadlines` feed is therefore empty for now.
- Leave is read with one query in `calendar/sources.ts` (names and
  type names joined) filtered by Plan 3's `viewerScope`/`inScope`;
  `listLeaveInRange` was not added to Plan 3's file.
- `TextReply` (text with headers) was added to `http/context.ts` for
  the ICS response.
- Without `PUBLIC_API_BASE_URL` creating a feed gives 409
  `CHANNEL_NOT_CONFIGURED` (the URL could not be built).
- `urlHint` shows "…" and the last 6 characters of the secret (the
  token itself always ends in ".ics").

### Task 7: OIDC sign-in with linking rules

- `pkce.ts` and `link.ts` were folded into `sso/identity.ts` (pure:
  `pkcePair`, `identityFromClaims`, `jitEligible`, `inviteEmailOk`).
- The invite token is kept sealed with the global key in `sso_states`
  (`invite_token_enc`), not hashed: the callback must open the invite
  with the raw token. Plan 3's `openInvite` is exported from
  `routes/users.ts`; the SSO invite path is its own function
  (`sso/accounts.ts inviteAccept`), not a shared `consumeInvite`.
- An invite accepted through SSO for an email that already has an
  account is refused (409 `EMAIL_TAKEN`): never link by email. The
  person signs in with their password and links from the app.
- `sso_identities` keeps unlinked rows (`status`), with a partial
  unique index on live links.
- The JIT lookup function reads `sso_settings`, `employees` and
  `memberships` across companies, so those three get job-scan SELECT
  policies (see Task 3).
- Password login with a null password hash fails as a wrong password
  (failure counted); `UserRow.password_hash` is now `string | null`.
- `GLOBAL_TABLES` gains `sso_states` and `sso_identities`; the RLS
  catalog test's exact list was updated.
- The SSO enforcement check runs in the tenant pipeline after role and
  MFA (`checkSsoEnforced`), skipping owners and non-password sessions.
- Security self-review: state single use (UPDATE ... RETURNING),
  10-minute expiry, provider-bound; PKCE S256; nonce checked; RS256
  only with kid lookup (alg none and HS256-with-public-key refused,
  tested); audience and azp; issuer per provider, Microsoft issuer
  bound to the token's own tid; identity keyed by sub or tid:oid; no
  automatic linking by email (Review Focus 2 tested: no session, no
  identity, membership unchanged); JIT only for employee role in
  exactly one company; link callbacks bound to the starting user's
  bearer session; SSO never counts as MFA unless a TOTP is given.

### Task 8: signed outbound webhooks

- `sign.ts` also holds the retry schedule and limits (`schedule.ts`
  folded in); the domain-event fan-out is `webhooks/fanout.ts`, called
  from `emitEvent`. Employee create and update emit
  `employee.created` / `employee.updated`.
- A 410 ends the delivery at once (no retries) and pauses the endpoint
  `gone`. Deliveries of a paused endpoint are not sent (except
  `ping`, which is sent even while paused, as the plan says).
- The rotation test uses a 1-hour grace instead of 24 hours: the test
  sessions expire after 8 hours.
- The previous secret is opened with the AAD it was sealed under (the
  rotation copies the cipher text; a bug found by the test).
- Security self-review: https only, no credentials, port 443, no IP
  literal or private suffix; every resolved address must be public
  (IPv4 and IPv6 reserved ranges, IPv4-mapped IPv6) and the request is
  pinned to the first one; redirects are never followed; response
  bodies are never stored; secrets sealed and shown once; the URL is
  never audited; bodies carry ids only (sentinels tested); HMAC over
  `id.timestamp.body`, two values during a rotation grace.

### Task 9: scoped API keys with rate limits

- The key path branches at the top of the request pipeline
  (`runWithKey` in `http/context.ts`) for any bearer starting `hrk_`,
  so public and user routes refuse a key too (403
  `API_KEY_ROUTE_NOT_ALLOWED`). `apikeys/auth.ts` does the checks in
  the plan's order inside its own transaction (rate counter commits
  even when the handler fails), then the handler runs as the key's
  service user with role hr; `RateLimit-*` headers on every key
  response, `Retry-After` on 429.
- A key for another company, a wrong, revoked, expired or
  past-grace secret: one 401 `UNAUTHENTICATED` (a malformed
  `X-Company-Id` is also 401 on this path).
- Redaction: `Tenant.apiScopes` reaches `toEmployeeView` (the tenant
  is the viewer everywhere), so list, read and write responses drop
  salary, bank, labour id and Emirates ID without `payroll:read`
  (write response tested).
- Service users: password login refused, `listUsers` omits them, the
  approval spine's chain members and notification recipients are
  human users only. The "service user never approver" test of the
  plan was not written (the code path is the member query).
- The leak test was not extended with a key caller; `apikeys.test.ts`
  checks the sentinels on the key's employee list instead.

### Task 10: developer surface and handover

- `DeveloperGuide` lives in `developer-guide-schema.ts` and the pure
  builder in `developer-guide.ts`: one file would make an import cycle
  (`routes` → `routes-channels` → guide → `routes`).
- `/v1/openapi.json` and `/v1/developer/guide` answer through
  `TextReply` (cached JSON text, `Cache-Control: public,
  max-age=300`). OpenAPI marks key routes with both security entries
  and `x-api-key-scope`, and lists one webhook per event type.
- `HANDOVER.md` (API layout rows, Plan 13 limits) and `LEDGER.md`
  (section 3: rulings 1 to 36 adopted by reference with this report's
  changes) were updated. The developer page itself is a spec for a
  web plan (no web code here).

## Status

All ten tasks are implemented and committed on `api-plan-13`.
Channel routes: 48, 8 of them public (as the plan says). Migrations
`1301` to `1309`.

## Tests

- `packages/contract`: 9 files, 116 tests, green.
- `packages/api`: every task's own tests plus conformance, leak,
  tenancy, RLS catalog and the real-PostgreSQL suites were run after
  each task; the full suite was run after Tasks 1 to 5 and at the end.
  Final full run: 70 files, 465 tests; one failure (a `Date.now()`
  in `sso/oidc-http.ts`, caught by Plan 3's injected-clock scan; the
  discovery cache now lives for the process) and three files killed
  by memory pressure. After the fixes, `errors`, `url-guard`, `sso`,
  `pg-channels.integration`, `wa-approvals`, `auth`, `email-in`,
  `conformance` and `leak` were re-run: 9 files, 87 tests, green.
- `packages/engine` 53 files, `packages/wps` 11 files green;
  `lines:ops`, `lines:test`, `ops:test` green; `apps/web` 102 of 103
  (only the baseline `every-error-code-has-text`). Runs used `--maxWorkers=1` or `2`: other
  agents' test runs on this machine caused out-of-memory kills
  (SIGKILL) of single workers several times; each killed file was
  re-run alone and passed.
- Root `pnpm typecheck` and `pnpm lines` green. The real-PostgreSQL
  suite (throwaway server from `/usr/lib/postgresql`) ran, including
  `pg-channels.integration.test.ts`.
- Test-first: each task's tests were written before its code and run
  red before the code was copied in. For Tasks 1, 2, 8 and 9 the
  modules were drafted alongside the tests (`apikeys.test.ts` first ran
  after the code existed), so not every test file was seen failing.
- Final checks added after the advisor's review: all five other
  SECURITY DEFINER functions are now exercised on real PostgreSQL
  through the runtime role (both companies seen); IPv4-mapped IPv6 in
  hex form (`::ffff:a00:5`) is judged as IPv4; SSO login refuses a
  locked or service account with `SSO_NOT_LINKED` (tested).

## Decisions

No new dependency was added (versions unchanged).

1. Commit trailers say `Co-Authored-By: Claude Opus 5.5` (the model
   that did the work, as the session's attribution notice requires
   and as Plan 3 did), not the brief's `Claude Sonnet 5.5`. Nothing is
   pushed, so they can be rewritten.
2. `PUBLIC_API_BASE_URL` and `PUBLIC_APP_BASE_URL` are optional (https
   when set): making them required would break the existing
   deployment files, which this plan does not own. Features that need
   them refuse with `CHANNEL_NOT_CONFIGURED` / `SSO_NOT_CONFIGURED`.
3. Cross-company jobs: SECURITY DEFINER functions plus job-scan RLS
   policies keyed to the migrating owner role (Task 3).
4. Jobs and public hooks open tenants through `Enter`; nothing outside
   the request plumbing and `main.ts` calls `withTenant`.
5. Every listed security hardening above (Tasks 4, 5, 7, 8, 9) beyond
   the plan text.

## Concerns

- No separate security reviewer could be dispatched (the brief forbids
  subagents); Tasks 4, 5, 7, 8 and 9 got a self-review only. A fresh
  review of those tasks is still owed.
- An owner or hr person invited through SSO has no password, so cannot
  enrol MFA (enrolment re-checks the password) and so cannot use MFA
  routes. No flow was invented for this.
- Functions over 30 lines remain in `webhooks/deliver.ts` (`claim`,
  `record`), `whatsapp/opt-in.ts` (`startOptIn`, `verifyOptIn`) and
  `inbound/items.ts` (`keepItem`); all files are under 300 lines.
- Not merged: the newer `origin/claude/quirky-wozniak-b7xkvr` (Plan 6
  review fixes with migration 605, Plan 8, Plan 3 and engine fixes).
  A trial merge shows 21 conflicting files (contract errors, examples,
  payroll, routes and route tests; api app, allowlist, http/context,
  pay-runs, snapshot, employees, receipts, routes/users, test helpers,
  conformance and leak; HANDOVER; two web mocks). Not done for lack of
  room in this session. After that merge, a WhatsApp approver who lost
  the role should get `NOT_AN_APPROVER` through `verdictFor`/`decide`;
  that test is still to write.
- Plan 13 adds 28 error codes with no English text in `apps/web`
  (`every-error-code-has-text` was already failing on 19 Plan 6
  codes); web is out of scope here.
- `due_webhook_deliveries` keeps returning pending deliveries of a
  paused endpoint (the claim skips them), which uses up the batch
  limit while many are parked.
- `pnpm ops:typecheck` still fails on `deploy/serve.ts` (Plan 6
  baseline, untouched).
- Provider wire formats (Postmark send and inbound, Meta send and
  webhook, Google and Entra endpoints and issuers) are UNVERIFIED and
  tested only against their own fakes.
- WhatsApp prices, Meta verification lead time and any TDRA position
  remain unknown; Arabic copy is unreviewed and never sent.

## Merge and finish

Date: 2026-11-26. Merged `origin/claude/quirky-wozniak-b7xkvr` at
`508b135` (Plan 3 review fixes, Plan 6 review fixes with migration
605 and quotas, Plan 8 with migrations 801 to 807, engine fixes, ops
kit, web groundwork). Not pushed.

Commits: `53627bb` (merge), `434ee6c` (ops: serve.ts and
RECEIPTS_DIR), `2803463` (tests and the `verdictFor` role check),
`0f52225` (this section, handover, ledger) and a follow-up commit
(revocation and recipient tests, runbook backup note).

### Conflicts (21 files) and resolutions

Both sides were kept everywhere.

- Contract `errors.ts`, `examples.ts`: both imports and spreads (HR
  then channels). `payroll.ts`: main's `reimbursementNote` kept.
- `routes.ts`: `CORE_ROUTES` (Plans 3 and 6) is kept for main's
  tests; `ROUTE_GROUPS = [CORE_ROUTES, HR_ROUTES, CHANNEL_ROUTES]`
  and `ROUTES = ROUTE_GROUPS.flat()`. `routes.test.ts` takes main's
  core-scoped checks (subset checks: MFA set, owner-only, text/plain,
  binary on `CORE_ROUTES`) plus Plan 13's public-ids check;
  `routes-hr.test.ts` no longer asserts the total of 121 (it checks
  46 HR, core 75 and that every core and HR id is in `ROUTES`).
- API `app.ts`, `audit/allowlist.ts`: both registrations and checks.
- `http/context.ts`: Plan 13's `rawBody`, `rawHeader`, `TextReply`
  plus main's `onFailure` cleanups and `CsvReply`. The API-key path
  goes through the same `base`, so it gets `onFailure` too.
  `channels/actor.ts` gives actor contexts an `onFailure` that throws
  (they write no outside files; a throw rolls the transaction back).
- `payroll/snapshot.ts`, `people/employees.ts`: main's version (our
  side held only the earlier merge of the same changes).
  `pay-runs.ts`: main's version plus the `pay-run.approved` event.
- `receipts/receipts.ts`: `uploadReceipt` keeps calling Plan 13's
  `storeReceiptBytes`, which now also runs main's `checkQuota`,
  inserts the row before writing the blob and registers the blob
  delete with `onFailure` (email-in accepts count toward the quota).
- `routes/users.ts` `listUsers`: human users only and unrevoked
  memberships.
- Tests: `conformance`, `leak` and `pg.integration` drop
  `PLAN6_PENDING` (main deleted it; Plan 6 is complete). `api-flow`
  runs expenses, payroll, expense reports, then `channelFlow`, then
  `hrFlow` (the HR flow revokes the employee's access, so channels
  run before it). `seed-rows`, `test-app` hold both sides. The leak
  test holds both fixture sets and adds `inboundItem` to the
  company-B kinds.
- `HANDOVER.md`: both layout tables and both limits paragraphs.
  `LEDGER.md` merged cleanly; no duplicate headings.
- `apps/web`: main's version, then English and Arabic texts for the
  28 Plan 13 error codes (Arabic NEEDS NATIVE REVIEW like the rest).
  The merge itself brought no other new codes.
- `reimburse.test.ts` and `reimbursed-once.test.ts` auto-merged with
  both sides' copy of the same fix (duplicate keys); main's versions
  taken.
- `approvals/decide.ts` merged cleanly: main's hardened rules
  (excluded list, role held at decision time) with Plan 13's
  `verdictFor` and events. `migrate.ts` is Plan 13's numeric sort;
  checked on a fresh PostgreSQL 16: order 001-013, 601-605, 801-807,
  1301-1309; every table but the five global ones has forced RLS (RLS
  catalog test green). `pnpm install` left `pnpm-lock.yaml` unchanged
  (no dependency changed).

### Fixes the merge needed

- `verdictFor` now returns `NOT_AN_APPROVER` when the current step is
  a role step and the caller no longer holds the role (the same rule
  `decide` applies), so a demoted approver's WhatsApp reject tap is
  refused at once instead of asking for a reason first.
- Plan 8 revocation: channel actors (`actorCtx`), notification
  recipients and calendar feeds ignore revoked memberships (a leaver
  gets no notices, cannot act by WhatsApp, and the feed URL gives 404).
  The SSO link path already read memberships under the no-tenant
  policy, which hides revoked rows; JIT never matches an employee that
  had a membership. Tested (`revoked-member-channels.test.ts`): with
  `revoked_at` set, the WhatsApp tap is refused (`TENANT_FORBIDDEN`
  audit, nothing decided; without the `actorCtx` filter the revoked
  manager's tap approved the claim), no new notice or message, and the
  feed URL gives 404. Each of the three filters was removed in turn
  and the test failed.
- `approval.pending` recipients follow the inbox rule: users excluded
  when the request opened and, on a role step, users who no longer
  hold the role get no notice (a demoted hr approver got approve
  buttons when step 2 reached them; tested).
- A named chain approver must be a human member (`chains.ts`): an API
  key's service user is refused with `CHAIN_INVALID`.
- `deploy/serve.ts` passes `fsBlobStore(RECEIPTS_DIR)` and the channel
  ports to `systemDeps`, as `main.ts` does. `check-env.mjs` requires
  an absolute `RECEIPTS_DIR` for api, migrate and serve (test added);
  compose sets it and mounts a `receipts` volume on the api service;
  the Dockerfile creates the directory for the `node` user; the env
  example and runbook list it, and the runbook's backup section says
  the `receipts` volume must be copied with every dump (command
  untested). The Dockerfile and compose changes were not built or
  run here (untested); CI's compose job needs no change (compose sets
  `RECEIPTS_DIR`). Smoke test on a throwaway PostgreSQL
  16 with `init-roles.sql`: `main.ts migrate`, `serve.ts` (health
  200) and `main.ts jobs` all ran.

### New tests

- `approver-identity.test.ts`: a demoted hr approver taps approve and
  reject in WhatsApp: both refused with `NOT_AN_APPROVER` (audit),
  nothing decided, two "cannot be made from WhatsApp" replies (fails
  on the pre-merge `verdictFor`); the service user is not in a role
  step's eligible list, gets 403 `API_KEY_ROUTE_NOT_ALLOWED` on
  approve and inbox, and cannot be a named approver.
- `leak.test.ts`: an API key without `payroll:read` calls every GET
  tenant route with every id: 403 outside its scopes, the route's
  status inside them, and no salary, fils, gross, IBAN, labour id,
  Emirates ID or HR sentinel in any body; a key with `payroll:read`
  does see salaries (not vacuous).
- `approver-identity.test.ts` also: a demoted approver gets no
  buttons when a later step reaches them.
- `revoked-member-channels.test.ts`: see the revocation fix above.

### Checks (run one package at a time)

- `packages/api`: 97 files, 694 tests, green
  (`vitest run --maxWorkers=1 --testTimeout=60000`, real PostgreSQL
  suites included and confirmed running).
- `packages/contract` 11 files, 131 tests; `packages/engine` 53
  files, 584 tests; `packages/wps` 11 files, 173 tests; `apps/web` 17
  files, 103 tests (`every-error-code-has-text` now passes).
- `pnpm typecheck`, `pnpm ops:typecheck`, `pnpm lines`,
  `pnpm lines:ops`, `pnpm lines:test`, `pnpm ops:test` (11 tests):
  green.

### Decisions and open points

- Commit trailers name `Claude Opus 5.5`, the model that did the
  work, as the session's attribution notice requires (the brief asked
  for `Claude Sonnet 5.5`); nothing is pushed, so they can be
  rewritten.
- Revoked memberships are not filtered in Plan 6's own member query
  (`approvals/requests.ts`) or in `subjects.ts`; that is main's code
  and was left as is (a revoked user cannot open a tenant, so cannot
  decide in the app; WhatsApp is now covered by `actorCtx`).
- A fresh security review of Tasks 4, 5, 7, 8 and 9 is still owed.
- Outside the worktree: the smoke test first ran `CREATE DATABASE
  payroll` by mistake on another agent's PostgreSQL (port 55439,
  `/tmp/p9pg`) and dropped it again at once; the throwaway server's
  data directory `/var/lib/postgresql/smoke-p13` is left behind,
  stopped (safe to delete).

### Second merge: Plan 9 (main at `9eec775`)

Main moved on while this merge was finishing (Plan 9: time,
attendance, leave policies, WFH; migrations 901 to 908;
`packages/time-client`). Merged again in `410c9c2`; nine files
conflicted, all resolved keeping both sides:

- `contract/src/routes.ts`: Plan 9 renamed Plan 3's time routes to
  `LEAVE_ATTENDANCE_ROUTES` (inside `CORE_ROUTES`) and added a new
  `TIME_ROUTES`; `ROUTE_GROUPS = [CORE, HR, TIME, CHANNEL]` (channels
  stay last, as `routes-channels.test.ts` expects). `routes-hr.test.ts`
  checks that every core, HR and time id is in `ROUTES` (subset, no
  total). `errors.ts`, `audit/allowlist.ts`: both spreads (no code
  appears in two maps; checked).
- `main.ts`: the `jobs` command and Plan 9's `purge-wfh` side by side.
- `routes/leave.ts`: Plan 9's half days, blackout-override audit and
  warnings plus the `leave.requested` event.
- Tests: `api-flow` runs channels, then `timeFlow`, then `hrFlow`;
  `seed-rows` seeds both; the leak test holds both fixture sets, the
  `employeeQuery` path and both kinds in the company-B list.
- Plan 9's forbidden-capture column scan (`wfh-settings.test.ts`)
  flagged six Plan 13 columns; they are allowed by table and column
  (`webhook_endpoints.url`, `rate_counters.window_start`,
  `notifications.title`, `inbound_items.content_enc`,
  `inbound_attachments.content_type`, `calendar_feeds.url_hint`):
  none holds a window title, page content or capture.
- Web: Plan 9's own `errors-time.ts` texts came with main; the
  every-error-code test passes with Plan 13's texts. The lockfile
  change came from main; `pnpm install` changed nothing more.
- Migration order is now 001-013, 601-605, 801-807, 901-908,
  1301-1309 (the numeric runner needed no change); the RLS catalog
  and real-PostgreSQL suites pass.

Checks after the second merge (one package at a time):
`packages/api` 124 files, 868 tests: one failure (the column scan
above), fixed and that file re-run green (6 tests); `packages/contract`
13 files, 141 tests; `packages/engine` 53 files, 584 tests;
`packages/wps` 11 files, 173 tests (one round-trip test timed out at
5 s under machine load on the first run, then passed alone and in a
full re-run); `packages/time-client` 2 files, 13 tests; `apps/web` 17
files, 103 tests. `pnpm typecheck`, `pnpm ops:typecheck`,
`pnpm lines`, `pnpm lines:ops`, `pnpm lines:test` (9), `pnpm ops:test`
(11): green.

### Third merge: Plan 7 (main at `70c763f`)

Merged in `cc9e9fe`; 22 files conflicted, all kept both sides:
`ROUTE_GROUPS = [CORE, HR, DOCUMENT, TIME, CHANNEL]` with subset
route tests; error, example, schema and audit maps spread both (no
shared error code or audit key; the audit collision test now also
checks Plan 13's list); `systemDeps(db, kek, blobs, { channels, pdf
})` so `main.ts` and `deploy/serve.ts` pass both (Plan 7's graceful
stop kept); the blob key accepts `receipts`, `files` and `inbound`;
config holds the channel groups, public URLs and Chrome settings; the
capture-column allowlist adds Plan 7's library titles to Plan 13's
six columns; web and `HANDOVER.md` keep both plans' entries. The
lockfile came from main (`pnpm install --frozen-lockfile` clean).
Migration order: 001-013, 070-075, 601-605, 801-807, 901-908,
1301-1309 (numeric).

Checks: `packages/api` 145 files, 990 tests, green (full run,
`--maxWorkers=1`); contract 14/159, engine 53/584, wps 11/173,
time-client 2/13, web 17/103; typecheck, ops:typecheck, lines,
lines:ops, lines:test (9), ops:test (11) green. The smoke-test data
directory `/var/lib/postgresql/smoke-p13` was deleted.

## Security review fixes

Review: `.superpowers/sdd/plan13/security-review.md` (0 Critical, 5
Important, 9 Minor). One commit per item, test first.

- I1 (email-in trusted sender-written headers): only the topmost
  `Authentication-Results` counts, and only when its authserv-id is
  `INBOUND_EMAIL_AUTHSERV_ID` (optional, outside the all-or-nothing
  inbound group); else the topmost `Received-SPF`, only with
  `receiver=` that id and no `Authentication-Results`. Unset id, a
  foreign id or no header: all results `none`, so the item is flagged
  `SENDER_UNVERIFIED`, never passed. Domains come from that one header.
  Tests: forged header above the real one (flagged, not passed), a
  forged header with the right id below a real fail (still rejected),
  end to end through the hook. UNVERIFIED: Postmark's header order and
  whether it strips inbound headers that claim its id.
- I5 (idle timeout, no deadline): `http-node.ts` now sets an overall
  timer that destroys the request at `timeoutMs` whatever the server
  sends, and stops reading (destroys the response) at the 64 KiB body
  cap. `sendWith(requestFn, scheme)` is the seam; the test runs a
  local plain-HTTP trickle server (no TLS change) and checks the call
  ends near the deadline, the cap ends a never-ending body, and the
  real client still refuses http. Per-run budgets for the delivery job
  were not added (the deadline bounds each delivery).
- I2 (a number that changes hands kept approving as the old holder):
  migration `1310` adds `replace_whatsapp_phone` (SECURITY DEFINER,
  EXECUTE for `payroll_app` only). On a successful verify it withdraws
  every other user's opt-in on that phone hash in every company
  (`withdrawn_via = 'replaced'`) and voids their open and
  awaiting-reason actions. It clears `app.company_id` with
  `set_config` while it works (a function-level `SET` of the
  placeholder needs a superuser) so the job-scan policies match inside
  the tenant transaction, and restores it. Decisions: the same user's
  opt-ins in other companies are kept (same person); withdrawals in
  the verifying company are audited `whatsapp.opted-out` `via:
  "replaced"`, other companies keep the marker on the row (their audit
  chains cannot be written from this tenant). Tests: the manager/HR
  scenario (M withdrawn, H's tap on M's button decides nothing, no new
  buttons to M), across companies, and on real PostgreSQL from a
  tenant transaction. The STOP test now opts B in after A's tap.
- I3 (any linked identity met enforcement): migration `1311` adds
  `sessions.sso_org` (`hd:<domain>` or `tid:<tenant>`, from the ID
  token). With `enforceSso` on, a non-owner needs an SSO session whose
  provider and organisation are in the company's `googleHostedDomains`
  or `microsoftTenantIds`; password, personal and foreign-tenant
  sessions get `SSO_REQUIRED`. Enforcement cannot be turned on with no
  hosted domain or tenant (400). Linking: in every company of the user
  that enforces SSO and where they are not an owner, the identity must
  be accepted, else 403 `SSO_IDENTITY_NOT_ALLOWED` (new code, web
  texts added). Old sessions have `sso_org` null and do not satisfy an
  enforced company. Tests: personal Gmail and foreign tenant refused
  at link, own tenant accepted, a personal identity linked before
  enforcement cannot sign in past it, enforcement with no domain 400.
