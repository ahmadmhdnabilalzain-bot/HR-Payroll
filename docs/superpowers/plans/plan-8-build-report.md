# Plan 8 build report (Tasks 2 to 8)

Date: 2026-11-26. Branch `api-plan-8` (not pushed), in the worktree
`/home/user/HR-Payroll/.claude/worktrees/agent-a5c1244c05330e949`, based
on `claude/quirky-wozniak-b7xkvr` at `32d2dfe`. Task 1 (the engine
`ae-employment` pack, probation and notice helpers) was already merged
and is used as is; nothing in `packages/engine` changed.

## Status

Done: Tasks 2 to 8, one commit each.

| Task | Commit | Message |
|---|---|---|
| 2 | `23006d1` | `feat(api): task manager` |
| 3 | `5b7fd6e` | `feat(api): requisitions and applicant tracker` |
| 4 | `1ac48b7` | `feat(api): offers with approval` |
| 5 | `d754b95` | `feat(api): offer to hire and onboarding` |
| 6 | `86c98e5` | `feat(api): exit flow and final settlement` |
| 7 | `35a2688` | `feat(api): exit hooks, access revocation, close` |
| 8 | (last) | `feat(api): goals, end-to-end flow, handover` |

The contract work of each task is inside that task's `feat(api)`
commit (the plan puts both halves in one task).

## Tests

- contract 93 passed; engine 539 passed, 3 skipped; wps 173 passed;
  api 309 passed, 19 skipped (the real-PostgreSQL suite without
  `DATABASE_URL`).
- Real PostgreSQL 16, run as the non-superuser runtime role
  (`plan3_runtime`, migrated by `plan3_owner`) the way the Plan 3
  builder did: 19 of 19 passed, including two new Plan 8 races
  (`tests/helpers/pg-concurrency-hr.ts`): hire sent twice at once gives
  201 and 200 with one employee; two owner-leavers revoked at once give
  200 and 409 `LAST_OWNER` with one owner left. The throwaway server
  was stopped and its directory removed.
- Review Focus: `leak.test.ts` covers every new GET route (task,
  requisition, application, offer, terms, exit and goal fixtures;
  offer salary, candidate email, exit reason and settlement total
  sentinels, with owner bodies checked to carry them);
  `exit_settlement_hidden_from_manager`;
  `hire_twice_concurrently_one_employee` (pglite and real PostgreSQL);
  `exit_settlement_refused_not_500`;
  `revoked_session_gets_403_immediately`; `revoke_last_owner_409`.
  Review Focus 3 belongs to Task 1 (engine, already merged).

### Gate

`pnpm check` is red at the base commit, before any Plan 8 change, in
`apps/web` typecheck only (three errors in `src/api/errors.ts`,
`src/api/mock/handlers-payroll.ts`, `src/api/mock/seed-history.ts`; Plan
4's files). After Plan 8 the web typecheck shows the same three errors
and no new one. Each commit was gated on `pnpm lines`, `pnpm
lines:test`, and typecheck plus tests of `contract`, `engine`, `wps`
and `api`. The machine was shared with other builders (load average
above 20 on 4 cores): with default settings a 5-second wps property
test timed out and one api worker was killed (SIGKILL), so the gate ran
vitest with `--maxWorkers=2 --testTimeout=60000`. No repository test
setting was changed.

### Test order (honest)

- Task 2: `tasks.test.ts` first, seen red. The contract schemas and
  `routes-hr.test.ts` were written before that test was run, so it was
  never seen red.
- Task 3: `approvals`, `requisitions`, `applications` first, seen red
  (20 failing).
- Task 4: `offers.test.ts` first, seen red.
- Task 5: `expand`, `terms`, `hire` first, seen red (12 failing).
- Task 6: `exit-settlement` (pure) and `exits` first, seen red (15
  failing); `settlement.ts` written first, then the rest.
- Task 7: `revocation` and `exit-hooks` first, seen red (19 failing).
  `old_invite_cannot_restore_after_revoke` was added after a
  self-review, seen red (it proved the hole), then fixed. The two
  real-PostgreSQL races were written after the code and never seen red.
- Task 8: `goals` first, seen red (6 failing). `hr-flow` passed on its
  first run because Tasks 2 to 7 already existed.

## Adaptations to the plan (the real Plan 3 code differs)

1. **Route counts.** Plan 3 has 50 routes, not 49 (`changeUserRole`).
   `CORE_ROUTES.length === 50`, `HR_ROUTES.length === 45`, `ROUTES` is
   95 (the plan says 94). Plan 3's "mfa routes" and "owner-only routes"
   assertions now read `CORE_ROUTES`; HR MFA routes are asserted in
   `routes-hr.test.ts` (`decideOffer`, `revokeExitAccess`).
2. **Lists are `{ items }`** (Plan 3's `listOf`), not bare arrays.
3. **Audit is an allowlist.** Plan 3 refuses any `data` key without a
   shape check, so its list could not stay unchanged. Plan 8's keys
   (`source`, `flowType`, `kind`, `kinds`, `statuses`, `inApp`,
   `external`, `applicationId`, `taskCount`, `progress`,
   `lastWorkingDate`) are in `src/audit/hr-allowlist.ts`, each shape
   checked, spread into Plan 3's `CHECKS` with one line. `hrAudit` also
   refuses `HR_SENSITIVE_KEYS`. Keys without a value are left out.
4. **Shared files touched by one line each:** HR error codes in
   `contract/src/errors-hr.ts`, schemas in `registry-hr.ts`, examples
   in `examples-hr.ts`, route registration in `api/src/routes/hr.ts`.
5. **Tenancy seed.** Plan 3's tenancy suite fails while a tenant table
   lacks rows; Plan 8's are seeded in `tests/helpers/seed-rows-hr.ts`.
6. **Leak and conformance fixtures** live in `tests/helpers/leak-hr.ts`,
   `seed-hr.ts` and `conformance-hr.ts`; `seedHr` runs after Plan 3's
   pay run and SIF so HR records never change those fixtures.
7. **Salary rules:** Plan 3's check is `checkSalary` in
   `src/people/employee-writes.ts` (not `validateSalary` in
   `employees.ts`); offers call it directly.
8. **Employee actions:** Plan 3 had no ReqCtx-level `createEmployee`,
   `setSalary`, `updateEmployee`. They are in
   `src/people/employee-actions.ts` (not `employees.ts`, the data
   layer) with the planned signatures and Plan 3 audit events; Plan 3's
   handlers now call them (its tests pass). `updateEmployee` accepts
   `lastWorkingDate: null`.
9. **Encryption:** Plan 3's closed `Column` union gained `reason_enc`
   and `settlement_enc`; `sealerFor(..., "offers" | "exits")` gives the
   planned AADs.
10. **No `altStatus` in `RouteDef`:** `hireFromOffer` declares 201 and
    answers a replay with Plan 3's `Reply(200, ...)`.
11. **Engine terms helper** `src/onboarding/engine-terms.ts` runs
    `calculateProbation` and `validateContractNotice` for offers and
    terms.
12. **Hire probation reminders** carry the onboarding flow link, so the
    hire's tasks are the template items plus two reminders, as the
    plan's test expects (`saveTerms` takes an optional flow).
13. **Exit contract:** `NoticeFlag`, `DocumentKind` and `ExitDocument`
    are defined in Task 6 (`Exit.documents` needs them); Task 7 adds
    `DocumentsRequest`, `AccessResult` and the routes. Contract exit
    tests are in a new `contract/tests/exits.test.ts`, not
    `schemas.test.ts`.
14. **Settlement cross-check** runs Plan 3's `computePayRun` on a
    one-leaver snapshot and compares amounts, `notComputed` and trace.
15. **Revocation touches more Plan 3 files than named:**
    `revoked_at IS NULL` in the tenant guard (`auth/guard.ts`),
    `membershipsOf` (`auth/accounts.ts`: login and `GET /v1/me`),
    `listUsers` and the owner count and target of `changeUserRole`
    (`routes/users.ts`). Accept-invite lives in `routes/users.ts`, not
    `routes/auth.ts`: a revoked membership is restored (role, employee
    link, revocation cleared); an unrevoked one is still 409.
16. **Access runs** are two `exit_hook_runs` rows (`in-app`,
    `external`) under a partial unique index; `beforeLastDay` is derived
    from the stored time, so a repeat returns the first answer exactly.
17. **`hr-flow` never moves the clock** (sessions last 8 hours and MFA
    routes would need a TOTP re-login): the joiner starts 2025-06-01 so
    probation is long over, and resigns 2026-01-15 so the last working
    day has passed on "today" (2026-03-01).
18. **Migrations:** 801 to 807 sort correctly with the runner's
    three-digit lexical order; no runner change was needed.

## Decisions (Claude's calls)

1. **Commit trailers:** the coordinator asked for `Co-Authored-By:
   Claude Sonnet 5.5`; this session's harness reminder says `Claude
   Opus 5.5` and that only the user's own instructions (for example a
   CLAUDE.md rule) outrank it. The repository has no such rule, so the
   commits use the Opus line, as the Plan 3 builder did. Not pushed; an
   amend is cheap if overruled.
2. **Pre-law joiners (before 2022-02-02):** the employment pack refuses
   them even with zero months. Terms are accepted for them only with
   `probationMonths: 0` (no dates); with months: 422 `ENGINE_REFUSED`
   `NO_PACK_FOR_DATE`. Otherwise no existing employee could leave
   through the exit flow.
3. **Terms check the contract notice** on the later of the joining
   date and today (Dubai); offers on the start date, as planned.
4. **Manual tasks default to the creator** as assignee for every role.
   Checklist ticks need the right to change status (creator, owner, hr,
   assignee); adding items needs edit rights. `mine=true` means
   assigned to me.
5. **Hiring manager named by owner or hr** must be a member with role
   owner, hr or manager (else 422 `ASSIGNEE_NOT_MEMBER`).
6. **Applications are visible** to owner, hr, the requisition's hiring
   manager or requester, and anyone on one of its interviews. Stage
   moves and interviews: owner, hr, hiring manager (others who can see
   it: 403). Scheduling on a closed application: 409
   `APPLICATION_CLOSED`. The calendar title is `Interview: <requisition
   title>` (no candidate name leaves the app).
7. **Order:** stage events and check-ins use a per-parent `seq` (rows
   locked first), never the timestamp.
8. **Duplicates** (candidate email, application, scorecard, offer,
   exit, hire claim) use `INSERT ... ON CONFLICT DO NOTHING RETURNING`,
   so a unique violation never aborts the request's one transaction.
9. **Free text:** requisition close reasons and decision notes are
   stored in clear columns, never shown on the planned shapes, never
   audited. Exit reasons are encrypted.
10. **Offers store their terms** (probation end, trace) as computed at
    creation. Managers see offers of requisitions they hire for, salary
    null. Contract examples carry no legal value (empty rule lists,
    notice 45 days).
11. **Hire** takes email and other optional employee fields from the
    request only (the candidate's email is not copied). Default template
    tasks say "From the default ... checklist (product default, not
    law)."
12. **Exit target:** owner or hr name anyone (no `employeeId`: their
    own link); others only themselves; no link: 422 `NO_EMPLOYEE_LINK`.
    Visibility is Plan 3's `viewerScope`; settlement and reason for
    owner, hr and the leaver; a visible exit the caller may not
    withdraw is 403.
13. **The whole `ExitSettlement`** is sealed as one JSON value; version
    in clear. Exit checklist: manager task to the manager's login,
    employee task to the leaver's login, each falling back to role hr.
14. **Revocation closes old invites:** unused invites linked to the
    leaver's employee or sent to a revoked login's email are marked
    used, so only a new invite can restore access.
15. **Last owner:** unrevoked owner rows are locked before counting.
    Revoke on a closed or withdrawn exit returns the stored result if
    any, else 409 `EXIT_NOT_APPROVED`.
16. **Close** accepts a refused settlement (HR has seen the engine's
    answer); documents may still be generated on a closed exit; each
    call runs each distinct kind once and keeps the history.
17. **Goals:** owner and hr may create for anyone; managers for
    themselves and reports; employees for themselves. Update: creator,
    owner, hr or the employee's manager.
18. **Pins:** no new dependency.

## Concerns

- **"No login" is by employee link.** Revocation finds logins through
  `memberships.employee_id`. A login of the same person that is not
  linked to the employee record is not revoked and the exit shows
  "no-login".
- **Huge amounts:** `toMoney` throws above the wire cap
  (999,999,999.99), which gives a 500 instead of a refused settlement.
- **Revoked users still see the company row with no tenant set** (the
  Plan 3 "my companies" policy reads memberships without `revoked_at`);
  every listing filters it out, but the policy itself does not.
- **Task comments** are ordered by time then id; two comments in the
  same millisecond may swap.
- **Migrations:** merged Plan 3 already uses `007_payroll.sql` and
  `008_sif.sql`, inside Plan 6's stated range 007 to 010.
- **Shared Plan 3 files edited** (merge points with Plans 6 and 9):
  `audit/allowlist.ts`, `deps.ts`, `app.ts`, `auth/guard.ts`,
  `auth/accounts.ts`, `routes/users.ts`, `routes/employees.ts`,
  `people/employees.ts` (`Column`), contract `errors.ts`, `routes.ts`,
  `registry.ts`, `examples.ts`, `index.ts`, tests `leak`,
  `conformance`, `seed-rows`, `test-app`, `pg.integration`,
  `routes.test.ts`; `HANDOVER.md`, `LEDGER.md`.
- **pglite serialises transactions:** the concurrency claims rest on
  the two real-PostgreSQL races above, which were not seen red.
- The `hr_flow_end_to_end` test body is long (one scenario); source
  functions stay under 30 lines.

## Follow-up 1: merge of main and the Tasks 4 to 7 review fixes

Date: 2026-11-26. The concerns above on "no login", huge amounts and
the "my companies" policy are fixed below; the rest stand.

| Commit | Message |
|---|---|
| `a2cd320` | Merge claude/quirky-wozniak-b7xkvr into api-plan-8 |
| `051e3a8` | fix(api): exit access, leaver self-action and money pins (review) |
| (last) | docs: Plan 8 follow-up report and handover |

Trailers stay `Co-Authored-By: Claude Opus 5.5` (harness reminder;
nothing pushed).

### Merge resolutions

- Appends kept on both sides in `app.ts`, `deps.ts`, the audit
  allowlist, contract `errors.ts`, `examples.ts`, `registry.ts`,
  `routes.ts`, `seed-rows.ts`, `pg.integration.test.ts`, `test-app.ts`
  (one options type; Plan 6's name `MakeAppOpts` kept as an alias),
  `HANDOVER.md`, `LEDGER.md`.
- `approvals/decide.ts` (add/add): main's file is Plan 6's approval
  spine; Plan 8's rule moved to `approvals/assert-decidable.ts` (test
  `tests/assert-decidable.test.ts`). `APPROVAL_NOT_PENDING` is defined
  once (main's).
- Route counts: core 75 (Plan 3's 50 plus Plan 6's 25), HR 46, all 121.
- `routes/employees.ts`: main's handlers taken (MFA on salary and bank
  writes, no self-edit, viewer-scoped loading); Plan 8's internal
  `employee-actions.ts` uses main's field-wise writes.
- **Hire and main's salary rules:** the hire route is owner or hr
  without MFA, but it copies only the salary of an offer an owner
  approved in an MFA session, which its creator could not approve. An
  approved offer has no update route, and the hire creates the
  employee with no login, so nobody writes their own salary.
- `routes/users.ts`: main's one-user-per-employee rule combined with
  revocation. A revoked membership keeps its employee link (main's
  index counts it), so only the same user can take that employee back;
  the invite check lets that same email be re-invited.
- Main moved the whole-API flow to `tests/helpers/api-flow.ts`; Plan
  8's `hrFlow` runs from there (so the real-PostgreSQL whole-API test
  covers Plan 8 too). Leak test: main's per-target `SENTINELS` kept,
  Plan 8 fixtures re-applied; the offer sentinel moved to `6543.21`
  (main's expense sentinels use `8888.0x`).
- Web app: main's `apps/web` taken; only English and Arabic texts for
  Plan 8's error codes added. Web typecheck clean, web tests pass.
- Migrations 001 to 013, 601 to 604, 801 to 807 run in numeric order;
  the RLS catalog test passes. `pnpm install` left the lockfile as is.

### Review fixes (`review-t4-7.md`)

- **C-1:** logins that may be the leaver's are those linked by
  `employee_id` plus those whose user email equals the employee's
  email (case-insensitive, this company only); `Exit.access.logins`
  shows them to owner and hr. Revoke takes `{ notTheLeaver? }`: every
  listed active login is revoked except those HR confirms belong to
  someone else. New owner-only MFA route `PATCH /v1/users/{id}/employee`.
- **I-1:** close needs a stored revocation run for every exit and
  re-reads live logins (409 `ACCESS_NOT_REVOKED`, `detail.userIds`);
  accept-invite refuses (410 `INVITE_USED`) an invite whose employee
  has a closed exit created at or after the invite was issued.
- **I-2:** the leaver gets 403 `SOD_VIOLATION` on decide, settlement,
  revoke, close and withdraw, except withdrawing their own
  still-requested exit.
- **I-3:** revoking an owner or hr login needs an owner;
  `LAST_OWNER` is checked first.
- **I-4:** exit items for the employee go to the manager (else hr),
  naming the leaver; the leaver cannot change exit tasks about them.
- **I-5:** tests for every survivor; M11, M12, M15, M22, M24, M25,
  M27, M28, M35 and M40 were re-applied one by one and each is killed.
- **Minors done:** M-1 (refused settlement above the wire cap; leave
  inputs bounded at 3650 days, product bound), M-2 (salary version
  only: 409 `SETTLEMENT_STALE`), M-3, M-4, M-5 (806 recreates both
  policies), M-6 (via I-1), M-7, M-8. **Not done:** M-2 for joining
  date or worker class (needs a stored field), M-9 (Plan 3 insert
  path), M-10 (needs a ruling), M-11 (cosmetic), M-12 (kept), M-13
  (handover note).

### Decisions

1. Unlinked logins of the same person are matched by exact email
   within the company and revoked by default; HR must name a login as
   "not the leaver" to keep it; owners can link logins. A login with
   another email and no link is still undetectable (residual risk).
2. Back-dated exits are recorded by hr or owner, not self-service.
3. The real-PostgreSQL owner race now has each owner revoke the
   other's exit; the loser gets 409 or 403; one owner remains.

### Tests

contract 110; engine 584; wps 173; api 515 (one worker; with two, the
OS killed one worker under load and that file passed alone); web 103,
typecheck clean; real PostgreSQL 21 of 21 as the runtime role.
