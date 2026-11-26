# Plan 6 build report (expenses and claims)

Date: 2026-11-26. Branch `api-plan-6` (not pushed), worktree
`/home/user/HR-Payroll/.claude/worktrees/agent-a98cb405e06910d16`,
based on `claude/quirky-wozniak-b7xkvr` at `32d2dfe`.

## Progress

| Task | Commit message | State |
|---|---|---|
| 1 | `feat(contract): expenses, approvals, receipts` | done |
| 2 | `feat(api): shared approval spine` | done |
| 3 | `feat(api): receipts with storage and OCR port` | done |
| 4 | `feat(api): expense policy, pricing, checks` | done |

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

## Adaptations to the plan (Task 2)

1. **Visibility is checked before the step checks** in `decide`: a
   caller who may not view the subject and is no step's approver gets
   404 before any 409, so approval ids cannot be probed for state (the
   plan listed the 409s first).
2. **`approval_requests` stores `claimant_employee_id`**, and at
   decision time every user now linked to that employee is excluded
   too (not only the claimant user stored at submit).
3. **A chain's first tier must start at "0.00"** (422 `CHAIN_INVALID`,
   path `tiers.0.minTotal`), and `resolveChain` refuses a subject that
   no tier covers with `NO_ELIGIBLE_APPROVER`. Without this, a claim
   below the first tier would open a request with no steps.
4. **`createApp(deps, opts)`** takes `{ subjects }`; Plan 6's routes are
   registered by one call, `registerExpenseApp` in `src/expense-app.ts`
   (one line in `app.ts`). `DEFAULT_SUBJECTS` is empty until Task 5.
5. **Audit keys** for Plan 6 are in `src/audit/allowlist-expenses.ts`
   (`subjectType`, `stepCount`, `stepOrder`, `tierCount`, `itemCount`,
   `limitCount`, `rateCount`, `size`, `contentType`, `flagCodes`,
   `payRunId`), spread into the Plan 3 allowlist; each has a shape
   check (enums, integers, uuid).
6. **`approval.cancelled`** is an extra audit action (a withdrawn
   claim closes its open request).
7. **Tenancy seed:** `tests/helpers/seed-rows-expenses.ts` seeds every
   Plan 6 table for both companies, called by one line in
   `seed-rows.ts`. The conformance registration check now asserts no
   duplicate and no unknown route, and that every non-pending route is
   registered (it compared sorted lists before).
8. **Real PostgreSQL:** Plan 6's races are in their own file,
   `tests/pg-plan6.integration.test.ts` (skipped without
   `DATABASE_URL`), so Plan 3's `pg-concurrency.ts` is not edited.

## Adaptations to the plan (Task 3)

1. **Body limits per route.** Plan 3's global 1 MiB `bodyLimit` ran
   before every route, so `src/http/body-limit.ts` now skips routes
   that declare their own `bodyLimit` and `register()` adds that
   route's limiter with `app.use` (so the route table still lists one
   handler per route). Both answer 413 `PAYLOAD_TOO_LARGE`.
2. **`BinaryReply`** in `src/http/context.ts` sends raw bytes with the
   stored type, `Content-Disposition: attachment;
   filename="receipt-<id>.<ext>"`, `X-Content-Type-Options: nosniff`
   and `Cache-Control: no-store`.
3. **`systemDeps(db, kek, blobs)`** takes the blob store; `main.ts`
   passes `fsBlobStore(RECEIPTS_DIR)`. The column union in
   `people/employees.ts` gained `"content"` so the sealer's AAD is
   exactly `<companyId>:receipts:content:<receiptId>`.
4. **`receipt.downloaded`** audit data is `{ contentType, size }` (the
   plan named no keys). `readSuggestion` also takes the request id for
   its log line, which carries a reason (`threw` or `invalid`) but
   never the reader's output or error text.
5. **`receiptVisible`** takes an optional extra viewer check, which
   Task 5 supplies (approvers of a claim that references the receipt).
6. **Tests:** `callBytes` in `tests/helpers/test-app.ts` reads binary
   bodies; `memoryBlobStore().dump()` lets the test see that stored
   bytes are encrypted; `makeApp({ reader })` swaps the OCR port.

## Receipts design (Task 3)

- Strict base64 is checked with a plain character class plus length
  and padding rules, then decoded and re-encoded to reject non-zero
  padding bits (Node's decoder never throws). The first version used a
  repeated-group regex, which overflowed V8's regex stack on a 7 MB
  body and gave a 500; the oversize test caught it.
- The size limit is computed from the text length before decoding;
  the declared type must equal the sniffed one; only JPEG, PNG and PDF
  magic bytes pass (`length > magic`), so HTML, SVG, GIF and HEIC fail.
- Bytes are encrypted with the company key before `BlobStore.put`;
  `fsBlobStore` accepts only `<uuid>/receipts/<uuid>` keys, writes a
  `.part` file exclusively and hard-links it into place, so a blob is
  never half-written or overwritten.
- `receipts` is insert-only (no update grant), with a database CHECK
  on type, size and hash shape.
- Missing visibility is always 404, never 403. `duplicateOf` lists only
  same-employee receipts for callers other than owner and hr.

## Adaptations to the plan (Task 4)

1. **Rule details the plan left open:** a missing category skips the
   kind and limit checks for that item but other problems are still
   reported; `EXPENSE_TOO_OLD` is not raised for a future date (that
   is `EXPENSE_DATE_IN_FUTURE`); `POSSIBLE_DUPLICATE` and
   `DUPLICATE_RECEIPT` flag the repeat, not the first item, inside one
   claim; a flag-mode over-limit item is listed in `overLimitIndexes`
   with or without a justification (the missing justification is the
   problem).
2. **Categories:** a taken code is detected with `ON CONFLICT DO
   NOTHING` (no 500 on a race). `expense-category.created` audit data
   is `{}`; `.updated` carries `changed` (field names).
3. **Policy versions** follow the chain pattern: version 0 can only
   insert, later versions update `WHERE version = expected`.
4. **POLICY_INVALID paths:** a duplicate limit or rate names the later
   row (`limits.1`, `mileageRates.1`); a zero rate names its amount
   (`mileageRates.2.perKm`).

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

## Approval spine design (Task 2)

- Database guards beside the code: a decided step and a closed request
  cannot be updated again (trigger `approval_closed_is_final`); a
  step's `decided_by` must be one of its `eligible` users (CHECK); one
  open request per subject (partial unique index); `current_step` and
  `closed_at` agree with `status` (CHECKs).
- `decide` locks the request row `FOR UPDATE`, checks `stepOrder`
  against `current_step`, then updates the step only `WHERE status =
  'pending'` and requires one row.
- Chain updates are optimistic: version 0 can only insert (`ON
  CONFLICT DO NOTHING`), a later version only updates `WHERE version =
  expected`; no row back means 409 `CHAIN_VERSION_CONFLICT`.

## Test order (honest)

- Task 1: contract tests written and seen red (18 failures), then green.
- Task 4: pricing, check, purity and policy tests seen red (modules
  missing, routes 404), then green.
- Task 3: sniff, fs-blob, receipts and config tests seen red (modules
  missing), then green.
- Task 2: `approvals-resolve.test.ts` was written before `resolve.ts`
  but not run red before it existed; `approvals.test.ts` was seen red
  (module missing), then green. The tenancy suite went red on the new
  tables, then green after seeding.

## Concerns

- A receipt's blob is written before the database transaction
  commits; a failed transaction leaves an orphan encrypted file (never
  served: no row points at it). A sweeper is later work.

1. `pnpm check` is not fully green, for reasons that predate this
   branch: two `apps/web` tests fail on the base commit and still fail
   (`every-error-code-has-text`: Plan 3's codes such as
   `INVITE_NOT_FOUND` have no web text, and Plan 6's codes join that
   list; `invite-and-mfa`: the web mock still enrols MFA without the
   password Plan 3 now requires). Everything else passes. Fixing the
   web's Plan 3 debt is Plan 4 work and would collide with the other
   builders in the same catalogue files.
