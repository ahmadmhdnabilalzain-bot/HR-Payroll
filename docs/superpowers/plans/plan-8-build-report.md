# Plan 8 build report (Tasks 2 to 8)

Date: 2026-11-26. Branch `api-plan-8` (not pushed), in the worktree
`/home/user/HR-Payroll/.claude/worktrees/agent-a5c1244c05330e949`, based
on `claude/quirky-wozniak-b7xkvr` at `32d2dfe`. Task 1 (the engine
`ae-employment` pack) was already merged and is used as is.

## Status

In progress. Tasks 2 and 3 done.

| Task | Commit message |
|---|---|
| 2 | `feat(api): task manager` |
| 3 | `feat(api): requisitions and applicant tracker` |

## Gate

`pnpm check` is red at the base commit, before any Plan 8 change, in
`apps/web` typecheck only (three errors in `src/api/errors.ts`,
`src/api/mock/handlers-payroll.ts`, `src/api/mock/seed-history.ts`; Plan
4's files, not touched here). Each commit is gated instead on `pnpm
lines`, `pnpm lines:test`, and typecheck plus tests of `contract`,
`engine`, `wps` and `api`.

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

## Concerns

- Migrations: the merged Plan 3 already uses `007_payroll.sql` and
  `008_sif.sql`, which collides with Plan 6's stated range 007 to 010.
  Plan 8 uses 801 to 807 (three digits, so the runner's lexical order
  is numeric; no runner change was needed).
