# Plan 6 build report (expenses and claims)

Date: 2026-11-26. Branch `api-plan-6` (not pushed), worktree
`/home/user/HR-Payroll/.claude/worktrees/agent-a98cb405e06910d16`,
based on `claude/quirky-wozniak-b7xkvr` at `32d2dfe`.

## Progress

| Task | Commit message | State |
|---|---|---|
| 1 | `feat(contract): expenses, approvals, receipts` | done |

## Adaptations to the plan (Task 1)

1. **Route count 75**, not 74: Plan 3 shipped 50 routes (it added
   `changeUserRole`). The 25 routes live in their own file
   `packages/contract/src/routes-expenses.ts` (`EXPENSE_ROUTES`), so
   merges with Plans 8 and 9 touch one line of `routes.ts`.
2. **List envelopes.** Plan 3 answers every list as `{ items }` and
   requires a named schema with an example for every route response.
   So `approvalInbox` returns `ApprovalTaskList`, `listApprovalChains`
   `ApprovalChainList`, `expenseAging` `AgingReport` and
   `expenseUnpaid` `UnpaidReport`, each `{ items: [...] }` (the plan
   said bare arrays). The download's response is a named placeholder
   `ReceiptContent` (the bytes are not JSON).
3. **Route ids the plan left unnamed:** `listApprovalChains`,
   `uploadReceipt`, `getReceipt`, `downloadReceipt`,
   `listExpenseCategories`, `createExpenseCategory`,
   `updateExpenseCategory`, `getExpensePolicy`, `putExpensePolicy`,
   `listExpenseClaims`, `createExpenseClaim`, `getExpenseClaim`,
   `updateExpenseClaim`, `submitExpenseClaim`, `cancelExpenseClaim`.
4. **Error codes:** `SOD_VIOLATION` and `PAYLOAD_TOO_LARGE` already
   existed in Plan 3; the other 19 are in one `EXPENSE_ERROR_STATUS`
   block spread into `ERROR_STATUS`.
5. **Extra contract files:** `expense-policy.ts` (categories, limits,
   rates, policy) split from `expenses.ts` to stay under 300 lines;
   `registry-expenses.ts` (named schemas) and `examples-expenses.ts`.
   `Trn` lives in `receipts.ts`; `PolicyCode` in `expense-policy.ts`.
6. **ComputedPayslip is not derived from Payslip** in the merged code,
   so Task 1 fills the no-claim values only in the serialisers
   (`toWirePayslip`, `toPayRun`); `compute.ts` and its tests are
   unchanged until Task 6.
7. **Pending route list.** The conformance and leak suites require
   every route to be served; `tests/helpers/plan6-pending.ts` lists
   the Plan 6 ids not yet served, each task removes its ids, and Task 7
   asserts the list is empty.
8. **The web app is `apps/web`**, not `packages/web`. Its typecheck was
   already red on the base commit (Plan 3's `sifFileId` and nested
   error `detail`). Minimal fixes so it compiles: the mocks fill the new
   pay-run and payslip fields (and the missing `sifFileId`), the web's
   App types carry `reimbursementTotal`, `salaryNet` and reimbursement
   amounts as `Fils` with wire conversion in `contract.ts`, and
   `ErrorDetail` follows the contract (problem objects are decoded as
   objects, mock JSON strings as before).

## Decisions

1. **Commit trailer.** The brief asks for `Co-Authored-By: Claude
   Sonnet 5.5`; the harness reminder says `Claude Opus 5.5` and that
   only the user's own instructions (CLAUDE.md or memory) outrank it.
   `LEDGER.md` sections 1 and 2 hold no owner rule on attribution, so
   every commit uses the Opus line, as the Plan 3 builder recorded. The
   session line is the one given. Nothing is pushed, so a rewrite is
   cheap if overruled.
2. **Migrations are numbered 601 to 604** (approvals, receipts,
   expense policy, expense claims): Plan 3 already used 007 and 008,
   and Plans 8 and 9 use 801 and 901 blocks. The runner's three-digit
   pattern and lexical sort already order them, so it is unchanged.

## Concerns

1. `pnpm check` is not fully green, for reasons that predate this
   branch: two `apps/web` tests fail on the base commit and still fail
   (`every-error-code-has-text`: Plan 3's codes such as
   `INVITE_NOT_FOUND` have no web text, and Plan 6's codes join that
   list; `invite-and-mfa`: the web mock still enrols MFA without the
   password Plan 3 now requires). Everything else passes. Fixing the
   web's Plan 3 debt is Plan 4 work and would collide with the other
   builders in the same catalogue files.
