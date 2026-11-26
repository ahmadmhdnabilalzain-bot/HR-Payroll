# Plan 8 build report (Tasks 2 to 8)

Date: 2026-11-26. Branch `api-plan-8` (not pushed), in the worktree
`/home/user/HR-Payroll/.claude/worktrees/agent-a5c1244c05330e949`, based
on `claude/quirky-wozniak-b7xkvr` at `32d2dfe`. Task 1 (the engine
`ae-employment` pack) was already merged and is used as is.

## Status

In progress. Tasks 2 to 7 done.

| Task | Commit message |
|---|---|
| 2 | `feat(api): task manager` |
| 3 | `feat(api): requisitions and applicant tracker` |
| 4 | `feat(api): offers with approval` |
| 5 | `feat(api): offer to hire and onboarding` |
| 6 | `feat(api): exit flow and final settlement` |
| 7 | `feat(api): exit hooks, access revocation, close` |

## Gate

`pnpm check` is red at the base commit, before any Plan 8 change, in
`apps/web` typecheck only (three errors in `src/api/errors.ts`,
`src/api/mock/handlers-payroll.ts`, `src/api/mock/seed-history.ts`; Plan
4's files, not touched here). Each commit is gated instead on `pnpm
lines`, `pnpm lines:test`, and typecheck plus tests of `contract`,
`engine`, `wps` and `api`. The machine is shared with other builders
(load average above 20 on 4 cores), so the gate runs vitest with
`--maxWorkers=2 --testTimeout=60000`: under that load a 5-second wps
property test timed out and one api worker was killed (SIGKILL) with
the default settings; both pass with the flags. No repository test
setting was changed.

## Adaptations to the plan (real Plan 3 code differs)

1. **Route counts.** Plan 3 has 50 routes, not 49 (`changeUserRole`
   was added). `CORE_ROUTES.length === 50`; the "mfa routes" and
   "owner-only routes" assertions in `routes.test.ts` now read
   `CORE_ROUTES` (Plan 8 adds MFA and owner-only routes).
2. **Lists are `{ items }`.** Plan 3 wraps every list response with
   `listOf`; Plan 8 does the same (`TaskSummaryList`, ...), not bare
   arrays.
3. **Audit is an allowlist.** Plan 3 refuses any audit `data` key that
   has no shape check, so "Plan 3's own list is left unchanged" was not
   possible. Plan 8's keys live in `src/audit/hr-allowlist.ts` (each
   with a shape check) and are spread into Plan 3's `CHECKS` with one
   line. `hrAudit` additionally refuses `HR_SENSITIVE_KEYS`. Keys with
   no value (for example `flowType` on a manual task) are left out.
4. **Shared files touched minimally.** HR error codes are in
   `contract/src/errors-hr.ts` (spread into `ERROR_STATUS`), HR schemas
   in `registry-hr.ts`, HR examples in `examples-hr.ts`, HR route
   registration in `api/src/routes/hr.ts` (one line in `app.ts`). This
   keeps merges with Plans 6 and 9 to single lines.
5. **Tenancy seed.** Plan 3's tenancy suite fails while any tenant
   table lacks rows for both companies; Plan 8's rows are seeded by
   `tests/helpers/seed-rows-hr.ts`.
7. **Salary rules.** Plan 3's salary check is `checkSalary` in
   `src/people/employee-writes.ts` (not `validateSalary` in
   `employees.ts`); offers call it directly, no export was renamed.
8. **Encryption.** `sealerFor(tx, deps, companyId, "offers")` gives
   exactly the planned AAD `<companyId>:offers:salary_enc:<offerId>`.
9. **Engine terms helper.** `src/onboarding/engine-terms.ts` runs
   `calculateProbation` and `validateContractNotice` for offers (and
   Task 5 terms). Offers check both at `startDate`, as planned.
10. **Employee actions.** Plan 3 had no ReqCtx-level
    `createEmployee`, `setSalary` or `updateEmployee` (the handlers
    lived in `routes/employees.ts`). They are now in
    `src/people/employee-actions.ts` (not `employees.ts`, which is the
    data layer) with the planned signatures, each writing its Plan 3
    audit event; the Plan 3 handlers call them, so behaviour is
    unchanged (Plan 3's employee tests pass). `updateEmployee` accepts
    `lastWorkingDate: null` to clear it.
11. **No `altStatus` in `RouteDef`.** `hireFromOffer` declares 201 and
    answers a replay with Plan 3's `Reply(200, ...)`; the route file
    documents it.
12. **Probation reminders created by the hire** carry the onboarding
    flow link, so the hire's task list is the template items plus the
    two reminders (as the plan's test expects); `saveTerms` takes an
    optional flow for this.
13. **Exit contract additions.** `NoticeFlag` (the engine's three
    strings), `DocumentKind` and `ExitDocument` are defined in
    `contract/src/exits.ts` in Task 6 because `Exit.documents` needs
    them; Task 7 only adds routes. `Exit.access` and `documents` are
    read from `src/exits/exit-hooks-view.ts`, which Task 7 extends.
14. **Encrypted columns.** Plan 3's closed `Column` union gained
    `reason_enc` and `settlement_enc`; `sealerFor(..., "exits")` gives
    the planned AAD `<companyId>:exits:<column>:<exitId>`.
15. **Settlement cross-check** runs Plan 3's `computePayRun` on a
    one-leaver snapshot and compares amounts, `notComputed` and the
    trace with `computeExitSettlement`. `serviceUnpaidLeaveDays` is
    always entered on exits (the plan's `SettlementInputs` requires
    it), so Plan 3's "not entered" note never applies here.
16. **Contract exit tests** are in a new `contract/tests/exits.test.ts`
    (not `schemas.test.ts`), to keep merges with other plans clean.
17. **Revocation touches more Plan 3 files than the plan names.**
    `revoked_at IS NULL` is applied in the tenant guard
    (`auth/guard.ts`), `membershipsOf` (`auth/accounts.ts`: login
    response and `GET /v1/me`), `listUsers`, and the owner count and
    target lookup of `changeUserRole` (`routes/users.ts`). Accept-invite
    lives in `routes/users.ts` (not `routes/auth.ts`): an existing
    revoked `(company, user)` membership is restored (role, employee
    link, `revoked_at` and `revoked_by` cleared) instead of failing on
    the primary key; an unrevoked one is still 409 `ALREADY_MEMBER`.
18. **Access result storage.** The two access runs (`in-app`,
    `external`) are rows of `exit_hook_runs` with a partial unique
    index (one per exit and kind); `beforeLastDay` is derived from the
    stored time, so a repeat call returns exactly the first answer.
6. **Leak test.** HR fixtures live in `tests/helpers/leak-hr.ts` and
   `seed-hr.ts` (`seedHr` runs after Plan 3's pay run and SIF, so the
   HR records never change those fixtures).

## Decisions

1. **Commit trailers.** The coordinator asked for `Co-Authored-By:
   Claude Sonnet 5.5`; the harness reminder for this session says
   `Claude Opus 5.5` and that only the user's own instructions (for
   example a CLAUDE.md rule) outrank it. The repository has no such
   rule, so the commits use the Opus line, as the Plan 3 builder did.
   Nothing is pushed; an amend is cheap if overruled.
2. **Manual tasks default to the creator** as assignee for every role
   (the plan states it for employees only).
3. **Checklist ticks** need the right to change status (creator, owner,
   hr or assignee); adding items needs the right to edit (creator,
   owner, hr). Comments: anyone who can see the task.
4. `mine=true` means "assigned to me".
5. **Hiring manager named by owner or hr** must be a member with role
   owner, hr or manager (else 422 `ASSIGNEE_NOT_MEMBER`); an unknown
   department is 404 with `detail.fields`.
6. **Who sees an application:** owner, hr, the requisition's hiring
   manager or requester, and anyone listed on one of its interviews
   (so interviewers can open it to score). Stage moves and interview
   scheduling or cancelling: owner, hr or the hiring manager (a
   manager who can see it but is not the hiring manager gets 403).
7. **Stage history order** uses a per-application `seq` column (not
   the timestamp, which can tie).
8. **A requisition's close reason** is stored in its own column
   `close_reason` (not shown on `Requisition`, whose shape the plan
   fixes) and is never audited.
9. **Interview scheduling on a closed application** (hired, rejected,
   withdrawn) is 409 `APPLICATION_CLOSED`; cancelling a cancelled
   interview returns it unchanged. The calendar title is
   `Interview: <requisition title>` (no candidate name leaves the app).
11. **Offers store their terms** (`probation_end_date`,
    `terms_trace`) as computed at creation, so a later pack change does
    not silently alter an offer already approved. Offer visibility for
    managers: the requisition's hiring manager only (salary null).
12. **Offer example trace** in the contract carries no rule values, so
    the contract holds no statutory number.
13. **Pre-law joiners (joined before 2022-02-02).** The employment
    pack starts on 2022-02-02, so `calculateProbation` refuses any
    earlier joining date, even with zero months. Terms for such an
    employee are accepted only with `probationMonths: 0` (no dates, no
    probation trace); with months they are refused (422
    `ENGINE_REFUSED`, `NO_PACK_FOR_DATE`). Without this, no existing
    employee could ever get terms, and so could never leave through the
    exit flow.
14. **Contract notice check date for terms** is the later of the
    joining date and today (Dubai): notice is given under the law in
    force, and a future joiner is checked at the start date (as offers
    are).
15. **Default template tasks** say "From the default onboarding
    checklist (product default, not law)." in their description.
16. **Hire uses only the request's fields** for email and the other
    optional employee fields (the candidate's email is not copied).
17. **Who the exit is for.** Owner or hr name any employee (no
    `employeeId`: their own linked employee). Others may only name
    themselves; a missing employee link is Plan 3's 422
    `NO_EMPLOYEE_LINK`.
18. **Exit visibility** is Plan 3's `viewerScope` (owner and hr: all;
    manager: self and direct reports; employee: self). Settlement and
    reason: owner, hr and the leaver. A visible exit the caller may not
    withdraw (not requester, owner or hr) is 403.
19. **Decision notes** (requisitions, offers, exits) are stored in clear
    columns, never shown on the planned response shapes and never
    audited. Exit reasons are encrypted (planned `reason_enc`).
20. **The whole `ExitSettlement`** (wire amounts, trace, inputs) is
    sealed as one JSON value in `settlement_enc`; `settlement_version`
    is kept in clear for ordering.
21. **Exit checklist people:** the manager task goes to the login linked
    to the leaver's manager, the employee task to the leaver's own
    login; each falls back to role hr.
22. **Revoke on a closed or withdrawn exit** returns the stored result
    if one exists, else 409 `EXIT_NOT_APPROVED`.
23. **Last owner:** every unrevoked owner row is locked (as
    `changeUserRole` does) before counting, so two revocations of two
    owner-leavers at once leave one owner (real PostgreSQL test:
    200 and 409).
24. **Close accepts a refused settlement** (HR has seen the engine's
    answer); documents can still be generated on a closed exit.
26. **Revocation closes old invites.** Revoking marks this company's
    unused invites as used when they are linked to the leaver's
    employee record or sent to the email of a login being revoked
    (also for "no-login" leavers). Without this, an invite issued
    before the exit (a duplicate, or one linked to the employee) could
    restore access after it; only a new invite can (test
    `old_invite_cannot_restore_after_revoke`, seen red first).
25. **Documents** run once per distinct kind per call, in the order
    stored; a repeated call adds new runs (the history is kept).
10. **Duplicates** (candidate email, application, scorecard) are found
    with `INSERT ... ON CONFLICT DO NOTHING RETURNING`, so a unique
    violation never aborts the request's one transaction.

## Test order (honest)

- Task 2: the API tests (`tasks.test.ts`) were written first and seen
  red (module missing). The contract schemas and `routes-hr.test.ts`
  were written before the contract test was run, so that test was
  never seen red.
- Task 3: `approvals`, `requisitions` and `applications` tests were
  written first and seen red (20 failing); the contract schemas came
  just before them.
- Task 7: `revocation` and `exit-hooks` tests were written first and
  seen red (19 failing). The two real-PostgreSQL races
  (`pg-concurrency-hr.ts`) were written after the code and never seen
  red against older code.
- Task 6: `exit-settlement` (pure) and `exits` tests were written
  first and seen red (15 failing); `settlement.ts` was written first,
  then the rest, as planned.
- Task 5: `expand`, `terms` and `hire` tests were written first and
  seen red (12 failing).
- Task 4: `offers.test.ts` was written first and seen red (seed
  failed: no offer routes).

## Concerns

- Migrations: the merged Plan 3 already uses `007_payroll.sql` and
  `008_sif.sql`, which collides with Plan 6's stated range 007 to 010.
  Plan 8 uses 801 to 807 (three digits, so the runner's lexical order
  is numeric; no runner change was needed).
