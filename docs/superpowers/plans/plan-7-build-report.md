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
| 4 | `feat(api): employee documents and expiry alerts` | done |
| 5 | `feat(api): company library and receipts` | done |
| 6 | `feat(api): letter templates and merge` | done |
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

### Task 4 (employee documents)

1. **Access helpers** (`documents/access.ts`) read only the employee's
   id, manager, name and last working date (no decryption): full access
   for owner, hr and the person (any role), limited for the person's
   manager, 404 for anyone else. Writes: owner and hr for anyone;
   others only their own linked employee (no link 422, other id 404).
2. **Version adds are serialised with a transaction advisory lock**
   keyed on the slot id, not `FOR UPDATE`: the runtime role has no
   UPDATE grant on `employee_documents`, and a row lock needs one.
   `unique (document_id, version)` still guards the numbering.
3. **Verify** stamps the current version once (`verified_by IS NULL`);
   a second verify changes nothing. Only `verified_by` and
   `verified_at` are updatable; the database also requires both or
   neither.
4. **Download** finds the version as `document_id = {id} AND id =
   {versionId}` after the slot's visibility check, and reads the file
   only through `readFile(..., "employee-document-version:<id>")`.
5. **Retention for documents** uses the current version's upload date
   in Dubai as the `issue` anchor, as the plan says.
6. **Leak suite:** Plan 7's GET routes have their own file
   (`leak-documents.test.ts`) with sentinel passport numbers
   (`helpers/seed-documents.ts`, `DOC_NUMBERS`) instead of new keys in
   Plan 3's `SENTINELS`; `leak.test.ts` skips Plan 7 ids. Binary bodies
   are read as latin1 text, so file markers are checked too.
7. **Settings audit** writes `{ settingsChanged: [...] }` (Task 3,
   item 4), e.g. `["leadDays.emirates-id", "leadDays.passport"]`.

### Task 5 (library)

1. **`inAudience` takes `role: Role | null`**: an employee with no
   user in the company (common: not every employee signs in) can still
   be in a receipts report through `allStaff`, an employee id or a
   department, never through a role.
2. **Receipts report rows** are employees employed today (joined on or
   before today and no last working date before today), with their
   linked user's role, and their receipt for the current version
   matched by employee id.
3. **Receipt times are set once in the database** too (trigger), and an
   acknowledgement requires a view time; the runtime role may update
   only `viewed_at` and `acknowledged_at` on receipts and `audience` on
   documents. Version adds use the same advisory lock as Task 4.
4. **Audit data:** `library.created` carries `{ documentId, version,
   allStaff, departmentCount, employeeCount, roles }`;
   `library.downloaded` and `library.acknowledged` carry `{
   documentId, version }`.
5. The leak suite covers the library routes with a file marker the
   manager (outside the audience) must never receive.

### Task 6 (letter templates)

1. **Files:** the template store (rows, inserts, starter seeding,
   views) is `letters/template-store.ts`; the route handlers are
   `letters/templates.ts`, to stay under 300 lines.
2. **A version created through `POST /v1/letter-templates` is a
   draft**, like every later version; only the seeded starters start
   published. `letter.template.created` audit data is `{ templateId,
   kind, lang }`; version, publish and review rows carry `{ templateId,
   version }`.
3. **The reviewer's name is not in the audit row** (the allowlist
   refuses free text); it stays on the version. A native review is
   recorded once; a later call keeps the first record.
4. **Database guards:** one published version per template (partial
   unique index); a trigger keeps body, fields and number immutable,
   lets the status only move forward and keeps a review once
   recorded; the runtime role may update only status, publish time and
   review columns.
5. **Malformed placeholders:** any `{{` left after removing the
   well-formed placeholders is refused. A stray single brace (as in
   `{{{employee.fullName}}}`) is allowed and printed literally.
6. **`buildMergeValues`** also checks money inputs (`parseAed`, else
   422 `VALIDATION_FAILED` naming `inputs.<key>`) and date inputs (ISO
   dates). `letter.reference` is the letter id.
7. Signup seeds the ten starters in its existing transaction (20 more
   ids per signup).

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
