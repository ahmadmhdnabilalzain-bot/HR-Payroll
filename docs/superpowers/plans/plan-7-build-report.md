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
| 1 | `feat(contract): documents, letters and Emiratisation schemas` | done |
| 3 | `feat(api): encrypted file storage and upload` | done |
| 4 | `feat(api): employee documents and expiry alerts` | |
| 5 | `feat(api): company library and receipts` | |
| 6 | `feat(api): letter templates and merge` | |
| 7 | `feat(api): letters rendered to PDF` | |
| 8 | `feat(api): Emiratisation report, handover` | |

Task 2 (engine pack and tracker) was already merged and is used as is.

## Adaptations to the plan

### Task 1 (contract)

1. **No `CORE_ROUTES` rename.** The merged contract already splits the
   route table into per-area arrays (`ACCOUNT_ROUTES`, `PEOPLE_ROUTES`,
   `TIME_ROUTES`, `PAY_ROUTES`, `EXPENSE_ROUTES`); `DOCUMENT_ROUTES`
   (35) joins them in `routes.ts` and is re-exported. The count test
   now says "75 routes before Plan 7" and Plan 7's own tests check 35.
2. **Lists are `{ items }` envelopes** with named list schemas
   (`EmployeeDocumentList`, `ExpiryAlertList`, `LibraryDocumentList`,
   `MergeFieldList`, `LetterTemplateList`, `LetterList`), as Plan 3
   and Plan 6 answer every list; the plan said bare arrays.
3. **Named schemas and examples** live in `registry-documents.ts` and
   `examples-documents.ts` (Plan 3 requires every route response to
   be named with an example). Downloads use the placeholder
   `FileContent`, as Plan 6's `ReceiptContent`.
4. **Extra param schemas** `VersionParams` (`{ id, versionId }`) and
   `TemplateVersionParams`.
5. **Override values are shape-checked in the contract**
   (`OVERRIDE_VALUE`): `largeRequiredRounding` one of `DOWN`,
   `HALF_UP`, `UP`; the others whole numbers (target basis points at
   most 10000). Without this, one bad value made every report a 422
   (the engine builder's first concern).
6. **`FileUpload.contentBase64`** allows up to 14,000,000 characters,
   so one byte over the maximum reaches the handler's
   `FILE_TOO_LARGE` instead of a validation error.
7. **Error codes** are one `DOCUMENT_ERROR_STATUS` block spread into
   `ERROR_STATUS`; `PAYLOAD_TOO_LARGE` already existed.
8. **Test helper `plan7-pending.ts`** lists Plan 7 ids not yet served;
   the conformance, leak and runtime-role flow suites skip them
   (`isPending` also covers `PLAN6_PENDING`). Each task marks its ids
   served.

### Task 3 (files)

1. **Plan 6's pieces are reused, not copied:** strict base64
   (`receipts/base64.ts`) and magic-byte sniffing
   (`receipts/sniff.ts`, which also needs more bytes than the magic).
   The upload size is computed from the text length before decoding.
2. **Byte crypto is on `CompanyKey`** (`encryptBytes`,
   `decryptBytes`, layout `0x01 | iv | tag | ct`, tag length pinned),
   not on `Keyring`, so the own-company AAD check applies to files too.
3. **`BinaryReply` and `binary()`** (Plan 6's shared download path) now
   write `Content-Disposition` only through `contentDisposition`, and
   every binary reply carries `Content-Security-Policy: sandbox`. To
   keep Plan 6's receipt header unchanged, `contentDisposition` leaves
   out the `filename*` part when the name is already plain ASCII.
   Lone surrogates become U+FFFD before percent-encoding.
4. **Audit uses Plan 3's allowlist**, not a `SENSITIVE_KEYS` list:
   `audit/allowlist-documents.ts` adds closed-set keys (`fileId`,
   `mime`, `type`, `kind`, `lang`, ...). Settings changes use a new key
   `settingsChanged` checked against a closed set of dotted names,
   because Plan 3's `changed` pattern refuses hyphens and underscores
   (`leadDays.emirates-id`, `overrides.finePerPostPerYear_2026`).
5. **`claimFile` is one conditional UPDATE** (`attached_to IS NULL AND
   uploaded_by = caller`); a trigger keeps `attached_to` write-once
   and every other column unchanged; the runtime role may update only
   `attached_to`. `attached_to` is `<kind>:<uuid>`.
6. **`readFile(ctx, fileId, attachedTo)`** also takes the record the
   file must be attached to, so a file id from one record can never be
   read through another.
7. **Real PostgreSQL race** (`pg-plan7.integration.test.ts`): two
   claims of one file at once give one success and one 409.
8. Plan 7's routes are registered by one call, `registerDocumentApp`
   in `src/document-app.ts`.

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
