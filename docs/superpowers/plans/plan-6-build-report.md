# Plan 6 build report (expenses and claims)

Date: 2026-11-26. Branch `api-plan-6` (not pushed), worktree
`/home/user/HR-Payroll/.claude/worktrees/agent-a98cb405e06910d16`,
based on `claude/quirky-wozniak-b7xkvr` at `32d2dfe`.

## Status

All seven tasks are built, test-first, one commit per task. Not pushed.
Tasks 2, 3 and 6 (approvals, untrusted files, money) await their
security review; then one whole-branch review.

## Tests (final run)

- api: 310 passed, 22 skipped (the real-PostgreSQL suites, which skip
  without `DATABASE_URL`). With `DATABASE_URL` pointing at a throwaway
  PostgreSQL 16 superuser (`/tmp/pgplan6`, port 5466, stopped at the
  end), the real-PostgreSQL suites pass 22 of 22 (Plan 3's 17 plus
  Plan 6's 5), run as the non-superuser runtime role the way Plan 3
  did. Plan 6's real-PostgreSQL cases are four races (two approvers,
  March and April runs at once, two submits against one monthly
  limit, a cancel racing the last approval) and one smoke case
  (receipt upload and download, list filters, the five reports). The
  rest of the Plan 6 suite runs on pglite only.
- contract 98, engine 539 (3 skipped), wps 173: all pass. Line length
  and every typecheck (including `apps/web`) pass.
- `apps/web`: 86 passed, 2 failed. Checked on the base commit
  `32d2dfe` (detached checkout, same worktree): the web suite already
  failed there with at least ten tests, including both of these; this
  branch's web changes fixed the rest (see Concerns). `pnpm check` therefore exits 1 at the web step, which
  also stops `pnpm -r test` before the api package, so the api suite
  was run on its own.

## Progress

| Task | Commit | Message |
|---|---|---|
| 1 | `6ff6ec7` | `feat(contract): expenses, approvals, receipts` |
| 2 | `9810ea8` | `feat(api): shared approval spine` |
| 3 | `4476d85` | `feat(api): receipts with storage and OCR port` |
| 4 | `542bd32` | `feat(api): expense policy, pricing, checks` |
| 5 | `665246a` | `feat(api): expense claims with approvals` |
| 6 | `deffc89` | `feat(api): reimburse approved claims in payroll` |
| 7 | the commit holding this report | `feat(api): expense reports, handover` |

The cancel lock-order fix (Further adaptations, item 1) touches Task
5's `expenses/claims.ts` but is in the Task 7 commit.

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

## Adaptations to the plan (Task 5)

1. **Extra files** to stay under 300 lines and 30-line functions:
   `expenses/items.ts` (save-time pricing, save checks, item inserts),
   `expenses/submit-facts.ts` (repricing, hashes, other claims, role,
   flag messages) and `expenses/receipt-access.ts` (the receipt viewer
   check for claim viewers).
2. **Items are repriced in place at submit**, so `expense_items` has an
   UPDATE grant (amount, rate, over-limit); still no DELETE anywhere.
   An edit inserts the next revision.
3. **Migration 604 also adds the pay-run columns** Task 6 needs
   (`reimbursement_total`, `claim_count`, `pending_claim_count`, all
   default 0), so the plan keeps four migration files.
4. **Database guards:** a claim in `rejected`, `cancelled` or
   `reimbursed` can never be updated (trigger); `pay_run_id` is only
   set on `approved` or `reimbursed` claims and `reimbursed` needs it
   (CHECKs); mileage and per diem items carry no VAT and no TRN
   (CHECK); every reference carries `company_id`.
5. **Cancel:** a visible caller who may not cancel gets 403 `FORBIDDEN`
   (for example the claimant on an approved claim, or a manager on a
   report's draft); a status that can never be cancelled gives 409
   `CLAIM_NOT_CANCELLABLE` (the plan said 409 for both). Audit data is
   `{ from: <previous status> }`.
6. **Visibility in SQL** (`VISIBLE` in `claim-view.ts`) is shared by
   the single read, the list and the receipt check; a visible caller
   who is not an editor gets 403 on edits, an invisible one 404.
7. **List date filters** use the claim's creation date in Dubai.
8. **Flags carry fixed messages per code** (no amounts or names).
9. **Approval outcome audit** (`expense-claim.approved`, `.rejected`,
   `.returned`) has `data: {}`; `onClosed` only moves a `submitted`
   claim.
10. **Real PostgreSQL:** two claims of one employee submitted at once
    against one monthly limit give one 200 and one 422 (the employee
    row lock serialises them).

## Adaptations to the plan (Task 6)

1. **The pay-run columns** (`reimbursement_total`, `claim_count`,
   `pending_claim_count`) are stored on `pay_runs` at insert (migration
   604) and read by `toPayRun`, so a voided run keeps the figures it
   had.
2. **`buildSnapshot(..., source)`** takes `{ newRun: true }` (approved,
   unlinked, in-scope claims minus `excludeClaimIds`, locked) or `{
   runId }` (the claims linked to that run). Approval rebuilds the
   snapshot from the linked claims, so its input hash still matches;
   with the plan's single rule the rebuild would have found no claims
   and refused every run that pays one.
3. **`src/expenses/run-claims.ts`** holds the payroll side (select for
   a new run, claims of a run, pending count, link, reimburse,
   release). `createPayRun` was split (`insertRun`) to keep functions
   short; its behaviour for runs without claims is unchanged.
4. **Linking is guarded twice:** the select is `FOR UPDATE` with
   `status = 'approved' AND pay_run_id IS NULL` in id order (no
   deadlock between two runs), and the link UPDATE repeats that
   predicate and must touch every snapshot claim (else 409
   `RUN_INPUTS_CHANGED`).
5. **`applyReimbursements` starts from `salaryNet`** (which the salary
   step sets equal to `net`) and replaces its own trace lines, so
   applying it twice gives the same payslip.
6. **Test helpers** live in `tests/helpers/reimb-world.ts` and
   `expense-fixtures.ts` (`claimOf`, `claimFor`, `approvedClaim`), not
   in Plan 3's `seed.ts` (`seedClaim` in the plan), to keep merges
   simple.
7. **SIF check:** the test asserts the SIF total equals the run's
   gross and the file contains neither the claim amount nor the net
   with reimbursements; `buildSifBatch` is unchanged and reads only
   `lines`.
8. **Real PostgreSQL:** March and April runs created at once link
   three claims, each to exactly one of the two runs.

## Adaptations to the plan (Task 7)

1. **Reports split** into `expenses/reports.ts` (summary, VAT
   register) and `expenses/reports-payroll.ts` (aging, unpaid,
   payouts). Summary rows sort by label; an employee with no
   department groups under `none` / "No department".
2. **CSV:** `CsvReply` in `src/http/context.ts` answers `text/csv;
   charset=utf-8` as an attachment (`expense-summary.csv`,
   `expense-vat-register.csv`, `expense-payouts.csv`), with `nosniff`
   and `no-store`; the routes wrap their JSON builders with
   `csvOptional`. The statement line is always one quoted cell; a cell
   starting with `=`, `+`, `-`, `@`, tab or CR gets a leading `'`, and
   is quoted when it holds `,`, `"`, CR or LF.
3. **Leak test:** `seedExpenses` (in `tests/helpers/seed-expenses.ts`,
   not `seed.ts`) runs **before** the pay run, so payslips carry the
   sentinel reimbursements and are checked too (the plan said after
   `seedPayroll`, which would leave no reimbursement in any payslip).
   Expense sentinels: owner and hr may see all four; the manager sees
   their own and both direct reports' (as line manager and approver);
   the employee sees their own. Company B gets 404 for every A claim
   and receipt id on every `{id}` GET route.
4. **Conformance:** the Plan 6 happy paths are in
   `tests/helpers/conformance-expenses.ts`, called from `runFlow` (the
   claim approved there is paid by the March run, so payouts has a
   row). The binary route is checked by `Content-Type` and
   `Content-Disposition` (the recorder reads text, so byte equality is
   proved in `receipts.test.ts`); the three CSV variants by
   `text/csv`. The pending list is empty and asserted empty.
5. **LEDGER.md** section 3 gained one dated row per ruling (28) and one
   row pointing at this report; **HANDOVER.md** has the state, layout
   rows, `RECEIPTS_DIR` and the limits.

## Further adaptations (found in the final check)

1. **Cancel takes locks in `decide`'s order** (approval request, then
   claim). The first version locked the claim first, and on real
   PostgreSQL a claimant cancelling while the last approver approved
   deadlocked (one 500); the new race test failed on that version and
   passes now. A request that changed between the two reads (a
   resubmit) gives 409 `APPROVAL_STEP_CHANGED`.
2. **Global Constraints the plan's interfaces do not carry:** `PayRun`
   has no note field, so pay runs show reimbursements through
   `reimbursementTotal` and `claimCount` and the note travels on each
   payslip (`reimbursementNote`) and on the payouts report;
   `ExpenseClaim` carries `vatRecoverability: "not-assessed"` but not
   the `VAT_STATEMENT` text (the VAT reports and CSVs carry it). The
   interfaces were followed as written.
3. **Smaller ones:** `mayDecide` takes the step order, not an array
   index; `expense_claims.created_at` is an added column (list order
   and date filters); `Payslip.reimbursementNote` is the literal note
   or null, not any string; `ReceiptUpload.dataBase64` has a maximum
   of 7,200,000 characters; `receipts/base64.ts` is an extra file;
   `fsBlobStore` hard-links the `.part` file into place (refusing to
   overwrite) instead of renaming; the OpenAPI error list was not
   widened with 413 and 415.

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
3. **No new dependency** and no version pin chosen; `hono/body-limit`
   is part of the pinned Hono 4.13.17.
4. **Statutory values:** none were added. VAT recovery is
   `not-assessed` (unsourced) with the exact `VAT_STATEMENT`; the WPS
   treatment of reimbursements is unsourced and carried as
   `REIMBURSEMENT_WPS_NOTE`; mileage and per diem rates have no default
   (`RATE_NOT_FOUND`); the TRN format is a labelled convention. No VAT
   rate appears in code or tests (a contract test scans exported
   strings and examples; a report test scans every report body).
5. **The web app** got only what its typecheck needed (see Task 1,
   item 8); no web texts were added for the new error codes, to avoid
   colliding with Plan 4 and the parallel plans in the same catalogue.

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
- Task 2: `approvals-resolve.test.ts` was written before `resolve.ts`
  but not run red before it existed; `approvals.test.ts` was seen red
  (module missing), then green. The tenancy suite went red on the new
  tables, then green after seeding.
- Task 3: sniff, fs-blob, receipts and config tests seen red (modules
  missing), then green.
- Task 4: pricing, check, purity and policy tests seen red (modules
  missing, routes 404), then green.
- Task 5: claim, submit and approval-flow tests seen red (18 failures,
  routes 404), then green.
- Task 6: reimburse, pay-run and exactly-once tests seen red (10
  failures), then green; every Plan 3 pay-run, SIF and idempotency test
  still passes unchanged (only the compute test builder gained
  `reimbursements: []`).
- Task 7: CSV and report tests seen red (module missing, routes 404),
  then green; the leak and conformance extensions were written after
  the report code and passed on first run.
- The real-PostgreSQL race tests were written after their code and were
  never seen red against a broken version.

## Concerns

1. `pnpm check` is not fully green, for reasons that predate this
   branch: two `apps/web` tests fail on the base commit and still fail
   (`every-error-code-has-text`: Plan 3's codes such as
   `INVITE_NOT_FOUND` have no web text, and Plan 6's codes join that
   list; `invite-and-mfa`: the web mock still enrols MFA without the
   password Plan 3 now requires). The web typecheck was red on the base
   commit too and is green now. Fixing the web's Plan 3 debt is Plan 4
   work.
2. A receipt's blob is written before the database transaction
   commits; a failed transaction leaves an orphan encrypted file (never
   served: no row points at it). A sweeper is later work.
3. Merge points with Plans 8 and 9 (all one-line or append-only):
   `routes.ts`, `registry.ts`, `examples.ts`, `errors.ts`,
   `allowlist.ts`, `app.ts`, `seed-rows.ts`, `conformance.test.ts`,
   `leak.test.ts`, `contract/tests/routes.test.ts` (the route count and
   the exact owner-only and MFA lists), `HANDOVER.md` and `LEDGER.md`
   section 3. Plan 3 files changed beyond one line: `http/context.ts`
   (binary and CSV replies, per-route body limit), `payroll/compute.ts`,
   `snapshot.ts`, `pay-runs.ts`, `payslips.ts` (reimbursements),
   `deps.ts`, `config.ts`, `main.ts` (blob store), and `people/
   employees.ts` (one column name).
4. pglite runs one transaction at a time, so the races are proved only
   by the real-PostgreSQL suite, which is skipped without
   `DATABASE_URL`.
5. Approvers keep seeing a claim (and its receipts) after deciding it,
   and a line manager sees a report's drafts: by design of the plan's
   visibility rule, worth a look in the security review.
6. An approval's `summary.total` and the inbox show claim totals to
   approvers; claim amounts are stored in clear (Ruling 15).
7. Old pay-run snapshots without `reimbursements` open as an empty
   list; none exist outside tests.
