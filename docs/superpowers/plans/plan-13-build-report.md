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

## Status

In progress (updated after each task).

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
