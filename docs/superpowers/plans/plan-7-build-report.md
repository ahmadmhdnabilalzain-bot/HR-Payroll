# Plan 7 build report (documents, letters, Emiratisation)

Date: 2026-11-26. Branch `api-plan-7` (not pushed), worktree
`/home/user/HR-Payroll/.claude/worktrees/agent-ac682107696d35bb1`.

## Setup and merge

Base `deffc89` (tip of `api-plan-6`), then `claude/quirky-wozniak-b7xkvr`
merged (`f28df25`). Conflicts were resolved by keeping both sides:

1. `pay-runs.ts`: Plan 6's expense-claim linking plus the review fixes
   (keyed snapshot hash, `changes` column, `RUN_EMPTY`, problems
   module). Pay-run audit data took the review side's flat
   `{ year, month }` (both shapes pass the allowlist).
2. `snapshot.ts`: the employee share-lock and unreadable-row refusal of
   the review side, then Plan 6's claim source.
3. `compute.ts`: Plan 6's reimbursements are applied before the review
   side's wire-cap check.
4. `employees.ts` column union: both sides' new columns.
5. Contract `PayRun`: Plan 6's three claim fields plus
   `changedSinceLastRun`; the MFA route list joins both sides.
6. Web mocks fill both sides' new pay-run fields; web `contract.ts` and
   `errors.ts` took the review side.
7. Two Plan 6 test fixtures adapted to the review fixes: the
   `reimburse.test.ts` employee gained a bank and labour id (now
   required), and the leaver settlement case gained
   `serviceUnpaidLeaveDays: 0` (now required for leavers).
8. `pg.integration.test.ts` (whole-API flow as the runtime role) now
   skips `PLAN6_PENDING` ids, as the conformance suite already did: the
   review side's flow does not call Plan 6 routes.

After the merge: api 330 tests pass; contract 98 pass; web 102 of 103
(`every-error-code-has-text` fails on Plan 6's codes, as before).

## Progress

| Task | Commit message | State |
|---|---|---|
| 1 | `feat(contract): documents, letters and Emiratisation schemas` | |
| 3 | `feat(api): encrypted file storage and upload` | |
| 4 | `feat(api): employee documents and expiry alerts` | |
| 5 | `feat(api): company library and receipts` | |
| 6 | `feat(api): letter templates and merge` | |
| 7 | `feat(api): letters rendered to PDF` | |
| 8 | `feat(api): Emiratisation report, handover` | |

Task 2 (engine pack and tracker) was already merged and is used as is.

## Adaptations to the plan

## Decisions

1. **Commit trailers.** The brief asks for `Claude Sonnet 5.5`; the
   session's attribution reminder says `Claude Opus 5.5` and yields
   only to the user's own CLAUDE.md or memory. The repository has no
   CLAUDE.md and `LEDGER.md` has no attribution rule, so the commits
   use the reminder's Opus line (as the Plan 6 builder did). Nothing
   is pushed, so a rewrite is cheap if overruled.

## Concerns

1. `PLAN6_PENDING` was never drained by Plan 6: its 25 served routes
   are skipped by the conformance, leak and runtime-role flow suites.
