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
